
import "./restorationDesk.css";
import { getDeskCamera } from "./deskCamera";

import {
  FIND_STATUS_LABELS,
  FIND_TYPE_LABELS,
  type Find,
} from "../../game/finds";
import { RESTORATIONS } from "../../data/finds";
import { PLACES } from "../../data/places";
import {
  subscribe,
  updateFindStatus,
  type GameState,
} from "../../core/state";
import { openRestoration } from "../restore/index";
import { finishRestoration } from "./restoreReport";
import { completeTutorialStep } from "../../game/tutorial";

function tilt(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return ((Math.abs(hash) % 50) - 25) / 10;
}

function metaRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "find-meta";

  const key = document.createElement("span");
  key.textContent = label;

  row.append(key, document.createTextNode(value));
  return row;
}

function renderItem(
  f: Find,
  selected: boolean,
  onClick: () => void,
): HTMLElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className =
    `desk-item type-${f.type}` + (selected ? " sel" : "");

  item.style.setProperty("--tilt", `${tilt(f.id)}deg`);
  item.setAttribute("aria-pressed", String(selected));

  const title = document.createElement("span");
  title.className = "desk-item-title";
  title.textContent = f.title;

  const kind = document.createElement("span");
  kind.className = "desk-item-kind";
  kind.textContent = FIND_TYPE_LABELS[f.type];

  item.append(title, kind);

  if (f.status === "new") {
    const mark = document.createElement("span");
    mark.className = "desk-new";
    mark.textContent = "Новое";
    item.appendChild(mark);
  }

  item.addEventListener("click", onClick);
  return item;
}

function renderInspect(
  host: HTMLElement,
  f: Find | undefined,
): void {
  host.replaceChildren();

  if (!f) {
    const hint = document.createElement("p");
    hint.className = "muted";
    hint.textContent =
      "Выберите предмет на коврике, чтобы осмотреть его.";
    host.appendChild(hint);
    return;
  }

  const title = document.createElement("h3");
  title.textContent = f.title;

  const tag = document.createElement("div");
  tag.className = "find-tag";
  tag.textContent =
    `${FIND_TYPE_LABELS[f.type]} · ${FIND_STATUS_LABELS[f.status]}`;

  const desc = document.createElement("p");
  desc.textContent = f.description;

  host.append(tag, title, desc);

  const place =
    PLACES.find((p) => p.id === f.placeId)?.name ?? f.placeId;

  host.append(
    metaRow("Кто нашёл: ", f.foundBy),
    metaRow("Где: ", place),
    metaRow("Когда: ", `день ${f.day}`),
    metaRow("Обстоятельства: ", f.circumstances),
  );

  const restoration = RESTORATIONS[f.id];

  if (!restoration) {
    const tools = document.createElement("div");
    tools.className = "desk-tools";
    tools.textContent =
      "Для этого предмета реставрация пока не подготовлена.";
    host.appendChild(tools);

    if (f.status === "done") {
      const done = document.createElement("p");
      done.textContent = "Реставрация завершена.";
      host.appendChild(done);
    } else if (import.meta.env.DEV) {
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

    const heading = document.createElement("b");
    heading.textContent = restoration.result.title;

    const text = document.createElement("p");
    text.textContent =
      f.outcome?.text ?? restoration.result.text;

    result.append(heading, text);
    host.appendChild(result);
    return;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn";

  btn.textContent =
    f.status === "inProgress"
      ? "Продолжить реставрацию"
      : "Начать реставрацию";

  btn.addEventListener("click", () => {
    if (f.status === "new") {
      updateFindStatus(f.id, "inProgress");
    }

    openRestoration(
      f,
      restoration,
      (outcome) => finishRestoration(f.id, outcome),
    );
  });

  host.appendChild(btn);
}

export function bindFinds(): void {
  const surface = document.getElementById("deskItems");
  const inspect = document.getElementById("deskInspect");

  if (!surface || !inspect) {
    console.error(
      "Не найдены элементы реставрационного стола",
    );
    return;
  }

  let selectedId: string | null = null;
  let lastState: Readonly<GameState> | null = null;

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
          const selectedNode = Array.from(
            surface.querySelectorAll<HTMLElement>(".desk-item")
          ).find(node => node.classList.contains("sel"));
          const camera = getDeskCamera();
          if (selectedNode && camera) {
            camera.open({
              target: selectedNode,
              title: f.title,
              // Move the live inspection panel into the overlay; keep handlers.
              content: inspect,
            });
          }
        }),
      );
    }

    renderInspect(
      inspect,
      finds.find((f) => f.id === selectedId),
    );
  };

  subscribe((state) => {
    lastState = state;
    render();
  });
}
