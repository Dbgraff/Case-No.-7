
import "./integratedDesktop.css";

import { showSpace } from "./spaces";

type GameTab = "hq" | "archive" | "case";
type GameSpace = "computer" | "table";

const tabs: Record<GameTab, string> = {
  hq: "Связь с группой",
  archive: "Электронный архив",
  case: "Дело № 7",
};

function isGameTab(value: string | undefined): value is GameTab {
  return value === "hq" || value === "archive" || value === "case";
}

export function initIntegratedDesktop(): void {
  const app = document.getElementById("app");
  const computer = document.getElementById("spaceComputer");
  const table = document.getElementById("spaceTable");
  const topbar = document.querySelector<HTMLElement>(".topbar");
  const spaces = document.getElementById("spaces");
  const originalTabs = document.getElementById("tabs");

  if (
    !app ||
    !computer ||
    !table ||
    !topbar ||
    !spaces ||
    !originalTabs ||
    app.classList.contains("integrated-desktop")
  ) {
    return;
  }

  app.classList.add("integrated-desktop");

  const shell = document.createElement("div");
  shell.className = "id-shell";

  shell.innerHTML = `
    <header class="id-menubar">
      <div class="id-menu-brand">
        <img
          src="/zapad81.png"
          alt="Эмблема ВТСО Запад-81"
        />
        <strong>Дело № 7</strong>
        <span>Штаб поискового отряда</span>
      </div>

      <div class="id-menu-status"></div>
    </header>

    <main class="id-screen">
      <div class="id-monitor">
        <div class="id-desktop-shortcuts">
          <button type="button" data-game-tab="hq">
            <span class="id-shortcut-icon">◉</span>
            <span>Связь</span>
          </button>

          <button type="button" data-game-tab="archive">
            <span class="id-shortcut-icon">▤</span>
            <span>Архив</span>
          </button>

          <button type="button" data-game-tab="case">
            <span class="id-shortcut-icon">▣</span>
            <span>Дело № 7</span>
          </button>
        </div>

        <section class="id-window">
          <div class="id-window-titlebar">
            <div class="id-window-controls" aria-hidden="true">
              <i></i><i></i><i></i>
            </div>

            <span id="idWindowTitle">
              Связь с группой
            </span>
          </div>

          <div class="id-window-body"></div>
        </section>
      </div>

      <div class="id-table-view" hidden>
        <div class="id-table-caption">
          <div>
            <span>ДЕЛО № 7 / РАБОЧЕЕ МЕСТО</span>
            <h2>Реставрационный стол</h2>
          </div>

          <span>ОСМОТР И ВОССТАНОВЛЕНИЕ</span>
        </div>

        <div class="id-table-content"></div>
      </div>
    </main>

    <nav class="id-dock" aria-label="Рабочие пространства">
      <button
        type="button"
        data-id-space="computer"
        class="active"
      >
        <span>▣</span>
        Монитор
      </button>

      <button
        type="button"
        data-id-space="table"
      >
        <span>▤</span>
        Стол реставрации
      </button>
    </nav>
  `;

  app.appendChild(shell);

  const status = shell.querySelector<HTMLElement>(
    ".id-menu-status",
  );

  const windowBody = shell.querySelector<HTMLElement>(
    ".id-window-body",
  );

  const tableContent = shell.querySelector<HTMLElement>(
    ".id-table-content",
  );

  const monitor = shell.querySelector<HTMLElement>(
    ".id-monitor",
  );

  const tableView = shell.querySelector<HTMLElement>(
    ".id-table-view",
  );

  const title = shell.querySelector<HTMLElement>(
    "#idWindowTitle",
  );

  if (
    !status ||
    !windowBody ||
    !tableContent ||
    !monitor ||
    !tableView ||
    !title
  ) {
    return;
  }

  // Локальные ссылки после проверки на null.
  // TypeScript безопасно использует их во вложенных функциях.

  const safeOriginalTabs = originalTabs;
  const safeTitle = title;
  const safeMonitor = monitor;
  const safeTableView = tableView;

  // Перемещаем существующие игровые элементы.
  // Обработчики событий и состояние игры сохраняются.

  status.appendChild(topbar);
  windowBody.appendChild(computer);
  tableContent.appendChild(table);

  // Оригинальные переключатели остаются в DOM,
  // чтобы не нарушать существующую игровую логику.

  spaces.classList.add("id-original-spaces");
  app.appendChild(spaces);

  function activateTab(tab: GameTab): void {
    const original =
      safeOriginalTabs.querySelector<HTMLButtonElement>(
        `button[data-tab="${tab}"]`,
      );

    original?.click();

    safeTitle.textContent = tabs[tab];

    shell
      .querySelectorAll<HTMLElement>("[data-game-tab]")
      .forEach((button) => {
        button.classList.toggle(
          "selected",
          button.dataset.gameTab === tab,
        );
      });
  }

  function activateSpace(space: GameSpace): void {
    showSpace(space);

    safeMonitor.hidden = space !== "computer";
    safeTableView.hidden = space !== "table";

    shell
      .querySelectorAll<HTMLElement>("[data-id-space]")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.idSpace === space,
        );
      });

    window.dispatchEvent(new Event("resize"));
  }

  shell.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const tabButton =
      target.closest<HTMLElement>("[data-game-tab]");

    if (tabButton) {
      const tab = tabButton.dataset.gameTab;

      if (isGameTab(tab)) {
        activateSpace("computer");
        activateTab(tab);
      }

      return;
    }

    const spaceButton =
      target.closest<HTMLElement>("[data-id-space]");

    if (spaceButton) {
      const space = spaceButton.dataset.idSpace;

      if (space === "computer" || space === "table") {
        activateSpace(space);
      }
    }
  });

  // Синхронизация с переключениями,
  // которые запускаются из обучения или игры.

  const observer = new MutationObserver(() => {
    const active =
      safeOriginalTabs.querySelector<HTMLButtonElement>(
        "button[data-tab].on",
      );

    if (!active) {
      return;
    }

    const tab = active.dataset.tab;

    if (isGameTab(tab)) {
      safeTitle.textContent = tabs[tab];

      shell
        .querySelectorAll<HTMLElement>("[data-game-tab]")
        .forEach((button) => {
          button.classList.toggle(
            "selected",
            button.dataset.gameTab === tab,
          );
        });
    }
  });

  observer.observe(safeOriginalTabs, {
    attributes: true,
    subtree: true,
    attributeFilter: ["class"],
  });

  activateTab("hq");
  activateSpace("computer");
}
