/** The two game spaces: the computer and the physical restoration table. */
export type SpaceId = "computer" | "table";

type SpaceListener = (space: SpaceId) => void;

const listeners = new Set<SpaceListener>();
let active: SpaceId = "computer";
let tableNews = 0;
let badgeEl: HTMLElement | null = null;

/**
 * Returns the space the player is currently in.
 * @returns {SpaceId} Active space.
 */
export function getActiveSpace(): SpaceId {
  return active;
}

/**
 * Subscribes to space switches.
 * @param {SpaceListener} listener - Called with the newly opened space.
 * @returns {() => void} Unsubscribe function.
 */
export function onSpaceChange(listener: SpaceListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Shows the number of new items on the table on the table's switch button.
 * @returns {void}
 */
function renderBadge(): void {
  if (!badgeEl) return;
  badgeEl.hidden = tableNews === 0;
  badgeEl.textContent = String(tableNews);
}

/**
 * Switches to a space: shows its container, hides the other one and
 * highlights the matching switch button.
 * @param {SpaceId} space - Space to open.
 * @returns {void}
 */
export function showSpace(space: SpaceId): void {
  active = space;
  document.getElementById("spaceComputer")!.hidden = space !== "computer";
  document.getElementById("spaceTable")!.hidden = space !== "table";
  document.getElementById("app")!.dataset.space = space;
  document
    .querySelectorAll<HTMLButtonElement>("#spaces button[data-space]")
    .forEach((b) => b.classList.toggle("on", b.dataset.space === space));

  if (space === "table") {
    tableNews = 0;
    renderBadge();
  }
  // lets the Pixi map recalculate its size after being hidden
  window.dispatchEvent(new Event("resize"));
  listeners.forEach((l) => l(space));
}

/**
 * Registers new items that arrived on the table. If the player is not at the
 * table, the counter on the table's switch button grows.
 * @param {number} count - Number of new items.
 * @returns {void}
 */
export function addTableNews(count: number): void {
  if (active === "table" || count <= 0) return;
  tableNews += count;
  renderBadge();
}

/**
 * Wires up the space switch buttons and creates the badge on the table button.
 * @returns {void}
 */
export function initSpaces(): void {
  const nav = document.getElementById("spaces")!;
  const tableBtn = nav.querySelector<HTMLButtonElement>('button[data-space="table"]');
  if (tableBtn) {
    badgeEl = document.createElement("span");
    badgeEl.className = "tab-badge";
    badgeEl.hidden = true;
    tableBtn.appendChild(badgeEl);
  }
  nav.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
      "button[data-space]",
    ) as HTMLButtonElement | null;
    if (btn) showSpace(btn.dataset.space as SpaceId);
  });
}
