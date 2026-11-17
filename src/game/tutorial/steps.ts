/** The opening tutorial follows the story's actual sequence. */
export const TUTORIAL_STEPS = [
  "intro", "caseFolder", "caseCompare", "computer", "archive",
  "dispatch", "selectItem", "restore", "done", "skipped",
] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];
export type ActiveTutorialStep = Exclude<TutorialStep, "intro" | "done" | "skipped">;
export const TUTORIAL_FIND_ID = "find-wrapper";
const NEXT: Record<ActiveTutorialStep, TutorialStep> = {
  caseFolder: "caseCompare",
  caseCompare: "computer",
  computer: "archive",
  archive: "dispatch",
  dispatch: "selectItem",
  selectItem: "restore",
  restore: "done",
};
export function isTutorialStep(v: unknown): v is TutorialStep {
  return typeof v === "string" && (TUTORIAL_STEPS as readonly string[]).includes(v);
}
export function isActiveStep(step: TutorialStep): step is ActiveTutorialStep {
  return step in NEXT;
}
export function isTutorialRunning(step: TutorialStep): boolean {
  return step === "intro" || isActiveStep(step);
}
export function nextStep(step: ActiveTutorialStep): TutorialStep {
  return NEXT[step];
}
