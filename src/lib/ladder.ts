/**
 * Spaced-repetition ladder. Pure functions — no I/O, no dates from the outside
 * world beyond what is passed in. This is the single source of truth for how a
 * topic moves through review intervals.
 */

export type Grade = "good" | "shaky" | "fail";

export const MIN_RUNG = 0;
export const MAX_RUNG = 5;

/**
 * Days to wait after a review before the next occurrence, indexed by rung.
 *   R0 = same day, R1 = +1, R2 = +3, R3 = +7, R4 = +14, R5 = +21 (cap).
 */
export const RUNG_INTERVAL_DAYS: readonly number[] = [0, 1, 3, 7, 14, 21];

export function clampRung(rung: number): number {
  if (Number.isNaN(rung)) return MIN_RUNG;
  return Math.max(MIN_RUNG, Math.min(MAX_RUNG, Math.trunc(rung)));
}

/**
 * Where a topic lands after you grade it:
 *   Good  -> +2 rungs (capped at R5)
 *   Shaky -> +1 rung  (capped at R5)
 *   Fail  -> back to R1
 */
export function nextRung(currentRung: number, grade: Grade): number {
  const cur = clampRung(currentRung);
  switch (grade) {
    case "good":
      return clampRung(cur + 2);
    case "shaky":
      return clampRung(cur + 1);
    case "fail":
      return 1;
  }
}

export function intervalDays(rung: number): number {
  return RUNG_INTERVAL_DAYS[clampRung(rung)];
}

export const GRADES: readonly Grade[] = ["good", "shaky", "fail"];

export const GRADE_LABEL: Record<Grade, string> = {
  good: "Good",
  shaky: "Shaky",
  fail: "Fail",
};
