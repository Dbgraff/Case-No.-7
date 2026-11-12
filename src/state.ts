import type { Find } from "./finds";

/** Persistent game state. Extend this type as new systems are added. */
export type GameState = {
  /** Current in-game day, starting at 1. */
  day: number;
  /** Hours left until sunset on the current day. */
  hoursLeft: number;
  /** Ids of places the group was sent to today (in order, repeats allowed). */
  visits: string[];
  /** All finds delivered by the group so far. */
  finds: Find[];
  /** Id of the place where the group is right now. */
  groupPlaceId: string;
};

/** localStorage key. Bump the version suffix when the save format changes. */
const STORAGE_KEY = "case7:save:v1";

/** Place where the group starts the game. */
export const START_PLACE_ID = "gate";

/** Hours available at the start of each day. */
export const HOURS_PER_DAY = 5;

/** Time cost of sending the group to a place, in hours. */
export const GROUP_TRIP_COST_HOURS = 1;

type Listener = (state: Readonly<GameState>) => void;

const listeners = new Set<Listener>();

/**
 * Creates a fresh state for a new game.
 * @returns {GameState} Initial state.
 */
function createInitialState(): GameState {
  return { day: 1, hoursLeft: HOURS_PER_DAY, visits: [], finds: [], groupPlaceId: START_PLACE_ID };
}

/**
 * Reads the save from localStorage and validates it.
 * Falls back to a new game if the save is missing or broken.
 * @returns {GameState} Loaded or initial state.
 */
function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const data = JSON.parse(raw) as Partial<GameState>;
    if (
      Number.isInteger(data.day) &&
      Number.isInteger(data.hoursLeft) &&
      data.day! >= 1 &&
      data.hoursLeft! >= 0
    ) {
      const visits =
        Array.isArray(data.visits) && data.visits.every((v) => typeof v === "string")
          ? data.visits
          : [];
      const finds = Array.isArray(data.finds) ? data.finds : [];
      const groupPlaceId =
        typeof data.groupPlaceId === "string" ? data.groupPlaceId : START_PLACE_ID;
      return { day: data.day!, hoursLeft: data.hoursLeft!, visits, finds, groupPlaceId };
    }
  } catch {
    // corrupted save or storage unavailable — start over
  }
  return createInitialState();
}

let state: GameState = loadState();

/**
 * Writes the current state to localStorage (errors are ignored).
 * @returns {void}
 */
function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or disabled — the game still works without saving
  }
}

/**
 * Returns the current state (read-only snapshot).
 * @returns {Readonly<GameState>} Current state.
 */
export function getState(): Readonly<GameState> {
  return state;
}

/**
 * Applies a partial update, saves it and notifies subscribers.
 * @param {Partial<GameState>} patch - Fields to change.
 * @returns {void}
 */
export function updateState(patch: Partial<GameState>): void {
  state = { ...state, ...patch };
  saveState();
  listeners.forEach((l) => l(state));
}

/**
 * Subscribes to state changes. The listener is called once immediately
 * with the current state.
 * @param {Listener} listener - Function called with the new state.
 * @returns {() => void} Unsubscribe function.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/**
 * Starts a new game: resets the state and the save.
 * @returns {void}
 */
export function resetState(): void {
  state = createInitialState();
  saveState();
  listeners.forEach((l) => l(state));
}
