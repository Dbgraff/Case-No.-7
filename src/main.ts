import "./style.css";
import { say } from "./ui/chat";
import { initTabs } from "./ui/tabs";
import { PLACES, type Place } from "./map/places";
import { initCampMap, type CampMap } from "./map/campMap";

/** Place currently chosen on the map (not yet visited). */
let selected: Place | null = null;
let campMap: CampMap | null = null;

const btnSend = document.getElementById("btnSend") as HTMLButtonElement;
const placeLabel = document.getElementById("placeLabel")!;

/**
 * Updates the selected place and the "send group" controls.
 * @param {Place | null} p - New selection, or `null` to clear it.
 * @returns {void}
 */
function selectPlace(p: Place | null): void {
  selected = p;
  btnSend.disabled = !p;
  placeLabel.textContent = p ? p.name : "место не выбрано";
  campMap?.setSelected(p ? p.id : null);
}

btnSend.addEventListener("click", () => {
  if (!selected) return;
  say("Даша", `Идём к «${selected.name}». Приём.`, "find");
  say("Артём", "Приняли. Выдвигаемся.");
  selectPlace(null);
});

/* ===== boot ===== */
initTabs();

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
  