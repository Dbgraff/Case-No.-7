import { BOARD_SLOTS, type BoardSlotId } from "../../game/board";
import { getState, subscribe, updateState, markDocRead, type GameState } from "../../core/state";
import { notify } from "./notifications";

let selectedCardId: string | null = null;
const usedCardIds = (s: Readonly<GameState>): Set<string> => new Set(Object.values(s.boardSlots).filter((id): id is string => id != null));

function placeOnSlot(slot: BoardSlotId, cardId: string): void {
  const s = getState();
  const next: GameState["boardSlots"] = { ...s.boardSlots };
  for (const key of Object.keys(next) as BoardSlotId[]) if (next[key] === cardId) next[key] = null;
  next[slot] = cardId; selectedCardId = null;
  updateState({ boardSlots: next });
}
function clearSlot(slot: BoardSlotId): void {
  updateState({ boardSlots: { ...getState().boardSlots, [slot]: null } });
}
function slotClass(card: { correct: boolean; slot: BoardSlotId } | null, slotId: BoardSlotId, drop: boolean): string {
  let cls = "case-slot";
  if (drop) cls += " drop-target";
  if (!card) return cls;
  if (card.correct && card.slot === slotId) cls += " ok";
  else cls += " conflict";
  return cls;
}
function renderSlots(s: Readonly<GameState>): void {
  const host = document.getElementById("caseSlots"); if (!host) return;
  host.replaceChildren();
  for (const slot of BOARD_SLOTS) {
    const cardId = s.boardSlots[slot.id];
    const card = cardId ? s.boardCards.find(c => c.id === cardId) ?? null : null;
    const el = document.createElement("div"); el.className = slotClass(card, slot.id, selectedCardId !== null);
    el.dataset.slot = slot.id;
    const label = document.createElement("div"); label.className = "case-slot-label"; label.textContent = slot.label;
    const body = document.createElement("div"); body.className = "case-slot-body";
    if (card) {
      const b = document.createElement("b"); b.textContent = card.title;
      const p = document.createElement("p"); p.textContent = card.text; body.append(b, p);
    } else { body.classList.add("muted"); body.textContent = selectedCardId ? "Нажмите, чтобы вставить карточку" : "Выберите или перетащите карточку справа"; }
    el.append(label, body);
    el.addEventListener("click", () => { if (selectedCardId) placeOnSlot(slot.id, selectedCardId); });
    el.addEventListener("dragover", e => { e.preventDefault(); el.classList.add("drag-over"); });
    el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
    el.addEventListener("drop", e => {
      e.preventDefault(); el.classList.remove("drag-over");
      const id = e.dataTransfer?.getData("text/card-id"); if (id) placeOnSlot(slot.id, id);
    });
    if (card) {
      const clear = document.createElement("button"); clear.type = "button";
      clear.className = "btn ghost case-slot-clear"; clear.textContent = "Убрать";
      clear.addEventListener("click", e => { e.stopPropagation(); clearSlot(slot.id); }); el.appendChild(clear);
    }
    host.appendChild(el);
  }
}
function renderCards(s: Readonly<GameState>): void {
  const host = document.getElementById("caseCards"); if (!host) return;
  host.replaceChildren(); const hint = document.getElementById("caseHint");
  if (hint) hint.textContent = selectedCardId ? "Карточка выбрана — выберите слот" : "Сверьте документы и распределите карточки по слотам";
  if (!s.boardCards.length) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "Карточки появятся после реставрации находок."; host.appendChild(p); return; }
  const used = usedCardIds(s);
  for (const card of s.boardCards) {
    const b = document.createElement("button"); b.type = "button";
    b.className = "case-card" + (used.has(card.id) ? " used" : "") + (selectedCardId === card.id ? " selected" : "");
    b.disabled = used.has(card.id); b.draggable = !used.has(card.id);
    b.addEventListener("dragstart", e => { e.dataTransfer?.setData("text/card-id", card.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"; selectedCardId = card.id; });
    b.addEventListener("dragend", () => render(getState()));
    const title = document.createElement("b"); title.textContent = card.title;
    const meta = document.createElement("span"); meta.className = "muted";
    meta.textContent = `слот: ${BOARD_SLOTS.find(x => x.id === card.slot)?.label ?? card.slot}`;
    const detail = document.createElement("p"); detail.textContent = card.text; b.append(title, meta, detail);
    b.addEventListener("click", () => { if (!used.has(card.id)) { selectedCardId = selectedCardId === card.id ? null : card.id; render(getState()); } });
    host.appendChild(b);
  }
}
function addLinks(box: HTMLElement): void {
  const links: [string, string][] = [
    ["Память народа", "https://pamyat-naroda.ru/"],
    ["ОБД Мемориал", "https://obd-memorial.ru/"]
  ];
  const p = document.createElement("p"); p.textContent = "История дела № 7 вымышленная. Вы можете исследовать реальные семейные истории в открытых базах:"; box.appendChild(p);
  for (const [name, url] of links) {
    const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = name; a.style.display = "block"; box.appendChild(a);
  }
}
function updateReport(s: Readonly<GameState>): void {
  const btn = document.getElementById("btnReport") as HTMLButtonElement | null;
  const msg = document.getElementById("caseReportMsg"); if (!btn || !msg) return;
  const complete = s.readDocs.includes("case-finished");
  btn.disabled = complete || s.day < 2 || BOARD_SLOTS.some(slot => !s.boardSlots[slot.id]);
  if (complete) {
    msg.replaceChildren();
    const h = document.createElement("strong"); h.textContent = "Дело № 7 · расследование завершено";
    const p = document.createElement("p"); p.textContent = "Иван Степанович Федотов, 1920 года рождения, пропал без вести в феврале 1942 года у Мясного Бора. Пионеры ошибочно приняли запись о смерти его однофамильца. Настоящая дальнейшая судьба Ивана не установлена.";
    msg.append(h, p); addLinks(msg); return;
  }
  btn.onclick = () => {
    const current = getState();
    const cards = BOARD_SLOTS.map(slot => ({ slot, card: current.boardCards.find(c => c.id === current.boardSlots[slot.id]) }));
    const wrong = cards.filter(x => !x.card?.correct || x.card.slot !== x.slot.id);
    if (wrong.length) {
      const repeatedError = cards.some(x => x.card?.id === "card-conclusion-wrong");
      msg.textContent = repeatedError ? "Командир: вы повторили ошибку «Искры». Сверьте отчества и номера полевой почты." : "Командир: в отчёте противоречие. Сопоставьте архивные записи заново.";
      notify("Командир", msg.textContent, "story"); return;
    }
    if (!current.readDocs.includes("answer-army") || !current.readDocs.includes("doc-hospital-list") || !current.readDocs.includes("doc-fedotov-card") || !current.readDocs.includes("doc-field-report")) {
      msg.textContent = "Командир: вывод выглядит убедительно, но нужны оба архивных ответа и донесение о пропаже."; return;
    }
    if (!current.readDocs.includes("answer-region")) {
      msg.textContent = "Галина: спасибо, что исправили ошибку. А где сегодня искать следы семьи? Проверьте современное название области через Книгу памяти.";
      notify("Галина Ремизова", msg.textContent, "story"); return;
    }
    markDocRead("case-finished");
    notify("Галина Ремизова", "Значит, Николай Петрович был прав про февраль. Спасибо, что не оставили этот вопрос без ответа.", "story");
    notify("Командир", "Отчёт принят. Дело № 7 исправлено. Иван Степанович числится пропавшим без вести; смерть в госпитале не подтверждена. Честь, готовность, умение.", "story");
  };
}
function render(s: Readonly<GameState>): void { renderSlots(s); renderCards(s); updateReport(s); }
export function bindCaseBoard(): void { selectedCardId = null; subscribe(render); }
