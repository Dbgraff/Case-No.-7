import { ARCHIVE_DOCS } from "../data/archive";
import type { ArchiveDoc, ArchiveHit } from "./archive";
import type { GameState } from "./state";

/** Lowercase, ё→е, keep letters/digits/spaces, split into tokens length ≥ 3. */
export function normalizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е");
}

/** Whether a doc is unlocked for the current progress. */
export function isDocUnlocked(doc: ArchiveDoc, s: Readonly<GameState>): boolean {
  const u = doc.unlockAfter;
  if (!u) return true;
  if (u.findId) {
    const f = s.finds.find((x) => x.id === u.findId);
    if (!f || f.status !== "done") return false;
  }
  if (u.clueId && !s.clues.some((c) => c.id === u.clueId)) return false;
  return true;
}

/**
 * Search the club archive. Matches keywords / title by prefix (as in the prototype).
 */
export function searchArchive(
  query: string,
  s: Readonly<GameState>,
  readIds: ReadonlySet<string>,
): ArchiveHit[] {
  const toks = normalizeQuery(query);
  if (!toks.length) return [];

  const pool = ARCHIVE_DOCS.filter((d) => isDocUnlocked(d, s));
  return pool
    .filter((d) => {
      const keys = d.keywords.map(norm).concat(norm(d.title).split(/\s+/));
      return keys.some((k) =>
        toks.some((t) => k.startsWith(t.slice(0, 6)) || t.startsWith(k) || k.includes(t)),
      );
    })
    .map((d) => ({
      id: d.id,
      title: d.title,
      source: d.source,
      read: readIds.has(d.id),
    }));
}

export function getArchiveDoc(id: string): ArchiveDoc | undefined {
  return ARCHIVE_DOCS.find((d) => d.id === id);
}

/**
 * Quick-search chips: starters + keywords of read docs + explicit
 * searchWords from restored finds (never auto-tokenized descriptions).
 */
export function archiveWordChips(s: Readonly<GameState>): string[] {
  const set = new Set<string>();

  for (const w of ["ракета", "искра", "лагерь"]) set.add(w);

  for (const f of s.finds) {
    if (f.status !== "done" || !f.searchWords) continue;
    for (const x of f.searchWords) {
      const t = x.toLowerCase().replace(/ё/g, "е").replace(/[^а-яa-z0-9]/g, "");
      if (t.length >= 3) set.add(t);
    }
  }

  // без этого клик по тексту не попадёт в быстрый поиск
  for (const w of s.pinnedWords) set.add(w);

  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}
