import type { Clue, Task } from "./clues";
import { CLUE_TEMPLATES } from "../data/clues";
import type { Find } from "./finds";
import { getState, updateState } from "./state";

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
export function completeRestoration(findId: string): RestorationResult | null {
  const s = getState();
  const found = s.finds.find((f) => f.id === findId);
  if (!found || found.status === "done") return null;

  const find: Find = { ...found, status: "done" };
  const template = CLUE_TEMPLATES.find(
    (t) => t.findId === findId && !s.clues.some((c) => c.id === t.id),
  );
  const clue: Clue | null = template
    ? {
        id: template.id,
        title: template.title,
        text: template.text,
        findId,
        day: s.day,
      }
    : null;
  const task: Task | null =
    template?.task ? { ...template.task, clueId: template.id, done: false } : null;

  updateState({
    finds: s.finds.map((f) => (f.id === findId ? find : f)),
    clues: clue ? [...s.clues, clue] : s.clues,
    tasks: task ? [...s.tasks, task] : s.tasks,
  });
  return { find, clue, task };
}
