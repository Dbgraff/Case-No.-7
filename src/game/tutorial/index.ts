import { getState, updateState } from "../../core/state";
import {
  TUTORIAL_FIND_ID, isTutorialRunning, nextStep,
  type ActiveTutorialStep,
} from "./steps";

/** Start at the HQ desk with the folder already delivered from an earlier trip. */
export function startTutorial(): boolean {
  const s = getState();
  if (s.tutorialStep !== "intro") return false;
  updateState({ tutorialStep: "caseFolder" });
  return true;
}

export function completeTutorialStep(step: ActiveTutorialStep, findId?: string): void {
  if (findId !== undefined && findId !== TUTORIAL_FIND_ID) return;
  if (getState().tutorialStep !== step) return;
  updateState({ tutorialStep: nextStep(step) });
}

export function skipTutorial(): void {
  if (!isTutorialRunning(getState().tutorialStep)) return;
  updateState({ tutorialStep: "skipped" });
}
