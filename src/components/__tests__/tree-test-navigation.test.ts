import { createElement } from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Navigation } from "@/components/tree-test-navigation";
import type { Item } from "@/lib/types/tree-test";
import { isTreePathOpen, toggleTreePath } from "@/lib/treetest/navigation-state";

vi.mock("@/env", () => ({ env: {} }));

function render(items: Item[], allowNonLeafAnswers = false) {
  return renderToStaticMarkup(
    createElement(Navigation, {
      items,
      allowNonLeafAnswers,
      resetKey: 0,
      onSelect: () => {},
      setPathTaken: () => {},
      customText: { findItHere: "Find here", selectAsAnswer: "Select folder" },
    })
  );
}

const largeTree: Item[] = Array.from({ length: 44 }, (_, root) => ({
  name: `Root ${root}`,
  children: Array.from({ length: 140 }, (_, child) => ({
    name: `Hidden ${root} ${child}`,
    link: `/root-${root}/hidden-${child}`,
  })),
}));

describe("participant tree rendering", () => {
  it.each([false, true])("does not mount collapsed descendants (folder answers: %s)", (folders) => {
    const html = render(largeTree, folders);
    expect(html).not.toContain("Hidden");
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(44);
    expect(html.match(/Root \d+/g)).toHaveLength(44);
  });

  it("opens a single root but keeps deeper branches unmounted", () => {
    const html = render([{ name: "Home", children: largeTree }]);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Root 43");
    expect(html).not.toContain("Hidden");
  });

  it("treats empty child lists as leaves", () => {
    expect(render([{ name: "Leaf", children: [], link: "/leaf" }])).not.toContain("aria-expanded");
  });

  it("allows repeated sibling labels without duplicate React keys", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const html = render([
        { name: "Same", children: largeTree },
        { name: "Same", children: largeTree },
      ]);
      expect(html.match(/Same/g)).toHaveLength(2);
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});

describe("branch navigation", () => {
  it("opens ancestors, switches siblings, and drops descendants on collapse", () => {
    let open: number[] = [];
    open = toggleTreePath(open, [0]);
    open = toggleTreePath(open, [0, 2]);
    open = toggleTreePath(open, [0, 2, 1]);
    expect(isTreePathOpen(open, [0])).toBe(true);
    expect(isTreePathOpen(open, [0, 2])).toBe(true);
    open = toggleTreePath(open, [0, 3]);
    expect(isTreePathOpen(open, [0, 2])).toBe(false);
    expect(isTreePathOpen(open, [0, 3, 1])).toBe(false);
    open = toggleTreePath(open, [0]);
    expect(open).toEqual([]);
    expect(toggleTreePath(open, [0])).toEqual([0]);
  });

  it("distinguishes same-named siblings by position", () => {
    expect(isTreePathOpen([0, 1], [0, 0])).toBe(false);
    expect(toggleTreePath([0, 1], [0, 0])).toEqual([0, 0]);
    expect(toggleTreePath([0, 1, 2], [0, 1])).toEqual([0]);
  });
});

// Exercise real React state and click handlers without a browser or database.

function text(node: ReactTestInstance): string {
  return node.children.map((child) => (typeof child === "string" ? child : text(child))).join("");
}

function session(items: Item[], folders = false) {
  let path = "";
  const onSelect = vi.fn();
  const setPathTaken = (update: string | ((previous: string) => string)) => {
    path = typeof update === "function" ? update(path) : update;
  };
  const props = {
    items,
    allowNonLeafAnswers: folders,
    resetKey: 0,
    onSelect,
    setPathTaken,
    customText: { findItHere: "Find here", selectAsAnswer: "Select folder" },
  };
  let view: ReturnType<typeof create>;
  act(() => {
    view = create(createElement(Navigation, props));
  });
  const buttons = (label: string) =>
    view.root.findAllByType("button").filter((button) => text(button) === label);
  return {
    buttons,
    onSelect,
    path: () => path,
    click(label: string, index = 0) {
      act(() => buttons(label)[index].props.onClick({ stopPropagation() {} }));
    },
    leaf(label: string) {
      const span = view.root
        .findAllByType("span")
        .find(
          (node) => text(node) === label && node.parent?.type === "div" && node.parent.props.onClick
        )!;
      act(() => span.parent!.props.onClick());
    },
    reset() {
      act(() => view.update(createElement(Navigation, { ...props, resetKey: 1 })));
    },
    close() {
      act(() => view.unmount());
    },
  };
}

describe("participant clicks", () => {
  it("keeps same-named branches independent and only selects the clicked duplicate leaf", () => {
    const same = {
      name: "Same",
      children: [
        { name: "Answer", link: "/home/same/answer" },
        { name: "Answer", link: "/home/same/answer" },
      ],
    };
    const test = session([{ name: "Home", children: [same, same] }]);
    try {
      test.click("Same", 1);
      expect(test.buttons("Same").map((button) => button.props["aria-expanded"])).toEqual([
        false,
        true,
      ]);
      test.leaf("Answer");
      expect(test.buttons("Find here")).toHaveLength(1);
      test.click("Find here");
      expect(test.onSelect).toHaveBeenCalledWith("/home/same/answer");
      expect(test.path()).toBe("/home/same/answer");
      test.click("Same", 0);
      expect(test.buttons("Same").map((button) => button.props["aria-expanded"])).toEqual([
        true,
        false,
      ]);
      expect(test.buttons("Find here")).toHaveLength(0);
      test.reset();
      expect(test.path()).toBe("/home");
      expect(test.buttons("Same").map((button) => button.props["aria-expanded"])).toEqual([
        false,
        false,
      ]);
    } finally {
      test.close();
    }
  });

  it("keeps folder answer links and expansion-then-selection paths unchanged", () => {
    const test = session(
      [
        {
          name: "Home",
          children: [{ name: "Folder", children: [{ name: "Leaf", link: "/home/folder/leaf" }] }],
        },
      ],
      true
    );
    try {
      test.click("Folder");
      test.click("Select folder", 1);
      expect(test.onSelect).toHaveBeenCalledWith("/home/folder");
      expect(test.path()).toBe("/home/folder");
      test.click("Folder");
      test.click("Folder");
      test.leaf("Leaf");
      test.click("Find here");
      expect(test.onSelect).toHaveBeenLastCalledWith("/home/folder/leaf");
      expect(test.path()).toBe("/home/folder/leaf");
      test.reset();
      expect(test.buttons("Find here")).toHaveLength(0);
      expect(test.path()).toBe("/home");
    } finally {
      test.close();
    }
  });

  it("preserves multilingual paths and records a leaf with its parent's name", () => {
    const test = session([
      {
        name: "Home",
        children: [{ name: "保健", children: [{ name: "保健", link: "/home/保健/保健" }] }],
      },
    ]);
    try {
      test.click("保健");
      test.leaf("保健");
      test.click("Find here");
      expect(test.path()).toBe("/home/保健/保健");
      expect(test.onSelect).toHaveBeenCalledWith("/home/保健/保健");
    } finally {
      test.close();
    }
  });
});
