/** A clue opened after a find has been restored. */
export type Clue = {
  /** Unique id. */
  id: string;
  /** Short title. */
  title: string;
  /** Clue text shown in the archive. */
  text: string;
  /** Id of the find whose restoration opened this clue. */
  findId: string;
  /** Day on which the clue was opened. */
  day: number;
};

/** A task opened by a clue. */
export type Task = {
  /** Unique id. */
  id: string;
  /** Short title. */
  title: string;
  /** What the player has to do. */
  description: string;
  /** Id of the clue that opened the task. */
  clueId: string;
  /** Whether the task is completed. */
  done: boolean;
};

/** Clue description from the content data. A task is optional. */
export type ClueTemplate = {
  id: string;
  findId: string;
  title: string;
  text: string;
  task?: Omit<Task, "clueId" | "done">;
  
  /** Variant used when fragile parts were lost during restoration. */
  onLost?: {
    text: string;
    task?: Omit<Task, "clueId" | "done">;
  };
};
