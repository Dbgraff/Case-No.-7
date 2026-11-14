import type { BoardCardTemplate } from "../game/board";

/**
 * Карточки доски. Открываются, когда открыта зацепка с тем же clueId.
 * correct: true — верный ответ для своего слота.
 */
export const BOARD_CARD_TEMPLATES: BoardCardTemplate[] = [
  {
    id: "card-where-stage",
    clueId: "clue-cipher-note",
    slot: "where",
    title: "Под сценой",
    text: "Тайник «Искры» — под эстрадой (из шифровки Серёжи).",
    correct: true,
  },
  {
    id: "card-who-fedotov-wrong",
    clueId: "clue-cipher-note",
    slot: "who",
    title: "Федотов · версия «Искры»",
    text: "Пионеры искали Федотова Ивана, 1921 г. р. — возможная путаница с однофамильцем.",
    correct: false,
  },
];
