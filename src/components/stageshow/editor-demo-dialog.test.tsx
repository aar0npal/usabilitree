import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorDemoDialog } from "./editor-demo-dialog";
import { ONBOARDING_STORAGE_KEYS, resetOnboarding, type EditorDemoKind } from "@/lib/onboarding";

vi.mock("./editor-demo", () => ({
  EditorDemo: ({ editor }: { editor: string }) => <figure data-editor={editor} />,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (
    <dialog open={open} onClose={() => onOpenChange(false)}>
      {open ? children : null}
    </dialog>
  ),
  DialogContent: ({ children, ...props }: { children: ReactNode }) => (
    <section {...props}>{children}</section>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

let values: Map<string, string>;
let views: ReactTestRenderer[];
let storage: {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.useFakeTimers();
  values = new Map();
  views = [];
  storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
  vi.stubGlobal("localStorage", storage);
});
afterEach(() => {
  act(() => views.forEach((view) => view.unmount()));
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function popup(editor: EditorDemoKind) {
  let view: ReactTestRenderer;
  act(() => {
    view = create(<EditorDemoDialog editor={editor} />);
  });
  views.push(view!);
  return {
    open: () => view!.root.findByType("dialog").props.open,
    close: () => act(() => view!.root.findByType("dialog").props.onClose()),
    content: () => view!.root.findByType("section"),
    editor: () => view!.root.findByType("figure").props["data-editor"],
  };
}
function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("first-use editor demos", () => {
  it("opens the matching demo and prevents every dismissal until one second", () => {
    const tree = popup("tree");
    expect(tree.open()).toBe(true);
    expect(tree.editor()).toBe("tree");
    expect(tree.content().props.closeDisabled).toBe(true);
    const escape = { preventDefault: vi.fn() };
    const outside = { preventDefault: vi.fn() };
    tree.content().props.onEscapeKeyDown(escape);
    tree.content().props.onInteractOutside(outside);
    expect(escape.preventDefault).toHaveBeenCalledOnce();
    expect(outside.preventDefault).toHaveBeenCalledOnce();
    tree.close();
    tick(999);
    tree.close();
    expect(tree.open()).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
    tick(1);
    expect(tree.content().props.closeDisabled).toBe(false);
    const allowed = { preventDefault: vi.fn() };
    tree.content().props.onEscapeKeyDown(allowed);
    expect(allowed.preventDefault).not.toHaveBeenCalled();
    tree.close();
    expect(tree.open()).toBe(false);
    expect(values.get(ONBOARDING_STORAGE_KEYS.tree)).toBe("true");
  });

  it("remembers each tab separately across visits", () => {
    const tree = popup("tree");
    tick(1000);
    tree.close();
    expect(popup("tree").open()).toBe(false);
    const tasks = popup("tasks");
    expect(tasks.open()).toBe(true);
    expect(tasks.editor()).toBe("tasks");
    tick(1000);
    tasks.close();
    expect(popup("tasks").open()).toBe(false);
  });

  it("reset onboarding makes both intros available again and preserves other preferences", () => {
    for (const key of Object.values(ONBOARDING_STORAGE_KEYS)) values.set(key, "true");
    values.set("theme", "dark");
    expect(popup("tree").open()).toBe(false);
    expect(popup("tasks").open()).toBe(false);
    resetOnboarding();
    expect(popup("tree").open()).toBe(true);
    expect(popup("tasks").open()).toBe(true);
    expect(values.has(ONBOARDING_STORAGE_KEYS.dashboard)).toBe(false);
    expect(values.get("theme")).toBe("dark");
  });

  it("does not prevent closing when browser storage is unavailable", () => {
    storage.getItem.mockImplementation(() => {
      throw new Error("Blocked");
    });
    storage.setItem.mockImplementation(() => {
      throw new Error("Blocked");
    });
    const tree = popup("tree");
    expect(tree.open()).toBe(true);
    tick(1000);
    tree.close();
    expect(tree.open()).toBe(false);
  });

  it("returns keyboard focus to the tab that opened the popup", () => {
    class Tab {
      focus = vi.fn();
    }
    const tab = new Tab();
    vi.stubGlobal("HTMLElement", Tab);
    vi.stubGlobal("document", { activeElement: tab });
    const tree = popup("tree");
    const { onOpenAutoFocus, onCloseAutoFocus } = tree.content().props;
    onOpenAutoFocus();
    tick(1000);
    tree.close();
    const event = { preventDefault: vi.fn() };
    onCloseAutoFocus(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(tab.focus).toHaveBeenCalledOnce();
  });

  it("cleans up the close-delay timer when leaving the tab", () => {
    popup("tree");
    act(() => views[0].unmount());
    expect(vi.getTimerCount()).toBe(0);
  });
});
