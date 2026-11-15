import { pinArchiveWord, subscribe, markDocRead, getState, type GameState } from "../../core/state";
import { archiveWordChips, getArchiveDoc, searchArchive } from "../../game/archive/search";
import { notify } from "./notifications";

let lastQuery = "";
const normalize = (v: string): string => v.toLowerCase().replace(/ё/g, "е").replace(/[\s.\-–—]+/g, " ").trim();

function section(title: string): HTMLElement {
  const el = document.createElement("section"); el.className = "archive-section";
  const h = document.createElement("h3"); h.textContent = title; el.appendChild(h); return el;
}
function clueCard(title: string, text: string, meta: string): HTMLElement {
  const c = document.createElement("div"); c.className = "clue-card";
  const h = document.createElement("b"); h.textContent = title;
  const p = document.createElement("p"); p.textContent = text;
  const m = document.createElement("span"); m.className = "muted"; m.textContent = meta;
  c.append(h, p, m); return c;
}
function fillClickableText(host: HTMLElement, text: string, onPin: (word: string) => void): void {
  host.replaceChildren();
  for (const part of text.split(/([а-яА-ЯёЁa-zA-Z0-9]+)/)) {
    if (/^[а-яА-ЯёЁa-zA-Z0-9]{3,}$/.test(part)) {
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "arch-word";
      btn.textContent = part; btn.title = "Добавить в быстрый поиск";
      btn.addEventListener("click", e => { e.preventDefault(); onPin(part); }); host.appendChild(btn);
    } else host.appendChild(document.createTextNode(part));
  }
}

function addExternalSearch(box: HTMLElement): void {
  const p = document.createElement("p"); p.className = "muted";
  p.textContent = "Необходимые исторические сведения найдите самостоятельно в интернете.";
  const a = document.createElement("a"); a.href = "https://www.google.com/"; a.target = "_blank";
  a.rel = "noopener noreferrer"; a.textContent = "Открыть поисковик (без готового запроса)";
  box.append(p, a);
}

function addAnswerForm(box: HTMLElement, id: "doc-archive-request" | "doc-memory-book"): void {
  const isArmy = id === "doc-archive-request";
  const stateKey = isArmy ? "answer-army" : "answer-region";
  if (getState().readDocs.includes(stateKey)) {
    const p = document.createElement("p"); p.textContent = "Данные проверены. Результат сохранён в деле."; box.appendChild(p); return;
  }
  const form = document.createElement("form"); form.className = "qrow";
  const input = document.createElement("input"); input.type = "text";
  input.autocomplete = "off"; input.placeholder = isArmy ? "Армия..." : "Современная область...";
  input.setAttribute("aria-label", isArmy ? "Армия" : "Современная область");
  const btn = document.createElement("button"); btn.type = "submit"; btn.className = "btn"; btn.textContent = "Отправить запрос";
  const result = document.createElement("p"); result.className = "muted";
  form.append(input, btn); box.append(form, result); addExternalSearch(box);
  form.addEventListener("submit", e => {
    e.preventDefault();
    const val = normalize(input.value);
    const ok = isArmy
      ? /^(2|2 я|2 ая|вторая|второй)\s*(ударная|ударной)(?:\s*армия|\s*армии)?$/.test(val)
      : /^(тверь|тверская|тверская область|тверской области)$/.test(val);
    if (!ok) {
      result.textContent = isArmy ? "Архив: проверьте название армии по месту боёв у Мясного Бора." : "Книга памяти: регион не найден. Сверьте современное название области.";
      return;
    }
    markDocRead(stateKey);
    result.textContent = isArmy ? "Запрос принят. Ответы по двум однофамильцам доступны по поиску «Федотов»." : "Поиск по Тверской области выполнен. Можно подготовить итоговый отчёт.";
    btn.disabled = true;
    input.disabled = true;
    notify("Система", result.textContent, "story");
  });
}

function openDoc(id: string): void {
  const d = getArchiveDoc(id);
  const box = document.getElementById("archDoc"); if (!box) return;
  box.replaceChildren();
  if (!d) { box.textContent = "Документ не найден."; return; }
  markDocRead(id);
  const src = document.createElement("span"); src.className = "arch-src"; src.textContent = d.source;
  const h = document.createElement("h3"); h.textContent = d.title;
  const body = document.createElement("div"); body.className = "arch-text";
  body.style.whiteSpace = "pre-wrap";
  fillClickableText(body, d.body, word => {
    pinArchiveWord(word);
    const input = document.getElementById("archQ") as HTMLInputElement;
    input.value = word; lastQuery = word; renderHits(getState());
  });
  box.append(src, h, body);
  if (id === "doc-archive-request" || id === "doc-memory-book") addAnswerForm(box, id);
  if (id === "doc-front-paper" || id === "doc-rocket-ref") {
    // Эти документы содержат дополнительные контекстные сведения, но не готовый ответ на форму.
  }
  document.querySelectorAll(".hit").forEach(el => {
    el.classList.toggle("on", (el as HTMLElement).dataset.id === id);
  });
}

function renderHits(s: Readonly<GameState>): void {
  const host = document.getElementById("archHits"); if (!host) return;
  host.replaceChildren();
  const hits = searchArchive(lastQuery, s, new Set(s.readDocs));
  if (lastQuery.trim().length < 3) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "Введите запрос или выберите слово из быстрого поиска."; host.appendChild(p); return; }
  if (!hits.length) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "В доступной части архива совпадений нет. Некоторые документы приходят только на второй день или после отправки запроса."; host.appendChild(p); return; }
  for (const hit of hits) {
    const b = document.createElement("button"); b.type = "button";
    b.className = "hit" + (hit.read ? "" : " new"); b.dataset.id = hit.id;
    const src = document.createElement("span"); src.textContent = hit.source;
    b.append(src, document.createTextNode(hit.title)); b.addEventListener("click", () => openDoc(hit.id)); host.appendChild(b);
  }
}
function renderWords(s: Readonly<GameState>): void {
  const host = document.getElementById("archWords"); if (!host) return;
  host.replaceChildren();
  for (const w of archiveWordChips(s)) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = w;
    if (s.pinnedWords.includes(w)) b.classList.add("pinned");
    b.addEventListener("click", () => {
      const input = document.getElementById("archQ") as HTMLInputElement;
      input.value = w; lastQuery = w; renderHits(getState());
    }); host.appendChild(b);
  }
}
function renderClues(s: Readonly<GameState>): void {
  const host = document.getElementById("archClues"); if (!host) return;
  host.replaceChildren(); const clues = section("Зацепки");
  if (!s.clues.length) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "Зацепки появятся после реставрации находок."; clues.appendChild(p); }
  for (const c of s.clues) {
    const source = s.finds.find(f => f.id === c.findId)?.title ?? c.findId;
    clues.appendChild(clueCard(c.title, c.text, `«${source}» · день ${c.day}`));
  }
  host.appendChild(clues);
  if (s.tasks.length) {
    const tasks = section("Задания");
    for (const t of s.tasks) tasks.appendChild(clueCard(t.title, t.description, t.done ? "Выполнено" : "В работе"));
    host.appendChild(tasks);
  }
}
export function bindArchive(): void {
  const input = document.getElementById("archQ") as HTMLInputElement;
  const go = document.getElementById("archQGo");
  const run = (): void => { lastQuery = input.value; renderHits(getState()); };
  go?.addEventListener("click", run);
  input.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
  subscribe(s => { renderWords(s); renderHits(s); renderClues(s); });
}
