import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { comingSaturdayISO, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

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

  const [topics, phases] = await Promise.all([
    supabase
      .from("study_items")
      .update({ scheduled_date: target })
      .lt("scheduled_date", today)
      .eq("status", "pending")
      .select("id"),
    supabase
      .from("main_task_items")
      .update({ scheduled_date: target })
      .lt("scheduled_date", today)
      .eq("status", "pending")
      .select("id"),
  ]);

  const err = topics.error || phases.error;
  if (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    today,
    rolledTo: target,
    count: (topics.data?.length ?? 0) + (phases.data?.length ?? 0),
    topicItems: topics.data?.length ?? 0,
    phaseItems: phases.data?.length ?? 0,
  });
}
