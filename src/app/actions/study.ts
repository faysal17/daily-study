"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { intervalDays, nextRung, type Grade } from "@/lib/ladder";
import { addDaysISO, todayISO } from "@/lib/dates";
import type { ActionResult } from "@/lib/types";

/**
 * Assign a topic to a date. Either an existing `topicId`, or a brand-new topic
 * created on the fly from `newTopicName` (+ optional `subject`).
 * The new study_item starts at rung 0.
 */
export async function assignTopic(input: {
  topicId?: string;
  newTopicName?: string;
  subject?: string;
  date: string; // "YYYY-MM-DD"
}): Promise<ActionResult> {
  const supabase = await createClient();

  const date = (input.date || "").trim() || todayISO();
  let topicId = input.topicId?.trim();
  let topicName = "";

  if (!topicId) {
    const name = (input.newTopicName ?? "").trim();
    if (!name) return { ok: false, error: "Pick a topic or type a new one." };

    const { data, error } = await supabase
      .from("topics")
      .insert({ name, subject: (input.subject ?? "").trim() || null })
      .select("id, name")
      .single();

    if (error) return { ok: false, error: error.message };
    topicId = data.id;
    topicName = data.name;
  } else {
    const { data } = await supabase
      .from("topics")
      .select("name")
      .eq("id", topicId)
      .single();
    topicName = data?.name ?? "topic";
  }

  const { error: insErr } = await supabase.from("study_items").insert({
    topic_id: topicId,
    scheduled_date: date,
    status: "pending",
    rung: 0,
  });

  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/");
  revalidatePath("/add");
  return { ok: true, message: `Assigned "${topicName}" for ${date}.` };
}

/**
 * Grade a due item. Marks it done, records the grade, and schedules the next
 * occurrence for the same topic at the new rung's interval. History is kept —
 * the graded row stays in the table as the review log.
 */
export async function gradeItem(
  itemId: string,
  grade: Grade,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("study_items")
    .select("id, topic_id, rung, status")
    .eq("id", itemId)
    .single();

  if (error || !item) {
    return { ok: false, error: error?.message ?? "Item not found." };
  }
  if (item.status === "done") {
    return { ok: true, message: "Already graded." };
  }

  const today = todayISO();
  const newRung = nextRung(item.rung, grade);
  const nextDate = addDaysISO(today, intervalDays(newRung));

  const { error: upErr } = await supabase
    .from("study_items")
    .update({
      status: "done",
      grade,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("status", "pending"); // guard against double-grading

  if (upErr) return { ok: false, error: upErr.message };

  const { error: insErr } = await supabase.from("study_items").insert({
    topic_id: item.topic_id,
    scheduled_date: nextDate,
    status: "pending",
    rung: newRung,
  });

  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/");
  return { ok: true, message: `Next review: ${nextDate} (R${newRung}).` };
}
