import { describe, expect, it, vi } from "vitest";

// The original path rule lives in @/lib/utils, which reads the app's env
vi.mock("@/env", () => ({ env: {} }));

import {
  answerOptions,
  carryAnswers,
  searchOptions,
  splitAnswers,
  toggleAnswer,
} from "@/lib/treetest/task-answers";

const tree = [
  {
    name: "Home",
    children: [
      {
        name: "Services",
        children: [
          { name: "Business permits", link: "/home/services/business-permits" },
          { name: "Health services", link: "/home/services/health-services" },
        ],
      },
      {
        name: "Servicios públicos",
        children: [{ name: "保健", link: "/home/servicios-pblicos/保健" }],
      },
      { name: "Contact", link: "/home/contact" },
    ],
  },
];

describe("answer options", () => {
  it("lists every item in reading order, with its path and the names above it", () => {
    const options = answerOptions(tree, "multilingual");
    expect(options.map((o) => [o.name, o.path, o.trail.join(" › "), o.parent])).toEqual([
      ["Home", "/home", "", true],
      ["Services", "/home/services", "Home", true],
      ["Business permits", "/home/services/business-permits", "Home › Services", false],
      ["Health services", "/home/services/health-services", "Home › Services", false],
      ["Servicios públicos", "/home/servicios-pblicos", "Home", true],
      ["保健", "/home/servicios-pblicos/保健", "Home › Servicios públicos", false],
      ["Contact", "/home/contact", "Home", false],
    ]);
  });

  it("takes a leaf's path from its saved link, as a participant's click records it", () => {
    const saved = [{ name: "Home", children: [{ name: "保健", link: "/home/" }] }];
    expect(answerOptions(saved, "original")[1].path).toBe("/home/");
  });
});

describe("a task's answers", () => {
  it("reads the comma list, skipping blanks and repeats", () => {
    expect(splitAnswers(" /home/a , /home/b,, /home/a ")).toEqual(["/home/a", "/home/b"]);
    expect(splitAnswers("")).toEqual([]);
  });

  it("follows its items to their new paths, keeping the rest", () => {
    const changes = new Map([["/home/about/contact", "/home/services/contact"]]);
    expect(carryAnswers("/home/about/contact, /home/faq", changes)).toBe(
      "/home/services/contact, /home/faq"
    );
    expect(carryAnswers("/home/faq", changes)).toBe("/home/faq");
  });

  it("adds a path, or takes it out when it's already there", () => {
    expect(toggleAnswer("", "/home/a")).toBe("/home/a");
    expect(toggleAnswer("/home/a", "/home/b")).toBe("/home/a, /home/b");
    expect(toggleAnswer("/home/a, /home/b", "/home/a")).toBe("/home/b");
  });
});

describe("searching the options", () => {
  const options = answerOptions(tree, "multilingual");
  const names = (shown: Set<number>) => options.filter((_, i) => shown.has(i)).map((o) => o.name);

  it("shows the matches and the parents they sit under", () => {
    expect(names(searchOptions(options, "heal"))).toEqual(["Home", "Services", "Health services"]);
  });

  it("shows everything under a matching parent, so a section can be picked from by name", () => {
    expect(names(searchOptions(options, "services"))).toEqual([
      "Home",
      "Services",
      "Business permits",
      "Health services",
    ]);
  });

  it("ignores case and accents", () => {
    expect(names(searchOptions(options, "PUBLICOS"))).toEqual([
      "Home",
      "Servicios públicos",
      "保健",
    ]);
  });

  it("shows everything for an empty search, and nothing for no match", () => {
    expect(searchOptions(options, "  ").size).toBe(options.length);
    expect(searchOptions(options, "zebra").size).toBe(0);
  });
});
