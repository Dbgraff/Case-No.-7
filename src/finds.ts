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
};

/**
 * Find description from the content data: everything except what depends on
 * the moment of discovery (day, status).
 */
export type FindTemplate = Omit<Find, "day" | "status">;
