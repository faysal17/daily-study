import { NavBar } from "@/components/NavBar";
import { AddForm } from "@/components/AddForm";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import type { Topic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select("id, name, subject, created_at")
    .order("name", { ascending: true });

  const topics = (data ?? []) as Topic[];

  return (
    <main className="container-narrow pb-16">
      <NavBar active="add" />
      <header className="mt-2 mb-4">
        <h1 className="text-xl font-semibold">Add / Assign</h1>
        <p className="text-sm text-[var(--muted)]">
          Put a topic on a date. Defaults to today.
        </p>
      </header>
      <AddForm topics={topics} today={todayISO()} />
    </main>
  );
}
