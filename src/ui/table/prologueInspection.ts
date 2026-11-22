import "./prologueInspection.css";
import "./prologueDocuments.css";
import "./prologueHints.css";

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
  paper.dataset.document = button.dataset.document ?? "";
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
  const nextInstruction = openConclusion
    ? "Оба листа изучены. Теперь сопоставьте сведения."
    : "Теперь осмотрите второй документ.";

  notes.innerHTML = `
    <dl>
      <dt>Материал</dt><dd>${details.footer}</dd>
      <dt>Дата</dt><dd>${details.season}</dd>
      <dt>Разыскиваемый</dt><dd>Иван Федотов</dd>
      <dt>Год рождения по документу</dt><dd><strong>${details.birthYear}</strong></dd>
    </dl>
    <div class="prologue-clipboard-actions">
      <p class="prologue-clipboard-guide" id="prologueClipboardGuide" role="status">
        ${nextInstruction}
      </p>
      ${openConclusion ? `
        <button type="button" data-action="compare" class="prologue-clipboard-next"
          aria-describedby="prologueClipboardGuide">Сопоставить сведения</button>
      ` : ""}
      <button type="button" data-action="other"
        ${openConclusion ? "" : 'class="prologue-clipboard-next" aria-describedby="prologueClipboardGuide"'}>
        Осмотреть другой документ
      </button>
    </div>
  `;

  notes.querySelector("[data-action=other]")!.addEventListener("click", openOtherDocument);

  if (openConclusion) {
    notes.querySelector("[data-action=compare]")!.addEventListener("click", openConclusion);
  }

  return notes;
}