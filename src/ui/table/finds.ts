import {
  FIND_STATUS_LABELS,
  FIND_TYPE_LABELS,
  type Find,
} from "../../game/finds";
import { RESTORATIONS } from "../../data/finds";
import { PLACES } from "../../data/places";
import { subscribe, updateFindStatus, type GameState } from "../../core/state";
import { openRestoration } from "../restore/index";
import { finishRestoration } from "./restoreReport";
import { completeTutorialStep } from "../../game/tutorial";

/**
 * Returns a small stable tilt (in degrees) for a find, so that items lie on
 * the table slightly crooked but keep the same angle between renders.
 * @param {string} id - Find id.
 * @returns {number} Angle in degrees, from -2.5 to 2.4.
 */
function tilt(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 50) - 25) / 10;
}

/**
 * Creates a "label: value" row for the inspection panel.
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
 * Builds a physical item lying on the table.
 * @param {Find} f - Find to display.
 * @param {boolean} isSelected - Whether the item is currently being inspected.
 * @param {() => void} onClick - Called when the player clicks the item.
 * @returns {HTMLElement} Item element.
 */
function renderItem(f: Find, isSelected: boolean, onClick: () => void): HTMLElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = `desk-item type-${f.type}` + (isSelected ? " sel" : "");
  item.style.setProperty("--tilt", `${tilt(f.id)}deg`);

  const title = document.createElement("span");
  title.className = "desk-item-title";
  title.textContent = f.title;
  item.appendChild(title);

  const kind = document.createElement("span");
  kind.className = "desk-item-kind";
  kind.textContent = FIND_TYPE_LABELS[f.type];
  item.appendChild(kind);

  if (f.status === "new") {
    const mark = document.createElement("span");
    mark.className = "desk-new";
    mark.textContent = "новое";
    item.appendChild(mark);
  }

  item.addEventListener("click", onClick);
  return item;
}

/**
 * Fills the inspection panel with the selected find (with its origin) or
 * with a hint if nothing is selected.
 * @param {HTMLElement} host - Panel element.
 * @param {Find | undefined} f - Selected find.
 * @returns {void}
 */
function renderInspect(host: HTMLElement, f: Find | undefined): void {
  host.replaceChildren();
  if (!f) {
    const hint = document.createElement("p");
    hint.className = "muted";
    hint.textContent = "Выберите предмет на столе, чтобы осмотреть его.";
    host.appendChild(hint);
    return;
  }

  const title = document.createElement("h3");
  title.textContent = f.title;
  host.appendChild(title);

  const tag = document.createElement("div");
  tag.className = "find-tag";
  tag.textContent = `${FIND_TYPE_LABELS[f.type]} · ${FIND_STATUS_LABELS[f.status]}`;
  host.appendChild(tag);

  const desc = document.createElement("p");
  desc.textContent = f.description;
  host.appendChild(desc);

  const place = PLACES.find((p) => p.id === f.placeId)?.name ?? f.placeId;
  host.appendChild(metaRow("Кто нашёл: ", f.foundBy));
  host.appendChild(metaRow("Где: ", place));
  host.appendChild(metaRow("Когда: ", `день ${f.day}`));
  host.appendChild(metaRow("Обстоятельства: ", f.circumstances));

  const restoration = RESTORATIONS[f.id];
  if (!restoration) {
    const tools = document.createElement("div");
    tools.className = "desk-tools";
    tools.textContent = "Для этого предмета реставрация пока не подготовлена.";
    host.appendChild(tools);

    if (f.status === "done") {
      const done = document.createElement("p");
      done.className = "muted";
      done.textContent = "Реставрация завершена.";
      host.appendChild(done);
    } else if (import.meta.env.DEV) {
      // TEMP: stub until the real restoration mechanic calls finishRestoration()
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost";
      btn.textContent = "[dev] Завершить реставрацию";
      btn.addEventListener("click", () => finishRestoration(f.id));
      host.appendChild(btn);
    }

    return;
  }

  if (f.status === "done") {
    const result = document.createElement("div");
    result.className = "desk-result";
    const h = document.createElement("b");
    h.textContent = restoration.result.title;
    const t = document.createElement("p");
    t.textContent = f.outcome?.text ?? restoration.result.text;
    result.append(h, t);
    host.appendChild(result);
    return;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn";
  btn.textContent = f.status === "inProgress" ? "Продолжить реставрацию" : "Начать реставрацию";
  btn.addEventListener("click", () => {
    if (f.status === "new") updateFindStatus(f.id, "inProgress");
    openRestoration(f, restoration, (outcome) => finishRestoration(f.id, outcome));
  });
  host.appendChild(btn);
}

/**
 * Keeps the restoration table in sync with the game state: every find lies
 * on the table as a physical item; clicking an item opens its description
 * and origin below.
 * @returns {void}
 */
export function bindFinds(): void {
  const surface = document.getElementById("deskItems")!;
  const inspect = document.getElementById("deskInspect")!;
  let selectedId: string | null = null;
  let lastState: Readonly<GameState> | null = null;

  /**
   * Redraws the items and the inspection panel.
   * @returns {void}
   */
  const render = (): void => {
    if (!lastState) return;
    const finds = lastState.finds;
    surface.replaceChildren();

    if (finds.length === 0) {
      const empty = document.createElement("p");
      empty.className = "desk-empty";
      empty.textContent =
        "Стол пуст. Отправьте группу на выход и завершите день — находки появятся здесь.";
      surface.appendChild(empty);
    }

    for (const f of finds) {
      surface.appendChild(
        renderItem(f, f.id === selectedId, () => {
          selectedId = f.id;
          completeTutorialStep("selectItem", f.id);
          render();
        }),
      );
    }
    renderInspect(inspect, finds.find((f) => f.id === selectedId));
  };

  subscribe((s) => {
    lastState = s;
    render();
  });
}
