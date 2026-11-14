import { completeRestoration } from "../../game/restoration";
import { notify } from "../computer/notifications";

/**
 * Single entry point for "the item is restored": updates the game state and
 * reports the result in the chat. Call it from the restoration mechanic.
 * @param {string} findId - Id of the restored find.
 * @returns {void}
 */
export function finishRestoration(findId: string): void {
  const r = completeRestoration(findId);
  if (!r) return;

  if (r.clue) {
    notify(
      "Штаб",
      `Реставрация «${r.find.title}» завершена. Новая зацепка: «${r.clue.title}». Она в архиве.`,
      "story",
    );
  } else {
    notify("Система", `Реставрация «${r.find.title}» завершена. Новых зацепок нет.`, "sys");
  }
  if (r.task) notify("Система", `Новое задание: «${r.task.title}».`, "sys");
}
