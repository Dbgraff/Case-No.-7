
import "./style.css";

import { initNotifications, notify } from "./ui/computer/notifications";
import { addTableNews, initSpaces } from "./ui/spaces";
import { initTabs } from "./ui/computer/tabs";
import { bindFinds } from "./ui/table/finds";
import { bindTopbar } from "./ui/computer/topbar";
import { endDay, type DayReport } from "./game/endDay";

import {
  GROUP_TRIP_COST_HOURS,
  HOURS_PER_DAY,
  getState,
  subscribe,
  updateState,
} from "./core/state";

import { PLACES, type Place } from "./data/places";
import { initCampMap, type CampMap } from "./map/campMap";
import { bindArchive } from "./ui/computer/archive";
import { startTutorial } from "./game/tutorial";
import { isTutorialRunning } from "./game/tutorial/steps";
import { TUTORIAL_INTRO } from "./data/tutorial";
import { bindTutorial } from "./ui/computer/tutorial";
import { bindCaseBoard } from "./ui/computer/caseBoard";

import { initIntegratedDesktop } from "./ui/integratedDesktop";

/**
 * Currently selected location on the camp map.
 */
let selected: Place | null = null;

/**
 * PixiJS camp map instance.
 */
let campMap: CampMap | null = null;

/**
 * Main game controls.
 */
const btnSend = document.getElementById(
  "btnSend",
) as HTMLButtonElement;

const btnEndDay = document.getElementById(
  "btnEndDay",
) as HTMLButtonElement;

const placeLabel = document.getElementById(
  "placeLabel",
)!;

/**
 * Returns the display name of a location.
 */
function placeName(id: string): string {
  return PLACES.find((place) => place.id === id)?.name ?? id;
}

/**
 * Updates availability of the group departure button.
 */
function refreshSendButton(): void {
  btnSend.disabled =
    !selected ||
    getState().hoursLeft < GROUP_TRIP_COST_HOURS;
}

/**
 * Selects or clears the currently marked location.
 */
function selectPlace(place: Place | null): void {
  selected = place;

  refreshSendButton();

  placeLabel.textContent = place
    ? place.name
    : "место не выбрано";

  campMap?.setSelected(place ? place.id : null);
}

/**
 * Delay before the group reports arrival.
 */
const ARRIVAL_DELAY_MS = 4000;

/**
 * A scheduled arrival notification.
 */
type PendingArrival = {
  timer: number;
  deliver: () => void;
};

const pendingArrivals = new Set<PendingArrival>();

/**
 * Schedules the group's arrival message.
 */
function scheduleArrival(name: string): void {
  const arrival: PendingArrival = {
    timer: 0,
    deliver: () => {},
  };

  arrival.deliver = () => {
    pendingArrivals.delete(arrival);

    notify(
      "Даша",
      `Прибыли к «${name}». Приём.`,
    );

    if (
      pendingArrivals.size === 0 &&
      getState().hoursLeft === 0
    ) {
      notify(
        "Система",
        "Солнце село. Выходов на сегодня больше нет — завершите день.",
        "sys",
      );
    }
  };

  arrival.timer = window.setTimeout(
    arrival.deliver,
    ARRIVAL_DELAY_MS,
  );

  pendingArrivals.add(arrival);
}

/**
 * Immediately delivers pending arrival messages.
 *
 * Called before ending a day so that notifications
 * remain in chronological order.
 */
function flushArrivals(): void {
  for (const arrival of [...pendingArrivals]) {
    window.clearTimeout(arrival.timer);
    arrival.deliver();
  }
}

/**
 * Send the search group to the selected location.
 */
btnSend.addEventListener("click", () => {
  if (
    !selected ||
    getState().hoursLeft < GROUP_TRIP_COST_HOURS
  ) {
    return;
  }

  const state = getState();
  const target = selected;

  updateState({
    hoursLeft:
      state.hoursLeft - GROUP_TRIP_COST_HOURS,

    visits: [
      ...state.visits,
      target.id,
    ],

    groupPlaceId: target.id,
  });

  campMap?.setGroupPlace(target.id);

  notify(
    "Даша",
    `Идём к «${target.name}». Приём.`,
  );

  notify(
    "Артём",
    "Приняли. Выдвигаемся.",
  );

  selectPlace(null);

  scheduleArrival(target.name);
});

/**
 * Reports the results of the group's trips.
 *
 * Finds are added to the restoration table
 * by the existing game logic.
 */
function reportDay(report: DayReport): void {
  notify(
    "Система",
    `День ${report.endedDay} завершён.`,
    "sys",
  );

  if (report.trips.length === 0) {
    notify(
      "Даша",
      "Сегодня выходов не было. Ждём новых указаний. Приём.",
    );
  }

  let foundCount = 0;

  for (const trip of report.trips) {
    const place = placeName(trip.placeId);

    if (trip.find) {
      foundCount++;

      notify(
        trip.find.foundBy,
        `«${place}»: нашли «${trip.find.title}». ${trip.find.circumstances} Приём.`,
        "story",
      );
    } else {
      notify(
        "Даша",
        `«${place}»: ничего нового. Приём.`,
      );
    }
  }

  if (foundCount > 0) {
    addTableNews(foundCount);

    notify(
      "Система",
      "Новые находки — на реставрационном столе.",
      "sys",
    );
  }

  notify(
    "Система",
    `Начался день ${report.newDay}. До заката ${HOURS_PER_DAY} ч.`,
    "sys",
  );
}

/**
 * Finish the current day.
 */
btnEndDay.addEventListener("click", () => {
  flushArrivals();

  const report = endDay();

  selectPlace(null);

  reportDay(report);
});

/* =====================================================
   GAME INITIALIZATION
   ===================================================== */

/**
 * Initialize the original game systems first.
 *
 * These functions connect the real game mechanics
 * to the existing DOM elements.
 */
initTabs();
initSpaces();
initNotifications();
bindTopbar();
bindFinds();

subscribe(refreshSendButton);

bindArchive();
bindCaseBoard();

/* =====================================================
   TUTORIAL
   ===================================================== */

if (startTutorial()) {
  addTableNews(1);
}

if (isTutorialRunning(getState().tutorialStep)) {
  notify(
    TUTORIAL_INTRO.who,
    TUTORIAL_INTRO.text,
  );
} else {
  notify(
    "Даша",
    "Штаб, мы у ворот «Ракеты». До заката пять часов. Корпуса 1, 2 и 4 — третьего нет. Где жила «Искра»?",
  );

  notify(
    "Командир",
    "Поиск по архиву бесплатный. Выходы группы стоят времени. Сначала разберитесь в документах, потом отправляйте ребят.",
  );
}

bindTutorial();

/* =====================================================
   DESKTOP INTEGRATION
   ===================================================== */

/**
 * Connect the existing game panels to the desktop UI.
 *
 * Creates:
 * - independent draggable windows;
 * - Dock and desktop shortcuts;
 * - monitor/table workspace switch;
 * - window minimize/maximize/pin controls.
 *
 * Does not recreate or replace restoration mechanics.
 */
initIntegratedDesktop();

/* =====================================================
   PIXIJS CAMP MAP
   ===================================================== */

/**
 * Initialize the actual camp map.
 *
 * The desktop integration moves #pixi-host
 * into the map window while preserving its identity.
 */
initCampMap(
  document.getElementById("pixi-host")!,
  PLACES,
  {
    onSelect: (place) => {
      if (
        place.id === getState().groupPlaceId
      ) {
        selectPlace(null);

        notify(
          "Штаб",
          `Группа уже находится у «${place.name}». Выберите другое место.`,
        );

        return;
      }

      selectPlace(place);

      notify(
        "Штаб",
        `Отметили на карте: ${place.name}.`,
      );
    },
  },
)
  .then((map) => {
    campMap = map;

    map.setGroupPlace(
      getState().groupPlaceId,
    );
  })
  .catch((error) => {
    console.error(error);

    notify(
      "Система",
      "Не удалось запустить карту (Pixi). Проверьте консоль.",
      "sys",
    );
  });
