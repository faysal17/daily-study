import { NavBar, PageHeader } from "@/components/NavBar";
import { TasksView } from "@/components/TasksView";
import { MainTasksPanel } from "@/components/MainTasksPanel";
import { createClient } from "@/lib/supabase/server";
import type { Grade } from "@/lib/ladder";
import type { Phase } from "@/lib/phases";
import type {
  ItemStatus,
  MainTaskRow,
  TaskRow,
  Topic,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type ItemRow = {
  id: string;
  topic_id: string;
  scheduled_date: string;
  status: ItemStatus;
  rung: number;
  grade: Grade | null;
  routine_block_id: string | null;
};
type MtRow = { id: string; name: string; subject: string | null; phase: Phase; rung: number };
type TopicRow = Topic & { main_task_id: string | null };
type PhaseItemRow = {
  id: string;
  main_task_id: string;
  phase: Phase;
  scheduled_date: string;
  status: ItemStatus;
  grade: Grade | null;
};

export default async function TasksPage() {
  const supabase = await createClient();

  const [
    { data: topicData },
    { data: itemData },
    { data: blockData },
    { data: mtData },
    { data: mtItemData },
  ] = await Promise.all([
    supabase
      .from("topics")
      .select("id, name, subject, created_at, main_task_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("study_items")
      .select(
        "id, topic_id, scheduled_date, status, rung, grade, routine_block_id",
      )
      .order("scheduled_date", { ascending: true }),
    supabase.from("routine_blocks").select("id, label"),
    supabase
      .from("main_tasks")
      .select("id, name, subject, phase, rung")
      .order("created_at", { ascending: false }),
    supabase
      .from("main_task_items")
      .select("id, main_task_id, phase, scheduled_date, status, grade")
      .order("scheduled_date", { ascending: true }),
  ]);

  const topics = (topicData ?? []) as TopicRow[];
  const items = (itemData ?? []) as ItemRow[];
  const mts = (mtData ?? []) as MtRow[];
  const mtItems = (mtItemData ?? []) as PhaseItemRow[];
  void blockData;

  const mtNameById = new Map(mts.map((m) => [m.id, m.name]));

  // ---- Topic rows ----
  const byTopic = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = byTopic.get(it.topic_id) ?? [];
    arr.push(it);
    byTopic.set(it.topic_id, arr);
  }
  const topicRows: TaskRow[] = topics.map((t) => {
    const list = byTopic.get(t.id) ?? [];
    const pending = list.filter((i) => i.status === "pending");
    const done = list.filter((i) => i.status === "done");
    const nextPending = pending[0] ?? null;
    return {
      topicId: t.id,
      topicName: t.name,
      subject: t.subject,
      mainTaskName: t.main_task_id
        ? mtNameById.get(t.main_task_id) ?? null
        : null,
      createdAt: t.created_at,
      pendingCount: pending.length,
      doneCount: done.length,
      nextDate: nextPending?.scheduled_date ?? null,
      currentRung:
        nextPending?.rung ??
        (done.length > 0 ? done[done.length - 1].rung : null),
      items: list.map((i) => ({
        id: i.id,
        scheduledDate: i.scheduled_date,
        status: i.status,
        rung: i.rung,
        grade: i.grade,
        routineLabel: null,
      })),
    };
  });

  // ---- Main task rows ----
  const topicsByMt = new Map<string, string[]>();
  for (const t of topics) {
    if (!t.main_task_id) continue;
    const arr = topicsByMt.get(t.main_task_id) ?? [];
    arr.push(t.name);
    topicsByMt.set(t.main_task_id, arr);
  }
  const itemsByMt = new Map<string, PhaseItemRow[]>();
  for (const it of mtItems) {
    const arr = itemsByMt.get(it.main_task_id) ?? [];
    arr.push(it);
    itemsByMt.set(it.main_task_id, arr);
  }
  const mainTaskRows: MainTaskRow[] = mts.map((m) => {
    const list = itemsByMt.get(m.id) ?? [];
    const open = list.find((i) => i.status === "pending") ?? null;
    return {
      id: m.id,
      name: m.name,
      subject: m.subject,
      phase: m.phase,
      rung: m.rung,
      topicNames: topicsByMt.get(m.id) ?? [],
      pendingItem: open
        ? { id: open.id, phase: open.phase, scheduledDate: open.scheduled_date }
        : null,
      history: list
        .filter((i) => i.status === "done")
        .map((i) => ({
          id: i.id,
          phase: i.phase,
          scheduledDate: i.scheduled_date,
          status: i.status,
          grade: i.grade,
        })),
    };
  });

  const allTopicOptions = topics.map((t) => ({
    id: t.id,
    name: t.name,
    mainTaskId: t.main_task_id,
  }));

  return (
    <main className="page">
      <NavBar active="tasks" />
      <PageHeader
        title="Tasks"
        subtitle={`${mts.length} main task${
          mts.length === 1 ? "" : "s"
        } · ${topics.length} topic${topics.length === 1 ? "" : "s"}`}
      />

      <MainTasksPanel rows={mainTaskRows} topicOptions={allTopicOptions} />

      <h2 className="mt-8 mb-3 px-1 text-sm font-semibold text-[var(--fg-muted)]">
        Topics
      </h2>
      <TasksView rows={topicRows} />
    </main>
  );
}
