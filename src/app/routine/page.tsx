import { NavBar } from "@/components/NavBar";
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
    <main className="container-narrow pb-16">
      <NavBar active="routine" />
      <header className="mt-2 mb-4">
        <h1 className="text-xl font-semibold">Routine</h1>
        <p className="text-sm text-[var(--muted)]">
          Your daily time blocks — reference only.
        </p>
      </header>
      <RoutineEditor blocks={blocks} />
    </main>
  );
}
