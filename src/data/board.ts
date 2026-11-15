import type { BoardCardTemplate } from "../game/board";

export const BOARD_CARD_TEMPLATES: BoardCardTemplate[] = [
  { id: "card-who-wrong", clueId: "clue-cache", slot: "who", title: "Федотов Иван, 1921", text: "Версия отряда «Искра»: сведения записаны по памяти ветерана без сверки отчества.", correct: false },
  { id: "card-conclusion-wrong", clueId: "clue-cache", slot: "conclusion", title: "Умер в госпитале", text: "Вывод пионеров из архивного ответа 1976 года. Личность не подтверждена.", correct: false },
  { id: "card-when-wrong", clueId: "clue-cache", slot: "when", title: "Март 1943", text: "Дата смерти Ивана Андреевича, а не обязательно разыскиваемого бойца.", correct: false },
  { id: "card-who-right", clueId: "clue-damaged-sheet", slot: "who", title: "Иван Степанович Федотов", text: "1920 год рождения, д. Сосновка, Калининская область. Полевая почта 4973.", correct: true },
  { id: "card-where-right", clueId: "clue-loose-letter", slot: "where", title: "Мясной Бор", text: "Район разведывательного задания и последнего известного выхода бойца.", correct: true },
  { id: "card-when-right", clueId: "clue-tape", slot: "when", title: "Февраль 1942", text: "Последняя достоверная дата в показаниях однополчанина и донесении.", correct: true },
  { id: "card-conclusion-right", clueId: "clue-cache", slot: "conclusion", title: "Пропал без вести", text: "Подтверждения гибели или смерти в госпитале именно Ивана Степановича нет. «Искра» перепутала однофамильцев.", correct: true },
];
