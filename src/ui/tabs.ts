/**
 * Wires up the top tab bar: clicking a tab shows the matching pane
 * (`data-tab` on the button <-> `data-pane` on the section).
 * @returns {void}
 */
export function initTabs(): void {
  const tabs = document.getElementById("tabs")!;
  tabs.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
      "button[data-tab]",
    ) as HTMLButtonElement | null;
    if (!btn) return;
    const tab = btn.dataset.tab!;
    tabs
      .querySelectorAll("button")
      .forEach((b) => b.classList.toggle("on", b === btn));
    document.querySelectorAll<HTMLElement>(".pane").forEach((p) => {
      const on = p.dataset.pane === tab;
      p.classList.toggle("on", on);
      p.hidden = !on;
    });
  });
}
