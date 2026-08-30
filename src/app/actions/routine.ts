"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

function parseDays(formData: FormData): number[] {
  return formData
    .getAll("days")
    .map((d) => Number(d))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);
}

export async function createBlock(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const start = String(formData.get("start_time") ?? "").trim();
  const end = String(formData.get("end_time") ?? "").trim();

  if (!label || !start || !end) {
    return { ok: false, error: "Label, start and end time are all required." };
  }

  const { error } = await supabase.from("routine_blocks").insert({
    label,
    start_time: start,
    end_time: end,
    days_of_week: parseDays(formData),
    active: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/routine");
  revalidatePath("/");
  return { ok: true };
}

export async function updateBlock(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const start = String(formData.get("start_time") ?? "").trim();
  const end = String(formData.get("end_time") ?? "").trim();

  if (!id) return { ok: false, error: "Missing block id." };
  if (!label || !start || !end) {
    return { ok: false, error: "Label, start and end time are all required." };
  }

  const { error } = await supabase
    .from("routine_blocks")
    .update({
      label,
      start_time: start,
      end_time: end,
      days_of_week: parseDays(formData),
      active: formData.get("active") === "on",
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/routine");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBlock(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing block id." };

  const { error } = await supabase.from("routine_blocks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/routine");
  revalidatePath("/");
  return { ok: true };
}
