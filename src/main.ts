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
} from "./game/state";
import { PLACES, type Place } from "./map/places";
import { initCampMap, type CampMap } from "./map/campMap";

/** Place currently chosen on the map (not yet visited). */
let selected: Place | null = null;
let campMap: CampMap | null = null;

const btnSend = document.getElementById("btnSend") as HTMLButtonElement;
const btnEndDay = document.getElementById("btnEndDay") as HTMLButtonElement;
const placeLabel = document.getElementById("placeLabel")!;

/**
 * Returns the display name of a place by its id.
 * @param {string} id - Place id.
 * @returns {string} Place name (or the id if the place is unknown).
 */
function placeName(id: string): string {
  return PLACES.find((p) => p.id === id)?.name ?? id;
}

/**
 * Enables "send group" only when a place is chosen and there is enough time.
 * @returns {void}
 */
function refreshSendButton(): void {
  btnSend.disabled = !selected || getState().hoursLeft < GROUP_TRIP_COST_HOURS;
}

/**
 * Updates the selected place and the "send group" controls.
 * @param {Place | null} p - New selection, or `null` to clear it.
 * @returns {void}
 */
function selectPlace(p: Place | null): void {
  selected = p;
  refreshSendButton();
  placeLabel.textContent = p ? p.name : "место не выбрано";
  campMap?.setSelected(p ? p.id : null);
}

/** Delay before the group reports its arrival at a place, ms. */
const ARRIVAL_DELAY_MS = 4000;

/** A group arrival report that has been scheduled but not yet delivered. */
type PendingArrival = { timer: number; deliver: () => void };

const pendingArrivals = new Set<PendingArrival>();

/**
 * Schedules the group's arrival message. After the last pending arrival of a
 * day with no hours left, a "sunset" system notification follows.
 * @param {string} name - Name of the place the group is heading to.
 * @returns {void}
 */
function scheduleArrival(name: string): void {
  const arrival: PendingArrival = { timer: 0, deliver: () => {} };
  arrival.deliver = () => {
    pendingArrivals.delete(arrival);
    notify("Даша", `Прибыли к «${name}». Приём.`);
    if (pendingArrivals.size === 0 && getState().hoursLeft === 0) {
      notify(
        "Система",
        "Солнце село. Выходов на сегодня больше нет — завершите день.",
        "sys",
      );
    }
  };
  arrival.timer = window.setTimeout(arrival.deliver, ARRIVAL_DELAY_MS);
  pendingArrivals.add(arrival);
}

/**
 * Delivers all scheduled arrival messages immediately (used before the day
 * ends, so reports keep their order).
 * @returns {void}
 */
function flushArrivals(): void {
  for (const a of [...pendingArrivals]) {
    window.clearTimeout(a.timer);
    a.deliver();
  }
}

btnSend.addEventListener("click", () => {
  if (!selected || getState().hoursLeft < GROUP_TRIP_COST_HOURS) return;
  const s = getState();
  const target = selected;
  updateState({
    hoursLeft: s.hoursLeft - GROUP_TRIP_COST_HOURS,
    visits: [...s.visits, target.id],
    groupPlaceId: target.id,
  });
  campMap?.setGroupPlace(target.id);
  notify("Даша", `Идём к «${target.name}». Приём.`);
  notify("Артём", "Приняли. Выдвигаемся.");
  selectPlace(null);
  scheduleArrival(target.name);
});

/**
 * Reports the results of the group's trips in the chat: a find with its
 * origin, or a message that nothing new was found.
 * @param {DayReport} report - Report returned by `endDay()`.
 * @returns {void}
 */
function reportDay(report: DayReport): void {
  notify("Система", `День ${report.endedDay} завершён.`, "sys");

  if (report.trips.length === 0) {
    notify("Даша", "Сегодня выходов не было. Ждём новых указаний. Приём.");
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
      notify("Даша", `«${place}»: ничего нового. Приём.`);
    }
  }

  if (foundCount > 0) {
    addTableNews(foundCount);
    notify("Система", "Новые находки — на реставрационном столе.", "sys");
  }
  notify("Система", `Начался день ${report.newDay}. До заката ${HOURS_PER_DAY} ч.`, "sys");
}

btnEndDay.addEventListener("click", () => {
  flushArrivals();
  const report = endDay();
  selectPlace(null);
  reportDay(report);
});

/* ===== boot ===== */
initTabs();
initSpaces();
initNotifications();
bindTopbar();
bindFinds();
subscribe(refreshSendButton);

notify(
  "Даша",
  "Штаб, мы у ворот «Ракеты». До заката пять часов. Корпуса 1, 2 и 4 — третьего нет. Где жила «Искра»?",
);
notify(
  "Командир",
  "Поиск по архиву бесплатный. Выходы группы стоят времени. Сначала разберитесь в документах, потом отправляйте ребят.",
);

initCampMap(document.getElementById("pixi-host")!, PLACES, {
  onSelect: (p) => {
    if (p.id === getState().groupPlaceId) {
      selectPlace(null);
      notify("Штаб", `Группа уже находится у «${p.name}». Выберите другое место.`);
      return;
    }
    selectPlace(p);
    notify("Штаб", `Отметили на карте: ${p.name}.`);
  },
})
  .then((map) => {
    campMap = map;
    map.setGroupPlace(getState().groupPlaceId);
  })
  .catch((err) => {
    console.error(err);
    notify("Система", "Не удалось запустить карту (Pixi). Проверьте консоль.", "sys");
  });
  