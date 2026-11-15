import { BOARD_SLOTS, type BoardSlotId } from "../../game/board";
import {
  getState,
  subscribe,
  updateState,
  type GameState,
} from "../../core/state";
import { notify } from "./notifications";

/** Выбранная карточка: клик по карточке → клик по слоту. */
let selectedCardId: string | null = null;

function usedCardIds(s: Readonly<GameState>): Set<string> {
  return new Set(
    Object.values(s.boardSlots).filter((id): id is string => id != null),
  );
}

function placeOnSlot(slot: BoardSlotId, cardId: string): void {
  const s = getState();
  const next: GameState["boardSlots"] = { ...s.boardSlots };
  // снять карточку со старого слота
  for (const key of Object.keys(next) as BoardSlotId[]) {
    if (next[key] === cardId) next[key] = null;
  }
  next[slot] = cardId;
  selectedCardId = null;
  updateState({ boardSlots: next });
}

function clearSlot(slot: BoardSlotId): void {
  const s = getState();
  updateState({
    boardSlots: { ...s.boardSlots, [slot]: null },
  });
}

function slotClass(
  card: { correct: boolean; slot: BoardSlotId } | null,
  slotId: BoardSlotId,
  dropTarget: boolean,
): string {
  let cls = "case-slot";
  if (dropTarget) cls += " drop-target";
  if (!card) return cls;
  if (card.correct && card.slot === slotId) cls += " ok";
  else if (!card.correct) cls += " conflict";
  return cls;
}

function renderSlots(s: Readonly<GameState>): void {
  const host = document.getElementById("caseSlots")!;
  host.replaceChildren();

  for (const slot of BOARD_SLOTS) {
    const cardId = s.boardSlots[slot.id];
    const card = cardId ? s.boardCards.find((c) => c.id === cardId) ?? null : null;

    const el = document.createElement("div");
    el.className = slotClass(card, slot.id, selectedCardId != null);
    el.dataset.slot = slot.id;

    const label = document.createElement("div");
    label.className = "case-slot-label";
    label.textContent = slot.label;

    const body = document.createElement("div");
    body.className = "case-slot-body";
    if (card) {
      const t = document.createElement("b");
      t.textContent = card.title;
      const p = document.createElement("p");
      p.textContent = card.text;
      body.append(t, p);
    } else {
      body.classList.add("muted");
      body.textContent = selectedCardId
        ? "Нажмите, чтобы вставить карточку"
        : "Перетащите карточку сюда или выберите карточку справа";
    }

    el.append(label, body);

    // клик по слоту: если карточка выбрана — вставить
    el.addEventListener("click", () => {
      if (selectedCardId) {
        placeOnSlot(slot.id, selectedCardId);
      }
    });

    // drag-and-drop
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      el.classList.add("drag-over");
    });
    el.addEventListener("dragleave", () => {
      el.classList.remove("drag-over");
    });
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      el.classList.remove("drag-over");
      const id = e.dataTransfer?.getData("text/card-id");
      if (id) placeOnSlot(slot.id, id);
    });

    if (card) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "btn ghost case-slot-clear";
      clear.textContent = "Убрать";
      clear.addEventListener("click", (e) => {
        e.stopPropagation();
        clearSlot(slot.id);
      });
      el.appendChild(clear);
    }

    host.appendChild(el);
  }
}

function renderCards(s: Readonly<GameState>): void {
  const host = document.getElementById("caseCards")!;
  host.replaceChildren();

  const hint = document.getElementById("caseHint");
  if (hint) {
    hint.textContent = selectedCardId
      ? "Карточка выбрана — нажмите на слот слева (или перетащите)."
      : "Выберите карточку, затем слот — или перетащите карточку на слот.";
  }

  if (!s.boardCards.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Пока нет карточек. Они появятся после реставрации находок.";
    host.appendChild(p);
    return;
  }

  const used = usedCardIds(s);

  for (const card of s.boardCards) {
    const b = document.createElement("button");
    b.type = "button";
    b.className =
      "case-card" +
      (used.has(card.id) ? " used" : "") +
      (selectedCardId === card.id ? " selected" : "");
    b.disabled = used.has(card.id);

    // drag
    b.draggable = !used.has(card.id);
    b.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("text/card-id", card.id);
      e.dataTransfer!.effectAllowed = "move";
      selectedCardId = card.id;
      b.classList.add("dragging");
    });
    b.addEventListener("dragend", () => {
      b.classList.remove("dragging");
      // selected сбросится при drop; если бросили мимо — оставим selected для клика
      render(getState());
    });

    const title = document.createElement("b");
    title.textContent = card.title;
    const meta = document.createElement("span");
    meta.className = "muted";
    meta.textContent = `подсказка: ${BOARD_SLOTS.find((x) => x.id === card.slot)?.label ?? card.slot}`;
    const text = document.createElement("p");
    text.textContent = card.text;
    b.append(title, meta, text);

    // клик: выбрать карточку (вторым шагом — клик по слоту)
    b.addEventListener("click", () => {
      if (used.has(card.id)) return;
      selectedCardId = selectedCardId === card.id ? null : card.id;
      render(getState());
    });

    host.appendChild(b);
  }
}

function updateReport(s: Readonly<GameState>): void {
  const btn = document.getElementById("btnReport") as HTMLButtonElement;
  const msg = document.getElementById("caseReportMsg")!;

  const filled = BOARD_SLOTS.filter((slot) => s.boardSlots[slot.id] != null).length;
  btn.disabled = filled < 1;

  btn.onclick = () => {
    const lines: string[] = [];
    let wrong = 0;
    for (const slot of BOARD_SLOTS) {
      const id = s.boardSlots[slot.id];
      if (!id) continue;
      const card = s.boardCards.find((c) => c.id === id);
      if (!card) continue;
      lines.push(`${slot.label}: ${card.title}`);
      // спорно, если карточка заведомо ложная ИЛИ не для этого слота
      if (!card.correct || card.slot !== slot.id) wrong++;
    }

    if (wrong > 0) {
      msg.textContent = "Командир: в отчёте есть спорные пункты. Перепроверьте доску.";
      notify("Командир", "В донесении есть противоречия. Перепроверьте доску «Дело».", "sys");
    } else {
      msg.textContent = "Командир: принял. Продолжайте сбор улик.";
      notify("Командир", `Принял донесение. ${lines.join("; ")}.`, "sys");
    }
  };
}

function render(s: Readonly<GameState>): void {
  renderSlots(s);
  renderCards(s);
  updateReport(s);
}

export function bindCaseBoard(): void {
  selectedCardId = null;
  subscribe(render);
}
