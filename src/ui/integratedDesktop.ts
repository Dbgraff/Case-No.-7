
import "../desktop/style.css";
import "./integratedDesktop.css";

import {
  getActiveSpace,
  onSpaceChange,
  showSpace,
  type SpaceId,
} from "./spaces";

type App = "browser" | "case" | "notes" | "chat";
type GameTab = "hq" | "archive" | "case";

interface WindowState {
  open: boolean;
  minimized: boolean;
  pinned: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}

const apps: App[] = ["browser", "case", "notes", "chat"];

const appInfo: Record<App, { title: string; color: string }> = {
  browser: { title: "Браузер", color: "blue" },
  case: { title: "Дело № 7", color: "amber" },
  notes: { title: "Заметки", color: "yellow" },
  chat: { title: "Связь", color: "green" },
};

const defaults: Record<App, WindowState> = {
  browser: {
    open: true,
    minimized: false,
    pinned: false,
    maximized: false,
    x: 115,
    y: 105,
    width: 850,
    height: 620,
    z: 2,
  },
  case: {
    open: false,
    minimized: false,
    pinned: false,
    maximized: false,
    x: 210,
    y: 130,
    width: 640,
    height: 610,
    z: 3,
  },
  notes: {
    open: false,
    minimized: false,
    pinned: false,
    maximized: false,
    x: 270,
    y: 155,
    width: 650,
    height: 510,
    z: 4,
  },
  chat: {
    open: true,
    minimized: false,
    pinned: false,
    maximized: false,
    x: Math.max(20, window.innerWidth - 375),
    y: 135,
    width: 335,
    height: 490,
    z: 5,
  },
};

const STORAGE_KEY = "case7-integrated-windows-v2";

function icon(name: App | "trash", size = 27): string {
  const paths: Record<App | "trash", string> = {
    browser: `
      <circle cx="12" cy="12" r="9"/>
      <path d="M3 12h18"/>
      <path d="M12 3c-3 3-4 6-4 9s1 6 4 9"/>
      <path d="M12 3c3 3 4 6 4 9s-1 6-4 9"/>
    `,
    case: `
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>
      <path d="M3 10h18"/>
    `,
    notes: `
      <rect x="5" y="3" width="14" height="18" rx="2"/>
      <path d="M9 8h6M9 12h6M9 16h4"/>
    `,
    chat: `
      <path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.4-4.1-1.1L3 21l1.9-4.5A8.5 8.5 0 1 1 20 11.5z"/>
      <path d="M8 11h8M8 14h5"/>
    `,
    trash: `
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>
      <path d="M10 11v6M14 11v6"/>
    `,
  };

  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${paths[name]}
    </svg>
  `;
}

function appIcon(app: App): string {
  return `
    <span class="app-icon icon-${appInfo[app].color}">
      ${icon(app)}
    </span>
  `;
}

function loadWindows(): Record<App, WindowState> {
  const result = structuredClone(defaults);

  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as Partial<Record<App, Partial<WindowState>>>;

    for (const app of apps) {
      const value = saved[app];
      if (!value) continue;

      for (const key of [
        "x",
        "y",
        "width",
        "height",
        "z",
      ] as const) {
        const number = value[key];

        if (
          typeof number === "number" &&
          Number.isFinite(number)
        ) {
          result[app][key] = number;
        }
      }

      for (const key of [
        "open",
        "minimized",
        "pinned",
        "maximized",
      ] as const) {
        const flag = value[key];

        if (typeof flag === "boolean") {
          result[app][key] = flag;
        }
      }
    }
  } catch {
    console.warn(
      "Не удалось восстановить расположение окон",
    );
  }

  return result;
}

export function initIntegratedDesktop(): void {
  const root = document.getElementById("app");
  const computer = document.getElementById("spaceComputer");
  const table = document.getElementById("spaceTable");
  const spaces = document.getElementById("spaces");
  const topbar = document.querySelector<HTMLElement>(".topbar");
  const tabs = document.getElementById("tabs");

  const hq = document.querySelector<HTMLElement>(
    '[data-pane="hq"]',
  );

  const archive = document.querySelector<HTMLElement>(
    '[data-pane="archive"]',
  );

  const casePane = document.querySelector<HTMLElement>(
    '[data-pane="case"]',
  );

  const map = document.querySelector<HTMLElement>(".map-wrap");
  const radio = document.querySelector<HTMLElement>(".radio");

  if (
    !root ||
    !computer ||
    !table ||
    !spaces ||
    !topbar ||
    !tabs ||
    !hq ||
    !archive ||
    !casePane ||
    !map ||
    !radio
  ) {
    console.error(
      "Desktop: не найдены элементы игровой страницы",
    );
    return;
  }

  if (root.classList.contains("integrated-desktop")) {
    return;
  }

  const safeTabs = tabs;
  const safeTable = table;
  const safeRoot = root;

  root.classList.add("integrated-desktop");

  const shell = document.createElement("main");
  shell.className = "game-shell id-shell";

  shell.innerHTML = `
    <div class="desktop-background">
      <div class="wallpaper-orb orb-one"></div>
      <div class="wallpaper-orb orb-two"></div>
      <div class="wallpaper-orb orb-three"></div>
    </div>

    <header class="system-menubar">
      <div class="menu-left">
        <img
          class="system-emblem"
          src="/zapad81.png"
          alt="Эмблема Запад-81"
          title="ВТСО Запад-81"
        />

        <strong class="menu-app-name">Браузер</strong>
        <span>Файл</span>
        <span>Правка</span>
        <span>Вид</span>
      </div>

      <div class="menu-right">
        <div id="idGameResources"></div>

        <button
          id="reset-layout"
          class="menu-action"
          type="button"
        >
          Сброс окон
        </button>

        <span id="system-clock"></span>
      </div>
    </header>

    <div class="id-monitor">
      <div
        class="desktop-shortcuts"
        id="idShortcuts"
      ></div>

      <div
        class="desktop-windows"
        id="idWindows"
      ></div>

      <nav
        class="dock"
        id="idDock"
        aria-label="Приложения"
      ></nav>
    </div>

    <div class="id-table-workspace" hidden>
      <div
        class="id-table-content"
        id="idTableContent"
      ></div>
    </div>

    <div class="workspace-switch">
      <button
        type="button"
        data-workspace="computer"
        class="active"
      >
        ▣ <span>Монитор</span>
      </button>

      <button
        type="button"
        data-workspace="table"
      >
        ▤ <span>Стол</span>
      </button>
    </div>
  `;

  root.appendChild(shell);

  const windowHost =
    shell.querySelector<HTMLElement>("#idWindows");

  const shortcuts =
    shell.querySelector<HTMLElement>("#idShortcuts");

  const dock =
    shell.querySelector<HTMLElement>("#idDock");

  const tableHost =
    shell.querySelector<HTMLElement>("#idTableContent");

  const tableWorkspace =
    shell.querySelector<HTMLElement>(".id-table-workspace");

  const monitor =
    shell.querySelector<HTMLElement>(".id-monitor");

  const resources =
    shell.querySelector<HTMLElement>("#idGameResources");

  const menuTitle =
    shell.querySelector<HTMLElement>(".menu-app-name");

  if (
    !windowHost ||
    !shortcuts ||
    !dock ||
    !tableHost ||
    !tableWorkspace ||
    !monitor ||
    !resources ||
    !menuTitle
  ) {
    throw new Error(
      "Desktop: не удалось создать рабочий стол",
    );
  }

  const safeWindowHost = windowHost;
  const safeShortcuts = shortcuts;
  const safeDock = dock;
  const safeMonitor = monitor;
  const safeTableWorkspace = tableWorkspace;
  const safeMenuTitle = menuTitle;

  resources.appendChild(topbar);
  tableHost.appendChild(table);

  const content: Partial<Record<App, HTMLElement>> = {
    browser: archive,
    case: casePane,
    chat: radio,
  };

  const windows = loadWindows();

  const elements = {} as Record<App, HTMLElement>;
  const bodies = {} as Record<App, HTMLElement>;

  let zIndex = Math.max(
    10,
    ...apps.map((app) => windows[app].z),
  );

  let activeApp: App = "browser";

  function saveWindows(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(windows),
      );
    } catch {
      console.warn(
        "Не удалось сохранить расположение окон",
      );
    }
  }

  function updateClock(): void {
    const clock = shell.querySelector("#system-clock");

    if (clock) {
      clock.textContent = new Date().toLocaleString(
        "ru-RU",
        {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        },
      );
    }
  }

  function clamp(app: App): void {
    const state = windows[app];
    const minWidth = app === "chat" ? 280 : 340;

    const maxWidth = Math.max(
      200,
      window.innerWidth - 20,
    );

    const maxHeight = Math.max(
      180,
      window.innerHeight - 125,
    );

    state.width = Math.min(
      maxWidth,
      Math.max(
        Math.min(minWidth, maxWidth),
        state.width,
      ),
    );

    state.height = Math.min(
      maxHeight,
      Math.max(
        Math.min(300, maxHeight),
        state.height,
      ),
    );

    state.x = Math.max(
      0,
      Math.min(
        state.x,
        Math.max(0, window.innerWidth - state.width),
      ),
    );

    state.y = Math.max(
      35,
      Math.min(
        state.y,
        Math.max(35, window.innerHeight - 90),
      ),
    );
  }

  function updateGeometry(app: App): void {
    const state = windows[app];
    const element = elements[app];

    element.classList.toggle(
      "is-maximized",
      state.maximized,
    );

    element.style.left = `${state.x}px`;
    element.style.top = `${state.y}px`;
    element.style.width = `${state.width}px`;
    element.style.height = `${state.height}px`;

    element.style.zIndex = String(
      state.z + (state.pinned ? 1000 : 0),
    );

    const pin =
      element.querySelector<HTMLButtonElement>(
        ".window-pin",
      );

    if (pin) {
      pin.classList.toggle(
        "is-pinned",
        state.pinned,
      );

      pin.setAttribute(
        "aria-pressed",
        String(state.pinned),
      );
    }
  }

  function updateVisibility(): void {
    for (const app of apps) {
      elements[app].hidden =
        !windows[app].open ||
        windows[app].minimized;
    }

    safeDock
      .querySelectorAll<HTMLElement>("[data-open]")
      .forEach((button) => {
        const app = button.dataset.open as App;

        button.querySelector(".dock-dot")?.remove();

        if (
          windows[app].open &&
          !windows[app].minimized
        ) {
          const dot = document.createElement("span");
          dot.className = "dock-dot";
          button.appendChild(dot);
        }
      });
  }

  function focus(app: App): void {
    activeApp = app;
    windows[app].z = ++zIndex;

    safeMenuTitle.textContent =
      appInfo[app].title;

    for (const id of apps) {
      updateGeometry(id);
    }

    saveWindows();
  }

  function openApp(app: App): void {
    windows[app].open = true;
    windows[app].minimized = false;

    focus(app);
    updateVisibility();

    if (app === "browser") {
      window.dispatchEvent(new Event("resize"));
    }
  }

  function closeApp(app: App): void {
    windows[app].open = false;
    windows[app].minimized = false;

    updateVisibility();
    saveWindows();
  }

  function minimizeApp(app: App): void {
    windows[app].minimized = true;

    updateVisibility();
    saveWindows();
  }

  function maximizeApp(app: App): void {
    windows[app].maximized =
      !windows[app].maximized;

    focus(app);

    window.dispatchEvent(new Event("resize"));
  }

  function togglePin(app: App): void {
    windows[app].pinned =
      !windows[app].pinned;

    focus(app);
  }

  function dragWindow(
    header: HTMLElement,
    app: App,
  ): void {
    header.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0) return;

        if (
          (event.target as HTMLElement).closest("button")
        ) {
          return;
        }

        if (windows[app].maximized) return;

        focus(app);

        const startX = event.clientX;
        const startY = event.clientY;

        const originalX = windows[app].x;
        const originalY = windows[app].y;

        header.setPointerCapture(event.pointerId);

        const move = (e: PointerEvent) => {
          windows[app].x = Math.max(
            0,
            Math.min(
              window.innerWidth -
                elements[app].offsetWidth,
              originalX + e.clientX - startX,
            ),
          );

          windows[app].y = Math.max(
            35,
            Math.min(
              window.innerHeight - 90,
              originalY + e.clientY - startY,
            ),
          );

          elements[app].style.left =
            `${windows[app].x}px`;

          elements[app].style.top =
            `${windows[app].y}px`;
        };

        const stop = () => {
          header.removeEventListener(
            "pointermove",
            move,
          );

          header.removeEventListener(
            "pointerup",
            stop,
          );

          header.removeEventListener(
            "pointercancel",
            stop,
          );

          saveWindows();
        };

        header.addEventListener(
          "pointermove",
          move,
        );

        header.addEventListener(
          "pointerup",
          stop,
        );

        header.addEventListener(
          "pointercancel",
          stop,
        );
      },
    );

    header.addEventListener(
      "dblclick",
      (event) => {
        if (
          (event.target as HTMLElement).closest("button")
        ) {
          return;
        }

        maximizeApp(app);
      },
    );
  }

  function resizeWindow(
    handle: HTMLElement,
    app: App,
  ): void {
    handle.addEventListener(
      "pointerdown",
      (event) => {
        if (
          event.button !== 0 ||
          windows[app].maximized
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        focus(app);

        const startX = event.clientX;
        const startY = event.clientY;

        const width = windows[app].width;
        const height = windows[app].height;

        handle.setPointerCapture(event.pointerId);

        const move = (e: PointerEvent) => {
          windows[app].width = Math.max(
            280,
            Math.min(
              window.innerWidth -
                windows[app].x - 10,
              width + e.clientX - startX,
            ),
          );

          windows[app].height = Math.max(
            250,
            Math.min(
              window.innerHeight -
                windows[app].y - 80,
              height + e.clientY - startY,
            ),
          );

          elements[app].style.width =
            `${windows[app].width}px`;

          elements[app].style.height =
            `${windows[app].height}px`;
        };

        const stop = () => {
          handle.removeEventListener(
            "pointermove",
            move,
          );

          handle.removeEventListener(
            "pointerup",
            stop,
          );

          handle.removeEventListener(
            "pointercancel",
            stop,
          );

          saveWindows();

          window.dispatchEvent(
            new Event("resize"),
          );
        };

        handle.addEventListener(
          "pointermove",
          move,
        );

        handle.addEventListener(
          "pointerup",
          stop,
        );

        handle.addEventListener(
          "pointercancel",
          stop,
        );
      },
    );
  }

  /*
   * CREATE ORIGINAL DESKTOP WINDOWS
   */

  for (const app of apps) {
    clamp(app);

    const element =
      document.createElement("section");

    element.className =
      `desktop-window window-${app}`;

    element.dataset.app = app;

    element.innerHTML = `
      <div class="window-header">
        <div class="traffic-lights">
          <button
            class="traffic-close"
            title="Закрыть"
          >×</button>

          <button
            class="traffic-minimize"
            title="Свернуть"
          >−</button>

          <button
            class="traffic-maximize"
            title="Развернуть"
          >＋</button>

          <span class="traffic-separator"></span>

          <button
            class="window-pin"
            title="Закрепить"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="m16 3 5 5-4 1-4 4-1 5-3-3-5 5"
              />
              <path d="m9 15-6 6"/>
            </svg>
          </button>
        </div>

        <span class="window-name">
          ${appInfo[app].title}
        </span>
      </div>

      <div class="window-content"></div>

      <div class="window-resize-handle"></div>
    `;

    safeWindowHost.appendChild(element);

    const body =
      element.querySelector<HTMLElement>(
        ".window-content",
      );

    const header =
      element.querySelector<HTMLElement>(
        ".window-header",
      );

    const resize =
      element.querySelector<HTMLElement>(
        ".window-resize-handle",
      );

    if (!body || !header || !resize) {
      throw new Error(
        `Не удалось создать окно ${app}`,
      );
    }

    // Эти переменные уже гарантированно не null.
    // Используем их во вложенных обработчиках.
    const safeBody: HTMLElement = body;
    const safeHeader: HTMLElement = header;
    const safeResize: HTMLElement = resize;

    elements[app] = element;
    bodies[app] = safeBody;

    if (app === "browser") {
      safeBody.innerHTML = `
        <div class="browser-toolbar">
          <div class="browser-navigation">
            <span>‹</span>
            <span>›</span>
            <span>↻</span>
          </div>

          <div class="browser-address">
            <span class="address-lock">⌁</span>
            archive.local
          </div>

          <span class="browser-menu">•••</span>
        </div>

        <div class="browser-tab-strip">
          <div class="browser-tab-active">
            ${icon("browser", 14)}
            <span>Электронный архив</span>
            <span class="tab-close">×</span>
          </div>

          <span class="new-tab">＋</span>
        </div>

        <div class="browser-page">
          <nav class="archive-nav">
            <div class="archive-logo">
              <span>А</span>
              ЭЛЕКТРОННЫЙ АРХИВ
            </div>

            <div class="archive-links">
              <button
                data-id-browser="archive"
                class="selected"
              >
                Каталог
              </button>

              <button data-id-browser="map">
                Карта лагеря
              </button>
            </div>
          </nav>

          <div class="id-browser-content"></div>
        </div>
      `;

      const browserContent =
        safeBody.querySelector<HTMLElement>(
          ".id-browser-content",
        );

      if (!browserContent) {
        throw new Error(
          "Нет содержимого браузера",
        );
      }

      const archiveHost =
        document.createElement("div");

      archiveHost.className =
        "id-archive-host";

      const mapHost =
        document.createElement("div");

      mapHost.className =
        "id-map-host";

      mapHost.hidden = true;

      archiveHost.appendChild(archive);
      mapHost.appendChild(map);

      browserContent.append(
        archiveHost,
        mapHost,
      );

      function showBrowserPage(
        page: "archive" | "map",
      ): void {
        archiveHost.hidden =
          page !== "archive";

        mapHost.hidden =
          page !== "map";

        safeBody
          .querySelectorAll<HTMLButtonElement>(
            "[data-id-browser]",
          )
          .forEach((button) => {
            button.classList.toggle(
              "selected",
              button.dataset.idBrowser === page,
            );
          });

        document.dispatchEvent(
          new CustomEvent("case7:browser-page", { detail: page }),
        );

        if (page === "map") {
          window.dispatchEvent(
            new Event("resize"),
          );
        }
      }

      safeBody
        .querySelectorAll<HTMLButtonElement>(
          "[data-id-browser]",
        )
        .forEach((button) => {
          button.addEventListener(
            "click",
            () => {
              showBrowserPage(
                button.dataset.idBrowser === "map"
                  ? "map"
                  : "archive",
              );
            },
          );
        });

      const tabObserver =
        new MutationObserver(() => {
          const selected =
            safeTabs.querySelector<HTMLButtonElement>(
              "button[data-tab].on",
            );

          const tab =
            selected?.dataset.tab as
              | GameTab
              | undefined;

          if (tab === "hq") {
            showBrowserPage("map");
            openApp("browser");
            openApp("chat");
          } else if (tab === "archive") {
            showBrowserPage("archive");
            openApp("browser");
          } else if (tab === "case") {
            openApp("case");
          }
        });

      tabObserver.observe(safeTabs, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    } else if (app === "notes") {
      safeBody.innerHTML = `
        <div class="notes-page">
          <aside class="notes-sidebar">
            <div class="notes-sidebar-heading">
              Заметки
            </div>

            <div class="note-selected">
              <strong>Дело № 7</strong>
              <small>Рабочие записи</small>
            </div>
          </aside>

          <div class="notes-editor">
            <div class="notes-date">
              ЛИЧНЫЕ ЗАМЕТКИ
            </div>

            <h2>Дело № 7</h2>

            <textarea
              id="notes-input"
              placeholder="Записывайте найденные сведения..."
            ></textarea>
          </div>
        </div>
      `;

      const notes =
        safeBody.querySelector<HTMLTextAreaElement>(
          "#notes-input",
        );

      if (notes) {
        notes.value =
          localStorage.getItem(
            "case7-monitor-notes",
          ) ?? "";

        notes.addEventListener(
          "input",
          () => {
            localStorage.setItem(
              "case7-monitor-notes",
              notes.value,
            );
          },
        );
      }
    } else if (app === "chat") {
      safeBody.innerHTML = `
        <div class="chat-app">
          <div class="chat-contact">
            <div class="contact-avatar">
              ${icon("chat", 20)}
            </div>

            <div>
              <strong>Поисковая группа</strong>

              <small>
                <span class="online-indicator"></span>
                На связи
              </small>
            </div>
          </div>

          <div class="id-chat-content"></div>
        </div>
      `;

      safeBody
        .querySelector(".id-chat-content")
        ?.appendChild(radio);
    } else {
      const gameContent = content[app];

      if (gameContent) {
        safeBody.appendChild(gameContent);
      }
    }

    element
      .querySelector(".traffic-close")
      ?.addEventListener(
        "click",
        () => closeApp(app),
      );

    element
      .querySelector(".traffic-minimize")
      ?.addEventListener(
        "click",
        () => minimizeApp(app),
      );

    element
      .querySelector(".traffic-maximize")
      ?.addEventListener(
        "click",
        () => maximizeApp(app),
      );

    element
      .querySelector(".window-pin")
      ?.addEventListener(
        "click",
        () => togglePin(app),
      );

    element.addEventListener(
      "pointerdown",
      () => {
        if (activeApp !== app) {
          focus(app);
        }
      },
    );

    dragWindow(safeHeader, app);
    resizeWindow(safeResize, app);

    updateGeometry(app);
  }

  /*
   * ORIGINAL DESKTOP SHORTCUTS
   */

  for (const app of [
    "case",
    "notes",
  ] as App[]) {
    const button =
      document.createElement("button");

    button.className =
      "desktop-shortcut";

    button.type = "button";

    button.innerHTML = `
      ${appIcon(app)}
      <span>${appInfo[app].title}</span>
    `;

    button.addEventListener(
      "click",
      () => openApp(app),
    );

    safeShortcuts.appendChild(button);
  }

  /*
   * ORIGINAL DOCK
   */

  for (const app of apps) {
    const button =
      document.createElement("button");

    button.className = "dock-item";
    button.type = "button";
    button.dataset.open = app;
    button.title = appInfo[app].title;
    button.innerHTML = appIcon(app);

    button.addEventListener(
      "click",
      () => openApp(app),
    );

    safeDock.appendChild(button);
  }

  const divider =
    document.createElement("div");

  divider.className =
    "dock-divider";

  const trash =
    document.createElement("span");

  trash.className =
    "dock-decoration";

  trash.title = "Корзина";

  trash.innerHTML = `
    <span class="app-icon icon-trash">
      ${icon("trash")}
    </span>
  `;

  safeDock.append(
    divider,
    trash,
  );

  /*
   * WORKSPACE SWITCH
   */

  function syncWorkspace(
    space: SpaceId,
  ): void {
    safeMonitor.hidden =
      space !== "computer";

    safeTableWorkspace.hidden =
      space !== "table";

    shell
      .querySelectorAll<HTMLButtonElement>(
        "[data-workspace]",
      )
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.workspace === space,
        );
      });
  }

  shell
    .querySelectorAll<HTMLButtonElement>(
      "[data-workspace]",
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const space =
            button.dataset.workspace;

          if (
            space === "computer" ||
            space === "table"
          ) {
            showSpace(space);
          }
        },
      );
    });

  /*
   * KEEP GAME PANES AVAILABLE
   */

  for (const pane of [
    archive,
    casePane,
  ]) {
    pane.hidden = false;

    new MutationObserver(() => {
      if (pane.hidden) {
        pane.hidden = false;
      }
    }).observe(pane, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
  }

  /*
   * RESET WINDOW POSITIONS
   */

  shell
    .querySelector("#reset-layout")
    ?.addEventListener(
      "click",
      () => {
        for (const app of apps) {
          windows[app] = {
            ...defaults[app],
          };

          clamp(app);
          updateGeometry(app);
        }

        saveWindows();
        updateVisibility();
      },
    );

  /*
   * WINDOW RESIZE
   */

  window.addEventListener(
    "resize",
    () => {
      for (const app of apps) {
        clamp(app);
        updateGeometry(app);
      }
    },
  );

  /*
   * CONNECT TO GAME SPACES
   */

  onSpaceChange(syncWorkspace);

  safeTable.hidden = false;

  computer.classList.add(
    "id-source-computer",
  );

  spaces.classList.add(
    "id-source-spaces",
  );

  safeRoot.dataset.integratedDesktop =
    "true";

  updateVisibility();
  syncWorkspace(getActiveSpace());
  updateClock();

  window.setInterval(
    updateClock,
    30000,
  );
}
