import { NavBar, PageHeader } from "@/components/NavBar";
import { RoutineEditor } from "@/components/RoutineEditor";
import { createClient } from "@/lib/supabase/server";
import type { RoutineBlock } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("routine_blocks")
    .select("*")
    .order("start_time", { ascending: true });

  const blocks = (data ?? []) as RoutineBlock[];

  return (
    <main className="page">
      <NavBar active="routine" />
      <PageHeader
        title="Routine"
        subtitle="Your daily time blocks. Assign tasks to these on the Plan screen."
      />
      <RoutineEditor blocks={blocks} />
    </main>
  );
}
