"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { intervalDays, nextRung, type Grade } from "@/lib/ladder";
import { nextPhase, phaseNeedsGrade } from "@/lib/phases";
import { addDaysISO, todayISO } from "@/lib/dates";
import type { ActionResult } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
}

/** Create a main task and attach topics to it (existing ids + new names). */
export async function createMainTask(input: {
  name: string;
  subject?: string;
  existingTopicIds?: string[];
  newTopicNames?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "Give the main task a name." };
  const subject = (input.subject ?? "").trim() || null;

  const { data: mt, error } = await supabase
    .from("main_tasks")
    .insert({ name, subject })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const existing = (input.existingTopicIds ?? []).filter(Boolean);
  if (existing.length > 0) {
    const { error: e } = await supabase
      .from("topics")
      .update({ main_task_id: mt.id })
      .in("id", existing);
    if (e) return { ok: false, error: e.message };
  }

  const fresh = (input.newTopicNames ?? [])
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => ({ name: n, subject, main_task_id: mt.id }));
  if (fresh.length > 0) {
    const { error: e } = await supabase.from("topics").insert(fresh);
    if (e) return { ok: false, error: e.message };
  }

  revalidateAll();
  return { ok: true, message: `Created “${name}”.` };
}

export async function deleteMainTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // topics.main_task_id is ON DELETE SET NULL, so the topics survive.
  const { error } = await supabase.from("main_tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

/** Replace the set of topics attached to a main task. */
export async function setMainTaskTopics(
  mainTaskId: string,
  topicIds: string[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const keep = topicIds.filter(Boolean);

  // Detach any topic currently on this main task that isn't in the new set.
  const { data: current } = await supabase
    .from("topics")
    .select("id")
    .eq("main_task_id", mainTaskId);
  const toDetach = (current ?? [])
    .map((t) => (t as { id: string }).id)
    .filter((id) => !keep.includes(id));

  if (toDetach.length > 0) {
    const { error } = await supabase
      .from("topics")
      .update({ main_task_id: null })
      .in("id", toDetach);
    if (error) return { ok: false, error: error.message };
  }
  if (keep.length > 0) {
    const { error } = await supabase
      .from("topics")
      .update({ main_task_id: mainTaskId })
      .in("id", keep);
    if (error) return { ok: false, error: error.message };
  }

  revalidateAll();
  return { ok: true };
}

/** Schedule the main task's *current* phase for a date. */
export async function scheduleMainTaskPhase(input: {
  mainTaskId: string;
  date: string;
  routineBlockId?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: mt, error } = await supabase
    .from("main_tasks")
    .select("id, name, phase, rung")
    .eq("id", input.mainTaskId)
    .single();
  if (error || !mt) return { ok: false, error: "Main task not found." };

  const { data: openItems } = await supabase
    .from("main_task_items")
    .select("id")
    .eq("main_task_id", mt.id)
    .eq("status", "pending")
    .limit(1);
  if (openItems && openItems.length > 0) {
    return {
      ok: false,
      error: "This main task already has a phase scheduled. Finish it first.",
    };
  }

  const date = (input.date || "").trim() || todayISO();
  const { error: insErr } = await supabase.from("main_task_items").insert({
    main_task_id: mt.id,
    phase: mt.phase,
    scheduled_date: date,
    status: "pending",
    rung: mt.phase === "recall" ? mt.rung : 0,
    routine_block_id: input.routineBlockId?.trim() || null,
  });
  if (insErr) return { ok: false, error: insErr.message };

  revalidateAll();
  return { ok: true, message: `Scheduled ${mt.phase} for ${date}.` };
}

/** Move a still-pending phase item to a new date / routine block. */
export async function rescheduleMainTaskPhase(input: {
  itemId: string;
  date: string;
  routineBlockId?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const date = (input.date || "").trim();
  if (!date) return { ok: false, error: "Pick a date." };

  const { error } = await supabase
    .from("main_task_items")
    .update({
      scheduled_date: date,
      routine_block_id: input.routineBlockId?.trim() || null,
    })
    .eq("id", input.itemId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, message: `Moved to ${date}.` };
}

/** Tick / untick a topic within a due phase item's checklist. */
export async function togglePhaseTopic(
  itemId: string,
  topicId: string,
  checked: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("main_task_items")
    .select("checked_topic_ids")
    .eq("id", itemId)
    .single();
  if (error || !item) return { ok: false, error: "Item not found." };

  const set = new Set<string>(item.checked_topic_ids ?? []);
  if (checked) set.add(topicId);
  else set.delete(topicId);

  const { error: upErr } = await supabase
    .from("main_task_items")
    .update({ checked_topic_ids: [...set] })
    .eq("id", itemId);
  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}

/**
 * Complete a due phase item. Skim/Notes just finish and unlock the next phase.
 * Exam needs a grade and sets the starting rung for Recall. Grading a Recall
 * session runs the ladder and auto-schedules the next Recall session.
 */
export async function completePhaseItem(
  itemId: string,
  grade?: Grade,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("main_task_items")
    .select("id, main_task_id, phase, status, routine_block_id")
    .eq("id", itemId)
    .single();
  if (error || !item) return { ok: false, error: "Item not found." };
  if (item.status === "done") return { ok: true, message: "Already done." };

  if (phaseNeedsGrade(item.phase) && !grade) {
    return { ok: false, error: "Pick a grade." };
  }

  const { data: mt } = await supabase
    .from("main_tasks")
    .select("id, rung")
    .eq("id", item.main_task_id)
    .single();
  const currentRung = mt?.rung ?? 0;

  const { error: upErr } = await supabase
    .from("main_task_items")
    .update({
      status: "done",
      grade: grade ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("status", "pending");
  if (upErr) return { ok: false, error: upErr.message };

  let message = "Done.";

  if (item.phase === "skim" || item.phase === "notes") {
    await supabase
      .from("main_tasks")
      .update({ phase: nextPhase(item.phase) })
      .eq("id", item.main_task_id);
    message = `${item.phase === "skim" ? "Notes" : "Exam"} phase unlocked.`;
  } else if (item.phase === "exam") {
    const startRung = nextRung(0, grade as Grade);
    await supabase
      .from("main_tasks")
      .update({ phase: "recall", rung: startRung })
      .eq("id", item.main_task_id);
    message = `Recall phase unlocked at R${startRung}. Schedule the first review.`;
  } else {
    // recall — run the ladder and queue the next review
    const newRung = nextRung(currentRung, grade as Grade);
    const nextDate = addDaysISO(todayISO(), intervalDays(newRung));
    await supabase
      .from("main_tasks")
      .update({ rung: newRung })
      .eq("id", item.main_task_id);
    const { error: insErr } = await supabase.from("main_task_items").insert({
      main_task_id: item.main_task_id,
      phase: "recall",
      scheduled_date: nextDate,
      status: "pending",
      rung: newRung,
      routine_block_id: item.routine_block_id,
    });
    if (insErr) return { ok: false, error: insErr.message };
    message = `Next review: ${nextDate} (R${newRung}).`;
  }

  revalidateAll();
  return { ok: true, message };
}

export async function deletePhaseItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("main_task_items")
    .delete()
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
