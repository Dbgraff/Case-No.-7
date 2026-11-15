/** Slot on the investigation board. */
export type BoardSlotId = "who" | "when" | "where" | "conclusion";

export const BOARD_SLOTS: { id: BoardSlotId; label: string }[] = [
  { id: "who", label: "Кто" },
  { id: "when", label: "Когда" },
  { id: "where", label: "Где" },
  { id: "conclusion", label: "Вывод" },
];

/** A card the player can pin onto a slot. */
export type BoardCard = {
  id: string;
  title: string;
  text: string;
  /** Preferred slot (hint for the player). */
  slot: BoardSlotId;
  /** Clue that opened this card (if any). */
  clueId?: string;
  /** If true, this is the correct card for its slot. */
  correct: boolean;
};

/** Template from content data. */
export type BoardCardTemplate = {
  id: string;
  title: string;
  text: string;
  slot: BoardSlotId;
  /** Open this card when this clue is opened. */
  clueId: string;
  correct: boolean;
};
