import { ARCHIVE_DOCS } from "../../data/archive";
import type { ArchiveDoc, ArchiveHit } from ".";
import type { GameState } from "../../core/state";

export function normalizeQuery(q: string): string[] {
  return q.toLowerCase().replace(/ё/g, "е").replace(/[^а-яa-z0-9 ]/g, " ").split(/\s+/).filter(t => t.length >= 3);
}
const norm = (s: string): string => s.toLowerCase().replace(/ё/g, "е");
const MORNING_DOCS = new Set(["doc-archive-request", "doc-front-paper", "doc-memory-book"]);
const REPLIES = new Set(["doc-hospital-list", "doc-fedotov-card", "doc-field-report"]);

export function isDocUnlocked(doc: ArchiveDoc, s: Readonly<GameState>): boolean {
  if (MORNING_DOCS.has(doc.id) && s.day < 2) return false;
  if (REPLIES.has(doc.id) && (s.day < 2 || !s.readDocs.includes("answer-army"))) return false;
  if (doc.id === "doc-memory-book" && !s.readDocs.includes("doc-fedotov-card")) return false;
  const u = doc.unlockAfter;
  if (!u) return true;
  if (u.findId && !s.finds.some(f => f.id === u.findId && f.status === "done")) return false;
  if (u.clueId && !s.clues.some(c => c.id === u.clueId)) return false;
  return true;
}

export function searchArchive(query: string, s: Readonly<GameState>, readIds: ReadonlySet<string>): ArchiveHit[] {
  const toks = normalizeQuery(query);
  if (!toks.length) return [];
  return ARCHIVE_DOCS.filter(d => isDocUnlocked(d, s)).filter(d => {
    const keys = d.keywords.map(norm).concat(norm(d.title).split(/\s+/));
    return keys.some(k => toks.some(t => k.startsWith(t.slice(0, 6)) || t.startsWith(k) || k.includes(t)));
  }).map(d => ({ id: d.id, title: d.title, source: d.source, read: readIds.has(d.id) }));
}

export function getArchiveDoc(id: string): ArchiveDoc | undefined { return ARCHIVE_DOCS.find(d => d.id === id); }
export function archiveWordChips(s: Readonly<GameState>): string[] {
  const set = new Set<string>(["ракета", "искра", "лагерь"]);
  if (s.day >= 2) { set.add("запрос"); set.add("отвага"); }
  for (const f of s.finds) {
    if (f.status !== "done") continue;
    for (const w of f.searchWords ?? []) {
      const t = norm(w).replace(/[^а-яa-z0-9]/g, "");
      if (t.length >= 3) set.add(t);
    }
  }
  for (const id of s.readDocs) {
    const doc = ARCHIVE_DOCS.find(d => d.id === id);
    for (const word of doc?.chipWords ?? []) set.add(norm(word));
  }
  for (const w of s.pinnedWords) set.add(w);
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}
