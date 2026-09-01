/**
 * The flow every main task moves through:
 *   skim -> notes -> exam -> (done)
 * Skim/Notes are ticked done with no grade. Exam is graded; grading it hands the
 * bundle off — every bundled topic starts its own spaced-repetition ladder (see
 * `completePhaseItem` in `@/app/actions/mainTasks`) and the main task lands in
 * the terminal `done` phase. There is no bundle-level recurring phase.
 *
 * `recall` is kept in the type only for historical rows written before the
 * hand-off; nothing creates it any more.
 */

export type Phase = "skim" | "notes" | "exam" | "recall" | "done";

/** The phases you actively schedule, in order. */
export const PHASES: readonly Phase[] = ["skim", "notes", "exam"];

export const PHASE_LABEL: Record<Phase, string> = {
  skim: "Skim",
  notes: "Notes",
  exam: "Exam",
  recall: "Recall / Review",
  done: "Done",
};

export const PHASE_SHORT: Record<Phase, string> = {
  skim: "Skim",
  notes: "Notes",
  exam: "Exam",
  recall: "Recall",
  done: "Done",
};

/** The phase that follows `p`. Exam hands off to per-topic review; `done` is terminal. */
export function nextPhase(p: Phase): Phase {
  switch (p) {
    case "skim":
      return "notes";
    case "notes":
      return "exam";
    default:
      return "done";
  }
}

/** Skim and Notes are ticked done with no grade; Exam needs a grade. */
export function phaseNeedsGrade(p: Phase): boolean {
  return p === "exam" || p === "recall";
}
