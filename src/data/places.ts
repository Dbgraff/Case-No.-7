/** A clickable building/location on the camp map. */
export type Place = {
  /** Unique id, used in game logic and saves. */
  id: string;
  /** Name shown on the map and in the chat. */
  name: string;
  /** Position and size in map coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
};

/** All places on the camp map. Later this can be moved to JSON content. */
export const PLACES: Place[] = [
  { id: "gate", name: "Ворота", x: 40, y: 160, w: 80, h: 44 },
  { id: "k1", name: "Корпус 1", x: 160, y: 70, w: 100, h: 52 },
  { id: "k2", name: "Корпус 2", x: 300, y: 80, w: 90, h: 48 },
  { id: "club", name: "Клуб", x: 170, y: 180, w: 90, h: 48 },
  { id: "stage", name: "Эстрада", x: 310, y: 220, w: 100, h: 44 },
];
