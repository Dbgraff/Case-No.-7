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
import { TUTORIAL_INTRO } from "./data/tutorial";
import { bindTutorial } from "./ui/computer/tutorial";
import { bindCaseBoard } from "./ui/computer/caseBoard";
import { initIntegratedDesktop } from "./ui/integratedDesktop";
import { initStory } from "./game/story";

let selected: Place | null = null;
let campMap: CampMap | null = null;

const btnSend = document.getElementById("btnSend") as HTMLButtonElement;
const btnEndDay = document.getElementById("btnEndDay") as HTMLButtonElement;
const placeLabel = document.getElementById("placeLabel")!;

function placeName(id: string): string {
  return PLACES.find(p => p.id === id)?.name ?? id;
}
function refreshSendButton(): void {
  btnSend.disabled = !selected || getState().hoursLeft < GROUP_TRIP_COST_HOURS;
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
    notify("Даша", `Прибыли к «${name}». Приём.`);
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
  if (!selected || getState().hoursLeft < GROUP_TRIP_COST_HOURS) return;
  const state = getState();
  const target = selected;
  // story.ts listens for new visits and delivers finds immediately.
  updateState({
    hoursLeft: state.hoursLeft - GROUP_TRIP_COST_HOURS,
    visits: [...state.visits, target.id],
    groupPlaceId: target.id,
  });
  campMap?.setGroupPlace(target.id);
  notify("Даша", `Идём к «${target.name}». Приём.`);
  notify("Артём", "Приняли. Выдвигаемся.");
  selectPlace(null);
  scheduleArrival(target.name);
});

function reportDay(report: DayReport): void {
  if (report.endedDay === 1) notify("Система", "Вылазка завершена. Началось утро ответов.", "sys");
  if (report.endedDay === 1) {
    notify("Даша", "Штаб, на сегодня вылазка закончена. Материалы, которые успели найти, уже на реставрационном столе.");
    notify("Система", "Наступило утро ответов. Поиск «запрос» в АРХИВЕ-81 откроет форму военного архива.", "story");
  } else {
    notify("Система", "Работа второго дня продлена. Можно завершить недостающие поисковые задания.", "sys");
  }
  notify("Система", `День ${report.newDay}. Доступно ${HOURS_PER_DAY} ч.`, "sys");
}
btnEndDay.addEventListener("click", () => {
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

if (startTutorial()) addTableNews(1);
if (isTutorialRunning(getState().tutorialStep)) {
  notify(TUTORIAL_INTRO.who, TUTORIAL_INTRO.text);
} else if (getState().day === 1 && getState().visits.length === 0) {
  notify("Даша", "Штаб, мы у ворот «Ракеты». Корпуса 1, 2 и 4 — третьего нет. Где размещалась «Искра» в 1975-м?");
}
bindTutorial();

initIntegratedDesktop();
initStory();

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
