import { subscribe, type GameState } from "../../game/state";

/**
 * Creates a titled list section.
 * @param {string} title - Section heading.
 * @returns {HTMLElement} Empty section element.
 */
function section(title: string): HTMLElement {
  const el = document.createElement("section");
  el.className = "archive-section";
  const h = document.createElement("h3");
  h.textContent = title;
  el.appendChild(h);
  return el;
}

/**
 * Builds a card with a title, a text and a small meta line.
 * @param {string} title - Card title.
 * @param {string} text - Card text (plain text).
 * @param {string} meta - Meta line under the text.
 * @returns {HTMLElement} Card element.
 */
function card(title: string, text: string, meta: string): HTMLElement {
  const c = document.createElement("div");
  c.className = "clue-card";
  const h = document.createElement("b");
  h.textContent = title;
  const p = document.createElement("p");
  p.textContent = text;
  const m = document.createElement("span");
  m.className = "muted";
  m.textContent = meta;
  c.append(h, p, m);
  return c;
}

/**
 * Keeps the "Архив" tab in sync with the game state: shows opened clues
 * and the tasks they opened.
 * @returns {void}
 */
export function bindArchive(): void {
  const host = document.getElementById("archiveClues")!;

  /** @param {Readonly<GameState>} s - Current game state. */
  const render = (s: Readonly<GameState>): void => {
    host.replaceChildren();

    const clues = section("Открытые зацепки");
    if (s.clues.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Пока пусто. Зацепки открываются после реставрации находок.";
      clues.appendChild(empty);
    }
    for (const c of s.clues) {
      const src = s.finds.find((f) => f.id === c.findId)?.title ?? c.findId;
      clues.appendChild(card(c.title, c.text, `Источник: «${src}» · день ${c.day}`));
    }
    host.appendChild(clues);

    if (s.tasks.length > 0) {
      const tasks = section("Задания");
      for (const t of s.tasks) {
        const clue = s.clues.find((c) => c.id === t.clueId)?.title ?? t.clueId;
        tasks.appendChild(
          card(t.title, t.description, `${t.done ? "Выполнено" : "В работе"} · зацепка «${clue}»`),
        );
      }
      host.appendChild(tasks);
    }
  };

  subscribe(render);
}
