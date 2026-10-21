import { Suspense } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorDemo } from "./editor-demo";
import * as playbackClock from "./kit/playback-clock";

vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" } }));

vi.mock("next/dynamic", async () => {
  const { lazy } = await import("react");
  return { default: lazy };
});
vi.mock("./examples/usabilitree-tree-editor", () => ({
  default: () => <section data-demo="tree-desktop" />,
}));
vi.mock("./examples/usabilitree-tree-editor-phone", () => ({
  default: () => <section data-demo="tree-phone" />,
}));
vi.mock("./examples/usabilitree-tasks-editor", () => ({
  default: () => <section data-demo="tasks-desktop" />,
}));
vi.mock("./examples/usabilitree-tasks-editor-phone", () => ({
  default: () => <section data-demo="tasks-phone" />,
}));

let phone: boolean;
let reduced: boolean;
let motionListeners: Set<() => void>;
let listener: (() => void) | undefined;
let view: ReactTestRenderer;
const removeListener = vi.fn();

beforeEach(() => {
  phone = false;
  reduced = false;
  motionListeners = new Set();
  vi.spyOn(playbackClock, "createPlaybackClock");
  listener = undefined;
  removeListener.mockClear();
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      get matches() {
        return query === "(prefers-reduced-motion: reduce)" ? reduced : phone;
      },
      addEventListener: (_event: string, next: () => void) => {
        if (query === "(prefers-reduced-motion: reduce)") motionListeners.add(next);
        else listener = next;
      },
      removeEventListener: (event: string, previous: () => void) => {
        motionListeners.delete(previous);
        removeListener(event, previous);
      },
    }),
  });
});
afterEach(() => {
  act(() => view?.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(editor: "tree" | "tasks") {
  await act(async () => {
    view = create(
      <Suspense fallback={null}>
        <EditorDemo editor={editor} />
      </Suspense>
    );
  });
}
function frame() {
  return view.root.find((node) => node.type === "div" && node.props["aria-hidden"] === "true");
}
function demo() {
  return view.root.findByType("section");
}

describe("responsive editor demos", () => {
  it.each(["tree", "tasks"] as const)(
    "keeps %s in desktop layout on wide windows",
    async (editor) => {
      await render(editor);
      expect(demo().props["data-demo"]).toBe(`${editor}-desktop`);
      expect(frame().props["data-ss-wide"]).toBe("");
      expect(view.root.findByType("button").props["aria-label"]).toBe(
        `Pause ${editor} editor demo`
      );
    }
  );

  it.each(["tree", "tasks"] as const)(
    "uses the %s phone demo on narrow windows",
    async (editor) => {
      phone = true;
      await render(editor);
      expect(demo().props["data-demo"]).toBe(`${editor}-phone`);
      expect(frame().props["data-ss-wide"]).toBeUndefined();
    }
  );

  it("switches both ways as the browser crosses the phone breakpoint", async () => {
    await render("tree");
    await act(async () => {
      phone = true;
      listener?.();
    });
    expect(demo().props["data-demo"]).toBe("tree-phone");
    await act(async () => {
      phone = false;
      listener?.();
    });
    expect(demo().props["data-demo"]).toBe("tree-desktop");
    act(() => view.unmount());
    expect(removeListener).toHaveBeenCalledWith("change", listener);
  });
});

function setReducedMotion(next: boolean) {
  act(() => {
    reduced = next;
    motionListeners.forEach((update) => update());
  });
}

describe("editor demo playback controls", () => {
  it.each(["tree", "tasks"] as const)(
    "pauses and resumes the %s demo outside the hidden scene",
    async (editor) => {
      await render(editor);
      const clock = vi.mocked(playbackClock.createPlaybackClock).mock.results[0].value;
      const setPaused = vi.spyOn(clock, "setPaused");
      const button = view.root.findByType("button");
      expect(view.root.findByType("figcaption").findByType("button")).toBe(button);
      expect(frame().findAllByType("button")).toHaveLength(0);
      expect(button.props["aria-label"]).toBe(`Pause ${editor} editor demo`);
      act(() => button.props.onClick());
      expect(setPaused).toHaveBeenLastCalledWith(true);
      expect(button.props["aria-label"]).toBe(`Play ${editor} editor demo`);
      act(() => button.props.onClick());
      expect(setPaused).toHaveBeenLastCalledWith(false);
      expect(button.props["aria-label"]).toBe(`Pause ${editor} editor demo`);
    }
  );

  it.each(["tree", "tasks"] as const)(
    "omits the %s control when reduced motion is enabled",
    async (editor) => {
      reduced = true;
      await render(editor);
      expect(view.root.findAllByType("button")).toHaveLength(0);
    }
  );

  it("responds to motion preference changes and preserves a paused demo", async () => {
    await render("tree");
    act(() => view.root.findByType("button").props.onClick());
    setReducedMotion(true);
    expect(view.root.findAllByType("button")).toHaveLength(0);
    setReducedMotion(false);
    expect(view.root.findByType("button").props["aria-label"]).toBe("Play tree editor demo");
  });

  it("gives each demo its own playback control", async () => {
    await act(async () => {
      view = create(
        <Suspense fallback={null}>
          <EditorDemo editor="tree" />
          <EditorDemo editor="tasks" />
        </Suspense>
      );
    });
    const clocks = vi
      .mocked(playbackClock.createPlaybackClock)
      .mock.results.map((result) => result.value);
    const treePaused = vi.spyOn(clocks[0], "setPaused");
    const tasksPaused = vi.spyOn(clocks[1], "setPaused");
    const [treeButton, tasksButton] = view.root.findAllByType("button");
    act(() => treeButton.props.onClick());
    expect(treePaused).toHaveBeenCalledWith(true);
    expect(tasksPaused).not.toHaveBeenCalled();
    act(() => tasksButton.props.onClick());
    expect(tasksPaused).toHaveBeenCalledWith(true);
    expect(treePaused).toHaveBeenCalledOnce();
  });
});
