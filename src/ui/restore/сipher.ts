import type { CipherRestoration, Find, RestorationOutcome } from "../../game/finds";
import {
  caesarShift,
  decodePolybius,
  matchesPlaintext,
  polybiusTable,
  RU_ALPHABET,
} from "../../game/ciphers";

/**
 * Opens the cipher restoration window for a find.
 */
export function openCipherRestoration(
  find: Find,
  restoration: CipherRestoration,
  onDone: (outcome: RestorationOutcome) => void,
): void {
  const overlay = document.createElement("div");
  overlay.className = "restore-overlay";

  const dialog = document.createElement("div");
  dialog.className = "restore-dialog cipher-dialog";

  const title = document.createElement("h3");
  title.textContent = restoration.label ?? `Шифр: ${find.title}`;

  const hint = document.createElement("p");
  hint.className = "muted";
  hint.textContent = restoration.hint ?? defaultHint(restoration.method);

  const cipherBox = document.createElement("div");
  cipherBox.className = "cipher-code";
  cipherBox.textContent = restoration.ciphertext;

  const body = document.createElement("div");
  body.className = "cipher-body";

  const msg = document.createElement("p");
  msg.className = "cipher-msg muted";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn ghost";
  close.textContent = "Закрыть";

  const buttons = document.createElement("div");
  buttons.className = "map-actions";
  buttons.append(close);

  dialog.append(title, hint, cipherBox, body, msg, buttons);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  let finished = false;

  const closeAll = (): void => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closeAll();
  };
  document.addEventListener("keydown", onKey);
  close.addEventListener("click", closeAll);

  const succeed = (decoded: string): void => {
    if (finished) return;
    finished = true;
    msg.textContent = `Расшифровано: «${decoded}».`;
    msg.classList.add("ok");
    close.textContent = "Готово";
    body.querySelectorAll("input, button").forEach((el) => {
      (el as HTMLInputElement).disabled = true;
    });
    onDone({
      text: restoration.result.text || decoded,
      digitsLost: false,
    });
  };

  if (restoration.method === "polybius") {
    mountPolybius(body, msg, restoration, succeed);
  } else if (restoration.method === "caesar") {
    mountCaesar(body, msg, restoration, succeed);
  } else {
    mountAnswer(body, msg, restoration, succeed);
  }
}

function defaultHint(method: CipherRestoration["method"]): string {
  if (method === "polybius") {
    return "Каждая пара цифр — строка и столбец таблицы. Таблица начинается с ключа, дальше алфавит без повторов.";
  }
  if (method === "caesar") {
    return "Буквы сдвинуты на одно и то же число позиций по алфавиту. Подберите сдвиг.";
  }
  return "Введите расшифрованный текст. Способ кодирования можно искать во внешнем интернете.";
}

function normalizeKey(s: string): string {
  return s
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/[^А-Я]/g, "");
}

function mountPolybius(
  host: HTMLElement,
  msg: HTMLElement,
  restoration: CipherRestoration,
  onSuccess: (decoded: string) => void,
): void {
  const keyRow = document.createElement("div");
  keyRow.className = "cipher-keyrow";
  const keyLabel = document.createElement("span");
  keyLabel.className = "label";
  keyLabel.textContent = "Ключ";
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className = "cipher-key";
  keyInput.placeholder = "Ключ таблицы";
  keyInput.autocomplete = "off";
  keyInput.spellcheck = false;
  keyRow.append(keyLabel, keyInput);

  const table = document.createElement("table");
  table.className = "cipher-poly";

  const decoded = document.createElement("div");
  decoded.className = "cipher-decoded";
  decoded.textContent = "…";

  host.append(keyRow, table, decoded);

  const render = (): void => {
    const key = keyInput.value;
    const t = polybiusTable(key);
    table.replaceChildren();

    const hr = document.createElement("tr");
    hr.appendChild(document.createElement("th"));
    for (let c = 1; c <= 6; c++) {
      const th = document.createElement("th");
      th.textContent = String(c);
      hr.appendChild(th);
    }
    table.appendChild(hr);

    for (let r = 0; r < 6; r++) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = String(r + 1);
      tr.appendChild(th);
      for (let c = 0; c < 6; c++) {
        const td = document.createElement("td");
        const ch = t[r * 6 + c] ?? "";
        td.textContent = ch === "_" ? "␣" : ch;
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    if (!key.trim()) {
      decoded.textContent = "…";
      decoded.classList.remove("ok");
      msg.textContent = "";
      return;
    }

    const text = decodePolybius(restoration.ciphertext, key);
    decoded.textContent = text;

    const plainOk = matchesPlaintext(text, restoration.plaintext);
    const keyOk =
    !restoration.key ||
    normalizeKey(key) === normalizeKey(restoration.key);

    if (plainOk && keyOk) {
        decoded.classList.add("ok");
        onSuccess(text);
    } else {
        decoded.classList.remove("ok");
        if (plainOk && !keyOk) {
            msg.textContent =
            "Текст уже читается, но ключ неполный. Допишите: «всегда готов».";
        } else {
            msg.textContent = "Таблица перестроилась, но текст пока бессмысленный.";
        }
    }
  };

  keyInput.addEventListener("input", render);
  render();
  keyInput.focus();
}

function mountCaesar(
  host: HTMLElement,
  msg: HTMLElement,
  restoration: CipherRestoration,
  onSuccess: (decoded: string) => void,
): void {
  const row = document.createElement("div");
  row.className = "cipher-keyrow";
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "Сдвиг";
  const range = document.createElement("input");
  range.type = "range";
  range.min = "0";
  range.max = String(RU_ALPHABET.length - 1);
  range.step = "1";
  range.value = "0";
  const out = document.createElement("span");
  out.className = "muted";
  out.textContent = "0";
  row.append(label, range, out);

  const decoded = document.createElement("div");
  decoded.className = "cipher-decoded";

  host.append(row, decoded);

  const render = (): void => {
    const shift = Number(range.value);
    out.textContent = String(shift);
    const text = caesarShift(restoration.ciphertext, -shift);
    decoded.textContent = text;
    if (matchesPlaintext(text, restoration.plaintext)) {
      decoded.classList.add("ok");
      onSuccess(text);
    } else {
      decoded.classList.remove("ok");
      msg.textContent =
        shift === 0 ? "Подберите сдвиг ползунком." : "Пока не похоже на осмысленный текст.";
    }
  };

  range.addEventListener("input", render);
  render();
}

function mountAnswer(
  host: HTMLElement,
  msg: HTMLElement,
  restoration: CipherRestoration,
  onSuccess: (decoded: string) => void,
): void {
  const row = document.createElement("div");
  row.className = "cipher-keyrow";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "cipher-key";
  input.placeholder = "Расшифрованный текст";
  input.autocomplete = "off";
  input.spellcheck = false;
  const check = document.createElement("button");
  check.type = "button";
  check.className = "btn";
  check.textContent = "Проверить";
  row.append(input, check);
  host.append(row);

  const tryAnswer = (): void => {
    const value = input.value.trim();
    if (!value) {
      msg.textContent = "Введите ответ.";
      return;
    }
    if (matchesPlaintext(value, restoration.plaintext)) {
      onSuccess(value.toUpperCase().replace(/Ё/g, "Е"));
    } else {
      msg.textContent = "Не сходится. Проверьте способ кодирования и попробуйте ещё раз.";
    }
  };

  check.addEventListener("click", tryAnswer);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryAnswer();
  });
  input.focus();
}
