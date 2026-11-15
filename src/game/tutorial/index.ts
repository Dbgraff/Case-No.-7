import { FIND_TEMPLATES } from "../../data/finds";
import type { Find } from "../finds";
import { getState, updateState } from "../../core/state";
import {
  TUTORIAL_FIND_ID,
  isTutorialRunning,
  nextStep,
  type ActiveTutorialStep,
} from "./steps";

/**
 * Starts the tutorial of a new game: puts the wrapper on the table
 * (day 1, no trip needed) and moves to the first step.
 * Does nothing if the tutorial has already started or was skipped.
 * @returns {boolean} `true` if the wrapper was delivered just now.
 */
export function startTutorial(): boolean {
  const s = getState();
  if (s.tutorialStep !== "intro") return false;

  const template = FIND_TEMPLATES.find((t) => t.id === TUTORIAL_FIND_ID);
  if (!template) {
    updateState({ tutorialStep: "skipped" });
    return false;
  }
  const has = s.finds.some((f) => f.id === TUTORIAL_FIND_ID);
  const find: Find = { ...template, day: s.day, status: "new" };
  updateState({
    finds: has ? s.finds : [...s.finds, find],
    tutorialStep: "toTable",
  });
  return !has;
}

/**
 * Counts a tutorial step as done. Works only if `step` is the current one,
 * so early or repeated actions change nothing.
 * @param {ActiveTutorialStep} step - Step the player has just completed.
 * @param {string} [findId] - Find the action was made with. If given, it must
 * be the training find, otherwise the call is ignored.
 * @returns {void}
 */
export function completeTutorialStep(step: ActiveTutorialStep, findId?: string): void {
  if (findId !== undefined && findId !== TUTORIAL_FIND_ID) return;
  if (getState().tutorialStep !== step) return;
  updateState({ tutorialStep: nextStep(step) });
}

/**
 * Skips the tutorial (for repeated playthroughs). Items already on the
 * table stay there.
 * @returns {void}
 */
export function skipTutorial(): void {
  if (!isTutorialRunning(getState().tutorialStep)) return;
  updateState({ tutorialStep: "skipped" });
}
