import type { Find, InkBlank, InkRestoration, RestorationOutcome } from "../../game/finds";
import { getState } from "../../core/state";

/** Words already restored per find, so the player can close the window and come back. */
const solved = new Map<string, boolean[]>();

/**
 * Tells whether a word fits the surviving letters of a smeared word.
 * @param {string} pattern - Pattern with "_" for lost letters.
 * @param {string} word - Candidate word.
 * @returns {boolean} `true` if length and known letters match (ignoring case and ё/е).
 */
function fits(pattern: string, word: string): boolean {
  const norm = (s: string): string => s.toLowerCase().replace(/ё/g, "е");
  const a = norm(pattern);
  const b = norm(word);
  if (a.length !== b.length) return false;
  return [...a].every((ch, i) => ch === "_" || ch === b[i]);
}

/**
 * Checks a picked word.
 * @param {InkBlank} blank - Smeared word.
 * @param {string} word - Picked word.
 * @returns {{ ok: boolean; msg: string }} Verdict and a message for the player.
 */
function check(blank: InkBlank, word: string): { ok: boolean; msg: string } {
  if (!fits(blank.pattern, word)) {
    return { ok: false, msg: `«${word}» не совпадает с уцелевшими буквами.` };
  }
  const hasContext = !blank.needsClue || getState().clues.some((c) => c.id === blank.needsClue);
  if (!hasContext) {
    return {
      ok: false,
      msg:
        blank.needsHint ??
        "По буквам подходит, но по одному письму это не определить. Нужен контекст из других материалов.",
    };
  }
  if (word !== blank.answer) {
    return { ok: false, msg: `«${word}» подходит по буквам, но не по смыслу.` };
  }
  return { ok: true, msg: "" };
}

/**
 * Opens the ink restoration window for a find.
 * @param {Find} find - Find being restored.
 * @param {InkRestoration} restoration - Task description.
 * @param {(outcome: RestorationOutcome) => void} onDone - Called once when all words are restored.
 * @returns {void}
 */
export function openInkRestoration(
  find: Find,
  restoration: InkRestoration,
  onDone: (outcome: RestorationOutcome) => void,
): void {
  const state = solved.get(find.id) ?? restoration.blanks.map(() => false);
  solved.set(find.id, state);

  const overlay = document.createElement("div");
  overlay.className = "restore-overlay";
  const dialog = document.createElement("div");
  dialog.className = "restore-dialog ink-dialog";

  const title = document.createElement("h3");
  title.textContent = `Реставрация: ${find.title}`;
  const hint = document.createElement("p");
  hint.className = "muted";
  hint.textContent = "Чернила поплыли. Подберите слово по уцелевшим буквам и контексту.";

  const paper = document.createElement("div");
  paper.className = "ink-paper";
  const opts = document.createElement("div");
  opts.className = "ink-opts";
  const msg = document.createElement("p");
  msg.className = "cipher-msg muted";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn ghost";
  close.textContent = "Закрыть";
  const buttons = document.createElement("div");
  buttons.className = "map-actions";
  buttons.append(close);

  dialog.append(title, hint, paper, opts, msg, buttons);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const closeAll = (): void => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closeAll();
  };
  document.addEventListener("keydown", onKey);
  close.addEventListener("click", closeAll);

  /** Redraws the text and the option rows. */
  const render = (): void => {
    paper.replaceChildren();
    for (const part of restoration.parts) {
      if (typeof part === "string") {
        paper.append(document.createTextNode(part));
        continue;
      }
      const span = document.createElement("span");
      const blank = restoration.blanks[part];
      span.className = "ink-blank" + (state[part] ? " ok" : "");
      span.textContent = state[part] ? blank.answer : blank.pattern;
      paper.append(span);
    }

    opts.replaceChildren();
    restoration.blanks.forEach((blank, i) => {
      const row = document.createElement("div");
      row.className = "ink-row";
      const label = document.createElement("b");
      label.textContent = `${blank.pattern}:`;
      row.append(label);
            for (const word of blank.options) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = word;

        if (state[i]) {
          // слово уже восстановлено: строка остаётся, верный вариант подсвечен
          btn.disabled = true;
          if (word === blank.answer) btn.classList.add("chosen");
          row.append(btn);
          continue;
        }

        btn.addEventListener("click", () => {
          const res = check(blank, word);
          if (!res.ok) {
            btn.classList.add("miss");
            window.setTimeout(() => btn.classList.remove("miss"), 700);
            msg.textContent = res.msg;
            return;
          }
          state[i] = true;
          msg.textContent = "";
          render();
          if (state.every(Boolean)) {
            msg.textContent = "Письмо прочитано.";
            msg.classList.add("ok");
            close.textContent = "Готово";
            onDone({ text: restoration.result.text, digitsLost: false });
          }
        });
        row.append(btn);
      }
      opts.append(row);
    });
  };
  render();
}
