import "./prologueInspection.css";

type DocumentDetails = {
  title: string;
  season: string;
  birthYear: number;
  footer: string;
};

export function showProloguePaper(
  host: HTMLElement,
  button: HTMLButtonElement,
  title: string,
  markup: string,
): HTMLElement {
  const source = button.getBoundingClientRect();
  host.querySelector(".prologue-reading-paper")?.remove();

  const paper = document.createElement("article");
  paper.className = "prologue-reading-paper";
  paper.setAttribute("aria-label", title);
  paper.innerHTML = markup;
  host.appendChild(paper);

  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const destination = paper.getBoundingClientRect();
    paper.animate(
      [
        {
          transform: `translate(${source.left - destination.left}px, ${source.top - destination.top}px)
            scale(${source.width / destination.width}, ${source.height / destination.height})`,
        },
        { transform: "none" },
      ],
      { duration: 540, easing: "cubic-bezier(.22, 1, .36, 1)" },
    );
  }

  return paper;
}

export function createPrologueClipboard(
  details: DocumentDetails,
  openOtherDocument: () => void,
  openConclusion?: () => void,
): HTMLElement {
  const notes = document.createElement("div");
  notes.className = "prologue-clipboard-notes";
  notes.innerHTML = `
    <dl>
      <dt>Материал</dt><dd>${details.footer}</dd>
      <dt>Дата</dt><dd>${details.season}</dd>
      <dt>Разыскиваемый</dt><dd>Иван Федотов</dd>
      <dt>Год рождения по документу</dt><dd><strong>${details.birthYear}</strong></dd>
    </dl>
    <div class="prologue-clipboard-actions">
      <button type="button" data-action="other">Осмотреть другой документ</button>
    </div>
  `;

  const actions = notes.querySelector<HTMLElement>(".prologue-clipboard-actions")!;
  actions.querySelector("[data-action=other]")!.addEventListener("click", openOtherDocument);

  if (openConclusion) {
    const compare = document.createElement("button");
    compare.type = "button";
    compare.textContent = "Сопоставить сведения";
    compare.addEventListener("click", openConclusion);
    actions.appendChild(compare);
  }

  return notes;
}