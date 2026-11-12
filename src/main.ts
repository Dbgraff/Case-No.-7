import "./style.css";
import { say } from "./ui/chat";
import { initTabs } from "./ui/tabs";
import { bindTopbar } from "./ui/topbar";
import {
  GROUP_TRIP_COST_HOURS,
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
const placeLabel = document.getElementById("placeLabel")!;

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
  updateState({ hoursLeft: getState().hoursLeft - GROUP_TRIP_COST_HOURS });
  say("Даша", `Идём к «${selected.name}». Приём.`, "find");
  say("Артём", "Приняли. Выдвигаемся.");
  selectPlace(null);
  if (getState().hoursLeft === 0) {
    say("Система", "Солнце село. Выходов на сегодня больше нет.", "sys");
  }
});

/* ===== boot ===== */
initTabs();
bindTopbar();
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
    selectPlace(p);
    say("Штаб", `Отметили на карте: ${p.name}.`);
  },
})
  .then((map) => {
    campMap = map;
  })
  .catch((err) => {
    console.error(err);
    say("Система", "Не удалось запустить карту (Pixi). Проверьте консоль.", "sys");
  });
  