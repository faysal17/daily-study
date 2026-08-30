import { NavBar, PageHeader } from "@/components/NavBar";
import { TodayList } from "@/components/TodayList";
import { RoutineBanner } from "@/components/RoutineBanner";
import { createClient } from "@/lib/supabase/server";
import {
  formatShort,
  hhmm,
  isSaturday,
  timeToMinutes,
  todayISO,
  weekdayOf,
} from "@/lib/dates";
import type { DueItem, RoutineBlock, TodayGroup } from "@/lib/types";

export const dynamic = "force-dynamic";

type JoinedTopic = { name: string; subject: string | null };
type Row = {
  id: string;
  topic_id: string;
  scheduled_date: string;
  rung: number;
  routine_block_id: string | null;
  topics: JoinedTopic | JoinedTopic[] | null;
};

function topicOf(row: Row) {
  const t = Array.isArray(row.topics) ? row.topics[0] : row.topics;
  return { name: t?.name ?? "(untitled topic)", subject: t?.subject ?? null };
}

const ANYTIME_KEY = "anytime";

export default async function TodayPage() {
  const supabase = await createClient();
  const today = todayISO();
  const saturday = isSaturday(today);
  const weekday = weekdayOf(today);

  const itemsQuery = supabase
    .from("study_items")
    .select(
      "id, topic_id, scheduled_date, rung, routine_block_id, topics(name, subject)",
    )
    .eq("status", "pending")
    .order("scheduled_date", { ascending: true });

  const [{ data: rows, error }, { data: blockRows }] = await Promise.all([
    saturday
      ? itemsQuery.lte("scheduled_date", today)
      : itemsQuery.eq("scheduled_date", today),
    supabase
      .from("routine_blocks")
      .select("*")
      .eq("active", true)
      .order("start_time", { ascending: true }),
  ]);

  const blocks = (blockRows ?? []) as RoutineBlock[];
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  // Review counts for the topics that show up today.
  const counts = new Map<string, number>();
  if (rows && rows.length > 0) {
    const topicIds = [...new Set(rows.map((r) => (r as Row).topic_id))];
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

  const dueByBlock = new Map<string, DueItem[]>();
  for (const raw of (rows ?? []) as Row[]) {
    const t = topicOf(raw);
    const due: DueItem = {
      id: raw.id,
      topicId: raw.topic_id,
      topicName: t.name,
      subject: t.subject,
      rung: raw.rung,
      scheduledDate: raw.scheduled_date,
      reviewCount: counts.get(raw.topic_id) ?? 0,
      overdue: raw.scheduled_date < today,
      routineBlockId: raw.routine_block_id,
    };
    // Bucket under its block only if that block runs today; otherwise "Anytime".
    const key =
      raw.routine_block_id && blockById.has(raw.routine_block_id)
        ? raw.routine_block_id
        : ANYTIME_KEY;
    const arr = dueByBlock.get(key) ?? [];
    arr.push(due);
    dueByBlock.set(key, arr);
  }

  const todaysBlocks = blocks
    .filter((b) => b.days_of_week?.includes(weekday))
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  const groups: TodayGroup[] = todaysBlocks.map((b) => ({
    key: b.id,
    label: b.label,
    timeRange: `${hhmm(b.start_time)} – ${hhmm(b.end_time)}`,
    startMinutes: timeToMinutes(b.start_time),
    items: dueByBlock.get(b.id) ?? [],
  }));

  const anytime = dueByBlock.get(ANYTIME_KEY) ?? [];
  if (anytime.length > 0) {
    groups.push({
      key: ANYTIME_KEY,
      label: "Anytime",
      timeRange: null,
      startMinutes: Number.MAX_SAFE_INTEGER,
      items: anytime,
    });
  }

  const totalDue = (rows ?? []).length;

  return (
    <main className="page">
      <NavBar active="today" />
      <PageHeader
        title="Today"
        subtitle={`${formatShort(today)}${
          totalDue > 0 ? ` · ${totalDue} to review` : ""
        }`}
      />

      <RoutineBanner blocks={blocks} />

      {error ? (
        <p className="mt-6 text-sm text-[var(--fail)]">
          Could not load items: {error.message}
        </p>
      ) : (
        <TodayList
          groups={groups}
          isSaturday={saturday}
          hasRoutine={todaysBlocks.length > 0}
        />
      )}
    </main>
  );
}
