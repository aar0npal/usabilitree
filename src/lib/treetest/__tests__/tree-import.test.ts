import { describe, expect, it, vi } from "vitest";

// The path rule lives in @/lib/utils, which reads the app's env
vi.mock("@/env", () => ({ env: {} }));

import { parseTreeText } from "@/lib/treetest/tree-import";

/** "name@level" for each imported row */
const read = (text: string) => parseTreeText(text).rows.map((row) => `${row.name}@${row.level}`);

const PLACEHOLDER_TREE = [
  "Home - City of Manila@0",
  "Services@1",
  "Business Permits@2",
  "Health Services@2",
  "About Us@1",
];

describe("importing a tree", () => {
  it("reads leading-comma text, one comma per level", () => {
    const text =
      "Home - City of Manila\n,Services\n,,Business Permits\n,,Health Services\n,About Us";
    expect(read(text)).toEqual(PLACEHOLDER_TREE);
  });

  it("reads Optimal Workshop's tree export, leaving out its header row", () => {
    // Byte for byte as Optimal Workshop writes tree.csv
    const result = parseTreeText(
      "level 1,level 2,level 3,...\nNew node\n,New node\n,,New node\nNew node\n"
    );
    expect(result.skippedHeader).toBe(true);
    expect(result.rows.map((row) => row.level)).toEqual([0, 1, 2, 0]);
  });

  it("reads a spreadsheet saved as CSV: padded rows, quoted cells, blank rows", () => {
    const text = 'Home,,\r\n,"Health, Safety",\r\n,,"The ""Best"" Clinics"\r\n,,,\r\n,Contact,\r\n';
    expect(read(text)).toEqual(["Home@0", "Health, Safety@1", 'The "Best" Clinics@2', "Contact@1"]);
  });

  it("keeps a cell with a line break inside its quotes as one item", () => {
    const text = 'Home,,\n,"Health\nServices",\n,,Clinics\n,Contact,';
    expect(read(text)).toEqual(["Home@0", "Health Services@1", "Clinics@2", "Contact@1"]);
    // A stray quote inside a name opens nothing, so the lines after it stay lines
    expect(read('Home\n,5" screens\n,Contact')).toEqual(["Home@0", '5" screens@1', "Contact@1"]);
  });

  it("reads cells pasted from Excel or Sheets, which arrive tab-separated", () => {
    const text = "Home\t\t\nServices\t\t\n\tBusiness Permits\t\n\tHealth Services\t\nAbout Us\t\t";
    expect(read(text)).toEqual([
      "Home@0",
      "Services@0",
      "Business Permits@1",
      "Health Services@1",
      "About Us@0",
    ]);
    const nested =
      "Home - City of Manila\n\tServices\n\t\tBusiness Permits\n\t\tHealth Services\n\tAbout Us";
    expect(read(nested)).toEqual(PLACEHOLDER_TREE);
  });

  it("reads outlines indented with spaces, at whatever width they use", () => {
    const two =
      "Home - City of Manila\n  Services\n    Business Permits\n    Health Services\n  About Us";
    const four = two.replace(/ {2}/g, "    ");
    expect(read(two)).toEqual(PLACEHOLDER_TREE);
    expect(read(four)).toEqual(PLACEHOLDER_TREE);
  });

  it("reads bulleted lists, from a doc or a Markdown file", () => {
    const text =
      "- Home - City of Manila\n  - Services\n    * Business Permits\n    * Health Services\n  - About Us";
    expect(read(text)).toEqual(PLACEHOLDER_TREE);
    const tabs =
      "• Home - City of Manila\n\t• Services\n\t\t• Business Permits\n\t\t• Health Services\n\t• About Us";
    expect(read(tabs)).toEqual(PLACEHOLDER_TREE);
  });

  it("reads the depth of an unindented numbered list from its numbers", () => {
    const text =
      "1. Home - City of Manila\n1.1 Services\n1.1.1 Business Permits\n1.1.2 Health Services\n1.2. About Us";
    expect(read(text)).toEqual(PLACEHOLDER_TREE);
  });

  it("keeps numbers and dashes that are part of a name", () => {
    expect(read("2024 Reports\n,Q1 - Summary\n,10 tips\n- 2023 archive")).toEqual([
      "2024 Reports@0",
      "Q1 - Summary@1",
      "10 tips@1",
      "- 2023 archive@0",
    ]);
  });

  it("nests an item that skips a level under the item above it, and counts the fix", () => {
    const result = parseTreeText("Home\n,,,Permits\n,About");
    expect(result.rows.map((row) => `${row.name}@${row.level}`)).toEqual([
      "Home@0",
      "Permits@1",
      "About@1",
    ]);
    expect(result.levelFixes).toBe(1);
  });

  it("starts a tree copied from the middle of an outline at the top level", () => {
    expect(read("    Services\n      Permits\n    About")).toEqual([
      "Services@0",
      "Permits@1",
      "About@0",
    ]);
  });

  it("keeps names in every script whole, with a byte-order mark and Windows line endings", () => {
    const text =
      "\uFEFFホーム\r\n,サービス\r\n,,営業許可\r\n,Услуги\r\n,خدماتنا\r\n,Servicios públicos";
    expect(read(text)).toEqual([
      "ホーム@0",
      "サービス@1",
      "営業許可@2",
      "Услуги@1",
      "خدماتنا@1",
      "Servicios públicos@1",
    ]);
  });

  it("finds no tree in text with no items", () => {
    expect(parseTreeText(" \n,,,\n\t\n").rows).toEqual([]);
  });
});
