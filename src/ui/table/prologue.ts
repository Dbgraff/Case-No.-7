import "./prologue.css";
import { getState, subscribe } from "../../core/state";
import { completeTutorialStep } from "../../game/tutorial";
import { showSpace } from "../spaces";

type ChatMessage = { who: string; text: string; kind: string };
const OPENING: ChatMessage[] = [
  { who: "Даша", text: "После первого осмотра «Ракеты» привезли папку с пометкой «Дело № 7». Она лежит у вас на столе. Посмотрите, что в ней.", kind: "story" },
  { who: "Командир", text: "Сначала разберите документы. Если найдутся противоречия, решим, куда отправить группу повторно.", kind: "story" },
];

export function initPrologue(): void {
  const workspace = document.querySelector<HTMLElement>(".id-table-workspace");
  if (!workspace || workspace.querySelector(".case7-prologue")) return;

  const host = document.createElement("section");
  host.className = "case7-prologue";
  host.setAttribute("aria-label", "Изучение дела № 7");
  host.innerHTML = `
    <aside class="prologue-chat" aria-label="Связь со штабом">
      <header><span>СВЯЗЬ СО ШТАБОМ</span><b>●</b></header>
      <div class="prologue-messages" id="prologueMessages" aria-live="polite"></div>
      <footer>Входящие сообщения · общий канал группы</footer>
    </aside>
    <div class="prologue-stage" id="prologueStage"></div>
  `;
  workspace.appendChild(host);
  const stage = host.querySelector<HTMLElement>("#prologueStage")!;
  const messages = host.querySelector<HTMLElement>("#prologueMessages")!;

  const append = ({ who, text, kind }: ChatMessage): void => {
    const box = document.createElement("div");
    box.className = "prologue-message " + (kind === "sys" ? "system" : "");
    const author = document.createElement("strong");
    author.textContent = who;
    const body = document.createElement("p");
    body.textContent = text;
    box.append(author, body);
    messages.appendChild(box);
    messages.scrollTop = messages.scrollHeight;
  };
  for (const item of OPENING) append(item);
  document.addEventListener("case7:chat-message", (e: Event) => {
    append((e as CustomEvent<ChatMessage>).detail);
  });

  const render = (): void => {
    const step = getState().tutorialStep;
    const active = step === "caseFolder" || step === "caseCompare";
    host.hidden = !active;
    if (!active) return;

    if (step === "caseFolder") {
      stage.innerHTML = `
        <div class="prologue-kicker">ПОСТУПИВШИЕ МАТЕРИАЛЫ · ПЕРВАЯ ВЫЛАЗКА</div>
        <button type="button" class="prologue-folder" id="prologueOpen">
          <span class="folder-tab">ВТСО «ЗАПАД-81» · ПОЛЕВЫЕ НАХОДКИ</span>
          <span class="folder-number">ДЕЛО <em>№ 7</em></span>
          <span class="folder-caption">Материалы поисковой работы отряда «Искра» · 1975</span>
          <span class="folder-action">Открыть папку →</span>
        </button>
        <p class="prologue-description">Документы нашли во время первой вылазки в заброшенный лагерь. Начните с содержимого папки.</p>
      `;
      stage.querySelector("#prologueOpen")?.addEventListener("click", () => completeTutorialStep("caseFolder"));
      return;
    }

    stage.innerHTML = `
      <div class="prologue-kicker">ДЕЛО № 7 / ПЕРВИЧНАЯ СВЕРКА</div>
      <h2>Сопоставьте записи</h2>
      <p class="prologue-description">Оба документа относятся к поиску Ивана Федотова. Найдите расхождение, но не считайте один источник верным без подтверждения.</p>
      <div class="prologue-docs">
        <article class="prologue-doc"><small>ЛЕТО 1975 · ДНЕВНИК «ИСКРЫ»</small><h3>Запись поискового отряда</h3><p>Разыскиваемый: Иван Федотов.<br>Год рождения: <mark>1920</mark>.<br>Дальнейшую судьбу необходимо установить.</p></article>
        <article class="prologue-doc"><small>ОСЕНЬ 1975 · ЧЕРНОВИК ЗАПРОСА</small><h3>Обращение в архив</h3><p>Просим сообщить о судьбе Федотова Ивана.<br>Год рождения: <mark>1921</mark>.<br>Дополнительные сведения уточняются.</p></article>
      </div>
      <fieldset class="prologue-answers">
        <legend>Какой вывод можно сделать на основании этих двух документов?</legend>
        <label><input type="radio" name="prologueAnswer" value="1920"> Достоверный год рождения — 1920</label>
        <label><input type="radio" name="prologueAnswer" value="1921"> Достоверный год рождения — 1921</label>
        <label><input type="radio" name="prologueAnswer" value="uncertain"> Сведения противоречат друг другу; нужно искать подтверждение</label>
      </fieldset>
      <p id="prologueFeedback" role="status"></p>
      <button type="button" class="prologue-confirm" id="prologueConfirm">Зафиксировать вывод</button>
    `;
    stage.querySelector("#prologueConfirm")?.addEventListener("click", () => {
      const selected = stage.querySelector<HTMLInputElement>('input[name="prologueAnswer"]:checked');
      const feedback = stage.querySelector<HTMLElement>("#prologueFeedback")!;
      if (!selected) {
        feedback.textContent = "Сначала выберите вывод.";
      } else if (selected.value !== "uncertain") {
        feedback.textContent = "У нас два несовпадающих источника. Пока нет оснований считать один из годов достоверным.";
      } else {
        append({ who: "Командир", text: "Верно. Расхождение записали. Нужны дополнительные материалы. Вернём группу в лагерь и проверим документы «Искры».", kind: "story" });
        completeTutorialStep("caseCompare");
      }
    });
  };
  subscribe(render);
  render();

  // At the very beginning the player is at the physical table, not the monitor.
  if (getState().tutorialStep === "caseFolder" || getState().tutorialStep === "caseCompare") {
    showSpace("table");
  }
}
