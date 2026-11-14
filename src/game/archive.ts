/** A digital document in the club / district archive. */
export type ArchiveDoc = {
  id: string;
  /** Title shown in the list and the viewer. */
  title: string;
  /** Provenance line, e.g. «Фонд лагеря · схема». */
  source: string;
  /** Full text (plain; line breaks kept). */
  body: string;
  /** Search tokens (lowercase, no ё). */
  keywords: string[];
  /**
   * If set, the doc is hidden until the player has restored this find
   * or opened this clue. Omit = always in the club base.
   */
  unlockAfter?: { findId?: string; clueId?: string };
  chipWords?: string[];
};

/** Result of one search hit. */
export type ArchiveHit = {
  id: string;
  title: string;
  source: string;
  /** True if the player has opened this doc at least once. */
  read: boolean;
  /** True if this is a freshly unlocked external reply, etc. */
  isNew?: boolean;
};
