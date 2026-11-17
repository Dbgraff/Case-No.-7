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

type PendingArrival = { timer: number; deliver: () => void };
const pendingArrivals = new Set<PendingArrival>();



btnSend.addEventListener("click", () => {
  if (
    !selected ||
    isTutorialRunning(getState().tutorialStep) ||
    getState().hoursLeft < GROUP_TRIP_COST_HOURS
  ) {
    return;
  }

  const state = getState();
  const target = selected;

  // Сначала ставим сообщения о движении группы в очередь.
  queueStoryMessage(
    "Даша",
    `Идём к «${target.name}». Приём.`
  );

  queueStoryMessage(
    "Артём",
    "Приняли. Выдвигаемся."
  );

  queueStoryMessage(
    "Даша",
    `Прибыли к «${target.name}». Приём.`,
    "story",
    4000
  );

  // Только затем обновляем состояние.
  // Подписчик story.ts поставит сообщения о находках
  // после сообщений о прибытии.
  updateState({
    hoursLeft: state.hoursLeft - GROUP_TRIP_COST_HOURS,
    visits: [...state.visits, target.id],
    groupPlaceId: target.id,
  });

  campMap?.setGroupPlace(target.id);
  selectPlace(null);
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
