
import "./deskLayout.css";

import { getState, subscribe } from "../../core/state";

import {
  FIND_STATUS_LABELS,
  FIND_TYPE_LABELS,
} from "../../game/finds";

import { PLACES } from "../../data/places";

export function initDeskLayout(): void {
  const desk = document.getElementById("spaceTable");
  const items = document.getElementById("deskItems");
  const inspect = document.getElementById("deskInspect");
  const header = desk?.querySelector(".desk-top");

  if (
    !desk ||
    !items ||
    !inspect ||
    !header ||
    desk.querySelector(".desk-preview")
  ) {
    return;
  }

  desk.classList.add("desk-redesign");

  // Заголовок рабочего пространства

  const heading = document.createElement("div");
  heading.className = "desk-heading";

  heading.innerHTML = `
    <span class="desk-heading-kicker">
      РАБОЧЕЕ ПРОСТРАНСТВО
    </span>

    <h2>Стол реставратора</h2>

    <p>
      Осмотр и восстановление найденных материалов
    </p>
  `;

  header.replaceChildren(heading);

  // Левая колонка: находки

  const itemsTitle = document.createElement("div");
  itemsTitle.className = "desk-panel-title";

  itemsTitle.innerHTML = `
    <span>01</span>
    <strong>Находки</strong>
    <small id="deskFindCount">0</small>
  `;

  const itemsPanel = document.createElement("div");
  itemsPanel.className = "desk-items-panel";
  itemsPanel.append(itemsTitle, items);

  // Центральная рабочая область

  const preview = document.createElement("section");
  preview.className = "desk-preview";

  preview.setAttribute(
    "aria-label",
    "Осмотр находки",
  );

  preview.innerHTML = `
    <div class="desk-preview-top">
      <span>02 / РАБОЧАЯ ПОВЕРХНОСТЬ</span>

      <span
        class="desk-preview-state"
        id="deskPreviewState"
      >
        ОЖИДАНИЕ
      </span>
    </div>

    <div class="desk-preview-workarea">
      <div
        class="desk-preview-corners"
        aria-hidden="true"
      ></div>

      <div
        class="desk-preview-object"
        id="deskPreviewObject"
      >
        <div class="desk-preview-placeholder">
          <div class="desk-placeholder-symbol">✦</div>

          <p>Выберите находку</p>

          <span>
            Предметы, переданные поисковой группой,
            появятся в списке слева.
          </span>
        </div>
      </div>
    </div>

    <div class="desk-preview-bottom">
      <span id="deskPreviewCaption">
        Объект не выбран
      </span>

      <span>ДЕЛО № 7</span>
    </div>
  `;

  // Правая колонка: информация и запуск мини-игр

  const inspectPanel = document.createElement("aside");
  inspectPanel.className = "desk-inspect-panel";

  const inspectTitle = document.createElement("div");
  inspectTitle.className = "desk-panel-title";

  inspectTitle.innerHTML = `
    <span>03</span>
    <strong>Информация</strong>
  `;

  inspectPanel.append(inspectTitle, inspect);

  desk.append(itemsPanel, preview, inspectPanel);

  const count = document.getElementById("deskFindCount");
  const object = document.getElementById("deskPreviewObject");
  const caption = document.getElementById("deskPreviewCaption");
  const stateLabel = document.getElementById("deskPreviewState");

  if (!object || !caption || !stateLabel) {
    return;
  }

  // Сохраняем проверенные ссылки для вложенных функций.

  const safeObject = object;
  const safeCaption = caption;
  const safeStateLabel = stateLabel;

  let selectedId: string | null = null;

  function renderPreview(): void {
    const finds = getState().finds;

    const find = finds.find(
      (item) => item.id === selectedId,
    );

    if (count) {
      count.textContent = String(finds.length);
    }

    safeObject.replaceChildren();

    // Пока предмет не выбран

    if (!find) {
      const placeholder = document.createElement("div");
      placeholder.className = "desk-preview-placeholder";

      const symbol = document.createElement("div");
      symbol.className = "desk-placeholder-symbol";
      symbol.textContent = "✦";

      const title = document.createElement("p");
      title.textContent = "Выберите находку";

      const hint = document.createElement("span");

      hint.textContent = finds.length
        ? "Нажмите на предмет в списке слева, чтобы изучить его."
        : "Завершите день после выхода группы — находки появятся здесь.";

      placeholder.append(symbol, title, hint);
      safeObject.appendChild(placeholder);

      safeCaption.textContent = "Объект не выбран";
      safeStateLabel.textContent = "ОЖИДАНИЕ";

      return;
    }

    // Данные выбранного предмета

    const type = FIND_TYPE_LABELS[find.type];
    const status = FIND_STATUS_LABELS[find.status];

    const place =
      PLACES.find((p) => p.id === find.placeId)?.name ??
      find.placeId;

    // Карточка осмотра

    const paper = document.createElement("div");

    paper.className =
      `desk-preview-paper type-${find.type}`;

    const paperMark = document.createElement("div");
    paperMark.className = "desk-paper-mark";
    paperMark.textContent = "МАТЕРИАЛЫ ДЕЛА № 7";

    const paperTitle = document.createElement("h3");
    paperTitle.textContent = find.title;

    const paperRule = document.createElement("div");
    paperRule.className = "desk-paper-rule";

    const paperDescription = document.createElement("p");
    paperDescription.textContent = find.description;

    const paperFooter = document.createElement("div");
    paperFooter.className = "desk-paper-footer";

    paperFooter.textContent =
      `${type} · День ${find.day}`;

    paper.append(
      paperMark,
      paperTitle,
      paperRule,
      paperDescription,
      paperFooter,
    );

    safeObject.appendChild(paper);

    safeCaption.textContent =
      `Место обнаружения: ${place}`;

    safeStateLabel.textContent =
      status.toUpperCase();
  }

  // Синхронизация выбора предмета с существующим
  // интерфейсом находок Милы.

  items.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest(".desk-item");

    if (!button || !items.contains(button)) {
      return;
    }

    const buttons = Array.from(
      items.querySelectorAll(".desk-item"),
    );

    const index = buttons.indexOf(button);
    const find = getState().finds[index];

    if (!find) {
      return;
    }

    selectedId = find.id;
    renderPreview();
  });

  // Обновление после изменений игрового состояния,
  // включая завершение реставрации.

  subscribe(() => {
    renderPreview();
  });

  renderPreview();
}
