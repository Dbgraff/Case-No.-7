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
import { startTutorial } from "./game/tutorial";
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

function placeName(id: string): string {
  return PLACES.find(p => p.id === id)?.name ?? id;
}
function refreshSendButton(): void {
  btnSend.disabled = !selected || isTutorialRunning(getState().tutorialStep) || getState().hoursLeft < GROUP_TRIP_COST_HOURS;
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

function scheduleArrival(name: string): void {
  const arrival: PendingArrival = { timer: 0, deliver: () => {} };
  arrival.deliver = () => {
    pendingArrivals.delete(arrival);
    queueStoryMessage("Даша", `Прибыли к «${name}». Приём.`);
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
  if (!selected || isTutorialRunning(getState().tutorialStep) || getState().hoursLeft < GROUP_TRIP_COST_HOURS) return;
  const state = getState();
  const target = selected;
  // story.ts listens for new visits and delivers finds immediately.
  updateState({
    hoursLeft: state.hoursLeft - GROUP_TRIP_COST_HOURS,
    visits: [...state.visits, target.id],
    groupPlaceId: target.id,
  });
  campMap?.setGroupPlace(target.id);
  queueStoryMessage("Даша", `Идём к «${target.name}». Приём.`);
  queueStoryMessage("Артём", "Приняли. Выдвигаемся.");
  selectPlace(null);
  scheduleArrival(target.name);
});

function reportDay(report: DayReport): void {
  if (report.endedDay === 1) queueStoryMessage("Система", "Вылазка завершена. Началось утро ответов.", "sys");
  if (report.endedDay === 1) {
    queueStoryMessage("Даша", "Штаб, на сегодня вылазка закончена. Найденные материалы уже на реставрационном столе.");
    queueStoryMessage("Система", "Утро ответов. Поиск «запрос» в АРХИВЕ-81 откроет форму военного архива.", "story");
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

// The story opens with Galina, then the training, then delayed field messages.
if (startTutorial()) addTableNews(1);
initIntegratedDesktop();
initStory(bindTutorial);

initCampMap(document.getElementById("pixi-host")!, PLACES, {
  onSelect: place => {
    if (place.id === getState().groupPlaceId) {
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
