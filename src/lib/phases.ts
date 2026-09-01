/**
 * The flow every topic (and every main task's bundle) moves through:
 *   skim -> notes -> exam -> recall
 * Skim, Notes and Exam are all ticked done with no grade. Finishing the Exam
 * moves the topic into `recall` at `RECALL_START_RUNG`; for a main task it hands
 * the bundle off — every bundled topic starts its own recall ladder and the main
 * task lands in the terminal `done` phase.
 *
 * Only `recall` is graded (Good / Shaky / Fail), and only `recall` recurs.
 */

export type Phase = "skim" | "notes" | "exam" | "recall" | "done";

/** The phases you actively schedule, in order. */
export const PHASES: readonly Phase[] = ["skim", "notes", "exam"];

/** The rung a topic enters `recall` at once its Exam is done. */
export const RECALL_START_RUNG = 1;

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

/** Only `recall` is graded — Skim, Notes and Exam are just ticked done. */
export function phaseNeedsGrade(p: Phase): boolean {
  return p === "recall";
}
