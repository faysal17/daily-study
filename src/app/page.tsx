import { NavBar } from "@/components/NavBar";
import { TodayList } from "@/components/TodayList";
import { RoutineBanner } from "@/components/RoutineBanner";
import { createClient } from "@/lib/supabase/server";
import { formatShort, isSaturday, todayISO } from "@/lib/dates";
import type { DueItem, RoutineBlock } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  topic_id: string;
  scheduled_date: string;
  rung: number;
  topics: { name: string; subject: string | null } | { name: string; subject: string | null }[] | null;
};

function topicOf(row: Row) {
  const t = Array.isArray(row.topics) ? row.topics[0] : row.topics;
  return { name: t?.name ?? "(untitled topic)", subject: t?.subject ?? null };
}

export default async function TodayPage() {
  const supabase = await createClient();
  const today = todayISO();
  const saturday = isSaturday(today);

  let query = supabase
    .from("study_items")
    .select("id, topic_id, scheduled_date, rung, topics(name, subject)")
    .eq("status", "pending")
    .order("scheduled_date", { ascending: true });

  // Today only ever shows items scheduled for today — plus, on Saturdays, any
  // overdue items the rollover job hasn't swept yet.
  query = saturday
    ? query.lte("scheduled_date", today)
    : query.eq("scheduled_date", today);

  const { data: rows, error } = await query;

  const items: DueItem[] = [];
  if (rows && rows.length > 0) {
    const topicIds = [...new Set(rows.map((r) => (r as Row).topic_id))];
    const { data: doneRows } = await supabase
      .from("study_items")
      .select("topic_id")
      .eq("status", "done")
      .in("topic_id", topicIds);

    const counts = new Map<string, number>();
    for (const d of doneRows ?? []) {
      const k = (d as { topic_id: string }).topic_id;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    for (const raw of rows as Row[]) {
      const t = topicOf(raw);
      items.push({
        id: raw.id,
        topicId: raw.topic_id,
        topicName: t.name,
        subject: t.subject,
        rung: raw.rung,
        scheduledDate: raw.scheduled_date,
        reviewCount: counts.get(raw.topic_id) ?? 0,
        overdue: raw.scheduled_date < today,
      });
    }
  }

  const { data: blockRows } = await supabase
    .from("routine_blocks")
    .select("*")
    .eq("active", true)
    .order("start_time", { ascending: true });

  const blocks = (blockRows ?? []) as RoutineBlock[];

  return (
    <main className="container-narrow pb-16">
      <NavBar active="today" />

      <header className="mt-2 mb-4">
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="text-sm text-[var(--muted)]">{formatShort(today)}</p>
      </header>

      <RoutineBanner blocks={blocks} />

      {error ? (
        <p className="mt-6 text-sm text-red-600">
          Could not load items: {error.message}
        </p>
      ) : (
        <TodayList initialItems={items} isSaturday={saturday} />
      )}
    </main>
  );
}
