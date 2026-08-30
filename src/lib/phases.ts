/**
 * The fixed flow every main task moves through:
 *   skim -> notes -> exam -> recall
 * Skim/Notes/Exam happen once. Exam is graded and sets the starting rung.
 * Recall is the recurring spaced-repetition phase (uses the ladder in
 * `@/lib/ladder`).
 */

export type Phase = "skim" | "notes" | "exam" | "recall";

export const PHASES: readonly Phase[] = ["skim", "notes", "exam", "recall"];

export const PHASE_LABEL: Record<Phase, string> = {
  skim: "Skim",
  notes: "Notes",
  exam: "Exam",
  recall: "Recall / Review",
};

export const PHASE_SHORT: Record<Phase, string> = {
  skim: "Skim",
  notes: "Notes",
  exam: "Exam",
  recall: "Recall",
};

/** The phase that follows `p`. Recall is terminal (stays recall). */
export function nextPhase(p: Phase): Phase {
  const i = PHASES.indexOf(p);
  return i < 0 || i >= PHASES.length - 1 ? "recall" : PHASES[i + 1];
}

/** Skim and Notes are ticked done with no grade; Exam and Recall need a grade. */
export function phaseNeedsGrade(p: Phase): boolean {
  return p === "exam" || p === "recall";
}
