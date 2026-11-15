import {
  pinArchiveWord,
  subscribe,
  markDocRead,
  getState,
  type GameState,
} from "../../core/state";
import {
  archiveWordChips,
  getArchiveDoc,
  searchArchive,
} from "../../game/archive/archiveSearch";

let lastQuery = "";

function section(title: string): HTMLElement {
  const el = document.createElement("section");
  el.className = "archive-section";
  const h = document.createElement("h3");
  h.textContent = title;
  el.appendChild(h);
  return el;
}

function clueCard(title: string, text: string, meta: string): HTMLElement {
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

/** Wraps words in buttons so the player can pin them to quick-search. */
function fillClickableText(
  host: HTMLElement,
  text: string,
  onPin: (word: string) => void,
): void {
  host.replaceChildren();
  const parts = text.split(/([а-яА-ЯёЁa-zA-Z0-9]+)/);
  for (const part of parts) {
    if (/^[а-яА-ЯёЁa-zA-Z0-9]{3,}$/.test(part)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "arch-word";
      btn.textContent = part;
      btn.title = "Добавить в быстрый поиск";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        onPin(part);
      });
      host.appendChild(btn);
    } else {
      host.appendChild(document.createTextNode(part));
    }
  }
}

function normalizeHasTokens(q: string): boolean {
  return q.trim().length >= 3;
}

function openDoc(id: string, s: Readonly<GameState>): void {
  const d = getArchiveDoc(id);
  const box = document.getElementById("archDoc")!;
  box.replaceChildren();
  if (!d) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Документ не найден.";
    box.appendChild(empty);
    return;
  }
  markDocRead(id);

  const src = document.createElement("span");
  src.className = "arch-src";
  src.textContent = d.source;

  const h = document.createElement("h3");
  h.textContent = d.title;

  const body = document.createElement("div");
  body.className = "arch-text";
  fillClickableText(body, d.body, (word) => {
    pinArchiveWord(word);
    const input = document.getElementById("archQ") as HTMLInputElement;
    input.value = word;
    lastQuery = word;
    // не latest — его здесь нет; берём актуальный стейт
    renderHits(getState());
  });

  box.append(src, h, body);

  document.querySelectorAll(".hit").forEach((el) => {
    el.classList.toggle("on", (el as HTMLElement).dataset.id === id);
  });
}

function renderHits(s: Readonly<GameState>): void {
  const host = document.getElementById("archHits")!;
  host.replaceChildren();
  const read = new Set(s.readDocs);
  const hits = searchArchive(lastQuery, s, read);

  if (!normalizeHasTokens(lastQuery)) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Введите запрос или нажмите слово ниже.";
    host.appendChild(p);
    return;
  }
  if (!hits.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent =
      "В базе клуба ничего. Если это фамилия или номер — позже можно будет слать запрос во внешний архив.";
    host.appendChild(p);
    return;
  }
  for (const hit of hits) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hit" + (hit.read ? "" : " new");
    b.dataset.id = hit.id;
    const src = document.createElement("span");
    src.textContent = hit.source;
    b.append(src, document.createTextNode(hit.title));
    b.addEventListener("click", () => openDoc(hit.id, s));
    host.appendChild(b);
  }
}

function renderWords(s: Readonly<GameState>): void {
  const host = document.getElementById("archWords")!;
  host.replaceChildren();
  for (const w of archiveWordChips(s)) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = w;
    if (s.pinnedWords.includes(w)) b.classList.add("pinned");
    b.addEventListener("click", () => {
      const input = document.getElementById("archQ") as HTMLInputElement;
      input.value = w;
      lastQuery = w;
      renderHits(s);
    });
    host.appendChild(b);
  }
}

function renderClues(s: Readonly<GameState>): void {
  const host = document.getElementById("archClues")!;
  host.replaceChildren();

  const clues = section("Зацепки");
  if (!s.clues.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Зацепки появляются после реставрации находок.";
    clues.appendChild(p);
  }
  for (const c of s.clues) {
    const src = s.finds.find((f) => f.id === c.findId)?.title ?? c.findId;
    clues.appendChild(clueCard(c.title, c.text, `«${src}» · день ${c.day}`));
  }
  host.appendChild(clues);

  if (s.tasks.length) {
    const tasks = section("Задания");
    for (const t of s.tasks) {
      const clue = s.clues.find((c) => c.id === t.clueId)?.title ?? t.clueId;
      tasks.appendChild(
        clueCard(
          t.title,
          t.description,
          `${t.done ? "Выполнено" : "В работе"} · «${clue}»`,
        ),
      );
    }
    host.appendChild(tasks);
  }
}

/**
 * Archive tab: search, document viewer, chips, clues and tasks.
 * Подписка на стейт — только здесь, один раз.
 */
export function bindArchive(): void {
  const input = document.getElementById("archQ") as HTMLInputElement;
  const go = document.getElementById("archQGo")!;

  let latest: Readonly<GameState> | null = null;

  const runSearch = (): void => {
    lastQuery = input.value;
    if (latest) renderHits(latest);
  };

  go.addEventListener("click", runSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });

  subscribe((s) => {
    latest = s;
    renderWords(s);
    renderHits(s);
    renderClues(s);
  });
}
