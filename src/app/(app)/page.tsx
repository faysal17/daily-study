import { NavBar, PageHeader } from "@/components/NavBar";
import { TodayList } from "@/components/TodayList";
import { RoutineBanner } from "@/components/RoutineBanner";
import { DayNav } from "@/components/DayNav";
import { createClient } from "@/lib/supabase/server";
import {
  addDaysISO,
  formatShort,
  hhmm,
  isISODate,
  isSaturday,
  timeToMinutes,
  todayISO,
  weekdayOf,
} from "@/lib/dates";
import type { Phase } from "@/lib/phases";
import type { RoutineBlock, TodayEntry, TodayGroup } from "@/lib/types";

export const dynamic = "force-dynamic";

type JoinedTopic = { name: string; subject: string | null };
type ItemRow = {
  id: string;
  topic_id: string;
  scheduled_date: string;
  rung: number;
  routine_block_id: string | null;
  topics: JoinedTopic | JoinedTopic[] | null;
};
type PhaseRow = {
  id: string;
  main_task_id: string;
  phase: Phase;
  scheduled_date: string;
  rung: number;
  routine_block_id: string | null;
  checked_topic_ids: string[] | null;
  main_tasks: JoinedTopic | JoinedTopic[] | null;
};

const one = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : v;

const ANYTIME_KEY = "anytime";

/** "Today" / "Yesterday" / "Tomorrow", else the short calendar label. */
function dayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDaysISO(today, 1)) return "Tomorrow";
  if (date === addDaysISO(today, -1)) return "Yesterday";
  return formatShort(date);
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const supabase = await createClient();
  const today = todayISO();
  const { d } = await searchParams;
  const selected = isISODate(d) ? d : today;
  const isToday = selected === today;
  // The Saturday overdue catch-up only makes sense for the live "today" view.
  const widen = isToday && isSaturday(today);
  const weekday = weekdayOf(selected);

  const itemsQ = supabase
    .from("study_items")
    .select(
      "id, topic_id, scheduled_date, rung, routine_block_id, topics(name, subject)",
    )
    .eq("status", "pending")
    .order("scheduled_date", { ascending: true });

  const phasesQ = supabase
    .from("main_task_items")
    .select(
      "id, main_task_id, phase, scheduled_date, rung, routine_block_id, checked_topic_ids, main_tasks(name, subject)",
    )
    .eq("status", "pending")
    .order("scheduled_date", { ascending: true });

  const [{ data: itemRows }, { data: phaseRows }, { data: blockRows }] =
    await Promise.all([
      widen
        ? itemsQ.lte("scheduled_date", selected)
        : itemsQ.eq("scheduled_date", selected),
      widen
        ? phasesQ.lte("scheduled_date", selected)
        : phasesQ.eq("scheduled_date", selected),
      supabase
        .from("routine_blocks")
        .select("*")
        .eq("active", true)
        .order("start_time", { ascending: true }),
    ]);

  const items = (itemRows ?? []) as ItemRow[];
  const phases = (phaseRows ?? []) as PhaseRow[];
  const blocks = (blockRows ?? []) as RoutineBlock[];
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  // Review counts for the standalone topics shown today.
  const counts = new Map<string, number>();
  if (items.length > 0) {
    const topicIds = [...new Set(items.map((r) => r.topic_id))];
    const { data: doneRows } = await supabase
      .from("study_items")
      .select("topic_id")
      .eq("status", "done")
      .in("topic_id", topicIds);
    for (const d of doneRows ?? []) {
      const k = (d as { topic_id: string }).topic_id;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }

  // Topics belonging to the main tasks that have a phase due today.
  const topicsByMainTask = new Map<string, { id: string; name: string }[]>();
  if (phases.length > 0) {
    const mtIds = [...new Set(phases.map((p) => p.main_task_id))];
    const { data: mtTopics } = await supabase
      .from("topics")
      .select("id, name, main_task_id")
      .in("main_task_id", mtIds)
      .order("name", { ascending: true });
    for (const t of (mtTopics ?? []) as {
      id: string;
      name: string;
      main_task_id: string;
    }[]) {
      const arr = topicsByMainTask.get(t.main_task_id) ?? [];
      arr.push({ id: t.id, name: t.name });
      topicsByMainTask.set(t.main_task_id, arr);
    }
  }

  const byBlock = new Map<string, TodayEntry[]>();
  const push = (key: string, entry: TodayEntry) => {
    const arr = byBlock.get(key) ?? [];
    arr.push(entry);
    byBlock.set(key, arr);
  };
  const bucketKey = (blockId: string | null) =>
    blockId && blockById.has(blockId) ? blockId : ANYTIME_KEY;

  for (const r of items) {
    const t = one(r.topics);
    push(bucketKey(r.routine_block_id), {
      kind: "topic",
      id: r.id,
      topicId: r.topic_id,
      topicName: t?.name ?? "(untitled topic)",
      subject: t?.subject ?? null,
      rung: r.rung,
      scheduledDate: r.scheduled_date,
      reviewCount: counts.get(r.topic_id) ?? 0,
      overdue: r.scheduled_date < today,
      routineBlockId: r.routine_block_id,
    });
  }

  for (const p of phases) {
    const mt = one(p.main_tasks);
    push(bucketKey(p.routine_block_id), {
      kind: "phase",
      id: p.id,
      mainTaskId: p.main_task_id,
      mainTaskName: mt?.name ?? "(main task)",
      subject: mt?.subject ?? null,
      phase: p.phase,
      rung: p.rung,
      scheduledDate: p.scheduled_date,
      overdue: p.scheduled_date < today,
      routineBlockId: p.routine_block_id,
      checkedTopicIds: p.checked_topic_ids ?? [],
      topics: topicsByMainTask.get(p.main_task_id) ?? [],
    });
  }

  const todaysBlocks = blocks
    .filter((b) => b.days_of_week?.includes(weekday))
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  const groups: TodayGroup[] = todaysBlocks.map((b) => ({
    key: b.id,
    label: b.label,
    timeRange: `${hhmm(b.start_time)} – ${hhmm(b.end_time)}`,
    startMinutes: timeToMinutes(b.start_time),
    items: byBlock.get(b.id) ?? [],
  }));

  const anytime = byBlock.get(ANYTIME_KEY) ?? [];
  if (anytime.length > 0) {
    groups.push({
      key: ANYTIME_KEY,
      label: "Anytime",
      timeRange: null,
      startMinutes: Number.MAX_SAFE_INTEGER,
      items: anytime,
    });
  }

  const totalDue = items.length + phases.length;

  return (
    <main className="page">
      <NavBar active="today" />
      <PageHeader
        title={dayLabel(selected, today)}
        subtitle={totalDue > 0 ? `${totalDue} to review` : "Nothing scheduled"}
      />

      <DayNav date={selected} today={today} />

      {isToday && <RoutineBanner blocks={blocks} />}

      <TodayList
        groups={groups}
        isSaturday={widen}
        isToday={isToday}
        hasRoutine={todaysBlocks.length > 0}
      />
    </main>
  );
}
