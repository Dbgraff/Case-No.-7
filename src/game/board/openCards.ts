import { BOARD_CARD_TEMPLATES } from "../../data/board";
import type { BoardCard } from ".";
import { addBoardCards } from "../../core/state";

/** Opens board cards linked to the given clue id. */
export function openBoardCardsForClue(clueId: string): void {
  const cards: BoardCard[] = BOARD_CARD_TEMPLATES.filter((t) => t.clueId === clueId).map(
    (t) => ({
      id: t.id,
      title: t.title,
      text: t.text,
      slot: t.slot,
      clueId: t.clueId,
      correct: t.correct,
    }),
  );
  addBoardCards(cards);
}
