import { NavBar, PageHeader } from "@/components/NavBar";
import { AddForm } from "@/components/AddForm";
import { createClient } from "@/lib/supabase/server";
import { hhmm, todayISO } from "@/lib/dates";
import type { Phase } from "@/lib/phases";
import type { RoutineBlock, Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const supabase = await createClient();

  const [
    { data: topicData },
    { data: blockData },
    { data: mtData },
    { data: openData },
  ] = await Promise.all([
    supabase
      .from("topics")
      .select("id, name, subject, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("routine_blocks")
      .select("*")
      .eq("active", true)
      .order("start_time", { ascending: true }),
    supabase
      .from("main_tasks")
      .select("id, name, phase")
      .order("created_at", { ascending: false }),
    supabase
      .from("main_task_items")
      .select("main_task_id")
      .eq("status", "pending"),
  ]);

  const topics = (topicData ?? []) as Topic[];
  const blocks = ((blockData ?? []) as RoutineBlock[]).map((b) => ({
    id: b.id,
    label: `${b.label} · ${hhmm(b.start_time)}–${hhmm(b.end_time)}`,
  }));
  const openSet = new Set(
    ((openData ?? []) as { main_task_id: string }[]).map((r) => r.main_task_id),
  );
  const mainTasks = ((mtData ?? []) as {
    id: string;
    name: string;
    phase: Phase;
  }[]).map((m) => ({ ...m, hasOpenItem: openSet.has(m.id) }));

  return (
    <main className="page">
      <NavBar active="add" />
      <PageHeader
        title="Add / Assign"
        subtitle="Schedule a topic or a main-task phase. Defaults to today."
      />
      <AddForm
        topics={topics}
        blocks={blocks}
        mainTasks={mainTasks}
        today={todayISO()}
      />
    </main>
  );
}
