import type { Find } from "./finds";
import { HOURS_PER_DAY, getState, updateState } from "../core/state";

export type TripResult = { placeId: string; find: Find | null };
export type DayReport = { endedDay: number; newDay: number; trips: TripResult[] };

/**
 * Походы теперь выдают находки при прибытии (game/story.ts).
 * Здесь только переход к утру и отчёт — никаких повторных спавнов,
 * особенно тайника до расшифровки.
 */
export function endDay(): DayReport {
  const s = getState();
  const trips: TripResult[] = s.visits.map(placeId => ({ placeId, find: null }));
  const next = Math.min(2, s.day + 1);
  updateState({ day: next, hoursLeft: HOURS_PER_DAY, visits: [] });
  return { endedDay: s.day, newDay: next, trips };
}
