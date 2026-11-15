/**
 * Cipher helpers used by the restoration UI and by content data.
 * Russian alphabet without ё = 32 letters; ё is folded into е.
 */

/** Russian alphabet without ё (32 letters). */
export const RU_ALPHABET = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";

/**
 * Fill for the 6×6 Polybius square: 32 letters + 4 fill = 36 cells.
 * "_" means space in messages — must stay inside the table.
 */
export const POLYBIUS_FILL = ["_", ".", ",", "-"];

/** Normalize for comparison: upper case, ё→е, only letters/digits. */
export function normalizePlain(s: string): string {
  return s
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/[^А-ЯA-Z0-9]/g, "");
}

/**
 * 6×6 Polybius table (exactly 36 cells):
 * unique key letters → rest of alphabet → fill ("_" first).
 */
export function polybiusTable(key: string): string[] {
  const raw = (key || "").toUpperCase().replace(/Ё/g, "Е").replace(/[^А-Я]/g, "");
  const out: string[] = [];
  for (const c of raw + RU_ALPHABET) {
    if (RU_ALPHABET.includes(c) && !out.includes(c)) out.push(c);
  }
  for (const f of POLYBIUS_FILL) {
    if (out.length >= 36) break;
    if (!out.includes(f)) out.push(f);
  }
  return out.slice(0, 36);
}

/** Encode plaintext; spaces become "_". */
export function encodePolybius(plaintext: string, key: string): string {
  const table = polybiusTable(key);
  return plaintext
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .split("")
    .map((c) => {
      const ch = c === " " ? "_" : c;
      const i = table.indexOf(ch);
      if (i < 0 || i >= 36) return "";
      return `${Math.floor(i / 6) + 1}${(i % 6) + 1}`;
    })
    .filter(Boolean)
    .join(" ");
}

/** Decode Polybius; "_" → space. Pairs must be 11..66. */
export function decodePolybius(ciphertext: string, key: string): string {
  const table = polybiusTable(key);
  const pairs = ciphertext.trim().split(/\s+/).filter(Boolean);
  return pairs
    .map((p) => {
      if (!/^[1-6]{2}$/.test(p)) return "?";
      const idx = (+p[0] - 1) * 6 + (+p[1] - 1);
      const ch = table[idx];
      return ch === "_" ? " " : (ch ?? "?");
    })
    .join("");
}

/** Caesar over the Russian alphabet. Non-letters kept as-is. */
export function caesarShift(text: string, shift: number): string {
  const n = RU_ALPHABET.length;
  const s = ((shift % n) + n) % n;
  return text
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .split("")
    .map((c) => {
      const i = RU_ALPHABET.indexOf(c);
      if (i < 0) return c;
      return RU_ALPHABET[(i + s) % n];
    })
    .join("");
}

export function matchesPlaintext(answer: string, expected: string): boolean {
  return normalizePlain(answer) === normalizePlain(expected);
}
