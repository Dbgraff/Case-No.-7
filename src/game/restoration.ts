import type { Clue, Task } from "./clues";
import { CLUE_TEMPLATES } from "../data/clues";
import type { Find, RestorationOutcome } from "./finds";
import { getState, updateState } from "../core/state";
import { openBoardCardsForClue } from "./board/openBoardCards";

/** What happened when a find was restored. */
export type RestorationResult = {
  /** The find, already with status "done". */
  find: Find;
  /** Clue opened by the restoration, or `null` if the find has none. */
  clue: Clue | null;
  /** Task opened by the clue, or `null`. */
  task: Task | null;
};

/**
 * Marks a find as restored and opens its clue (and task, if any).
 * Safe to call twice: a find that is already "done" is ignored.
 * @param {string} findId - Id of the restored find.
 * @returns {RestorationResult | null} Result, or `null` if the find is
 * unknown or has already been restored.
 */
export function completeRestoration(findId: string, outcome?: RestorationOutcome): RestorationResult | null {
  const s = getState();
  const found = s.finds.find((f) => f.id === findId);
  if (!found || found.status === "done") return null;

  const find: Find = { ...found, status: "done", ...(outcome ? { outcome } : {}) };
  const template = CLUE_TEMPLATES.find(
    (t) => t.findId === findId && !s.clues.some((c) => c.id === t.id),
  );
  
  const lost = outcome?.digitsLost ? template?.onLost : undefined;
  const clue: Clue | null = template
    ? {
        id: template.id,
        title: template.title,
        text: lost?.text ?? template.text,
        findId,
        day: s.day,
      }
    : null;
  const taskSource = lost?.task ?? template?.task;
  const task: Task | null =
    template && taskSource ? { ...taskSource, clueId: template.id, done: false } : null;

  updateState({
    finds: s.finds.map((f) => (f.id === findId ? find : f)),
    clues: clue ? [...s.clues, clue] : s.clues,
    tasks: task ? [...s.tasks, task] : s.tasks,
  });

  if (clue) {
    openBoardCardsForClue(clue.id);
  }

  return { find, clue, task };
}
