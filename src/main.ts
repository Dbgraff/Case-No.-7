import "./style.css";

import { initNotifications, notify } from "./ui/computer/notifications";
import { addTableNews, initSpaces } from "./ui/spaces";
import { initTabs } from "./ui/computer/tabs";
import { bindFinds } from "./ui/table/finds";
import { bindTopbar } from "./ui/computer/topbar";
import { endDay, type DayReport } from "./game/endDay";
import { GROUP_TRIP_COST_HOURS, HOURS_PER_DAY, getState, subscribe, updateState } from "./core/state";
import { PLACES, type Place } from "./data/places";
import { initCampMap, type CampMap } from "./map/campMap";
import { bindArchive } from "./ui/computer/archive";
import { completeTutorialStep, startTutorial } from "./game/tutorial";
import { FIND_TEMPLATES } from "./data/finds";
import { initPrologue } from "./ui/table/prologue";
import { isTutorialRunning } from "./game/tutorial/steps";
import { bindTutorial } from "./ui/computer/tutorial";
import { bindCaseBoard } from "./ui/computer/caseBoard";
import { initIntegratedDesktop } from "./ui/integratedDesktop";
import { initStory, queueStoryMessage } from "./game/story";

let selected: Place | null = null;
let campMap: CampMap | null = null;

const btnSend = document.getElementById("btnSend") as HTMLButtonElement;
const btnEndDay = document.getElementById("btnEndDay") as HTMLButtonElement;
const placeLabel = document.getElementById("placeLabel")!;

function refreshSendButton(): void {
  btnSend.disabled = !selected || (isTutorialRunning(getState().tutorialStep) && !(getState().tutorialStep === "dispatch" && selected.id === "gate")) || getState().hoursLeft < GROUP_TRIP_COST_HOURS;
  btnEndDay.disabled = isTutorialRunning(getState().tutorialStep);
}
function selectPlace(place: Place | null): void {
  selected = place;
  refreshSendButton();
  placeLabel.textContent = place ? place.name : "место не выбрано";
  campMap?.setSelected(place ? place.id : null);
}

const ARRIVAL_DELAY_MS = 4000;
type PendingArrival = { timer: number; deliver: () => void };
const pendingArrivals = new Set<PendingArrival>();

function scheduleArrival(name: string, tutorialGate = false): void {
  const arrival: PendingArrival = { timer: 0, deliver: () => {} };
  arrival.deliver = () => {
    pendingArrivals.delete(arrival);
    queueStoryMessage("Даша", `Прибыли к «${name}». Приём.`);
    if (tutorialGate && getState().tutorialStep === "dispatch") {
      const state = getState();
      const template = FIND_TEMPLATES.find(f => f.id === "find-wrapper");
      if (template && !state.finds.some(f => f.id === template.id)) {
        updateState({ finds: [...state.finds, { ...template, day: state.day, status: "new" }] });
        addTableNews(1);
      }
      queueStoryMessage("Даша", "У ворот нашли старый фантик. Передали в штаб: используйте его для проверки инструментов реставрации.");
      completeTutorialStep("dispatch");
    }
    if (pendingArrivals.size === 0 && getState().hoursLeft === 0) {
      notify("Система", "Время на вылазку вышло. Завершите день, чтобы продолжить расследование утром.", "sys");
    }
  };
  arrival.timer = window.setTimeout(arrival.deliver, ARRIVAL_DELAY_MS);
  pendingArrivals.add(arrival);
}
function flushArrivals(): void {
  for (const arrival of [...pendingArrivals]) {
    window.clearTimeout(arrival.timer);
    arrival.deliver();
  }
}

btnSend.addEventListener("click", () => {
  if (!selected || (isTutorialRunning(getState().tutorialStep) && !(getState().tutorialStep === "dispatch" && selected.id === "gate")) || getState().hoursLeft < GROUP_TRIP_COST_HOURS) return;
  const state = getState();
  const target = selected;
  const tutorialGate = state.tutorialStep === "dispatch" && target.id === "gate";
  // story.ts listens for new visits and delivers finds immediately.
  queueStoryMessage("Даша", `Идём к «${target.name}». Приём.`);
  queueStoryMessage("Артём", "Приняли. Выдвигаемся.");
  updateState({
    hoursLeft: state.hoursLeft - GROUP_TRIP_COST_HOURS,
    visits: [...state.visits, target.id],
    groupPlaceId: target.id,
  });
  campMap?.setGroupPlace(target.id);
  selectPlace(null);
  scheduleArrival(target.name, tutorialGate);
});

function reportDay(report: DayReport): void {
  if (report.endedDay === 1) queueStoryMessage("Система", "Вылазка завершена. Началось утро ответов.", "sys");
  if (report.endedDay === 1) {
    queueStoryMessage("Даша", "Штаб, на сегодня вылазка закончена. Найденные материалы уже на реставрационном столе.");
    queueStoryMessage("Система", "Утро ответов. Найдите в электронном каталоге форму запроса в военный архив (поиск по слову «запрос»).", "story");
  } else {
    queueStoryMessage("Система", "Работа второго дня продлена. Можно завершить поисковые задания.", "sys");
  }
  queueStoryMessage("Система", `День ${report.newDay}. Доступно ${HOURS_PER_DAY} ч.`, "sys");
}
btnEndDay.addEventListener("click", () => {
  if (isTutorialRunning(getState().tutorialStep)) return;
  flushArrivals();
  const report = endDay();
  selectPlace(null);
  reportDay(report);
});

initTabs();
initSpaces();
initNotifications();
bindTopbar();
bindFinds();
subscribe(refreshSendButton);
bindArchive();
bindCaseBoard();

// The first trip has already happened; the player examines its folder in HQ.
startTutorial();
initIntegratedDesktop();
initPrologue();
initStory(bindTutorial);

initCampMap(document.getElementById("pixi-host")!, PLACES, {
  onSelect: place => {
    if (place.id === getState().groupPlaceId && !(getState().tutorialStep === "dispatch" && place.id === "gate")) {
      selectPlace(null);
      notify("Штаб", `Группа уже находится у «${place.name}». Выберите другое место.`);
      return;
    }
    selectPlace(place);
    notify("Штаб", `Отметили на карте: ${place.name}.`);
  },
}).then(map => {
  campMap = map;
  map.setGroupPlace(getState().groupPlaceId);
}).catch(error => {
  console.error(error);
  notify("Система", "Не удалось запустить карту (Pixi). Проверьте консоль.", "sys");
});
