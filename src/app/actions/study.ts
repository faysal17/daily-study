"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { intervalDays, nextRung, type Grade } from "@/lib/ladder";
import { addDaysISO, todayISO } from "@/lib/dates";
import type { ActionResult } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
}

/**
 * Assign a topic to a date, optionally into a routine time block.
 * Either an existing `topicId`, or a new topic from `newTopicName` (+ `subject`).
 * The new study_item starts at rung 0.
 */
export async function assignTopic(input: {
  topicId?: string;
  newTopicName?: string;
  subject?: string;
  date: string; // "YYYY-MM-DD"
  routineBlockId?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const date = (input.date || "").trim() || todayISO();
  const routineBlockId = input.routineBlockId?.trim() || null;
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
      .select("name, main_task_id")
      .eq("id", topicId)
      .single();
    topicName = data?.name ?? "topic";

    if (data?.main_task_id) {
      const { data: mt } = await supabase
        .from("main_tasks")
        .select("phase")
        .eq("id", data.main_task_id)
        .single();
      if (mt && mt.phase !== "done") {
        return {
          ok: false,
          error:
            "This topic is in a main task. Schedule the main task's phase instead — its topics start their own review after the Exam.",
        };
      }
    }
  }

  const { error: insErr } = await supabase.from("study_items").insert({
    topic_id: topicId,
    scheduled_date: date,
    status: "pending",
    rung: 0,
    routine_block_id: routineBlockId,
  });

  if (insErr) return { ok: false, error: insErr.message };

  revalidateAll();
  return { ok: true, message: `Assigned “${topicName}” for ${date}.` };
}

/**
 * Finish a due item. Marks it done and schedules the next occurrence for the
 * same topic, keeping the same routine block. History is kept: the graded row
 * stays as the review log.
 *
 * Rung 0 is the topic's *first pass* — there is nothing to recall yet, so it
 * takes no grade (`grade` is null). It just moves onto the ladder at R1, and
 * every occurrence after that is graded Good / Shaky / Fail.
 */
export async function gradeItem(
  itemId: string,
  grade: Grade | null,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("study_items")
    .select("id, topic_id, rung, status, routine_block_id")
    .eq("id", itemId)
    .single();

  if (error || !item) {
    return { ok: false, error: error?.message ?? "Item not found." };
  }
  if (item.status === "done") {
    return { ok: true, message: "Already graded." };
  }

  const firstPass = item.rung === 0;
  if (!firstPass && !grade) {
    return { ok: false, error: "Pick a grade." };
  }

  const today = todayISO();
  const newRung = firstPass ? 1 : nextRung(item.rung, grade as Grade);
  const nextDate = addDaysISO(today, intervalDays(newRung));

  const { error: upErr } = await supabase
    .from("study_items")
    .update({
      status: "done",
      grade: grade ?? null,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("status", "pending");

  if (upErr) return { ok: false, error: upErr.message };

  const { error: insErr } = await supabase.from("study_items").insert({
    topic_id: item.topic_id,
    scheduled_date: nextDate,
    status: "pending",
    rung: newRung,
    routine_block_id: item.routine_block_id,
  });

  if (insErr) return { ok: false, error: insErr.message };

  revalidateAll();
  return {
    ok: true,
    message: firstPass
      ? `First pass done. First review: ${nextDate} (R1).`
      : `Next review: ${nextDate} (R${newRung}).`,
  };
}

/**
 * Move a still-pending study item to a new date / routine block. Does not touch
 * the ladder — it only relocates work that hasn't been graded yet.
 */
export async function rescheduleStudyItem(input: {
  itemId: string;
  date: string;
  routineBlockId?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const date = (input.date || "").trim();
  if (!date) return { ok: false, error: "Pick a date." };

  const { error } = await supabase
    .from("study_items")
    .update({
      scheduled_date: date,
      routine_block_id: input.routineBlockId?.trim() || null,
      rolled_from: null,
    })
    .eq("id", input.itemId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, message: `Moved to ${date}.` };
}

/** Delete a single scheduled/finished item. */
export async function deleteItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("study_items")
    .delete()
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

/** Delete a topic and every item (history included) for it. */
export async function deleteTopic(topicId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", topicId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
