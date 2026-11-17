import { FIND_TEMPLATES } from "../data/finds";
import type { Find } from "./finds";
import { getState, subscribe, updateState, type GameState } from "../core/state";
import { notify } from "../ui/computer/notifications";
import { addTableNews } from "../ui/spaces";
import { isTutorialRunning } from "./tutorial/steps";

/**
 * All narrative messages use the same queue. The player receives genuine
 * messenger notifications, not a wall of dialogue in one render frame.
 */
let nextMessageAt = 0;
export function queueStoryMessage(
  who: string,
  text: string,
  kind: "" | "sys" | "story" = "story",
  gapMs = 1900,
): void {
  const now = performance.now();
  nextMessageAt = Math.max(now, nextMessageAt) + gapMs;
  window.setTimeout(() => notify(who, text, kind), nextMessageAt - now);
}

/**
 * Starts the narrative only once the actual title screen has been dismissed.
 * Tutorial always takes place between Galina's request and the field briefing.
 */
export function initStory(onGameReady: () => void): void {
  let lastVisits = getState().visits.length;
  let lastDay = getState().day;
  const lastClues = new Set(getState().clues.map(c => c.id));
  const lastReads = new Set(getState().readDocs);
  let assigning = false;
  let started = false;
  let briefingScheduled = false;

  const clue = (s: Readonly<GameState>, id: string): boolean =>
    s.clues.some(c => c.id === id);

  const updateGoal = (): void => {
    const s = getState();
    const el = document.getElementById("goalText");
    const label = document.querySelector<HTMLElement>(".goalbar .label");
    let stage = "Этап 1/8";
    let text = "Где располагался отряд «Искра» в 1975 году?";

    if (isTutorialRunning(s.tutorialStep)) {
      stage = "Пролог";
      text = "Освойте реставрацию на учебном предмете. Затем начнётся расследование.";
    } else if (s.day >= 2) {
      stage = "Этап 7/8";
      text = "Проверьте архивные записи двух Федотовых и современное название области.";
      if (s.readDocs.includes("answer-region")) {
        stage = "Этап 8/8";
        text = "Составьте итоговый вывод на доске и доложите командиру.";
      }
    } else if (clue(s, "clue-cache")) {
      stage = "Этап 6/8";
      text = "Изучите тайник «Искры» и завершите вылазку для получения ответов архива.";
    } else if (clue(s, "clue-cipher-note")) {
      stage = "Этап 6/8";
      text = "Шифр раскрыт. Отправьте группу к эстраде и найдите тайник.";
    } else if (clue(s, "clue-loose-letter") && clue(s, "clue-tape")) {
      stage = "Этап 5/8";
      text = "Найдите шифровку Серёжи и определите место тайника.";
    } else if (s.visits.includes("k1") || s.finds.some(f => f.id === "find-damaged-sheet")) {
      stage = "Этап 3/8";
      text = "Восстановите дневник «Искры» и проверьте отрядную папку в клубе.";
    }

    if (el) el.textContent = text;
    if (label) label.textContent = stage;
  };

  const startBriefing = (): void => {
    if (briefingScheduled || !started) return;
    if (isTutorialRunning(getState().tutorialStep)) return;
    briefingScheduled = true;
    const s = getState();
    if (s.day !== 1 || s.visits.length > 0 || s.finds.some(f => f.id === "find-damaged-sheet")) {
      queueStoryMessage("Командир", "Связь со штабом восстановлена. Продолжайте проверку материалов дела № 7.", "story", 1400);
      return;
    }

    queueStoryMessage("Система", "Обучение завершено. Поисковая группа ждёт указаний.", "sys", 2400);
    queueStoryMessage("Командир", "В найденных в лагере материалах отряда «Искра» есть противоречия. Наша задача — проверить их расследование 1975 года и восстановить подтверждённые сведения об Иване Федотове. Начните с документов. Честь, готовность, умение.", "story", 2800);
    queueStoryMessage("Даша", "Штаб, мы у ворот «Ракеты». Тут корпуса 1, 2 и 4 — третьего нет. Где в 1975 году жила «Искра»?", "story", 3600);
    queueStoryMessage("Лёша", "Наверняка корпуса перенумеровали. Поищите в электронном каталоге справку о лагере и план 1975 года.", "", 4200);
  };

  const grantPlace = (id: string): void => {
    if (assigning || isTutorialRunning(getState().tutorialStep)) return;
    const s = getState();
    const existing = new Set(s.finds.map(f => f.id));
    const unlocked = FIND_TEMPLATES.filter(f =>
      f.placeId === id && f.id !== "find-wrapper" && !existing.has(f.id) &&
      (f.id !== "find-cache" || clue(s, "clue-cipher-note")),
    );

    if (id === "k1") queueStoryMessage("Даша", "Нашли бывший третий корпус. У окна — дневник «Искры». Передаём в штаб.");
    if (id === "k2") queueStoryMessage("Даша", "Под подоконником — записка Серёжи с рядами чисел. Придётся расшифровать.");
    if (id === "club") {
      queueStoryMessage("Даша", "Нашли в клубе старый стенд «Никто не забыт».");
      queueStoryMessage("Артём", "На верхнем шкафу лежала папка. В ней письмо и кассета — сейчас передадим.");
    }
    if (id === "stage") queueStoryMessage(
      unlocked.length ? "Артём" : "Даша",
      unlocked.length
        ? "Под сценой нашлась жестяная коробка с материалами «Искры»!"
        : "Эстрада заросла. Без подсказки Серёжи тайник не найти.",
    );
    if (id === "gate") queueStoryMessage("Лёша", "В архиве должны сохраниться старые планы территории.");
    if (!unlocked.length) return;

    assigning = true;
    const added: Find[] = unlocked.map(f => ({ ...f, day: s.day, status: "new" }));
    updateState({ finds: [...getState().finds, ...added] });
    assigning = false;
    addTableNews(added.length);
    queueStoryMessage("Система", `На стол поступили находки: ${added.map(f => f.title).join(", ")}.`, "sys");
  };

  subscribe(s => {
    if (s.visits.length > lastVisits) {
      const places = s.visits.slice(lastVisits);
      lastVisits = s.visits.length;
      for (const id of places) grantPlace(id);
    } else if (s.visits.length < lastVisits) {
      lastVisits = s.visits.length;
    }

    for (const c of s.clues) {
      if (lastClues.has(c.id)) continue;
      lastClues.add(c.id);
      if (c.id === "clue-tape") queueStoryMessage("Лёша", "Номер полевой почты надёжнее, чем год рождения по памяти. Нужно сверить оба документа.");
      if (c.id === "clue-cipher-note") queueStoryMessage("Даша", "«Под сценой»! Теперь мы знаем точное место поиска.");
      if (c.id === "clue-cache") queueStoryMessage("Даша", "Галина сомневалась в ответе архива. Нужно проверить: это точно тот Федотов?");
    }
    for (const id of s.readDocs) {
      if (lastReads.has(id)) continue;
      lastReads.add(id);
      if (id === "answer-army") queueStoryMessage("Лёша", "Вторая ударная армия. Теперь можно уточнить архивный запрос.");
      if (id === "answer-region") queueStoryMessage("Артём", "Калининская область сегодня называется Тверской. Нашли нужный регион.");
    }

    const doneByAction: Record<string, boolean> = {
      "task-find-trace": s.finds.some(f => f.id === "find-cipher-note") && s.finds.some(f => f.id === "find-loose-letter"),
      "task-paper": s.readDocs.includes("doc-front-paper"),
      "task-army": s.readDocs.includes("answer-army"),
      "task-fieldmail": s.readDocs.includes("doc-front-paper") || s.readDocs.includes("doc-fedotov-card"),
      "task-cache": clue(s, "clue-cache"),
      "task-check-identity": s.readDocs.includes("doc-fedotov-card") && s.readDocs.includes("doc-hospital-list"),
    };
    if (s.tasks.some(t => !t.done && doneByAction[t.id])) {
      updateState({ tasks: s.tasks.map(t => doneByAction[t.id] ? { ...t, done: true } : t) });
    }

    if (s.day !== lastDay) {
      lastDay = s.day;
      if (s.day === 2) {
        queueStoryMessage("Даша", "Вылазка завершена. Осталось проверить ответы военного архива.");
        queueStoryMessage("Командир", "Сопоставьте отчество, год рождения и полевую почту. Не повторите ошибку «Искры».");
      }
    }
    if (started && !isTutorialRunning(s.tutorialStep)) startBriefing();
    updateGoal();
  });

  const launch = (): void => {
    if (started) return;
    started = true;
    const s = getState();
    if (isTutorialRunning(s.tutorialStep)) {
      if (s.day === 1 && s.visits.length === 0) {
        notify(
          "Даша",
          "Штаб, мы в лагере «Ракета». Среди старых бумаг нашли папку «Дело № 7» — материалы поисковой работы пионерского отряда «Искра» за 1975 год. Ребята пытались выяснить судьбу Ивана Федотова, но в записях есть нестыковки. Передаём материалы для проверки.",
          "story",
        );
        queueStoryMessage("Даша", "Нашли у ворот старый фантик — передали на стол. Попробуйте восстановить надпись, проверим оборудование перед настоящими документами.", "", 2200);
      }
      window.setTimeout(onGameReady, Math.max(2800, nextMessageAt - performance.now() + 500));
    } else {
      onGameReady();
      startBriefing();
    }
    updateGoal();
  };

  // main.ts runs before the separate title-screen module. Do not speak behind it.
  const awaitTitleScreen = (): void => {
    if (sessionStorage.getItem("case7:demo:intro-dismissed") === "1") {
      launch();
      return;
    }
    window.setTimeout(awaitTitleScreen, 350);
  };
  window.setTimeout(awaitTitleScreen, 350);
  updateGoal();
}
