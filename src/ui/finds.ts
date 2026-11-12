import {
  FIND_STATUS_LABELS,
  FIND_TYPE_LABELS,
  type Find,
} from "../finds";
import { PLACES } from "../map/places";
import { subscribe, type GameState } from "../state";

/**
 * Creates a "label: value" row for a find card.
 * @param {string} label - Row label.
 * @param {string} value - Row value (plain text).
 * @returns {HTMLElement} Row element.
 */
function metaRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "find-meta";
  const l = document.createElement("span");
  l.textContent = label;
  row.appendChild(l);
  row.appendChild(document.createTextNode(value));
  return row;
}

/**
 * Builds the card of one find, including its origin.
 * @param {Find} f - Find to display.
 * @returns {HTMLElement} Card element.
 */
function renderCard(f: Find): HTMLElement {
  const card = document.createElement("article");
  card.className = "find-card";

  const head = document.createElement("div");
  head.className = "find-head";
  const title = document.createElement("h3");
  title.textContent = f.title;
  const tag = document.createElement("span");
  tag.className = "find-tag";
  tag.textContent = `${FIND_TYPE_LABELS[f.type]} · ${FIND_STATUS_LABELS[f.status]}`;
  head.appendChild(title);
  head.appendChild(tag);
  card.appendChild(head);

  const desc = document.createElement("p");
  desc.textContent = f.description;
  card.appendChild(desc);

  const place = PLACES.find((p) => p.id === f.placeId)?.name ?? f.placeId;
  card.appendChild(metaRow("Кто нашёл: ", f.foundBy));
  card.appendChild(metaRow("Где: ", place));
  card.appendChild(metaRow("Когда: ", `день ${f.day}`));
  card.appendChild(metaRow("Обстоятельства: ", f.circumstances));
  return card;
}

/**
 * Keeps the "Находки" tab in sync with the game state: shows an empty-state
 * message or the list of find cards (newest first).
 * @returns {void}
 */
export function bindFinds(): void {
  const host = document.getElementById("findsList")!;
  let renderedCount = -1;

  /** @param {GameState} s - Current game state. */
  const render = (s: Readonly<GameState>): void => {
    if (s.finds.length === renderedCount) return;
    renderedCount = s.finds.length;
    host.replaceChildren();

    if (s.finds.length === 0) {
      const empty = document.createElement("div");
      empty.className = "placeholder";
      const h = document.createElement("h2");
      h.textContent = "Находки";
      const p = document.createElement("p");
      p.textContent =
        "Пока пусто. Отправьте группу на выход и завершите день — находки появятся здесь.";
      empty.appendChild(h);
      empty.appendChild(p);
      host.appendChild(empty);
      return;
    }

    for (const f of [...s.finds].reverse()) host.appendChild(renderCard(f));
  };

  subscribe(render);
}
