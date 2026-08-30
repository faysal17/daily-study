import { NavBar, PageHeader } from "@/components/NavBar";
import { AddForm } from "@/components/AddForm";
import { createClient } from "@/lib/supabase/server";
import { hhmm, todayISO } from "@/lib/dates";
import type { RoutineBlock, Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const supabase = await createClient();

  const [{ data: topicData }, { data: blockData }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, name, subject, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("routine_blocks")
      .select("*")
      .eq("active", true)
      .order("start_time", { ascending: true }),
  ]);

  const topics = (topicData ?? []) as Topic[];
  const blocks = ((blockData ?? []) as RoutineBlock[]).map((b) => ({
    id: b.id,
    label: `${b.label} · ${hhmm(b.start_time)}–${hhmm(b.end_time)}`,
  }));

  return (
    <main className="page">
      <NavBar active="add" />
      <PageHeader
        title="Add / Assign"
        subtitle="Put a topic on a date. Defaults to today."
      />
      <AddForm topics={topics} blocks={blocks} today={todayISO()} />
    </main>
  );
}
