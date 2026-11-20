
import "./prologue.css";

import { getState, subscribe } from "../../core/state";
import { completeTutorialStep } from "../../game/tutorial";
import { showSpace } from "../spaces";
import { say, type ChatKind } from "../computer/chat";

type ChatMessage = {
  who: string;
  text: string;
  kind: ChatKind;
};

type DocumentId = "diary" | "request";

const OPENING: ChatMessage[] = [
  {
    who: "Даша",
    text: "После первого осмотра «Ракеты» привезли папку с пометкой «Дело № 7». Она лежит у вас на столе. Посмотрите, что в ней.",
    kind: "story",
  },
  {
    who: "Командир",
    text: "Сначала разберите документы. Если найдутся противоречия, решим, куда отправить группу повторно.",
    kind: "story",
  },
];

const DOCUMENTS: Record<
  DocumentId,
  {
    label: string;
    title: string;
    content: string;
    footer: string;
  }
> = {
  diary: {
    label: "ЛЕТО 1975 · ДНЕВНИК «ИСКРЫ»",
    title: "Запись поискового отряда",
    content: `
      <p>Разыскиваемый: Иван Федотов.</p>
      <p>Год рождения: <mark>1920</mark>.</p>
      <p>Дальнейшую судьбу необходимо установить.</p>
    `,
    footer: "Дело № 7 · лист 1",
  },

  request: {
    label: "ОСЕНЬ 1975 · ЧЕРНОВИК ЗАПРОСА",
    title: "Обращение в архив",
    content: `
      <p>Просим сообщить о судьбе Федотова Ивана.</p>
      <p>Год рождения: <mark>1921</mark>.</p>
      <p>Дополнительные сведения уточняются.</p>
    `,
    footer: "Дело № 7 · лист 2",
  },
};

function documentContent(id: DocumentId): string {
  const documentData = DOCUMENTS[id];

  return `
    <span class="prologue-paper-label">
      ${documentData.label}
    </span>

    <span class="prologue-paper-rule"></span>

    <strong class="prologue-paper-title">
      ${documentData.title}
    </strong>

    <div class="prologue-paper-body">
      ${documentData.content}
    </div>

    <span class="prologue-paper-footer">
      ${documentData.footer}
    </span>
  `;
}

export function initPrologue(): void {
  const workspace = document.querySelector<HTMLElement>(
    ".id-table-workspace",
  );

  if (!workspace || workspace.querySelector(".case7-prologue")) {
    return;
  }

  const host = document.createElement("section");

  host.className = "case7-prologue";
  host.setAttribute("aria-label", "Изучение дела № 7");

  host.innerHTML = `
    <button
      type="button"
      class="prologue-chat-toggle"
      id="prologueChatToggle"
      aria-controls="prologueChatPopup"
      aria-expanded="false"
      aria-label="Открыть сообщения"
    >
      <span aria-hidden="true">✉</span>
      <span>Сообщения</span>

      <span
        class="prologue-chat-unread"
        id="prologueChatUnread"
        hidden
      ></span>
    </button>

    <aside
      class="prologue-chat"
      id="prologueChatPopup"
      aria-label="Сообщения поисковой группы"
      aria-hidden="true"
    >
      <header class="prologue-contact">
        <span
          class="prologue-contact-avatar"
          aria-hidden="true"
        >✉</span>

        <span class="prologue-contact-info">
          <strong>Поисковая группа</strong>

          <small>
            <span class="prologue-online-dot"></span>
            На связи
          </small>
        </span>

        <button
          type="button"
          class="prologue-chat-close"
          id="prologueChatClose"
          aria-label="Закрыть сообщения"
        >×</button>
      </header>

      <div
        class="prologue-messages"
        id="prologueMessages"
        role="log"
        aria-label="История сообщений"
      ></div>

      <footer>Сообщения поисковой группы</footer>
    </aside>

    <div
      class="prologue-stage"
      id="prologueStage"
    ></div>
  `;

  workspace.appendChild(host);

  const stage = host.querySelector<HTMLElement>(
    "#prologueStage",
  )!;

  const messages = host.querySelector<HTMLElement>(
    "#prologueMessages",
  )!;

  const popup = host.querySelector<HTMLElement>(
    "#prologueChatPopup",
  )!;

  const toggle = host.querySelector<HTMLButtonElement>(
    "#prologueChatToggle",
  )!;

  const close = host.querySelector<HTMLButtonElement>(
    "#prologueChatClose",
  )!;

  const unread = host.querySelector<HTMLElement>(
    "#prologueChatUnread",
  )!;

  let unreadCount = 0;
  let previousStep = "";

  const viewedDocuments = new Set<DocumentId>();

  // =========================================================
  // ЧАТ
  // =========================================================

  function setPopupOpen(open: boolean): void {
    host.classList.toggle("chat-popup-open", open);

    toggle.setAttribute(
      "aria-expanded",
      String(open),
    );

    toggle.setAttribute(
      "aria-label",
      open ? "Закрыть сообщения" : "Открыть сообщения",
    );

    popup.setAttribute(
      "aria-hidden",
      String(!open),
    );

    popup.inert = !open;

    if (open) {
      unreadCount = 0;
      unread.textContent = "";
      unread.hidden = true;

      messages.scrollTop = messages.scrollHeight;
    }
  }

  setPopupOpen(false);

  toggle.addEventListener("click", () => {
    setPopupOpen(
      !host.classList.contains("chat-popup-open"),
    );
  });

  close.addEventListener("click", () => {
    setPopupOpen(false);
    toggle.focus();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!host.classList.contains("chat-popup-open")) {
      return;
    }

    if (
      event.target instanceof Node &&
      !popup.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      setPopupOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      host.classList.contains("chat-popup-open")
    ) {
      setPopupOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      setPopupOpen(false);
    }
  });

  // Используем те же .bub, что и на мониторе.

  document.addEventListener(
    "case7:chat-message",
    (event: Event) => {
      const { who, text, kind } = (
        event as CustomEvent<ChatMessage>
      ).detail;

      const bubble = document.createElement("div");

      bubble.className =
        "bub" + (kind ? ` ${kind}` : "");

      const author = document.createElement("b");
      author.textContent = who;

      bubble.append(
        author,
        document.createTextNode(text),
      );

      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;

      if (!host.classList.contains("chat-popup-open")) {
        unreadCount++;

        unread.textContent = String(unreadCount);
        unread.hidden = false;
      }
    },
  );

  if (
    getState().tutorialStep === "caseFolder" ||
    getState().tutorialStep === "caseCompare"
  ) {
    for (const message of OPENING) {
      say(message.who, message.text, message.kind);
    }
  }

  // =========================================================
  // ШАГ 1 — ЗАКРЫТАЯ ПАПКА НА СТОЛЕ
  // =========================================================

  function renderClosedFolder(): void {
    stage.innerHTML = `
      <div class="prologue-desk-scene">

        <aside
          class="prologue-tip prologue-tip--intro"
          aria-label="Подсказка"
        >
          <span class="prologue-tip-heading">
            ПОСТУПИВШИЕ МАТЕРИАЛЫ
          </span>

          <p>
            Первая вылазка завершена.
            На стол доставлена папка «Дело № 7».
          </p>
        </aside>

        <button
          type="button"
          class="prologue-folder-closed"
          id="prologueOpen"
          aria-label="Открыть папку Дело номер 7"
        >
          <span class="prologue-folder-tab">
            ВТСО «ЗАПАД-81» · ПОЛЕВЫЕ НАХОДКИ
          </span>

          <strong class="prologue-folder-heading">
            ДЕЛО <em>№ 7</em>
          </strong>

          <span class="prologue-folder-subtitle">
            Материалы поисковой работы
            отряда «Искра» · 1975
          </span>

          <span class="prologue-folder-action">
            Открыть папку ↗
          </span>
        </button>

        <aside
          class="prologue-tip prologue-tip--action"
          aria-label="Действие"
        >
          <span class="prologue-tip-heading">
            ЧТО ДЕЛАТЬ?
          </span>

          <p>
            Нажмите на папку, чтобы открыть
            её и изучить содержимое.
          </p>
        </aside>

      </div>
    `;

    stage
      .querySelector("#prologueOpen")
      ?.addEventListener("click", () => {
        completeTutorialStep("caseFolder");
      });
  }

  // =========================================================
  // ШАГ 2 — ОТКРЫТАЯ ПАПКА И ДОКУМЕНТЫ
  // =========================================================

  function renderOpenFolder(): void {
    stage.innerHTML = `
      <div class="prologue-desk-scene prologue-desk-scene--open">

        <aside
          class="prologue-tip prologue-tip--intro"
          aria-label="Материалы дела"
        >
          <span class="prologue-tip-heading">
            ДЕЛО № 7
          </span>

          <p>
            В папке два документа отряда «Искра».
            Изучите каждый из них.
          </p>
        </aside>

        <div
          class="prologue-open-folder"
          aria-label="Открытая папка с документами"
        >
          <div
            class="prologue-folder-left"
            aria-hidden="true"
          >
            <span class="prologue-inner-stamp">
              ДЕЛО № 7
              <small>1975</small>
            </span>
          </div>

          <div class="prologue-folder-right">
            <span class="prologue-folder-inner-label">
              МАТЕРИАЛЫ ПОИСКОВОГО ОТРЯДА
            </span>

            <div class="prologue-document-stack">

              <button
                type="button"
                class="
                  prologue-document
                  prologue-document--request
                "
                data-document="request"
                aria-label="Взять черновик запроса в архив"
              >
                ${documentContent("request")}
              </button>

              <button
                type="button"
                class="
                  prologue-document
                  prologue-document--diary
                "
                data-document="diary"
                aria-label="Взять запись поискового отряда"
              >
                ${documentContent("diary")}
              </button>

            </div>
          </div>
        </div>

        <!--
          Лист, который игрок достал из папки.
          Он лежит отдельно справа на столе.
        -->
        <div
          class="prologue-reading-area"
          id="prologueReadingArea"
          hidden
        >
          <article
            class="prologue-reading-paper"
            id="prologueReadingPaper"
          ></article>

          <button
            type="button"
            class="prologue-return"
            id="prologueReturnDoc"
          >
            ← Вернуть документ в папку
          </button>
        </div>

        <aside
          class="prologue-tip prologue-tip--action"
          id="prologueActionTip"
          aria-label="Подсказка"
        >
          <span class="prologue-tip-heading">
            ИЗУЧЕНИЕ ДОКУМЕНТОВ
          </span>

          <p id="prologueActionText">
            Нажмите на лист в папке,
            чтобы положить его на стол.
          </p>
        </aside>

        <!--
          Вопрос появляется только после просмотра
          обоих документов.
        -->
        <section
          class="prologue-conclusion"
          id="prologueConclusion"
          aria-label="Вывод по документам"
          hidden
        >
          <span class="prologue-tip-heading">
            ЗАФИКСИРОВАТЬ НАБЛЮДЕНИЕ
          </span>

          <fieldset class="prologue-answers">
            <legend>
              Какой вывод можно сделать по двум документам?
            </legend>

            <label>
              <input
                type="radio"
                name="prologueAnswer"
                value="1920"
              >
              <span>
                Достоверный год рождения — 1920
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="prologueAnswer"
                value="1921"
              >
              <span>
                Достоверный год рождения — 1921
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="prologueAnswer"
                value="uncertain"
              >
              <span>
                Сведения противоречат друг другу;
                нужно искать подтверждение
              </span>
            </label>
          </fieldset>

          <p
            class="prologue-feedback"
            id="prologueFeedback"
            role="status"
          ></p>

          <button
            type="button"
            class="prologue-confirm"
            id="prologueConfirm"
          >
            Зафиксировать вывод →
          </button>
        </section>

      </div>
    `;

    const readingArea = stage.querySelector<HTMLElement>(
      "#prologueReadingArea",
    )!;

    const readingPaper = stage.querySelector<HTMLElement>(
      "#prologueReadingPaper",
    )!;

    const actionTip = stage.querySelector<HTMLElement>(
      "#prologueActionTip",
    )!;

    const actionText = stage.querySelector<HTMLElement>(
      "#prologueActionText",
    )!;

    const conclusion = stage.querySelector<HTMLElement>(
      "#prologueConclusion",
    )!;

    // -------------------------------------------------------
    // Достаём документ из папки
    // -------------------------------------------------------

    function showDocument(id: DocumentId): void {
      viewedDocuments.add(id);

      readingPaper.innerHTML = documentContent(id);

      readingArea.hidden = false;

      stage
        .querySelectorAll<HTMLButtonElement>(
          "[data-document]",
        )
        .forEach((button) => {
          const selected =
            button.dataset.document === id;

          button.classList.toggle(
            "is-reading",
            selected,
          );

          button.setAttribute(
            "aria-pressed",
            String(selected),
          );
        });

      if (viewedDocuments.size === 2) {
        actionTip.hidden = true;
        conclusion.hidden = false;
      } else {
        actionText.textContent =
          "Документ лежит на столе. Прочитайте его, затем верните в папку.";
      }
    }

    stage
      .querySelectorAll<HTMLButtonElement>(
        "[data-document]",
      )
      .forEach((button) => {
        button.addEventListener("click", () => {
          showDocument(
            button.dataset.document as DocumentId,
          );
        });
      });

    // -------------------------------------------------------
    // Возвращаем документ в папку
    // -------------------------------------------------------

    stage
      .querySelector("#prologueReturnDoc")
      ?.addEventListener("click", () => {
        readingArea.hidden = true;

        stage
          .querySelectorAll<HTMLButtonElement>(
            "[data-document]",
          )
          .forEach((button) => {
            button.classList.remove("is-reading");
            button.setAttribute(
              "aria-pressed",
              "false",
            );
          });

        if (viewedDocuments.size < 2) {
          actionText.textContent =
            "Теперь выберите второй документ.";
        }
      });

    // -------------------------------------------------------
    // Проверяем вывод
    // -------------------------------------------------------

    stage
      .querySelector("#prologueConfirm")
      ?.addEventListener("click", () => {
        const answer =
          stage.querySelector<HTMLInputElement>(
            'input[name="prologueAnswer"]:checked',
          );

        const feedback =
          stage.querySelector<HTMLElement>(
            "#prologueFeedback",
          )!;

        if (!answer) {
          feedback.textContent =
            "Сначала выберите вывод.";
          return;
        }

        if (answer.value !== "uncertain") {
          feedback.textContent =
            "В документах указаны разные годы. Пока нельзя считать один из них достоверным.";
          return;
        }

        say(
          "Командир",
          "Верно. Расхождение записали. Нужны дополнительные материалы. Вернём группу в лагерь и проверим документы «Искры».",
          "story",
        );

        completeTutorialStep("caseCompare");
      });
  }

  // =========================================================
  // ПЕРЕКЛЮЧЕНИЕ ЭТАПОВ ПРОЛОГА
  // =========================================================

  const render = (): void => {
    const step = getState().tutorialStep;

    const active =
      step === "caseFolder" ||
      step === "caseCompare";

    host.hidden = false;
    stage.hidden = !active;

    host.classList.toggle(
      "prologue-chat-only",
      !active,
    );

    if (step === previousStep) {
      return;
    }

    previousStep = step;

    if (step === "caseFolder") {
      renderClosedFolder();
    }

    if (step === "caseCompare") {
      renderOpenFolder();
    }
  };

  subscribe(render);
  render();

  if (
    getState().tutorialStep === "caseFolder" ||
    getState().tutorialStep === "caseCompare"
  ) {
    showSpace("table");
  }
}
