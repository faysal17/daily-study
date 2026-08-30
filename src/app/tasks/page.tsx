import { NavBar, PageHeader } from "@/components/NavBar";
import { TasksView } from "@/components/TasksView";
import { createClient } from "@/lib/supabase/server";
import type { Grade } from "@/lib/ladder";
import type { ItemStatus, TaskRow, Topic } from "@/lib/types";

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

export default async function TasksPage() {
  const supabase = await createClient();

  const [{ data: topicData }, { data: itemData }, { data: blockData }] =
    await Promise.all([
      supabase
        .from("topics")
        .select("id, name, subject, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("study_items")
        .select(
          "id, topic_id, scheduled_date, status, rung, grade, routine_block_id",
        )
        .order("scheduled_date", { ascending: true }),
      supabase.from("routine_blocks").select("id, label"),
    ]);

  const topics = (topicData ?? []) as Topic[];
  const items = (itemData ?? []) as ItemRow[];
  const blockLabel = new Map(
    ((blockData ?? []) as { id: string; label: string }[]).map((b) => [
      b.id,
      b.label,
    ]),
  );

  const byTopic = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = byTopic.get(it.topic_id) ?? [];
    arr.push(it);
    byTopic.set(it.topic_id, arr);
  }

  const rows: TaskRow[] = topics.map((t) => {
    const list = byTopic.get(t.id) ?? [];
    const pending = list.filter((i) => i.status === "pending");
    const done = list.filter((i) => i.status === "done");
    const nextPending = pending[0] ?? null; // already sorted by date asc
    return {
      topicId: t.id,
      topicName: t.name,
      subject: t.subject,
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
        routineLabel: i.routine_block_id
          ? blockLabel.get(i.routine_block_id) ?? null
          : null,
      })),
    };
  });

  return (
    <main className="page">
      <NavBar active="tasks" />
      <PageHeader
        title="Tasks"
        subtitle={`${rows.length} topic${rows.length === 1 ? "" : "s"} · ${
          items.filter((i) => i.status === "pending").length
        } scheduled`}
      />
      <TasksView rows={rows} />
    </main>
  );
}
