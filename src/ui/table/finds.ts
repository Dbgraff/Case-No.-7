
import "./restorationDesk.css";
import "./findInspection.css";
import { getDeskCamera, showDeskPreview } from "./deskCamera";

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

  item.dataset.findId = f.id;
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

function renderPreview(host: HTMLElement, find: Find): void {
  const restoration = RESTORATIONS[find.id];
  const result = find.status === "done" ? restoration?.result : undefined;

  const label = document.createElement("span");
  label.className = "prologue-paper-label";
  label.textContent = FIND_TYPE_LABELS[find.type];

  const rule = document.createElement("span");
  rule.className = "prologue-paper-rule";
  rule.setAttribute("aria-hidden", "true");

  const title = document.createElement("h3");
  title.className = "prologue-paper-title";
  title.textContent = result?.title ?? find.title;

  const text = document.createElement("p");
  text.className = "prologue-paper-body";
  text.textContent = result ? find.outcome?.text ?? result.text : find.description;

  host.dataset.findType = find.type;
  host.setAttribute("aria-label", title.textContent);
  host.replaceChildren(label, rule, title, text);

  if (find.type === "tape") {
    const cassette = document.createElement("div");
    cassette.className = "desk-find-cassette";
    cassette.setAttribute("aria-hidden", "true");
    text.before(cassette);
  }
}

function renderInspect(
  host: HTMLElement,
  f: Find | undefined,
): void {
  host.replaceChildren();

  if (!f) return;

  const tag = document.createElement("div");
  tag.className = "find-tag";
  tag.textContent = FIND_STATUS_LABELS[f.status];
  host.append(tag);

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

  if (f.status === "done") return;

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
  const desk = document.getElementById("spaceTable");
  const surface = document.getElementById("deskItems");
  const inspect = document.getElementById("deskInspect");

  if (!desk || !surface || !inspect) {
    console.error("Не найдены элементы реставрационного стола");
    return;
  }

  let selectedId: string | null = null;
  let lastState: Readonly<GameState> | null = null;
  let preview: HTMLElement | null = null;

  function openFind(findId: string): void {
    const camera = getDeskCamera();
    if (!camera) return;

    preview?.remove();
    preview = null;
    selectedId = findId;
    completeTutorialStep("selectItem", findId);
    render();

    const target = surface!.querySelector<HTMLElement>(".desk-item.sel");
    const find = lastState?.finds.find(item => item.id === findId);
    if (!target || !find) return;

    preview = document.createElement("article");
    preview.className = "desk-find-preview prologue-reading-paper";
    renderPreview(preview, find);
    showDeskPreview(desk!, target, preview);

    camera.open({
      target,
      title: find.title,
      content: inspect!,
      onClose: () => {
        preview?.remove();
        preview = null;
        selectedId = null;
        render();
        Array.from(surface!.querySelectorAll<HTMLButtonElement>("[data-find-id]"))
          .find(button => button.dataset.findId === findId)?.focus({ preventScroll: true });
      },
    });
  }

  function render(): void {
    if (!lastState) return;

    const finds = lastState.finds;
    const selected = finds.find(find => find.id === selectedId);
    if (preview && !selected) {
      getDeskCamera()?.close();
      return;
    }

    surface!.replaceChildren();

    if (finds.length === 0) {
      const empty = document.createElement("p");
      empty.className = "desk-empty";
      empty.textContent =
        "Стол пуст. Отправьте группу на выход и завершите день — находки появятся здесь.";
      surface!.appendChild(empty);
    }

    for (const find of finds) {
      surface!.appendChild(renderItem(find, find.id === selectedId, () => openFind(find.id)));
    }

    renderInspect(inspect!, selected);
    if (preview && selected) renderPreview(preview, selected);
  }

  subscribe((state) => {
    lastState = state;
    render();
  });
}