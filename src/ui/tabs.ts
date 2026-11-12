type TabListener = (tab: string) => void;

const listeners = new Set<TabListener>();
let active = "hq";

/**
 * Returns the id of the currently open tab (`data-tab` value).
 * @returns {string} Active tab id.
 */
export function getActiveTab(): string {
  return active;
}

/**
 * Subscribes to tab switches.
 * @param {TabListener} listener - Called with the id of the newly opened tab.
 * @returns {() => void} Unsubscribe function.
 */
export function onTabChange(listener: TabListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Opens a tab: highlights its button and shows the matching pane
 * (`data-tab` on the button <-> `data-pane` on the section).
 * @param {string} tab - Tab id.
 * @returns {void}
 */
export function showTab(tab: string): void {
  const tabs = document.getElementById("tabs")!;
  active = tab;
  tabs
    .querySelectorAll<HTMLButtonElement>("button[data-tab]")
    .forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  document.querySelectorAll<HTMLElement>(".pane").forEach((p) => {
    const on = p.dataset.pane === tab;
    p.classList.toggle("on", on);
    p.hidden = !on;
  });
  listeners.forEach((l) => l(tab));
}

/**
 * Wires up the top tab bar: clicking a tab button opens that tab.
 * @returns {void}
 */
export function initTabs(): void {
  const tabs = document.getElementById("tabs")!;
  tabs.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
      "button[data-tab]",
    ) as HTMLButtonElement | null;
    if (btn) showTab(btn.dataset.tab!);
  });
}
