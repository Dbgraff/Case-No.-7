import type { ActiveTutorialStep } from "../game/tutorial/steps";

/** Short training after Galina's request, before the real field investigation. */
export const TUTORIAL_INTRO = {
  who: "Даша",
  text:
    "Нашли у ворот старый фантик. Он не относится к делу № 7, " +
    "но на нём можно проверить инструменты реставрации. Предмет уже на столе.",
};

export const TUTORIAL_HINTS: Record<ActiveTutorialStep, string> = {
  toTable:
    "Подготовка 1/4: переключитесь на стол реставрации. Фантик уже лежит на коврике.",
  selectItem:
    "Подготовка 2/4: выберите фантик и прочитайте описание находки.",
  restore:
    "Подготовка 3/4: нажмите «Начать реставрацию» и осторожно очистите поверхность.",
  archive:
    "Подготовка 4/4: вернитесь к монитору и откройте архив, чтобы увидеть результат.",
};

export const TUTORIAL_DONE_TEXT =
  "Подготовка завершена. Теперь можно заняться просьбой Галины Ремизовой.";

export const TUTORIAL_SKIPPED_TEXT =
  "Подготовка пропущена. Поисковая группа готова приступить к делу.";
