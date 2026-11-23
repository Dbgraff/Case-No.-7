import type { Find, FindStatus } from "../game/finds";
import type { Clue, Task } from "../game/clues";
import { isTutorialStep, type TutorialStep } from "../game/tutorial/steps";
import type { BoardCard, BoardSlotId } from "../game/board";

export type RadioMessage = {
  who: string;
  text: string;
  kind: "" | "sys" | "story";
};

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
  /** Clues opened by restored finds. */
  clues: Clue[];
  /** Tasks opened by clues. */
  tasks: Task[];
  /** Current tutorial step. */
  tutorialStep: TutorialStep;
  /** Messages already delivered to the radio. */
  radioHistory: RadioMessage[];
  /** Ids of archive documents the player has opened. */
  readDocs: string[];
  /** Words the player pinned to archive quick-search by clicking in text. */
  pinnedWords: string[];
  /** Cards available on the board (opened by clues). */
  boardCards: BoardCard[];
  /** Which card id sits in which slot (null = empty). */
  boardSlots: Record<BoardSlotId, string | null>;
};

/** localStorage key. Bump the version suffix when the save format changes. */
const STORAGE_KEY = "case7:save:v1";

/** The group has returned to HQ after the first field trip. */
export const START_PLACE_ID = "hq";

/** Hours available at the start of each day. */
export const HOURS_PER_DAY = 5;

/** Time cost of sending the group to a place, in hours. */
export const GROUP_TRIP_COST_HOURS = 1;

export const MAX_PINNED_WORDS = 10;

type Listener = (state: Readonly<GameState>) => void;

const listeners = new Set<Listener>();

/**
 * Creates a fresh state for a new game.
 * @returns {GameState} Initial state.
 */
function createInitialState(): GameState {
  return {
    day: 1,
    hoursLeft: HOURS_PER_DAY,
    visits: [],
    finds: [],
    groupPlaceId: START_PLACE_ID,
    clues: [],
    tasks: [],
    tutorialStep: "intro",
    radioHistory: [],
    readDocs: [],
    pinnedWords: [],
    boardCards: [],
    boardSlots: { who: null, when: null, where: null, conclusion: null },
  };
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

      const clues = Array.isArray(data.clues) ? data.clues : [];
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];

      // Old saves may lack a tutorial step. Use existing progress to select the fallback.
      const hasProgress = data.day! > 1 || finds.length > 0 || visits.length > 0;
      const tutorialStep: TutorialStep = isTutorialStep(data.tutorialStep)
        ? data.tutorialStep
        : hasProgress
          ? "skipped"
          : "intro";
      const radioHistory = Array.isArray(data.radioHistory)
        ? data.radioHistory.filter(message =>
            message && typeof message.who === "string" && typeof message.text === "string" &&
            (message.kind === "" || message.kind === "sys" || message.kind === "story"),
          )
        : [];
      const readDocs =
        Array.isArray(data.readDocs) && data.readDocs.every((x) => typeof x === "string")
          ? data.readDocs
          : [];

      const pinnedWords =
        Array.isArray(data.pinnedWords) && data.pinnedWords.every((x) => typeof x === "string")
          ? data.pinnedWords
          : [];

      const boardCards = Array.isArray(data.boardCards) ? data.boardCards : [];
      const boardSlots =
        data.boardSlots && typeof data.boardSlots === "object"
          ? {
              who: (data.boardSlots as GameState["boardSlots"]).who ?? null,
              when: (data.boardSlots as GameState["boardSlots"]).when ?? null,
              where: (data.boardSlots as GameState["boardSlots"]).where ?? null,
              conclusion: (data.boardSlots as GameState["boardSlots"]).conclusion ?? null,
            }
          : { who: null, when: null, where: null, conclusion: null };

      return {
        day: data.day!,
        hoursLeft: data.hoursLeft!,
        visits,
        finds,
        groupPlaceId,
        clues,
        tasks,
        tutorialStep,
        radioHistory,
        readDocs,
        pinnedWords,
        boardCards,
        boardSlots,
      };
    }
  } catch {
    // Corrupted save or storage unavailable.
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
    // Storage full or disabled.
  }
}

/**
 * Returns the current state (read-only snapshot).
 * @returns {Readonly<GameState>} Current state.
 */
export function getState(): Readonly<GameState> {
  return state;
}

/** The radio updates its own views through the chat event. */
export function recordRadioMessage(message: RadioMessage): void {
  state = { ...state, radioHistory: [...state.radioHistory, message] };
  saveState();
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
 * Changes the processing status of one find and saves the game.
 * @param {string} id - Find id.
 * @param {FindStatus} status - New status.
 * @returns {void}
 */
export function updateFindStatus(id: string, status: FindStatus): void {
  updateState({
    finds: state.finds.map((f) => (f.id === id ? { ...f, status } : f)),
  });
}

/** Marks an archive document as read. */
export function markDocRead(id: string): void {
  if (state.readDocs.includes(id)) return;
  updateState({ readDocs: [...state.readDocs, id] });
}

/**
 * Subscribes to state changes. The listener is called once immediately
 * with the current state.
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
  try {
    localStorage.removeItem("case7-monitor-notes");
  } catch {
    // Storage may be unavailable.
  }
  saveState();
  listeners.forEach((l) => l(state));
}

/** Adds a word to quick-search chips (normalized, no duplicates). */
export function pinArchiveWord(raw: string): void {
  const w = raw
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9]/g, "");
  if (w.length < 3) return;
  if (state.pinnedWords.includes(w)) return;
  if (state.pinnedWords.length >= MAX_PINNED_WORDS) return;
  updateState({ pinnedWords: [...state.pinnedWords, w] });
}

/** Puts a board card into a slot (or clears the slot if cardId is null). */
export function setBoardSlot(slot: BoardSlotId, cardId: string | null): void {
  updateState({
    boardSlots: { ...state.boardSlots, [slot]: cardId },
  });
}

/** Adds board cards if they are not already in state. */
export function addBoardCards(cards: BoardCard[]): void {
  if (!cards.length) return;
  const have = new Set(state.boardCards.map((c) => c.id));
  const next = cards.filter((c) => !have.has(c.id));
  if (!next.length) return;
  updateState({ boardCards: [...state.boardCards, ...next] });
}