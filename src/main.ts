import "./style.css";
import { say } from "./ui/chat";
import { initTabs } from "./ui/tabs";
import { bindFinds } from "./ui/finds";
import { bindTopbar } from "./ui/topbar";
import { endDay, type DayReport } from "./game/endDay";
import {
  GROUP_TRIP_COST_HOURS,
  HOURS_PER_DAY,
  getState,
  subscribe,
  updateState,
} from "./state";
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

btnSend.addEventListener("click", () => {
  if (!selected || getState().hoursLeft < GROUP_TRIP_COST_HOURS) return;
  const s = getState();
  updateState({
    hoursLeft: s.hoursLeft - GROUP_TRIP_COST_HOURS,
    visits: [...s.visits, selected.id],
    groupPlaceId: selected.id,
  });
  campMap?.setGroupPlace(selected.id);
  say("Даша", `Идём к «${selected.name}». Приём.`, "find");
  say("Артём", "Приняли. Выдвигаемся.");
  selectPlace(null);
  if (getState().hoursLeft === 0) {
    say("Система", "Солнце село. Выходов на сегодня больше нет — завершите день.", "sys");
  }
});

/**
 * Reports the results of the group's trips in the chat: a find with its
 * origin, or a message that nothing new was found.
 * @param {DayReport} report - Report returned by `endDay()`.
 * @returns {void}
 */
function reportDay(report: DayReport): void {
  say("Система", `День ${report.endedDay} завершён.`, "sys");

  if (report.trips.length === 0) {
    say("Даша", "Сегодня выходов не было. Ждём новых указаний. Приём.");
  }

  let foundCount = 0;
  for (const trip of report.trips) {
    const place = placeName(trip.placeId);
    if (trip.find) {
      foundCount++;
      say(
        trip.find.foundBy,
        `«${place}»: нашли «${trip.find.title}». ${trip.find.circumstances} Приём.`,
        "find",
      );
    } else {
      say("Даша", `«${place}»: ничего нового. Приём.`);
    }
  }

  if (foundCount > 0) {
    say("Система", "Новые находки — на вкладке «Находки».", "sys");
  }
  say("Система", `Начался день ${report.newDay}. До заката ${HOURS_PER_DAY} ч.`, "sys");
}

btnEndDay.addEventListener("click", () => {
  const report = endDay();
  selectPlace(null);
  reportDay(report);
});

/* ===== boot ===== */
initTabs();
bindTopbar();
bindFinds();
subscribe(refreshSendButton);

say(
  "Даша",
  "Штаб, мы у ворот «Ракеты». До заката пять часов. Корпуса 1, 2 и 4 — третьего нет. Где жила «Искра»?",
);
say(
  "Командир",
  "Поиск по архиву бесплатный. Выходы группы стоят времени. Сначала разберитесь в документах, потом отправляйте ребят.",
);

initCampMap(document.getElementById("pixi-host")!, PLACES, {
  onSelect: (p) => {
    if (p.id === getState().groupPlaceId) {
      selectPlace(null);
      say("Штаб", `Группа уже находится у «${p.name}». Выберите другое место.`);
      return;
    }
    selectPlace(p);
    say("Штаб", `Отметили на карте: ${p.name}.`);
  },
})
  .then((map) => {
    campMap = map;
    map.setGroupPlace(getState().groupPlaceId);
  })
  .catch((err) => {
    console.error(err);
    say("Система", "Не удалось запустить карту (Pixi). Проверьте консоль.", "sys");
  });
  