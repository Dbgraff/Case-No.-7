import { subscribe, type GameState } from "../../core/state";
import { completeTutorialStep, skipTutorial } from "../../game/tutorial";
import {
  isActiveStep,
  isTutorialRunning,
  type TutorialStep,
} from "../../game/tutorial/steps";
import {
  TUTORIAL_DONE_TEXT,
  TUTORIAL_HINTS,
  TUTORIAL_SKIPPED_TEXT,
} from "../../data/tutorial";
import { getActiveSpace, onSpaceChange } from "../spaces";
import { queueStoryMessage } from "../../game/story";
import { getActiveTab, onTabChange } from "./tabs";

/**
 * Wires the tutorial to the UI: shows the hint of the current step in the
 * chat (kind "sys"), counts steps from real player actions (space switch,
 * tab switch) and handles the "skip" button. Call it after the opening
 * chat messages, so the first hint comes after them.
 * @returns {void}
 */
export function bindTutorial(): void {
  const skipBtn = document.getElementById("btnSkipTutorial") as HTMLButtonElement;
  let shown: TutorialStep | null = null;

  /**
   * Counts the "open the archive" step if the player is on the archive tab.
   * @returns {void}
   */
  const checkArchive = (): void => {
    if (getActiveSpace() === "computer" && getActiveTab() === "archive") {
      completeTutorialStep("archive");
    }
  };

  onSpaceChange((space) => {
    if (space === "computer") completeTutorialStep("computer");
    if (space === "computer") { checkArchive(); checkIntegratedArchive(); }
  });
  onTabChange(checkArchive);

  // Integrated desktop uses "Каталог" instead of legacy tab navigation.
  const checkIntegratedArchive = (): void => {
    const archiveHost = document.querySelector<HTMLElement>(".id-archive-host");
    const browserWindow = document.querySelector<HTMLElement>(".window-browser");
    if (
      getActiveSpace() === "computer" &&
      archiveHost && !archiveHost.hidden &&
      browserWindow && !browserWindow.hidden
    ) {
      completeTutorialStep("archive");
    }
  };

  document.addEventListener("case7:browser-page", (event: Event) => {
    if ((event as CustomEvent<string>).detail === "archive" && getActiveSpace() === "computer") {
      completeTutorialStep("archive");
    }
  });
  onSpaceChange(checkIntegratedArchive);
  skipBtn.addEventListener("click", skipTutorial);

  /** @param {Readonly<GameState>} s - Current game state. */
  const render = (s: Readonly<GameState>): void => {
    const step = s.tutorialStep;
    skipBtn.hidden = !isTutorialRunning(step);
    if (step === shown) return;
    const prev = shown;
    shown = step;

    if (isActiveStep(step)) {
      queueStoryMessage("Система", TUTORIAL_HINTS[step], "sys", 550);
    } else if (step === "done" && prev !== null && isActiveStep(prev)) {
      queueStoryMessage("Система", TUTORIAL_DONE_TEXT, "sys", 550);
    } else if (step === "skipped" && prev !== null && isTutorialRunning(prev)) {
      queueStoryMessage("Система", TUTORIAL_SKIPPED_TEXT, "sys", 550);
    }
  };
  subscribe(render);
  if (getActiveSpace() === "computer") completeTutorialStep("computer");
}
