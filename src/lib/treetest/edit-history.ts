/**
 * Undo and redo for an editor whose state is one value. Each change records
 * the state before it. Changes that share a group with the change just before
 * them (keystrokes in one field) undo as one step.
 */
export interface EditHistory<T> {
  past: T[];
  future: T[];
  /** The group of the last recorded change */
  group: string | null;
}

const LIMIT = 100;

export function emptyHistory<T>(): EditHistory<T> {
  return { past: [], future: [], group: null };
}

/** Records a change away from `before`; any redo is gone once something new happens */
export function record<T>(
  history: EditHistory<T>,
  before: T,
  group: string | null = null
): EditHistory<T> {
  if (group !== null && group === history.group) return { ...history, future: [] };
  return { past: [...history.past, before].slice(-LIMIT), future: [], group };
}

/** The state to go back to, and the history after it; null when there's nothing to undo */
export function undo<T>(history: EditHistory<T>, current: T): [T, EditHistory<T>] | null {
  if (history.past.length === 0) return null;
  const previous = history.past[history.past.length - 1];
  return [
    previous,
    { past: history.past.slice(0, -1), future: [current, ...history.future], group: null },
  ];
}

export function redo<T>(history: EditHistory<T>, current: T): [T, EditHistory<T>] | null {
  if (history.future.length === 0) return null;
  const [next, ...rest] = history.future;
  return [next, { past: [...history.past, current].slice(-LIMIT), future: rest, group: null }];
}
