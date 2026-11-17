
import './style.css';
import {
  archiveRecords,
  initialMessages,
  type Message,
} from './data';

type App = 'browser' | 'case' | 'notes' | 'chat';
type Workspace = 'monitor' | 'table';
type BrowserTab = 'archive' | 'search' | 'help';

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

const root = document.querySelector<HTMLDivElement>('#desktop-root');
if (!root) throw new Error('Не найден элемент #desktop-root');

const apps: App[] = ['browser', 'case', 'notes', 'chat'];

const appInfo: Record<App, { title: string; color: string }> = {
  browser: { title: 'Браузер', color: 'blue' },
  case: { title: 'Дело № 7', color: 'amber' },
  notes: { title: 'Заметки', color: 'yellow' },
  chat: { title: 'Связь', color: 'green' },
};

const defaults: Record<App, WindowState> = {
  browser: {
    open: true, minimized: false, pinned: false,
    maximized: false, x: 115, y: 105,
    width: 850, height: 620, z: 2,
  },
  case: {
    open: false, minimized: false, pinned: false,
    maximized: false, x: 210, y: 130,
    width: 640, height: 610, z: 3,
  },
  notes: {
    open: false, minimized: false, pinned: false,
    maximized: false, x: 270, y: 155,
    width: 650, height: 510, z: 4,
  },
  chat: {
    open: true, minimized: false, pinned: false,
    maximized: false, x: Math.max(20, innerWidth - 375),
    y: 135, width: 335, height: 490, z: 5,
  },
};

const STORAGE_KEY = 'case7-desktop-windows-v1';

function loadWindows(): Record<App, WindowState> {
  const result = structuredClone(defaults);

  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '{}',
    ) as Partial<Record<App, Partial<WindowState>>>;

    for (const app of apps) {
      const item = saved[app];
      if (!item) continue;

      for (const key of [
        'x', 'y', 'width', 'height', 'z',
      ] as const) {
        if (Number.isFinite(item[key])) {
          result[app][key] = item[key] as number;
        }
      }

      for (const key of [
        'open', 'minimized', 'pinned', 'maximized',
      ] as const) {
        if (typeof item[key] === 'boolean') {
          result[app][key] = item[key] as boolean;
        }
      }
    }
  } catch {
    console.warn('Не удалось восстановить расположение окон');
  }

  return result;
}

const windows = loadWindows();

const state = {
  workspace: 'monitor' as Workspace,
  active: 'browser' as App,
  browserTab: 'archive' as BrowserTab,
  zIndex: Math.max(10, ...apps.map(app => windows[app].z)),
  search: '',
  notes: localStorage.getItem('case7-monitor-notes') ?? '',
  messages: [...initialMessages] as Message[],
};

function saveWindows(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
  } catch {
    console.warn('Не удалось сохранить расположение окон');
  }
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;',
  };

  return value.replace(/[&<>"']/g, char => entities[char]);
}

function icon(name: App | 'trash', size = 27): string {
  const paths: Record<App | 'trash', string> = {
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
    <svg width="${size}" height="${size}"
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
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

function getMinSize(app: App): { width: number; height: number } {
  return app === 'chat'
    ? { width: 280, height: 300 }
    : { width: 340, height: 300 };
}

function clampWindow(app: App): void {
  const win = windows[app];
  const min = getMinSize(app);

  const availableWidth = Math.max(200, innerWidth - 20);
  const availableHeight = Math.max(180, innerHeight - 125);

  win.width = Math.min(
    availableWidth,
    Math.max(Math.min(min.width, availableWidth), win.width),
  );

  win.height = Math.min(
    availableHeight,
    Math.max(Math.min(min.height, availableHeight), win.height),
  );

  win.x = Math.max(
    0,
    Math.min(win.x, Math.max(0, innerWidth - win.width)),
  );

  win.y = Math.max(
    35,
    Math.min(win.y, Math.max(35, innerHeight - 90)),
  );
}

function clampAllWindows(): void {
  apps.forEach(clampWindow);
  saveWindows();
}

clampAllWindows();

function windowZ(app: App): number {
  return (windows[app].pinned ? 1000 : 0) + windows[app].z;
}

function syncLayers(): void {
  root?.querySelectorAll<HTMLElement>('.desktop-window')
    .forEach(element => {
      const app = element.dataset.app as App;
      element.style.zIndex = String(windowZ(app));
    });
}

function focusApp(app: App, redraw = true): void {
  state.active = app;
  windows[app].z = ++state.zIndex;

  saveWindows();

  if (redraw) {
    render();
  } else {
    syncLayers();

    const title = root?.querySelector('.menu-app-name');
    if (title) title.textContent = appInfo[app].title;
  }
}

function openApp(app: App): void {
  windows[app].open = true;
  windows[app].minimized = false;
  focusApp(app);
}

function closeApp(app: App): void {
  windows[app].open = false;
  saveWindows();
  render();
}

function minimizeApp(app: App): void {
  windows[app].minimized = true;
  saveWindows();
  render();
}

function togglePin(app: App): void {
  windows[app].pinned = !windows[app].pinned;
  focusApp(app);
}

function toggleMaximize(app: App): void {
  windows[app].maximized = !windows[app].maximized;
  focusApp(app);
}

function resetWindowPositions(): void {
  for (const app of apps) {
    const current = windows[app];
    const original = defaults[app];

    current.x = original.x;
    current.y = original.y;
    current.width = original.width;
    current.height = original.height;
    current.maximized = false;
  }

  clampAllWindows();
  render();
}

function browserContent(): string {
  const tabs: [BrowserTab, string][] = [
    ['archive', 'Каталог'],
    ['search', 'Поиск'],
    ['help', 'Справка'],
  ];

  let page = '';

  if (state.browserTab === 'archive') {
    page = `
      <div class="archive-hero">
        <div class="breadcrumb">ГЛАВНАЯ / КАТАЛОГ</div>
        <span class="overline">ЭЛЕКТРОННЫЙ КАТАЛОГ</span>
        <h1>Архивные материалы</h1>
        <p>Поиск и изучение исторических документов.</p>
      </div>

      <div class="archive-content">
        <div class="section-heading">
          <div>
            <span class="overline">ДОСТУПНЫЕ МАТЕРИАЛЫ</span>
            <h2>Документы</h2>
          </div>
          <span class="count-label">
            ${archiveRecords.length} записи
          </span>
        </div>

        <div class="archive-records">
          ${archiveRecords.map((record, index) => `
            <article class="archive-record">
              <div class="record-symbol">
                ${['▤', '▦', '✉'][index % 3]}
              </div>
              <div class="record-main">
                <small>${escapeHtml(record.code)}</small>
                <h3>${escapeHtml(record.title)}</h3>
                <p>${escapeHtml(record.description)}</p>
              </div>
              <span class="record-status">
                ${escapeHtml(record.tag)}
              </span>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (state.browserTab === 'search') {
    page = `
      <div class="archive-content">
        <span class="overline">ПОИСК ПО КАТАЛОГУ</span>
        <h1>Поиск документов</h1>
        <p class="secondary-text">
          Введите фамилию, название или номер документа.
        </p>

        <form id="archive-search-form" class="archive-search">
          <input id="archive-search-input"
            value="${escapeHtml(state.search)}"
            placeholder="Введите запрос..."
            autocomplete="off"/>
          <button type="submit">Найти</button>
        </form>

        <div id="archive-search-results"></div>
      </div>
    `;
  }

  if (state.browserTab === 'help') {
    page = `
      <div class="archive-content">
        <span class="overline">СПРАВОЧНАЯ ИНФОРМАЦИЯ</span>
        <h1>Работа с архивом</h1>
        <p class="secondary-text">
          Проверяйте даты, имена и происхождение документов.
          Сопоставляйте сведения из разных источников.
        </p>
        <div class="help-card">
          <strong>Обратите внимание</strong>
          <p>Совпадение имени и фамилии не подтверждает
          личность человека.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="browser-toolbar">
      <div class="browser-navigation">
        <span>‹</span><span>›</span><span>↻</span>
      </div>
      <div class="browser-address">
        <span class="address-lock">⌁</span>
        archive.local
      </div>
      <span class="browser-menu">•••</span>
    </div>

    <div class="browser-tab-strip">
      <div class="browser-tab-active">
        ${icon('browser', 14)}
        <span>Электронный архив</span>
        <span class="tab-close">×</span>
      </div>
      <span class="new-tab">＋</span>
    </div>

    <div class="browser-page">
      <nav class="archive-nav">
        <div class="archive-logo">
          <span>А</span> ЭЛЕКТРОННЫЙ АРХИВ
        </div>

        <div class="archive-links">
          ${tabs.map(([id, label]) => `
            <button data-browser-tab="${id}"
              class="${state.browserTab === id ? 'selected' : ''}">
              ${label}
            </button>
          `).join('')}
        </div>
      </nav>
      ${page}
    </div>
  `;
}

function caseContent(): string {
  return `
    <div class="case-page">
      <div class="case-header">
        <span class="overline">РАБОЧЕЕ ДОСЬЕ / ИССЛЕДОВАНИЕ</span>
        <h1>Дело № 7</h1>
        <p>Материалы расследования</p>
      </div>

      <div class="case-paper">
        <div class="paper-top">
          <span>ЛИЧНОЕ ДЕЛО</span><span>№ 007</span>
        </div>
        <h2>Федотов<br>Иван Степанович</h2>
        <div class="paper-divider"></div>

        <dl>
          <div><dt>Год исчезновения</dt><dd>1942</dd></div>
          <div><dt>Регион</dt><dd>Смоленская область</dd></div>
          <div><dt>Статус</dt><dd>Пропал без вести</dd></div>
          <div><dt>Расследование</dt><dd>1975</dd></div>
        </dl>

        <div class="paper-footer">
          СВЕДЕНИЯ ТРЕБУЮТ ПРОВЕРКИ
        </div>
      </div>
    </div>
  `;
}

function notesContent(): string {
  return `
    <div class="notes-page">
      <aside class="notes-sidebar">
        <div class="notes-sidebar-heading">Заметки</div>
        <div class="note-selected">
          <strong>Дело № 7</strong>
          <small>Рабочие записи</small>
        </div>
      </aside>

      <div class="notes-editor">
        <div class="notes-date">ЛИЧНЫЕ ЗАМЕТКИ</div>
        <h2>Дело № 7</h2>
        <textarea id="notes-input"
          placeholder="Записывайте найденные сведения..."
        >${escapeHtml(state.notes)}</textarea>
      </div>
    </div>
  `;
}

function chatContent(): string {
  return `
    <div class="chat-app">
      <div class="chat-contact">
        <div class="contact-avatar">${icon('chat', 20)}</div>
        <div>
          <strong>Поисковая группа</strong>
          <small><span class="online-indicator"></span>
          На связи</small>
        </div>
        <span class="chat-more">•••</span>
      </div>

      <div class="chat-history">
        <div class="chat-day">Сегодня</div>

        ${state.messages.map(message => `
          <div class="chat-message ${message.mine ? 'outgoing' : ''}">
            <div class="message-author">
              ${escapeHtml(message.author)}
            </div>
            <div class="message-text">
              ${escapeHtml(message.text)}
            </div>
            <div class="message-time">
              ${escapeHtml(message.time)}
            </div>
          </div>
        `).join('')}
      </div>

      <form id="message-form" class="message-form">
        <input name="message"
          placeholder="Написать сообщение..."
          autocomplete="off" required/>
        <button type="submit" aria-label="Отправить">➤</button>
      </form>
    </div>
  `;
}

function appContent(app: App): string {
  switch (app) {
    case 'browser': return browserContent();
    case 'case': return caseContent();
    case 'notes': return notesContent();
    case 'chat': return chatContent();
  }
}

function windowMarkup(app: App): string {
  const win = windows[app];
  if (!win.open || win.minimized) return '';

  return `
    <section
      class="desktop-window window-${app}
        ${win.maximized ? 'is-maximized' : ''}"
      data-app="${app}"
      style="
        left:${win.x}px;
        top:${win.y}px;
        width:${win.width}px;
        height:${win.height}px;
        z-index:${windowZ(app)};
      "
    >
      <div class="window-header" data-drag="${app}">
        <div class="traffic-lights">
          <button data-close="${app}" class="traffic-close"
            title="Закрыть" aria-label="Закрыть">×</button>

          <button data-minimize="${app}" class="traffic-minimize"
            title="Свернуть" aria-label="Свернуть">−</button>

          <button data-maximize="${app}" class="traffic-maximize"
            title="${win.maximized ? 'Восстановить' : 'Развернуть'}"
            aria-label="${win.maximized ? 'Восстановить' : 'Развернуть'}">
            ${win.maximized ? '−' : '＋'}
          </button>

          <span class="traffic-separator"></span>

          <button data-pin="${app}"
            class="window-pin ${win.pinned ? 'is-pinned' : ''}"
            aria-pressed="${win.pinned}"
            title="${win.pinned ? 'Открепить' : 'Поверх остальных окон'}"
            aria-label="${win.pinned ? 'Открепить' : 'Закрепить'}">
            <svg viewBox="0 0 24 24" width="15" height="15"
              fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round"
              stroke-linejoin="round">
              <path d="m16 3 5 5-4 1-4 4-1 5-3-3-5 5"/>
              <path d="m9 9 6 6"/>
            </svg>
          </button>
        </div>

        <span class="window-name">${appInfo[app].title}</span>
      </div>

      <div class="window-content">${appContent(app)}</div>

      ${!win.maximized ? `
        <div class="window-resize-handle"
          data-resize="${app}"
          title="Изменить размер окна"
          aria-label="Изменить размер окна">
        </div>
      ` : ''}
    </section>
  `;
}

function monitorMarkup(): string {
  return `
    <div class="desktop-background">
      <div class="wallpaper-orb orb-one"></div>
      <div class="wallpaper-orb orb-two"></div>
      <div class="wallpaper-orb orb-three"></div>
    </div>

    <header class="system-menubar">
      <div class="menu-left">
        <img class="system-emblem" src="/zapad81.png"
          alt="Эмблема Запад-81" title="ВТСО Запад-81"/>

        <strong class="menu-app-name">
          ${appInfo[state.active].title}
        </strong>
        <span>Файл</span><span>Правка</span><span>Вид</span>
      </div>

      <div class="menu-right">
        <button id="reset-layout" class="menu-action"
          title="Сбросить расположение и размеры окон">
          Сброс окон
        </button>
        <span id="system-clock"></span>
      </div>
    </header>

    <div class="desktop-shortcuts">
      ${(['case', 'notes'] as App[]).map(app => `
        <button class="desktop-shortcut" data-open="${app}">
          ${appIcon(app)}
          <span>${appInfo[app].title}</span>
        </button>
      `).join('')}
    </div>

    <div class="desktop-windows">
      ${apps.map(windowMarkup).join('')}
    </div>

    <nav class="dock" aria-label="Приложения">
      ${apps.map(app => `
        <button class="dock-item" data-open="${app}"
          title="${appInfo[app].title}">
          ${appIcon(app)}
          ${windows[app].open && !windows[app].minimized
            ? '<span class="dock-dot"></span>'
            : ''}
        </button>
      `).join('')}

      <div class="dock-divider"></div>

      <span class="dock-decoration" title="Корзина">
        <span class="app-icon icon-trash">${icon('trash')}</span>
      </span>
    </nav>
  `;
}

function tableMarkup(): string {
  return `
    <div class="table-workspace">
      <div class="table-light"></div>
      <div class="table-heading">
        <span>РАБОЧАЯ ЗОНА / 02</span>
        <h1>Реставрационный стол</h1>
        <p>Пространство для работы с найденными материалами</p>
      </div>

      <div class="table-surface">
        <div class="table-folder"></div>
        <div class="table-document">
          <span>ДЕЛО № 7</span>
          <div class="document-lines"></div>
          <small>Материалы для восстановления</small>
        </div>
        <div class="table-pencil"></div>
      </div>

      <div class="table-placeholder">
        Здесь позже будут подключены мини-игры реставрации.
      </div>
    </div>
  `;
}

function render(): void {
  if (!root) return;

  root.innerHTML = `
    <main class="game-shell">
      ${state.workspace === 'monitor'
        ? monitorMarkup()
        : tableMarkup()}

      <div class="workspace-switch">
        <button data-workspace="monitor"
          class="${state.workspace === 'monitor' ? 'active' : ''}">
          ▣ <span>Монитор</span>
        </button>
        <button data-workspace="table"
          class="${state.workspace === 'table' ? 'active' : ''}">
          ▤ <span>Стол</span>
        </button>
      </div>
    </main>
  `;

  bindEvents();
  updateClock();
  updateSearchResults();
  scrollChat();
}

function updateClock(): void {
  const clock = root?.querySelector('#system-clock');
  if (!clock) return;

  clock.textContent = new Date().toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function updateSearchResults(): void {
  const target = root?.querySelector('#archive-search-results');
  if (!target || !state.search) return;

  const query = state.search.toLowerCase();

  const matches = archiveRecords.filter(record =>
    `${record.code} ${record.title} ${record.description}`
      .toLowerCase().includes(query),
  );

  target.innerHTML = `
    <div class="search-results-heading">
      Найдено: ${matches.length}
    </div>

    ${matches.map(record => `
      <div class="search-result">
        <small>${escapeHtml(record.code)}</small>
        <strong>${escapeHtml(record.title)}</strong>
        <p>${escapeHtml(record.description)}</p>
      </div>
    `).join('') || `
      <p class="secondary-text">Ничего не найдено.</p>
    `}
  `;
}

function scrollChat(): void {
  const history = root?.querySelector('.chat-history');
  if (history) history.scrollTop = history.scrollHeight;
}

function bindEvents(): void {
  if (!root) return;

  const onButtons = (
    selector: string,
    handler: (app: App) => void,
  ) => {
    root.querySelectorAll<HTMLButtonElement>(selector)
      .forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();

          const attribute = selector.slice(1, -1);
          const app = button.getAttribute(attribute) as App;
          handler(app);
        });
      });
  };

  onButtons('[data-open]', openApp);
  onButtons('[data-close]', closeApp);
  onButtons('[data-minimize]', minimizeApp);
  onButtons('[data-maximize]', toggleMaximize);
  onButtons('[data-pin]', togglePin);

  root.querySelectorAll<HTMLButtonElement>('[data-workspace]')
    .forEach(button => {
      button.addEventListener('click', () => {
        state.workspace = button.dataset.workspace as Workspace;
        render();
      });
    });

  root.querySelectorAll<HTMLButtonElement>('[data-browser-tab]')
    .forEach(button => {
      button.addEventListener('click', () => {
        state.browserTab = button.dataset.browserTab as BrowserTab;
        render();
      });
    });

  root.querySelector('#reset-layout')
    ?.addEventListener('click', resetWindowPositions);

  root.querySelector<HTMLTextAreaElement>('#notes-input')
    ?.addEventListener('input', event => {
      state.notes = (event.target as HTMLTextAreaElement).value;
      localStorage.setItem('case7-monitor-notes', state.notes);
    });

  root.querySelector<HTMLFormElement>('#archive-search-form')
    ?.addEventListener('submit', event => {
      event.preventDefault();

      state.search = root
        ?.querySelector<HTMLInputElement>('#archive-search-input')
        ?.value.trim() ?? '';

      updateSearchResults();
    });

  root.querySelector<HTMLFormElement>('#message-form')
    ?.addEventListener('submit', event => {
      event.preventDefault();

      const input = root?.querySelector<HTMLInputElement>(
        '#message-form input',
      );

      const text = input?.value.trim();
      if (!text) return;

      state.messages.push({
        author: 'Штаб',
        text,
        time: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        mine: true,
      });

      render();
    });

  root.querySelectorAll<HTMLElement>('.desktop-window')
    .forEach(element => {
      element.addEventListener('pointerdown', () => {
        focusApp(element.dataset.app as App, false);
      });
    });

  setupDragging();
  setupResizing();
}

function setupDragging(): void {
  root?.querySelectorAll<HTMLElement>('[data-drag]')
    .forEach(header => {
      const app = header.dataset.drag as App;

      header.addEventListener('dblclick', event => {
        if ((event.target as HTMLElement).closest('button')) return;
        toggleMaximize(app);
      });

      header.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement).closest('button')) return;
        if (windows[app].maximized) return;

        const element = header.closest<HTMLElement>('.desktop-window');
        if (!element) return;

        const startX = event.clientX;
        const startY = event.clientY;
        const initialX = windows[app].x;
        const initialY = windows[app].y;

        header.setPointerCapture(event.pointerId);

        const move = (e: PointerEvent) => {
          const maxX = Math.max(0, innerWidth - element.offsetWidth);
          const maxY = Math.max(35, innerHeight - 90);

          windows[app].x = Math.max(
            0,
            Math.min(maxX, initialX + e.clientX - startX),
          );

          windows[app].y = Math.max(
            35,
            Math.min(maxY, initialY + e.clientY - startY),
          );

          element.style.left = `${windows[app].x}px`;
          element.style.top = `${windows[app].y}px`;
        };

        const stop = () => {
          header.removeEventListener('pointermove', move);
          header.removeEventListener('pointerup', stop);
          header.removeEventListener('pointercancel', stop);
          saveWindows();
        };

        header.addEventListener('pointermove', move);
        header.addEventListener('pointerup', stop);
        header.addEventListener('pointercancel', stop);
      });
    });
}

function setupResizing(): void {
  root?.querySelectorAll<HTMLElement>('[data-resize]')
    .forEach(handle => {
      const app = handle.dataset.resize as App;

      handle.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        if (windows[app].maximized) return;

        event.stopPropagation();
        event.preventDefault();

        const element = handle.closest<HTMLElement>('.desktop-window');
        if (!element) return;

        focusApp(app, false);

        const startX = event.clientX;
        const startY = event.clientY;
        const initialWidth = windows[app].width;
        const initialHeight = windows[app].height;
        const min = getMinSize(app);

        handle.setPointerCapture(event.pointerId);

        const move = (e: PointerEvent) => {
          const maxWidth = Math.max(
            180,
            innerWidth - windows[app].x - 10,
          );

          const maxHeight = Math.max(
            180,
            innerHeight - windows[app].y - 80,
          );

          windows[app].width = Math.min(
            maxWidth,
            Math.max(
              Math.min(min.width, maxWidth),
              initialWidth + e.clientX - startX,
            ),
          );

          windows[app].height = Math.min(
            maxHeight,
            Math.max(
              Math.min(min.height, maxHeight),
              initialHeight + e.clientY - startY,
            ),
          );

          element.style.width = `${windows[app].width}px`;
          element.style.height = `${windows[app].height}px`;
        };

        const stop = () => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', stop);
          handle.removeEventListener('pointercancel', stop);
          saveWindows();
        };

        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', stop);
        handle.addEventListener('pointercancel', stop);
      });
    });
}

window.addEventListener('resize', () => {
  clampAllWindows();
  render();
});

render();
