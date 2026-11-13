import type { FindTemplate, Restoration } from "../finds";

/**
 * ЗАГЛУШКИ для проверки механики. Настоящие улики, их происхождение и связи
 * пишет сюжетный разработчик — здесь нужно будет заменить содержимое.
 *
 * Правило: одно место = не более одной находки на шаблон. Место без шаблона
 * (или с уже найденным шаблоном) — группа ничего не находит.
 */
export const FIND_TEMPLATES: FindTemplate[] = [
  {
    id: "find-wrapper",
    type: "other",
    title: "Фантик от конфеты",
    description: "Выцветший бумажный фантик. Простой предмет, чтобы освоить реставрацию.",
    foundBy: "Даша",
    placeId: "gate",
    circumstances: "Лежал в траве у столба ворот.",
    related: [],
  },
  {
    id: "find-damaged-sheet",
    type: "document",
    title: "Повреждённый лист",
    description: "Лист бумаги со следами сырости. Часть текста не читается.",
    foundBy: "Артём",
    placeId: "k1",
    circumstances: "Был зажат между досками в коридоре.",
    related: [],
  },
  {
    id: "find-loose-letter",
    type: "letter",
    title: "Письмо без конверта",
    description: "Сложенный вчетверо лист, подпись частично стёрта.",
    foundBy: "Даша",
    placeId: "club",
    circumstances: "Лежало на полке за стопкой журналов.",
    related: [],
  },
];

/**
 * Restoration tasks by find id. A find without an entry cannot be restored yet.
 * ЗАГЛУШКИ: тексты результатов пишет сюжетный разработчик.
 */
export const RESTORATIONS: Record<string, Restoration> = {
  "find-wrapper": {
    kind: "mold",
    spots: 3,
    result: {
      title: "Надпись на обороте",
      text: "Карандашом, неровным почерком: «Текст-заглушка. Сюда сюжетный разработчик впишет первую зацепку».",
    },
  },
  "find-damaged-sheet": {
    kind: "mold",
    spots: 6,
    result: {
      title: "Читаемая часть листа",
      text: "После очистки проступили строки: «Заглушка. Здесь будет текст документа с датой, фамилией и местом».",
    },
  },
};
