/** All tutorial steps in order. `intro` = not started, `done`/`skipped` = finished. */
export const TUTORIAL_STEPS = [
  "intro",
  "toTable",
  "selectItem",
  "restore",
  "archive",
  "done",
  "skipped",
] as const;

/** Current tutorial step (saved in `GameState`). */
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** Steps where the player has to do something. */
export type ActiveTutorialStep = "toTable" | "selectItem" | "restore" | "archive";

/** Id of the find that is used as the first training item. */
export const TUTORIAL_FIND_ID = "find-wrapper";

const NEXT: Record<ActiveTutorialStep, TutorialStep> = {
  toTable: "selectItem",
  selectItem: "restore",
  restore: "archive",
  archive: "done",
};

/**
 * Checks that a value read from a save is a valid tutorial step.
 * @param {unknown} v - Value to check.
 * @returns {boolean} `true` if `v` is a known step.
 */
export function isTutorialStep(v: unknown): v is TutorialStep {
  return typeof v === "string" && (TUTORIAL_STEPS as readonly string[]).includes(v);
}

/**
 * Tells whether the step waits for a player action.
 * @param {TutorialStep} step - Step to check.
 * @returns {boolean} `true` for toTable, selectItem, restore, archive.
 */
export function isActiveStep(step: TutorialStep): step is ActiveTutorialStep {
  return step in NEXT;
}

/**
 * Tells whether the tutorial is still going (not finished and not skipped).
 * @param {TutorialStep} step - Step to check.
 * @returns {boolean} `true` if the tutorial is in progress.
 */
export function isTutorialRunning(step: TutorialStep): boolean {
  return step === "intro" || isActiveStep(step);
}

/**
 * Returns the step that follows an active step.
 * @param {ActiveTutorialStep} step - Current step.
 * @returns {TutorialStep} Next step.
 */
export function nextStep(step: ActiveTutorialStep): TutorialStep {
  return NEXT[step];
}
