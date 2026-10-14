import { describe, expect, it, vi } from "vitest";

// The path rule lives in @/lib/utils, which reads the app's env
vi.mock("@/env", () => ({ env: {} }));

import { sampleParsedTree, sampleTreeStructure } from "@/lib/treetest/sample-data";
import { parseTreeText } from "@/lib/treetest/tree-import";
import {
  canIndent,
  collapseAllIds,
  findPathIssues,
  fitPath,
  indentRow,
  insertionPoint,
  makeRow,
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
    expect(treeFromRows(imported)).toEqual(sampleParsedTree);
  });

  it("reloads a saved tree as the same rows", () => {
    const loaded = rowsFromTree(sampleParsedTree);
    expect(treeFromRows(loaded)).toEqual(sampleParsedTree);
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
      )
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
    expect(treeFromRows(saved)[0].name).toBe("Home");
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

  it("hides the rows inside a collapsed parent", () => {
    const list = tree();
    const shown = visibleRows(list, new Set([list[1].id]));
    expect(shown.map(({ row }) => row.name)).toEqual(["Home", "Services", "About"]);
    expect(shown.map(({ index }) => index)).toEqual([0, 1, 4]);
  });
});

describe("paths that can't tell items apart", () => {
  const issuesByName = (list: OutlineRow[]) =>
    Object.fromEntries(
      Array.from(findPathIssues(list), ([id, issue]) => [
        list.find((row) => row.id === id)!.name,
        issue,
      ])
    );

  it("finds nothing in a tree whose paths are all distinct", () => {
    expect(
      findPathIssues(rows("Home@0", "Services@1", "Contact@2", "About@1", "Contact@2")).size
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

  it("flags names in scripts the path can't hold at all", () => {
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
    for (const name of scripts) {
      expect(issuesByName(rows("Home@0", `${name}@1`))).toEqual({ [name]: { kind: "empty" } });
    }
    // Korean keeps only the space between its words, as a lone hyphen
    expect(rowPaths(rows("Home@0", "고객 지원@1"))[1]).toBe("/home/-");
    expect(issuesByName(rows("Home@0", "고객 지원@1"))).toEqual({ "고객 지원": { kind: "empty" } });
  });

  it("keeps accented names apart, though their paths lose the accented letters", () => {
    const list = rows("Inicio@0", "Servicios públicos@1", "Über uns@1", "Café crème@1");
    expect(rowPaths(list)).toEqual([
      "/inicio",
      "/inicio/servicios-pblicos",
      "/inicio/ber-uns",
      "/inicio/caf-crme",
    ]);
    expect(findPathIssues(list).size).toBe(0);
  });

  it("ignores rows still being named", () => {
    expect(findPathIssues(rows("Home@0", "@1", "@1")).size).toBe(0);
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
