
import './style.css';
import { archiveRecords, initialMessages, type Message } from './data';

type App = 'archive' | 'case' | 'notes' | 'chat';
type Workspace = 'monitor' | 'table';

interface WindowState {
    open: boolean;
    minimized: boolean;
    pinned: boolean;
    x: number;
    y: number;
    z: number;
}

const root = document.querySelector<HTMLDivElement>('#desktop-root');

if (!root) throw new Error('Desktop root not found');

const windows: Record<App, WindowState> = {
    archive: {
        open: true,
        minimized: false,
        pinned: false,
        x: 125,
        y: 85,
        z: 2,
    },
    case: {
        open: false,
        minimized: false,
        pinned: false,
        x: 240,
        y: 120,
        z: 3,
    },
    notes: {
        open: false,
        minimized: false,
        pinned: false,
        x: 290,
        y: 150,
        z: 4,
    },
    chat: {
        open: true,
        minimized: false,
        pinned: true,
        x: Math.max(20, window.innerWidth - 375),
        y: 120,
        z: 5,
    },
};

const appInfo: Record<
    App,
    { title: string; icon: string; className: string }
> = {
    archive: {
        title: 'Браузер',
        icon: 'globe',
        className: 'browser-icon',
    },
    case: {
        title: 'Дело № 7',
        icon: 'folder',
        className: 'case-icon',
    },
    notes: {
        title: 'Заметки',
        icon: 'notes',
        className: 'notes-icon',
    },
    chat: {
        title: 'Связь',
        icon: 'chat',
        className: 'chat-icon',
    },
};

const state = {
    workspace: 'monitor' as Workspace,
    active: 'archive' as App,
    zIndex: 10,
    browserTab: 'archive',
    search: '',
    notes: localStorage.getItem('case7-monitor-notes') ?? '',
    messages: [...initialMessages] as Message[],
};

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[char] ?? char);
}

function getWindowZIndex(app: App): number {
    const win = windows[app];

    return win.pinned
        ? 1000 + win.z
        : win.z;
}

function syncWindowLayers(): void {
    if (!root) return;

    root
        .querySelectorAll<HTMLElement>('.desktop-window')
        .forEach(element => {
            const app = element.dataset.app as App;

            element.style.zIndex = String(getWindowZIndex(app));
        });
}

function openApp(app: App): void {
    windows[app].open = true;
    windows[app].minimized = false;

    focusApp(app);
}

function focusApp(app: App): void {
    state.active = app;
    windows[app].z = ++state.zIndex;

    syncWindowLayers();
    render();
}

function closeApp(app: App): void {
    windows[app].open = false;
    render();
}

function minimizeApp(app: App): void {
    windows[app].minimized = true;
    render();
}

function togglePin(app: App): void {
    const win = windows[app];

    win.pinned = !win.pinned;
    win.z = ++state.zIndex;

    state.active = app;

    render();
}

function icon(app: App): string {
    const paths: Record<App, string> = {
        archive: `
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    `,
        case: `
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z" />
      <path d="M3 10h18" />
    `,
        notes: `
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    `,
        chat: `
      <path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-4.5a8.5 8.5 0 1 1 15.1-5z" />
      <path d="M8 12h8M8 9h5" />
    `,
    };

    return `
    <span class="app-icon ${appInfo[app].className}">
      <svg
        viewBox="0 0 24 24"
        width="29"
        height="29"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        ${paths[app]}
      </svg>
    </span>
  `;
}

function browserContent(): string {
    const tabs = [
        ['archive', 'Материалы'],
        ['search', 'Поиск'],
        ['help', 'Справка'],
    ];

    let content = '';

    if (state.browserTab === 'archive') {
        content = `
      <div class="archive-hero">
        <div class="archive-breadcrumb">ГЛАВНАЯ / КАТАЛОГ / ДЕЛО № 7</div>
        <div class="archive-hero-content">
          <div>
            <div class="archive-eyebrow">ЭЛЕКТРОННЫЙ КАТАЛОГ</div>
            <h1>Архив материалов</h1>
            <p>Рабочая подборка документов по расследованию 1975 года.</p>
          </div>
          <div class="archive-stamp">ЗАПАД<br>81</div>
        </div>
      </div>

      <div class="archive-content">
        <div class="section-heading">
          <div>
            <span class="overline">РАБОЧАЯ КОЛЛЕКЦИЯ</span>
            <h2>Последние материалы</h2>
          </div>
          <span class="count-label">${archiveRecords.length} документа</span>
        </div>

        <div class="archive-records">
          ${archiveRecords.map((record, index) => `
            <article class="archive-record">
              <div class="record-symbol">${['▤', '▦', '✉'][index % 3]}</div>
              <div class="record-main">
                <span class="record-code">${escapeHtml(record.code)}</span>
                <h3>${escapeHtml(record.title)}</h3>
                <p>${escapeHtml(record.description)}</p>
              </div>
              <span class="record-status">${escapeHtml(record.tag)}</span>
            </article>
          `).join('')}
        </div>

        <div class="archive-notice">
          <span>ⓘ</span>
          <p>Демонстрационный архив. Доступные документы будут
          постепенно расширяться по мере прохождения игры.</p>
        </div>
      </div>
    `;
    } else if (state.browserTab === 'search') {
        content = `
      <div class="archive-content search-page">
        <span class="overline">ПОИСК ПО КАТАЛОГУ</span>
        <h1>Найти документ</h1>
        <p class="secondary-text">
          Используйте фамилию, номер дела или название материала.
        </p>
        <form id="archive-search-form" class="archive-search">
          <input
            id="archive-search-input"
            placeholder="Например, Федотов"
            value="${escapeHtml(state.search)}"
            autocomplete="off"
          />
          <button type="submit">Найти</button>
        </form>
        <div id="archive-search-results"></div>
      </div>
    `;
    } else {
        content = `
      <div class="archive-content help-page">
        <span class="overline">СПРАВОЧНЫЕ МАТЕРИАЛЫ</span>
        <h1>Работа с источниками</h1>
        <p>При изучении архивных материалов обращайте внимание
        на даты, имена, происхождение документов и расхождения
        между разными источниками.</p>
        <div class="help-card">
          <strong>Помните</strong>
          <p>Совпадение имени и фамилии не является достаточным
          подтверждением личности человека.</p>
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
        <span class="lock-symbol">⌁</span>
        archive.local
      </div>
      <span class="browser-menu">•••</span>
    </div>
    <div class="browser-tab-strip">
      <div class="browser-tab-active">
        <span>◈</span> Электронный архив <span class="tab-close">×</span>
      </div>
      <span class="new-tab">＋</span>
    </div>
    <div class="browser-page">
      <nav class="archive-nav">
        <div class="archive-logo"><span>А</span> ЭЛЕКТРОННЫЙ АРХИВ</div>
        <div class="archive-links">
          ${tabs.map(([id, label]) => `
            <button data-browser-tab="${id}"
              class="${state.browserTab === id ? 'selected' : ''}">
              ${label}
            </button>
          `).join('')}
        </div>
        <div class="archive-avatar">81</div>
      </nav>
      ${content}
    </div>
  `;
}

function caseContent(): string {
    return `
    <div class="case-page">
      <div class="case-header">
        <span class="overline">ВТСО «ЗАПАД-81» / РАБОЧЕЕ ДОСЬЕ</span>
        <h1>Дело № 7</h1>
        <p>Материалы расследования</p>
      </div>

      <div class="case-paper">
        <div class="paper-top">
          <span>ЛИЧНОЕ ДЕЛО</span>
          <span>№ 007</span>
        </div>
        <h2>Федотов<br>Иван Андреевич</h2>
        <div class="paper-divider"></div>
        <dl>
          <div><dt>Год исчезновения</dt><dd>1942</dd></div>
          <div><dt>Регион</dt><dd>Смоленская область</dd></div>
          <div><dt>Статус</dt><dd>Пропал без вести</dd></div>
          <div><dt>Повторное расследование</dt><dd>1975</dd></div>
        </dl>
        <div class="paper-footer">СВЕДЕНИЯ ТРЕБУЮТ ПРОВЕРКИ</div>
      </div>
    </div>
  `;
}

function notesContent(): string {
    return `
    <div class="notes-page">
      <div class="notes-sidebar">
        <div class="notes-sidebar-heading">Заметки</div>
        <div class="note-selected">
          <strong>Дело № 7</strong>
          <small>Рабочие записи</small>
        </div>
      </div>
      <div class="notes-editor">
        <div class="notes-date">ЛИЧНЫЕ ЗАМЕТКИ</div>
        <h2>Дело № 7</h2>
        <textarea id="notes-input"
          placeholder="Записывайте найденные сведения, вопросы и гипотезы..."
        >${escapeHtml(state.notes)}</textarea>
      </div>
    </div>
  `;
}

function chatContent(): string {
    return `
    <div class="chat-app">
      <div class="chat-contact">
        <div class="contact-avatar">З81</div>
        <div>
          <strong>Поисковая группа</strong>
          <small><span class="online-indicator"></span> На связи</small>
        </div>
        <span class="chat-more">•••</span>
      </div>
      <div class="chat-history">
        <div class="chat-day">Сегодня</div>
        ${state.messages.map(message => `
          <div class="chat-message ${message.mine ? 'outgoing' : ''}">
            <div class="message-author">${escapeHtml(message.author)}</div>
            <div class="message-text">${escapeHtml(message.text)}</div>
            <div class="message-time">${escapeHtml(message.time)}</div>
          </div>
        `).join('')}
      </div>
      <form id="message-form" class="message-form">
        <input name="message" placeholder="Написать сообщение..."
          autocomplete="off" required />
        <button type="submit" aria-label="Отправить">➤</button>
      </form>
    </div>
  `;
}

function appContent(app: App): string {
    switch (app) {
        case 'archive': return browserContent();
        case 'case': return caseContent();
        case 'notes': return notesContent();
        case 'chat': return chatContent();
    }
}

function windowMarkup(app: App): string {
    const win = windows[app];

    if (!win.open || win.minimized) {
        return '';
    }

    const info = appInfo[app];

    return `
    <section
      class="desktop-window window-${app}"
      data-app="${app}"
      style="
        left: ${win.x}px;
        top: ${win.y}px;
        z-index: ${getWindowZIndex(app)};
      "
    >
      <div class="window-header" data-drag="${app}">
        <div class="traffic-lights">
          <button
            data-close="${app}"
            class="traffic-close"
            aria-label="Закрыть окно"
            title="Закрыть"
          >×</button>

          <button
            data-minimize="${app}"
            class="traffic-minimize"
            aria-label="Свернуть окно"
            title="Свернуть"
          >−</button>

          <button
            class="traffic-maximize"
            disabled
            title="Развернуть — пока недоступно"
          >＋</button>
        </div>

        <span class="window-name">${info.title}</span>

        <button
          class="window-pin ${win.pinned ? 'is-pinned' : ''}"
          data-pin="${app}"
          aria-label="${win.pinned
            ? 'Открепить окно'
            : 'Закрепить поверх остальных'
        }"
          aria-pressed="${win.pinned}"
          title="${win.pinned
            ? 'Открепить'
            : 'Поверх остальных окон'
        }"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m16 3 5 5-4 1-4 4-1 5-3-3-5 5" />
            <path d="m9 9 6 6" />
          </svg>
        </button>
      </div>

      <div class="window-content">
        ${appContent(app)}
      </div>
    </section>
  `;
}

function monitorMarkup(): string {
    return `
    <div class="desktop-background">
      <div class="wallpaper-orb orb-one"></div>
      <div class="wallpaper-orb orb-two"></div>
      <div class="wallpaper-orb orb-three"></div>
      <div class="wallpaper-noise"></div>
    </div>

    <header class="system-menubar">
      <div class="menu-left">
        <img
            class="system-emblem"
            src="/zapad81.png"
            alt="Эмблема ВТСО Запад-81"
            title="ВТСО Запад-81"
        />
        <strong>${appInfo[state.active].title}</strong>
        <span>Файл</span><span>Правка</span><span>Вид</span>
      </div>
      <div class="menu-right">
        <span>◖◖</span>
        <span>◉</span>
        <span id="system-clock"></span>
      </div>
    </header>

    <div class="desktop-shortcuts">
      ${(['case', 'notes'] as App[]).map(app => `
        <button class="desktop-shortcut" data-open="${app}">
          ${icon(app)}
          <span>${appInfo[app].title}</span>
        </button>
      `).join('')}
    </div>

    <div class="desktop-windows">
      ${(['archive', 'case', 'notes', 'chat'] as App[])
            .map(windowMarkup).join('')}
    </div>

    <nav class="dock" aria-label="Приложения">
      ${(['archive', 'case', 'notes', 'chat'] as App[]).map(app => `
        <button class="dock-item" data-open="${app}"
          title="${appInfo[app].title}">
          ${icon(app)}
          ${windows[app].open ? '<span class="dock-dot"></span>' : ''}
        </button>
      `).join('')}
      <div class="dock-divider"></div>
      <button class="dock-item dock-trash" title="Корзина">
        <span class="app-icon trash-icon">▥</span>
      </button>
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
    `).join('') || '<p class="secondary-text">Ничего не найдено.</p>'}
  `;
}

function scrollChat(): void {
    const history = root?.querySelector('.chat-history');
    if (history) history.scrollTop = history.scrollHeight;
}

function bindEvents(): void {
    if (!root) return;

    root.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(button => {
        button.addEventListener('click', () => {
            openApp(button.dataset.open as App);
        });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => {
        button.addEventListener('click', event => {
            event.stopPropagation();
            closeApp(button.dataset.close as App);
        });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-minimize]').forEach(button => {
        button.addEventListener('click', event => {
            event.stopPropagation();
            minimizeApp(button.dataset.minimize as App);
        });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-workspace]').forEach(button => {
        button.addEventListener('click', () => {
            state.workspace = button.dataset.workspace as Workspace;
            render();
        });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-browser-tab]').forEach(button => {
        button.addEventListener('click', () => {
            state.browserTab = button.dataset.browserTab ?? 'archive';
            render();
        });
    });

    root.querySelector<HTMLTextAreaElement>('#notes-input')
        ?.addEventListener('input', event => {
            state.notes = (event.target as HTMLTextAreaElement).value;
            localStorage.setItem('case7-monitor-notes', state.notes);
        });

    root.querySelector<HTMLFormElement>('#archive-search-form')
        ?.addEventListener('submit', event => {
            event.preventDefault();
            state.search =
                root?.querySelector<HTMLInputElement>('#archive-search-input')
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

    root.querySelectorAll<HTMLElement>('.desktop-window').forEach(element => {
        element.addEventListener('pointerdown', () => {
            const app = element.dataset.app as App;
            state.active = app;
            windows[app].z = ++state.zIndex;
            syncWindowLayers();
            root?.querySelector('.system-menubar strong')?.replaceChildren(
                document.createTextNode(appInfo[app].title),
            );
        });
    });

    root
        .querySelectorAll<HTMLButtonElement>('[data-pin]')
        .forEach(button => {
            button.addEventListener('click', event => {
                event.stopPropagation();

                const app = button.dataset.pin as App;
                togglePin(app);
            });
        });

    setupDragging();
}

function setupDragging(): void {
    root?.querySelectorAll<HTMLElement>('[data-drag]').forEach(header => {
        const app = header.dataset.drag as App;


        header.addEventListener('pointerdown', event => {
            if ((event.target as HTMLElement).closest('button')) return;
            if (event.button !== 0) return;

            const element = header.closest<HTMLElement>('.desktop-window');
            if (!element) return;

            const startX = event.clientX;
            const startY = event.clientY;
            const initialX = windows[app].x;
            const initialY = windows[app].y;

            header.setPointerCapture(event.pointerId);

            const move = (moveEvent: PointerEvent) => {
                const maxX = Math.max(0, window.innerWidth - 180);
                const maxY = Math.max(35, window.innerHeight - 120);

                windows[app].x = Math.max(
                    0,
                    Math.min(maxX, initialX + moveEvent.clientX - startX),
                );

                windows[app].y = Math.max(
                    35,
                    Math.min(maxY, initialY + moveEvent.clientY - startY),
                );

                element.style.left = `${windows[app].x}px`;
                element.style.top = `${windows[app].y}px`;
            };

            const stop = () => {
                header.removeEventListener('pointermove', move);
                header.removeEventListener('pointerup', stop);
                header.removeEventListener('pointercancel', stop);
            };

            header.addEventListener('pointermove', move);
            header.addEventListener('pointerup', stop);
            header.addEventListener('pointercancel', stop);
        });
    });
}

render();
