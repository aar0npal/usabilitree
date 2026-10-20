import { Suspense } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorDemo } from "./editor-demo";

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
let listener: (() => void) | undefined;
let view: ReactTestRenderer;
const removeListener = vi.fn();

beforeEach(() => {
  phone = false;
  listener = undefined;
  removeListener.mockClear();
  vi.stubGlobal("window", {
    matchMedia: () => ({
      get matches() {
        return phone;
      },
      addEventListener: (_event: string, next: () => void) => {
        listener = next;
      },
      removeEventListener: removeListener,
    }),
  });
});
afterEach(() => {
  act(() => view?.unmount());
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
function demo() {
  return view.root.findByType("section");
}

describe("responsive editor demos", () => {
  it.each(["tree", "tasks"] as const)(
    "keeps %s in desktop layout on wide windows",
    async (editor) => {
      await render(editor);
      expect(demo().props["data-demo"]).toBe(`${editor}-desktop`);
      expect(view.root.findByProps({ "aria-hidden": "true" }).props["data-ss-wide"]).toBe("");
      expect(view.root.findAllByType("button")).toHaveLength(0);
    }
  );

  it.each(["tree", "tasks"] as const)(
    "uses the %s phone demo on narrow windows",
    async (editor) => {
      phone = true;
      await render(editor);
      expect(demo().props["data-demo"]).toBe(`${editor}-phone`);
      expect(
        view.root.findByProps({ "aria-hidden": "true" }).props["data-ss-wide"]
      ).toBeUndefined();
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
