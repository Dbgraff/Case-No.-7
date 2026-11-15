import { FIND_TEMPLATES } from "../data/finds";
import type { Find } from "./finds";
import { getState, subscribe, updateState } from "../core/state";
import { notify } from "../ui/computer/notifications";
import { addTableNews } from "../ui/spaces";

/**
 * Сюжетная связка существующих механик.
 * Выдаёт находки во время вылазки, ведёт цели и историю двух игровых дней.
 * Данные для прогресса берутся из уже сохраняемого GameState.
 */
export function initStory(): void {
  let lastVisits = getState().visits.length;
  let lastDay = getState().day;
  let lastClues = new Set(getState().clues.map(c => c.id));
  let lastReads = new Set(getState().readDocs);
  const visitedEvents = new Set<string>();
  let assigning = false;

  const speech = (who: string, message: string): void => notify(who, message, "story");

  const goal = (): void => {
    const s = getState();
    const el = document.getElementById("goalText");
    const label = document.querySelector<HTMLElement>(".goalbar .label");
    const clue = (id: string): boolean => s.clues.some(c => c.id === id);
    let text = "Где располагался отряд «Искра» в 1975 году?";
    let stage = "Этап 1/8";
    if (s.visits.includes("k1") || s.finds.some(f => f.id === "find-damaged-sheet")) { stage = "Этап 3/8"; text = "Исследуйте документы отряда: восстановите дневник, письмо и запись ветерана."; }
    if (clue("clue-loose-letter") && clue("clue-tape")) { stage = "Этап 5/8"; text = "Разгадайте записку Серёжи и найдите тайник под сценой."; }
    if (clue("clue-cipher-note") && !clue("clue-cache")) { stage = "Этап 6/8"; text = "Отправьте группу к эстраде и восстановите найденное в тайнике."; }
    if (clue("clue-cache") && s.day === 1) { stage = "Этап 6/8"; text = "Материалы пионеров изучены. Завершите вылазку, чтобы получить ответы наутро."; }
    if (s.day >= 2) { stage = "Этап 7/8"; text = "Оформите архивный запрос, сопоставьте двух Федотовых и установите современную область."; }
    if (s.day >= 2 && s.readDocs.includes("answer-region")) { stage = "Этап 8/8"; text = "Составьте итоговый вывод на доске «Дело № 7» и доложите командиру."; }
    if (el) el.textContent = text;
    if (label) label.textContent = stage;
  };

  const grantPlace = (id: string): void => {
    if (assigning) return;
    const s = getState();
    // Если игрок завершил вылазку слишком рано, не блокируем сюжетные находки.
    if (s.day < 1) return;
    const existing = new Set(s.finds.map(f => f.id));
    const candidates = FIND_TEMPLATES.filter(f => f.placeId === id && f.id !== "find-wrapper" && !existing.has(f.id));
    const unlocked = candidates.filter(f => f.id !== "find-cache" || s.clues.some(c => c.id === "clue-cipher-note"));

    const key = `${id}:${s.day}`;
    if (!visitedEvents.has(key)) {
      visitedEvents.add(key);
      if (id === "k1") speech("Даша", "Это бывший третий корпус! После перенумерации он стал первым. В тумбочке нашёлся дневник «Искры». Отправляем в штаб.");
      if (id === "k2") speech("Даша", "Под подоконником записка с числами. Похоже, Серёжа любил тайны не зря.");
      if (id === "club") { speech("Даша", "На стенде «Никто не забыт» нашлась отрядная папка."); speech("Артём", "Снял её с верхнего шкафа. Тут письмо и магнитофонная кассета. Всё отправляем на стол."); }
      if (id === "stage" && unlocked.length) speech("Артём", "Нашёл нишу под эстрадой! Тут коробка с картонной доской и письмом вожатой.");
      if (id === "stage" && !unlocked.length) speech("Даша", "Эстрада заросла. Без точного указания на тайник здесь можно искать до заката. Нужна шифровка.");
      if (id === "gate") speech("Лёша", "Надо сначала выяснить старую нумерацию корпусов. В архиве наверняка есть планы.");
    }
    if (!unlocked.length) return;
    assigning = true;
    const added: Find[] = unlocked.map(f => ({ ...f, day: s.day, status: "new" }));
    updateState({ finds: [...getState().finds, ...added] });
    assigning = false;
    addTableNews(added.length);
    notify("Система", `На стол поступили новые находки: ${added.map(f => f.title).join(", ")}.`, "sys");
  };

  subscribe(s => {
    if (s.visits.length > lastVisits) {
      const newVisits = s.visits.slice(lastVisits);
      lastVisits = s.visits.length;
      for (const id of newVisits) grantPlace(id);
    } else if (s.visits.length < lastVisits) {
      lastVisits = s.visits.length;
    }
    for (const clue of s.clues) {
      if (lastClues.has(clue.id)) continue;
      lastClues.add(clue.id);
      if (clue.id === "clue-tape") speech("Лёша", "Номер полевой почты — важнее предположительного года рождения. Сверим его с военным архивом.");
      if (clue.id === "clue-cipher-note") speech("Даша", "«Под сценой»? Тогда вернёмся к эстраде. Теперь знаем, где искать.");
      if (clue.id === "clue-cache") speech("Даша", "Галина сомневалась в ответе архива ещё в 1976 году. Мы обязаны проверить обе записи, прежде чем делать вывод.");
    }
    for (const id of s.readDocs) {
      if (lastReads.has(id)) continue;
      lastReads.add(id);
      if (id === "answer-army") speech("Лёша", "Вторая ударная армия. Теперь военный архив может сузить выборку. Утром придут выписки.");
      if (id === "answer-region") speech("Артём", "Калининская область теперь Тверская! Значит, современный поиск нужно вести по Тверской области.");
    }
    if (s.day !== lastDay) {
      lastDay = s.day;
      if (s.day === 2) {
        speech("Даша", "Штаб, мы закончили вылазку. Теперь дело за архивами. Проверьте точные данные бойца.");
        speech("Командир", "Нужна сверка: отчество, год рождения, полевая почта. Не повторите прежнюю ошибку.");
      }
    }
    goal();
  });

  const s = getState();
  if (s.day === 1 && !s.visits.length && !s.clues.some(c => c.id === "clue-damaged-sheet")) {
    speech("Галина Ремизова", "Вы собираетесь в «Ракету»? В 1975 году мы с «Искрой» искали бойца. Дело № 7 закрыли, а я так и не уверена, что правильно. Под эстрадой оставили тайник. Может, найдёте его?");
    speech("Командир", "ВТСО «Запад-81». Задача — восстановить материалы «Искры» и проверить судьбу бойца. Честь, готовность, умение.");
  }
  goal();
}
