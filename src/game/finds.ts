/** Kind of a physical find (what it looks like on the restoration table). */
export type FindType = "document" | "photo" | "letter" | "tape" | "note" | "other";

/** Human-readable names of find types (for the UI). */
export const FIND_TYPE_LABELS: Record<FindType, string> = {
  document: "Документ",
  photo: "Фотография",
  letter: "Письмо",
  tape: "Кассета",
  note: "Записка",
  other: "Предмет",
};

/** Processing status of a find. */
export type FindStatus = "new" | "inProgress" | "done";

/** Human-readable names of find statuses (for the UI). */
export const FIND_STATUS_LABELS: Record<FindStatus, string> = {
  new: "Не изучено",
  inProgress: "В работе",
  done: "Изучено",
};

/** A physical find delivered by the group. Every find has a known origin. */
export type Find = {
  /** Unique id. */
  id: string;
  /** Kind of item. */
  type: FindType;
  /** Short title. */
  title: string;
  /** Short description of the item. */
  description: string;
  /** Group member who found it. */
  foundBy: string;
  /** Id of the place where it was found. */
  placeId: string;
  /** Day on which it was found. */
  day: number;
  /** Circumstances of the discovery. */
  circumstances: string;
  /** Current processing status. */
  status: FindStatus;
  /** Ids of related tasks and materials. */
  related: string[];
  /** Result of the restoration, if it produced one (e.g. the saved clean copy of a tape). */
  outcome?: RestorationOutcome;
  /** Words added to archive quick-search after this find is restored. */
  searchWords?: string[];
};

/**
 * Find description from the content data: everything except what depends on
 * the moment of discovery (day, status).
 */
export type FindTemplate = Omit<Find, "day" | "status">;

/** Text revealed after a restoration is done. */
export type RestorationText = {
  /** Short heading of the revealed text. */
  title: string;
  /** Revealed text. */
  text: string;
};

/**
 * Mold-removal restoration of a document: the player wipes mold spots off
 * the paper to read what is written underneath.
 */
export type MoldRestoration = {
  kind: "mold";
  /** Number of mold spots drawn on the paper (difficulty). */
  spots: number;
  /** What the player learns after the restoration is done. */
  result: RestorationText;
};

/**
 * Audio restoration of a tape: the player tunes the playback speed and the
 * noise filter until the recording becomes clear.
 */
/** A part of a tape transcript. */
export type TranscriptPart = {
  /** Text of the part. */
  text: string;
  /** Fragile parts (e.g. digits) are lost forever if the tape is over-cleaned. */
  fragile?: boolean;
};

/** Range of "good" values of a slider. */
export type ValueRange = {
  from: number;
  to: number;
};

/**
 * Audio restoration of a tape: the player tunes three sliders (noise
 * reduction, 50 Hz hum filter, tape speed) and records a clean copy.
 */
export type AudioRestoration = {
  kind: "audio";
  /** Heading of the tape card. */
  label: string;
  /** What is recorded on the tape, in parts. */
  transcript: TranscriptPart[];
  /** Good ranges: noise and hum in %, speed in cm/s. */
  good: { noise: ValueRange; hum: ValueRange; speed: ValueRange };
  /** Heading and fallback text of the result. */
  result: RestorationText;
};

/**
 * Cipher restoration: the player decodes a message using a known method
 * (Polybius square, Caesar shift) or by entering the plaintext after
 * researching the method outside the game.
 */
export type CipherMethod = "polybius" | "caesar" | "answer";

export type CipherRestoration = {
  kind: "cipher";
  /** Which solver UI to show. */
  method: CipherMethod;
  /** Ciphertext shown on the note (digits for Polybius, letters for others). */
  ciphertext: string;
  /**
   * Correct plaintext. Comparison ignores case, ё/е and non-letters.
   * For interactive methods this is also what the live decode must produce.
   */
  plaintext: string;
  /**
   * Polybius: keyword that starts the table (e.g. «ВСЕГДАГОТОВ»).
   * Caesar / answer: unused.
   */
  key?: string;
  /** Optional in-game hint (method name, slogan, etc.). */
  hint?: string;
  /** Heading of the note card in the UI. */
  label?: string;
  /** What the player learns after a successful decode. */
  result: RestorationText;
};

/** What the player got out of a restoration. */
export type RestorationOutcome = {
  /** Saved clean copy (what goes to the notes). */
  text: string;
  /** `true` if fragile parts (e.g. digits) were not saved. */
  digitsLost: boolean;
};

/** All restoration kinds. */
export type Restoration = MoldRestoration | AudioRestoration | CipherRestoration;
