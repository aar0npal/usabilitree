import { clock } from "./clock";

type Source = Pick<typeof clock, "now" | "raf" | "cancelRaf">;
type Task = { at: number; callback: (time: number) => void; interval?: number };

/** A demo's own clock, so pausing one never stops its neighbors or the page. */
export function createPlaybackClock(source: Source = clock) {
  const tasks = new Map<number, Task>();
  const listeners = new Set<(paused: boolean) => void>();
  let nextId = 0;
  let frame: number | null = null;
  let pausedAt: number | null = null;
  let offset = 0;
  const now = () => (pausedAt ?? source.now()) - offset;

  function wake() {
    if (frame === null && pausedAt === null && tasks.size) frame = source.raf(tick);
  }
  function tick() {
    frame = null;
    const time = now();
    for (const [id, task] of Array.from(tasks)) {
      if (pausedAt !== null) break;
      if (!tasks.has(id) || task.at > time) continue;
      if (task.interval) task.at = time + task.interval;
      else tasks.delete(id);
      task.callback(time);
    }
    wake();
  }
  function add(callback: (time: number) => void, delay: number, interval?: number) {
    const id = ++nextId;
    tasks.set(id, { at: now() + delay, callback, interval });
    wake();
    return id;
  }
  function cancel(id: number) {
    tasks.delete(id);
    if (!tasks.size && frame !== null) {
      source.cancelRaf(frame);
      frame = null;
    }
  }
  return {
    now,
    raf: (callback: FrameRequestCallback) => add(callback, 0),
    cancelRaf: cancel,
    timeout: (callback: () => void, delay: number) => add(callback, delay),
    clearTimeout: cancel,
    interval: (callback: () => void, delay: number) => add(callback, delay, delay),
    clearInterval: cancel,
    subscribe(listener: (paused: boolean) => void) {
      listeners.add(listener);
      listener(pausedAt !== null);
      return () => {
        listeners.delete(listener);
      };
    },
    setPaused(paused: boolean) {
      if (paused === (pausedAt !== null)) return;
      if (paused) {
        pausedAt = source.now();
        if (frame !== null) source.cancelRaf(frame);
        frame = null;
      } else {
        offset += source.now() - pausedAt!;
        pausedAt = null;
        wake();
      }
      listeners.forEach((listener) => listener(paused));
    },
    dispose() {
      if (frame !== null) source.cancelRaf(frame);
      frame = null;
      tasks.clear();
      listeners.clear();
    },
  };
}
export type PlaybackClock = ReturnType<typeof createPlaybackClock>;
