import type { ClueTemplate } from "../game/clues";

/**
 * ЗАГЛУШКИ для проверки механики. Настоящие зацепки и задания пишет
 * сюжетный разработчик. Правило: одна находка — не более одной зацепки.
 * Находка без шаблона после реставрации зацепок не даёт.
 */
export const CLUE_TEMPLATES: ClueTemplate[] = [
  {
    id: "clue-wrapper",
    findId: "find-wrapper",
    title: "Фантик с пометкой",
    text: "На обороте фантика карандашом выведено число. Пока непонятно, что оно значит.",
  },
  {
    id: "clue-damaged-sheet",
    findId: "find-damaged-sheet",
    title: "Список фамилий",
    text: "После реставрации проявился список из нескольких фамилий. Часть строк обрывается.",
    task: {
      id: "task-check-names",
      title: "Проверить фамилии по архиву",
      description: "Найти в архиве клуба упоминания фамилий из списка.",
    },
  },
  {
    id: "clue-loose-letter",
    findId: "find-loose-letter",
    title: "Подпись «М.»",
    text: "Письмо подписано одной буквой. Адресат не назван.",
  },
];