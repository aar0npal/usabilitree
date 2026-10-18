import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TreeTestBranch } from "@/components/tree-test-branch";

vi.mock("@/env", () => ({ env: {} }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 16)
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function branch(initialOpen = false) {
  const children = vi.fn(() => createElement("span", null, "Branch contents"));
  const element = { inert: false };
  let view: ReturnType<typeof create>;
  act(() => {
    view = create(<TreeTestBranch open={initialOpen}>{children}</TreeTestBranch>, {
      createNodeMock: () => element,
    });
  });
  return {
    children,
    element,
    json: () => view.toJSON(),
    wrapper: () => view.root.findAllByType("div")[0],
    open(open: boolean) {
      act(() => view.update(<TreeTestBranch open={open}>{children}</TreeTestBranch>));
    },
    tick(ms: number) {
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    },
    dispose() {
      act(() => view.unmount());
    },
  };
}

describe("branch animation lifecycle", () => {
  it("mounts only on opening, paints a collapsed frame, then expands", () => {
    const test = branch();
    try {
      expect(test.json()).toBeNull();
      expect(test.children).not.toHaveBeenCalled();
      test.open(true);
      expect(test.wrapper().props.className).toContain("grid-rows-[0fr]");
      test.tick(16);
      expect(test.wrapper().props.className).toContain("grid-rows-[0fr]");
      test.tick(16);
      expect(test.wrapper().props.className).toContain("grid-rows-[1fr]");
      expect(test.element.inert).toBe(false);
    } finally {
      test.dispose();
    }
  });

  it("makes closing content inert immediately and unmounts it after the transition", () => {
    const test = branch(true);
    try {
      test.open(false);
      expect(test.element.inert).toBe(true);
      expect(test.wrapper().props["aria-hidden"]).toBe(true);
      expect(test.wrapper().props.className).toContain("grid-rows-[0fr]");
      test.tick(199);
      expect(test.json()).not.toBeNull();
      test.tick(1);
      expect(test.json()).toBeNull();
      const calls = test.children.mock.calls.length;
      test.tick(1000);
      expect(test.children).toHaveBeenCalledTimes(calls);
    } finally {
      test.dispose();
    }
  });

  it("cancels stale close timers and opening frames during rapid toggles", () => {
    const test = branch();
    try {
      test.open(true);
      test.tick(16);
      test.open(false);
      test.tick(50);
      test.open(true);
      test.tick(500);
      expect(test.json()).not.toBeNull();
      expect(test.element.inert).toBe(false);
      expect(test.wrapper().props.className).toContain("grid-rows-[1fr]");
      test.open(false);
      test.tick(200);
      expect(test.json()).toBeNull();
    } finally {
      test.dispose();
    }
  });

  it("ignores child transitions and stale end events after reopening", () => {
    const test = branch(true);
    try {
      test.open(false);
      const currentTarget = {};
      act(() =>
        test
          .wrapper()
          .props.onTransitionEnd({ target: {}, currentTarget, propertyName: "grid-template-rows" })
      );
      expect(test.json()).not.toBeNull();
      test.open(true);
      act(() =>
        test.wrapper().props.onTransitionEnd({
          target: currentTarget,
          currentTarget,
          propertyName: "grid-template-rows",
        })
      );
      expect(test.json()).not.toBeNull();
      test.open(false);
      act(() =>
        test.wrapper().props.onTransitionEnd({
          target: currentTarget,
          currentTarget,
          propertyName: "grid-template-rows",
        })
      );
      expect(test.json()).toBeNull();
    } finally {
      test.dispose();
    }
  });

  it("cancels pending work on unmount and disables movement for reduced motion", () => {
    const test = branch();
    test.open(true);
    expect(test.wrapper().props.className).toContain("motion-reduce:transition-none");
    test.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
