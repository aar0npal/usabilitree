import { describe, expect, it } from "vitest";
import { createPlaybackClock } from "./playback-clock";

function source() {
  let time = 0;
  let next = 0;
  const frames = new Map<number, FrameRequestCallback>();
  return {
    now: () => time,
    raf(fn: FrameRequestCallback) {
      frames.set(++next, fn);
      return next;
    },
    cancelRaf(id: number) {
      frames.delete(id);
    },
    advance(ms: number) {
      time += ms;
      const pending = Array.from(frames.values());
      frames.clear();
      pending.forEach((fn) => fn(time));
    },
    pending: () => frames.size,
  };
}

describe("demo playback", () => {
  it("resumes a wait with its remaining time", () => {
    const native = source();
    const clock = createPlaybackClock(native);
    let finished = false;
    clock.timeout(() => {
      finished = true;
    }, 1000);
    native.advance(400);
    clock.setPaused(true);
    expect(native.pending()).toBe(0);
    native.advance(10000);
    expect(clock.now()).toBe(400);
    expect(finished).toBe(false);
    clock.setPaused(false);
    native.advance(599);
    expect(finished).toBe(false);
    native.advance(1);
    expect(finished).toBe(true);
  });

  it("does not advance a tween's clock while paused", () => {
    const native = source();
    const clock = createPlaybackClock(native);
    const frames: number[] = [];
    native.advance(100);
    clock.raf((time) => frames.push(time));
    clock.setPaused(true);
    native.advance(5000);
    expect(frames).toEqual([]);
    clock.setPaused(false);
    native.advance(16);
    expect(frames).toEqual([116]);
  });

  it("pauses each demo independently", () => {
    const native = source();
    const tree = createPlaybackClock(native);
    const tasks = createPlaybackClock(native);
    const seen: string[] = [];
    tree.timeout(() => seen.push("tree"), 100);
    tasks.timeout(() => seen.push("tasks"), 100);
    tree.setPaused(true);
    native.advance(100);
    expect(seen).toEqual(["tasks"]);
    tree.setPaused(false);
    native.advance(100);
    expect(seen).toEqual(["tasks", "tree"]);
  });

  it("cancels pending work when a demo unmounts", () => {
    const native = source();
    const clock = createPlaybackClock(native);
    let calls = 0;
    clock.timeout(() => calls++, 10);
    clock.interval(() => calls++, 10);
    clock.dispose();
    expect(native.pending()).toBe(0);
    native.advance(100);
    expect(calls).toBe(0);
  });
});
