"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { intervalDays, nextRung, type Grade } from "@/lib/ladder";
import { RECALL_START_RUNG, nextPhase, phaseNeedsGrade } from "@/lib/phases";
import { addDaysISO, todayISO } from "@/lib/dates";
import type { ActionResult } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
}

/**
 * Schedule a topic's *current phase* for a date, optionally into a routine time
 * block. Either an existing `topicId`, or a new topic from `newTopicName`
 * (+ `subject`) — a new topic starts at Skim (rung 0).
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
  let phase: string = "skim";
  let rung = 0;

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
      .select("name, phase, rung, main_task_id")
      .eq("id", topicId)
      .single();
    topicName = data?.name ?? "topic";
    phase = data?.phase ?? "skim";
    rung = data?.rung ?? 0;

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
    phase,
    rung: phase === "recall" ? rung : 0,
    routine_block_id: routineBlockId,
  });

  if (insErr) return { ok: false, error: insErr.message };

  revalidateAll();
  return { ok: true, message: `Scheduled ${phase} for ${date}.` };
}

/**
 * Finish a due study item — one phase of a topic.
 *
 * - **Skim / Notes**: ticked done, no grade; advances `topics.phase`.
 * - **Exam**: ticked done, no grade; moves the topic to `recall` at
 *   `RECALL_START_RUNG`.
 * - **Recall**: graded Good/Shaky/Fail; runs the spaced-repetition ladder, bumps
 *   `topics.rung`, and inserts the next `pending` recall row (same routine block).
 *
 * History is kept: the finished row stays as the review log. Skim/Notes/Exam do
 * not auto-schedule the next phase — the topic is scheduled again from Plan.
 */
export async function gradeItem(
  itemId: string,
  grade: Grade | null,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("study_items")
    .select("id, topic_id, phase, rung, status, routine_block_id")
    .eq("id", itemId)
    .single();

  if (error || !item) {
    return { ok: false, error: error?.message ?? "Item not found." };
  }
  if (item.status === "done") {
    return { ok: true, message: "Already graded." };
  }
  if (phaseNeedsGrade(item.phase) && !grade) {
    return { ok: false, error: "Pick a grade." };
  }

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

  if (item.phase === "skim" || item.phase === "notes") {
    const next = nextPhase(item.phase);
    await supabase
      .from("topics")
      .update({ phase: next })
      .eq("id", item.topic_id);
    revalidateAll();
    return { ok: true, message: `${next === "notes" ? "Notes" : "Exam"} unlocked — schedule it from Plan.` };
  }

  if (item.phase === "exam") {
    await supabase
      .from("topics")
      .update({ phase: "recall", rung: RECALL_START_RUNG })
      .eq("id", item.topic_id);
    revalidateAll();
    return {
      ok: true,
      message: `Recall unlocked at R${RECALL_START_RUNG} — schedule the first review from Plan.`,
    };
  }

  // recall — run the ladder and queue the next review
  const newRung = nextRung(item.rung, grade as Grade);
  const nextDate = addDaysISO(todayISO(), intervalDays(newRung));

  await supabase
    .from("topics")
    .update({ phase: "recall", rung: newRung })
    .eq("id", item.topic_id);

  const { error: insErr } = await supabase.from("study_items").insert({
    topic_id: item.topic_id,
    scheduled_date: nextDate,
    status: "pending",
    phase: "recall",
    rung: newRung,
    routine_block_id: item.routine_block_id,
  });

  if (insErr) return { ok: false, error: insErr.message };

  revalidateAll();
  return { ok: true, message: `Next review: ${nextDate} (R${newRung}).` };
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
