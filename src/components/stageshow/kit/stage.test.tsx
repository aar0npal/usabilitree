import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Stage } from "./stage";
import { PlaybackContext } from "./playback";
import { createPlaybackClock } from "./playback-clock";

class StageNode extends EventTarget {
  private attributes = new Set<string>();
  clientWidth = 720;
  parentElement = null;
  style: Record<string, string> = {};
  setAttribute(name: string) {
    this.attributes.add(name);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
  toggleAttribute(name: string, value: boolean) {
    if (value) this.attributes.add(name);
    else this.attributes.delete(name);
  }
  querySelectorAll() {
    return [];
  }
  querySelector() {
    return null;
  }
  getAnimations() {
    return [];
  }
}

let view: ReactTestRenderer | undefined;
let stage: StageNode;
let intersect: (visible: boolean) => void;
let reduced: { matches: boolean };
let mediaListeners: Set<() => void>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16)
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  reduced = { matches: false };
  mediaListeners = new Set();
  vi.stubGlobal("window", {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    matchMedia: () => ({
      get matches() {
        return reduced.matches;
      },
      addEventListener: (_: string, fn: () => void) => mediaListeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => mediaListeners.delete(fn),
    }),
  });
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), {
      hidden: false,
      fonts: { status: "loaded" },
    })
  );
  class Observer {
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.stubGlobal("MutationObserver", Observer);
  vi.stubGlobal(
    "IntersectionObserver",
    class extends Observer {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        super();
        intersect = (visible) => callback([{ isIntersecting: visible }]);
      }
    }
  );
});

afterEach(() => {
  if (view) act(() => view?.unmount());
  view = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function replayFade() {
  const script = vi.fn(async () => {});
  const playback = { clock: createPlaybackClock(), repeat: true };
  act(() => {
    view = create(
      <PlaybackContext.Provider value={playback}>
        <Stage
          width={720}
          height={480}
          initial={{ value: "opening" }}
          poster={{ value: "poster" }}
          script={script}
          play="once"
        >
          {(state) => <span>{state.value}</span>}
        </Stage>
      </PlaybackContext.Provider>,
      {
        createNodeMock(element) {
          const node = new StageNode();
          if (element.props.className === "ss-stage") stage = node;
          return node;
        },
      }
    );
  });
  act(() => intersect(true));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1700);
  });
  expect(stage.hasAttribute("data-replaying")).toBe(true);
  return script;
}

describe("replay fade cancellation", () => {
  it("reveals a demo when it stops offscreen and returns", async () => {
    const script = await replayFade();
    act(() => intersect(false));
    expect(stage.hasAttribute("data-replaying")).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(script).toHaveBeenCalledTimes(1);
    act(() => intersect(true));
    expect(stage.hasAttribute("data-replaying")).toBe(false);
    expect(script).toHaveBeenCalledTimes(2);
  });

  it("reveals the poster when reduced motion interrupts a replay", async () => {
    await replayFade();
    await act(async () => {
      reduced.matches = true;
      mediaListeners.forEach((listener) => listener());
    });
    expect(stage.hasAttribute("data-replaying")).toBe(false);
    expect(view!.root.findByType("span").children).toEqual(["poster"]);
  });

  it("clears the fade when the tab is hidden", async () => {
    await replayFade();
    act(() => {
      Object.defineProperty(document, "hidden", { value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(stage.hasAttribute("data-replaying")).toBe(false);
  });

  it("clears the fade on unmount", async () => {
    await replayFade();
    act(() => view!.unmount());
    view = undefined;
    expect(stage.hasAttribute("data-replaying")).toBe(false);
  });
});
