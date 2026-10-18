import { describe, expect, it, vi } from "vitest";

// The original path rule lives in @/lib/utils, which reads the app's env
vi.mock("@/env", () => ({ env: {} }));

import { sampleParsedTree, sampleTreeStructure } from "@/lib/treetest/sample-data";
import { parseTreeText } from "@/lib/treetest/tree-import";
import type { PathRule } from "@/lib/treetest/path-rule";
import {
  canIndent,
  collapseAllIds,
  dropLevels,
  findPathIssues,
  fitPath,
  followPaths,
  indentRow,
  insertionPoint,
  makeRow,
  moveAmongSiblings,
  moveRow,
  outdentRow,
  removeRow,
  rowPaths,
  rowsFromTree,
  rowsToSave,
  structureFromRows,
  treeFromRows,
  visibleRows,
  type OutlineRow,
} from "@/lib/treetest/tree-outline";

/** Rows from "name@level" shorthand */
const rows = (...items: string[]): OutlineRow[] =>
  items.map((item) => {
    const at = item.lastIndexOf("@");
    return makeRow(item.slice(0, at), Number(item.slice(at + 1)));
  });

const shape = (list: OutlineRow[]) => list.map((row) => `${row.name}@${row.level}`);

describe("saving the editor's tree", () => {
  it("rebuilds the sample study's saved tree, links and all, from its comma text", () => {
    // The sample study's comma text and its saved tree were written separately; the editor must agree with both
    const { rows: imported } = parseTreeText(sampleTreeStructure);
    expect(treeFromRows(imported, "original")).toEqual(sampleParsedTree);
  });

  it("reloads a saved tree as the same rows", () => {
    const loaded = rowsFromTree(sampleParsedTree);
    expect(treeFromRows(loaded, "original")).toEqual(sampleParsedTree);
    expect(structureFromRows(loaded)).toBe(sampleTreeStructure);
  });

  it("links leaves only, by their full path", () => {
    const tree = treeFromRows(
      rows(
        "Home - City of Manila@0",
        "Services@1",
        "Business Permits@2",
        "Health Services@2",
        "About Us@1"
      ),
      "original"
    );
    expect(tree).toEqual([
      {
        name: "Home - City of Manila",
        children: [
          {
            name: "Services",
            children: [
              {
                name: "Business Permits",
                link: "/home---city-of-manila/services/business-permits",
              },
              { name: "Health Services", link: "/home---city-of-manila/services/health-services" },
            ],
          },
          { name: "About Us", link: "/home---city-of-manila/about-us" },
        ],
      },
    ]);
  });

  it("trims names, and drops unnamed rows without orphaning the rows under them", () => {
    const saved = rowsToSave(rows("  Home  @0", "@1", "Permits@2", "About@1"));
    expect(shape(saved)).toEqual(["  Home  @0", "Permits@1", "About@1"]);
    expect(treeFromRows(saved, "original")[0].name).toBe("Home");
  });

  it("writes comma text that reads back as the same tree, commas in names included", () => {
    const original = rows("Home, Garden & Pets@0", "Pots, planters@1", "Seeds@2", "Contact@0");
    const { rows: back } = parseTreeText(structureFromRows(original));
    expect(shape(back)).toEqual(shape(original));
  });
});

describe("editing rows", () => {
  const tree = () => rows("Home@0", "Services@1", "Permits@2", "Clinics@2", "About@1");

  it("indents a row with everything under it, never the first row or past the row above", () => {
    expect(canIndent(tree(), 0)).toBe(false);
    // Permits sits under Services: nothing above it at its level to nest under
    expect(canIndent(tree(), 2)).toBe(false);
    expect(shape(indentRow(tree(), 4))).toEqual([
      "Home@0",
      "Services@1",
      "Permits@2",
      "Clinics@2",
      "About@2",
    ]);
    expect(shape(indentRow(tree(), 1))).toEqual(shape(tree()));
    const services = rows("Home@0", "About@1", "Services@1", "Permits@2");
    expect(shape(indentRow(services, 2))).toEqual(["Home@0", "About@1", "Services@2", "Permits@3"]);
  });

  it("outdents a row with everything under it and leaves the order alone", () => {
    expect(shape(outdentRow(tree(), 1))).toEqual([
      "Home@0",
      "Services@0",
      "Permits@1",
      "Clinics@1",
      "About@1",
    ]);
    expect(shape(outdentRow(tree(), 0))).toEqual(shape(tree()));
  });

  it("adds after a leaf as its sibling, into an open parent as its first child, after a closed one", () => {
    expect(insertionPoint(tree(), 2)).toEqual({ at: 3, level: 2 });
    expect(insertionPoint(tree(), 1)).toEqual({ at: 2, level: 2 });
    expect(insertionPoint(tree(), 1, true)).toEqual({ at: 4, level: 1 });
  });

  it("deletes a row with everything under it", () => {
    expect(shape(removeRow(tree(), 1))).toEqual(["Home@0", "About@1"]);
    expect(shape(removeRow(tree(), 3))).toEqual(["Home@0", "Services@1", "Permits@2", "About@1"]);
  });

  it("collapses every parent but a lone top-level item, as the test opens it", () => {
    const one = tree();
    expect(collapseAllIds(one)).toEqual([one[1].id]);
    const two = rows("Home@0", "Shop@1", "Help@0", "FAQ@1");
    expect(collapseAllIds(two)).toEqual([two[0].id, two[2].id]);
  });

  it("moves a row with everything under it into a gap, at the level the drop sets", () => {
    const list = tree();
    const id = (name: string) => list.find((row) => row.name === name)!.id;
    // Services, with its two children, to the end at the top level
    expect(shape(moveRow(list, 1, { above: id("About"), level: 0 }))).toEqual([
      "Home@0",
      "About@1",
      "Services@0",
      "Permits@1",
      "Clinics@1",
    ]);
    // About up between Permits and Clinics, one level deeper
    expect(
      shape(moveRow(list, 4, { above: id("Permits"), below: id("Clinics"), level: 2 }))
    ).toEqual(["Home@0", "Services@1", "Permits@2", "About@2", "Clinics@2"]);
    // Deeper than the row above: its first child, even if that row's children are hidden
    expect(
      shape(moveRow(list, 4, { above: id("Services"), below: id("About"), level: 2 }))
    ).toEqual(["Home@0", "Services@1", "About@2", "Permits@2", "Clinics@2"]);
  });

  it("allows only levels that keep the rows around the gap where they are", () => {
    const [home, services, permits, , about] = tree();
    // Between a parent and its first child: only as that child's sibling
    expect(dropLevels(services, permits)).toEqual({ min: 2, max: 2 });
    // After the last child: as its sibling, its parent's, or nested under it
    expect(dropLevels(permits, about)).toEqual({ min: 1, max: 3 });
    expect(dropLevels(undefined, home)).toEqual({ min: 0, max: 0 });
    expect(dropLevels(about, undefined)).toEqual({ min: 0, max: 2 });
  });

  it("swaps a row with its sibling above or below, children and all", () => {
    expect(shape(moveAmongSiblings(tree(), 4, -1)!)).toEqual([
      "Home@0",
      "About@1",
      "Services@1",
      "Permits@2",
      "Clinics@2",
    ]);
    expect(shape(moveAmongSiblings(tree(), 2, 1)!)).toEqual([
      "Home@0",
      "Services@1",
      "Clinics@2",
      "Permits@2",
      "About@1",
    ]);
    // No sibling past its parent's edge
    expect(moveAmongSiblings(tree(), 2, -1)).toBeNull();
    expect(moveAmongSiblings(tree(), 4, 1)).toBeNull();
  });

  it("hides the rows inside a collapsed parent", () => {
    const list = tree();
    const shown = visibleRows(list, new Set([list[1].id]));
    expect(shown.map(({ row }) => row.name)).toEqual(["Home", "Services", "About"]);
    expect(shown.map(({ index }) => index)).toEqual([0, 1, 4]);
  });
});

describe("paths that can't tell items apart", () => {
  const issuesByName = (list: OutlineRow[], rule: PathRule = "original") =>
    Object.fromEntries(
      Array.from(findPathIssues(list, rule), ([id, issue]) => [
        list.find((row) => row.id === id)!.name,
        issue,
      ])
    );

  it("finds nothing in a tree whose paths are all distinct", () => {
    expect(
      findPathIssues(rows("Home@0", "Services@1", "Contact@2", "About@1", "Contact@2"), "original")
        .size
    ).toBe(0);
  });

  it("flags two items with the same name under one parent", () => {
    expect(issuesByName(rows("Home@0", "Contact@1", "About@1", "contact@1"))).toEqual({
      Contact: { kind: "duplicate", withName: "contact" },
      contact: { kind: "duplicate", withName: "Contact" },
    });
  });

  it("flags names that differ only in symbols the path drops", () => {
    expect(issuesByName(rows("Courses@0", "C++@1", "C#@1"))).toEqual({
      "C++": { kind: "duplicate", withName: "C#" },
      "C#": { kind: "duplicate", withName: "C++" },
    });
    // ñ becomes n, so these two Spanish words share a path
    expect(issuesByName(rows("Inicio@0", "Año@1", "Ano@1"))).toEqual({
      Año: { kind: "duplicate", withName: "Ano" },
      Ano: { kind: "duplicate", withName: "Año" },
    });
  });

  const scripts = [
    "サービス",
    "服务",
    "Услуги",
    "Υπηρεσίες",
    "خدماتنا",
    "שירותים",
    "บริการ",
    "सेवाएं",
  ];

  it("under the original rule, flags names in scripts the path can't hold at all", () => {
    for (const name of scripts) {
      expect(issuesByName(rows("Home@0", `${name}@1`))).toEqual({ [name]: { kind: "empty" } });
    }
    // Korean keeps only the space between its words, as a lone hyphen
    expect(rowPaths(rows("Home@0", "고객 지원@1"), "original")[1]).toBe("/home/-");
    expect(issuesByName(rows("Home@0", "고객 지원@1"))).toEqual({ "고객 지원": { kind: "empty" } });
  });

  it("keeps accented names apart, though their paths lose the accented letters", () => {
    const list = rows("Inicio@0", "Servicios públicos@1", "Über uns@1", "Café crème@1");
    expect(rowPaths(list, "original")).toEqual([
      "/inicio",
      "/inicio/servicios-pblicos",
      "/inicio/ber-uns",
      "/inicio/caf-crme",
    ]);
    expect(findPathIssues(list, "original").size).toBe(0);
  });

  it("under the multilingual rule, keeps those names apart by their own letters", () => {
    const list = rows("Home@0", ...scripts.map((name) => `${name}@1`), "고객 지원@1");
    expect(rowPaths(list, "multilingual").slice(1)).toEqual([
      "/home/サービス",
      "/home/服务",
      "/home/услуги",
      "/home/υπηρεσίες",
      "/home/خدماتنا",
      "/home/שירותים",
      "/home/บริการ",
      "/home/सेवाएं",
      "/home/고객-지원",
    ]);
    expect(findPathIssues(list, "multilingual").size).toBe(0);
    // Symbols still drop wherever a letter is left, so these stay one path
    expect(issuesByName(rows("Courses@0", "C++@1", "C#@1"), "multilingual")).toEqual({
      "C++": { kind: "duplicate", withName: "C#" },
      "C#": { kind: "duplicate", withName: "C++" },
    });
  });

  it("ignores rows still being named", () => {
    expect(findPathIssues(rows("Home@0", "@1", "@1"), "original").size).toBe(0);
  });
});

describe("answers following their items", () => {
  /** Carries one answer through a series of edits, as the Tree tab does */
  const follow = (
    start: OutlineRow[],
    edits: OutlineRow[][],
    answer: string,
    rules: { saved: PathRule; editor: PathRule } = { saved: "original", editor: "original" }
  ) => {
    let paths = followPaths(start, rules.saved).paths;
    for (const rows of edits) {
      const followed = followPaths(rows, rules.editor, paths);
      paths = followed.paths;
      answer = followed.moves.get(answer) ?? answer;
    }
    return answer;
  };
  const renamed = (rows: OutlineRow[], at: number, names: string[]) =>
    names.map((name) => rows.map((row, i) => (i === at ? { ...row, name } : row)));

  it("moves answers when an item, or a parent above it, is renamed or moved", () => {
    const tree = rows("Home@0", "Services@1", "Permits@2", "About@1", "Contact@2");
    const ourServices = renamed(tree, 1, ["Our services"]);
    expect(follow(tree, ourServices, "/home/services/permits")).toBe("/home/our-services/permits");
    const moved = moveRow(tree, 4, { above: tree[2].id, below: tree[3].id, level: 2 });
    expect(follow(tree, [moved], "/home/about/contact")).toBe("/home/services/contact");
  });

  it("follows a rename that clears the name before typing the new one", () => {
    const tree = rows("Home@0", "Contact@1");
    expect(follow(tree, renamed(tree, 1, ["Contac", "", "H", "Help"]), "/home/contact")).toBe(
      "/home/help"
    );
  });

  it("follows a rename that passes through another item's name on the way", () => {
    // Typing "Help center" spells "Help", a sibling's name, before it's done
    const tree = rows("Home@0", "Contact@1", "Help@1");
    const typing = renamed(tree, 1, ["", "H", "Hel", "Help", "Help ", "Help center"]);
    expect(follow(tree, typing, "/home/contact")).toBe("/home/help-center");
    // The sibling's own answers never move
    expect(follow(tree, typing, "/home/help")).toBe("/home/help");
  });

  it("moves a draft's answers saved under the original rule onto its multilingual paths", () => {
    // A Japanese leaf the original rule saved as "/home/", in a draft edited once
    const tree = rows("Home@0", "Contact@1", "保健@1");
    const edit = renamed(tree, 1, ["Help"]);
    const rules = { saved: "original", editor: "multilingual" } as const;
    expect(follow(tree, edit, "/home/", rules)).toBe("/home/保健");
    expect(follow(tree, edit, "/home/contact", rules)).toBe("/home/help");
  });

  it("leaves an answer on a path two items share, which can't say which one it meant", () => {
    // Two Japanese siblings the original rule both saved as "/home/"
    const tree = rows("Home@0", "保健@1", "税務@1");
    const edit = renamed(tree, 1, ["保健センター"]);
    expect(follow(tree, edit, "/home/", { saved: "original", editor: "multilingual" })).toBe(
      "/home/"
    );
  });
});

describe("shortening a path to fit", () => {
  it("drops whole segments from the start, never cutting a word", () => {
    const path = "/home/services/business-permits/renew-a-permit";
    expect(fitPath(path, 46)).toBe(path);
    expect(fitPath(path, 45)).toBe("…/services/business-permits/renew-a-permit");
    expect(fitPath(path, 40)).toBe("…/business-permits/renew-a-permit");
    // The last segment stays whole even when it alone is too long
    expect(fitPath(path, 5)).toBe("…/renew-a-permit");
  });
});
