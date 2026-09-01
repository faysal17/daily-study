import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { comingSaturdayISO, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Move every overdue pending row in `table` to `target`, recording the day it
 * was pulled from in `rolled_from` (overwritten on each roll, so it points at
 * the most recent day the item was actually due). The Today screen's day
 * navigation reads `rolled_from` to keep the item visible on that day too.
 */
async function rollTable(
  supabase: Admin,
  table: "study_items" | "main_task_items",
  today: string,
  target: string,
): Promise<{ moved: number; error: string | null }> {
  const { data, error } = await supabase
    .from(table)
    .select("id, scheduled_date")
    .lt("scheduled_date", today)
    .eq("status", "pending");
  if (error) return { moved: 0, error: error.message };

  const rows = (data ?? []) as { id: string; scheduled_date: string }[];
  if (rows.length === 0) return { moved: 0, error: null };

  // Group by the date being left, so each group keeps its own `rolled_from`.
  const idsByFromDate = new Map<string, string[]>();
  for (const r of rows) {
    const arr = idsByFromDate.get(r.scheduled_date) ?? [];
    arr.push(r.id);
    idsByFromDate.set(r.scheduled_date, arr);
  }

  for (const [fromDate, ids] of idsByFromDate) {
    const { error: upErr } = await supabase
      .from(table)
      .update({ scheduled_date: target, rolled_from: fromDate })
      .in("id", ids);
    if (upErr) return { moved: 0, error: upErr.message };
  }
  return { moved: rows.length, error: null };
}

/**
 * Daily rollover. Any pending item whose scheduled_date is in the past is moved
 * to the coming Saturday, so overdue work lands in one weekend catch-up slot
 * instead of piling onto the Today page every day.
 *
 * Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayISO();
  const target = comingSaturdayISO(today);

  const topics = await rollTable(supabase, "study_items", today, target);
  const phases = await rollTable(supabase, "main_task_items", today, target);

  const err = topics.error || phases.error;
  if (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    today,
    rolledTo: target,
    count: topics.moved + phases.moved,
    topicItems: topics.moved,
    phaseItems: phases.moved,
  });
}
