import { subscribe, type GameState } from "../../core/state";

/**
 * Keeps the day and hours-left counters in the top bar in sync with the game state.
 * Renders once immediately and then on every state change.
 * @returns {void}
 */
export function bindTopbar(): void {
  const dayEl = document.getElementById("day")!;
  const hoursEl = document.getElementById("hours")!;

  /** @param {GameState} s - Current game state. */
  const render = (s: Readonly<GameState>): void => {
    dayEl.textContent = String(s.day);
    hoursEl.textContent = `${s.hoursLeft} ч`;
  };

  subscribe(render);
}
