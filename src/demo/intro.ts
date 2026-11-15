
import './intro.css';
import { getState, resetState } from '../core/state';

const INTRO_DISMISSED_KEY = 'case7:demo:intro-dismissed';

function hasProgress(): boolean {
  const state = getState();

  return (
    state.day > 1 ||
    state.visits.length > 0 ||
    state.finds.length > 0 ||
    state.readDocs.length > 0 ||
    state.clues.length > 0 ||
    state.boardCards.length > 0 ||
    state.tutorialStep === 'done' ||
    state.tutorialStep === 'skipped'
  );
}

function closeIntro(): void {
  const overlay = document.getElementById('demo-intro');
  if (!overlay) return;

  sessionStorage.setItem(INTRO_DISMISSED_KEY, '1');
  overlay.classList.add('demo-intro-leaving');

  window.setTimeout(() => overlay.remove(), 350);
}

function startNewGame(): void {
  if (hasProgress()) {
    const confirmed = window.confirm(
      'Начать новую игру? Текущее сохранение будет заменено.',
    );

    if (!confirmed) return;
  }

  resetState();
  sessionStorage.setItem(INTRO_DISMISSED_KEY, '1');
  window.location.reload();
}

function createIntro(): void {
  if (sessionStorage.getItem(INTRO_DISMISSED_KEY) === '1') {
    return;
  }

  const progress = hasProgress();
  const overlay = document.createElement('div');

  overlay.id = 'demo-intro';
  overlay.className = 'demo-intro';

  overlay.innerHTML = `
    <div class="demo-intro-background" aria-hidden="true"></div>
    <div class="demo-intro-shade" aria-hidden="true"></div>

    <main class="demo-intro-layout">
      <header class="demo-intro-header">
        <div class="demo-intro-brand">
          <img
            class="demo-intro-emblem"
            src="/zapad81.png"
            alt="Эмблема ВТСО Запад-81"
          />

          <div class="demo-intro-brand-copy">
            <span class="demo-intro-brand-title">
              ВТСО «ЗАПАД-81»
            </span>
            <span class="demo-intro-brand-subtitle">
              Создано совместно с ВТСО «Запад-81»
            </span>
          </div>
        </div>
      </header>

      <section class="demo-intro-content">
        <h1 class="demo-intro-title">
          ДЕЛО <span>№ 7</span>
        </h1>

        <div class="demo-intro-divider"></div>

        <p class="demo-intro-tagline">
          История, которую предстоит восстановить
        </p>

        <nav class="demo-intro-actions"
          aria-label="Главное меню">

          <button
            id="demo-new"
            class="demo-intro-button demo-intro-button-primary"
            type="button"
          >
            <span>НОВАЯ ИГРА</span>
            <span class="demo-intro-arrow" aria-hidden="true">→</span>
          </button>

          <button
            id="demo-continue"
            class="demo-intro-button demo-intro-button-secondary"
            type="button"
            ${progress ? '' : 'disabled'}
          >
            <span>ПРОДОЛЖИТЬ</span>
            <span class="demo-intro-arrow" aria-hidden="true">→</span>
          </button>
        </nav>

        ${
          progress
            ? `
              <p class="demo-intro-save">
                Сохранение найдено · День ${getState().day}
              </p>
            `
            : ''
        }
      </section>

      <footer class="demo-intro-footer">
        <span>СЮЖЕТНАЯ ИСТОРИКО-ПОИСКОВАЯ ИГРА</span>
        <span>2026</span>
      </footer>
    </main>
  `;

  document.body.appendChild(overlay);

  document.getElementById('demo-new')
    ?.addEventListener('click', startNewGame);

  document.getElementById('demo-continue')
    ?.addEventListener('click', closeIntro);
}

createIntro();
