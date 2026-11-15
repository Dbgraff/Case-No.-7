import type { ActiveTutorialStep } from "../game/tutorial/steps";

/**
 * ЗАГЛУШКИ. Настоящие тексты обучения пишет сюжетный разработчик.
 */

/** First message of the game: Даша asks HQ to check the wrapper. */
export const TUTORIAL_INTRO = {
  who: "Даша",
  text: "Штаб, мы у ворот «Ракеты». В траве у столба нашли фантик — он уже у вас на столе. Проверьте, пожалуйста, что с ним. Приём.",
};

/** System hints, one per step. */
export const TUTORIAL_HINTS: Record<ActiveTutorialStep, string> = {
  toTable: "Обучение 1/4: переключитесь на «Стол реставрации» — находка уже там.",
  selectItem: "Обучение 2/4: выберите предмет на столе и осмотрите его — описание и обстоятельства находки появятся ниже.",
  restore: "Обучение 3/4: нажмите «Начать реставрацию» и доведите её до конца.",
  archive: "Обучение 4/4: вернитесь на «Компьютер» и откройте вкладку «Архив» — там новая зацепка.",
};

/** Shown when the last step is done. */
export const TUTORIAL_DONE_TEXT =
  "Обучение пройдено. Дальше — сами: отправляйте группу и завершайте день.";

/** Shown when the player skips the tutorial. */
export const TUTORIAL_SKIPPED_TEXT = "Обучение пропущено.";
