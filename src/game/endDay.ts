import { FIND_TEMPLATES } from "../data/finds";
import type { Find } from "./finds";
import { HOURS_PER_DAY, getState, updateState } from "./state";

/** Result of one group trip made during the day. */
export type TripResult = {
  /** Id of the visited place. */
  placeId: string;
  /** What the group found there, or `null` if nothing new. */
  find: Find | null;
};

/** Summary of a finished day, used by the UI to report what happened. */
export type DayReport = {
  /** Number of the day that has just ended. */
  endedDay: number;
  /** Number of the day that has just started. */
  newDay: number;
  /** Results of every group trip of the ended day, in order. */
  trips: TripResult[];
};

/**
 * Ends the current day: processes the group's trips (new finds appear),
 * starts the next day and restores the hours. Triggered only by the player.
 *
 * A trip yields a find if the place has a not-yet-found template in
 * `FIND_TEMPLATES`; otherwise the group finds nothing.
 * @returns {DayReport} Report about the day that has ended.
 */
export function endDay(): DayReport {
  const s = getState();
  const foundIds = new Set(s.finds.map((f) => f.id));
  const newFinds: Find[] = [];

  const trips: TripResult[] = s.visits.map((placeId) => {
    const template = FIND_TEMPLATES.find(
      (t) => t.placeId === placeId && !foundIds.has(t.id),
    );
    if (!template) return { placeId, find: null };
    foundIds.add(template.id);
    const find: Find = { ...template, day: s.day, status: "new" };
    newFinds.push(find);
    return { placeId, find };
  });

  const report: DayReport = { endedDay: s.day, newDay: s.day + 1, trips };
  updateState({
    day: report.newDay,
    hoursLeft: HOURS_PER_DAY,
    visits: [],
    finds: [...s.finds, ...newFinds],
  });
  return report;
}
