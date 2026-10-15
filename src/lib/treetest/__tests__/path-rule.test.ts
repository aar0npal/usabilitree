import { describe, expect, it, vi } from "vitest";

// The original rule lives in @/lib/utils, which reads the app's env
vi.mock("@/env", () => ({ env: {} }));

import { sampleParsedTree } from "@/lib/treetest/sample-data";
import { editorPathRule, pathSegment, treePathRule } from "@/lib/treetest/path-rule";

describe("path segments", () => {
  it("gives the same segment under both rules wherever a letter or digit is left", () => {
    for (const rule of ["original", "multilingual"] as const) {
      expect(pathSegment("Business Permits", rule)).toBe("business-permits");
      expect(pathSegment("Servicios públicos", rule)).toBe("servicios-pblicos");
      expect(pathSegment("C++", rule)).toBe("c");
      expect(pathSegment("Año 2024", rule)).toBe("ano-2024");
    }
  });

  it("keeps a name's own letters, in any script, when the original rule blanks it", () => {
    expect(pathSegment("保健サービス", "original")).toBe("");
    expect(pathSegment("保健サービス", "multilingual")).toBe("保健サービス");
    expect(pathSegment("Услуги для бизнеса", "multilingual")).toBe("услуги-для-бизнеса");
    expect(pathSegment("고객 지원", "original")).toBe("-");
    expect(pathSegment("고객 지원", "multilingual")).toBe("고객-지원");
    // Thai and Hindi letters carry combining marks, which stay with them
    expect(pathSegment("บริการ", "multilingual")).toBe("บริการ");
    expect(pathSegment("सेवाएं", "multilingual")).toBe("सेवाएं");
  });

  it("keeps symbols when there are no letters at all, but never a slash or comma", () => {
    expect(pathSegment("★★★", "multilingual")).toBe("★★★");
    expect(pathSegment("★ / ★, ★", "multilingual")).toBe("★-★-★");
  });
});

const japaneseTree = (link: string) => [
  {
    name: "Home",
    children: [
      { name: "Services", link: "/home/services" },
      { name: "保健", link },
    ],
  },
];

describe("reading a saved tree's rule", () => {
  it("reads every existing study's tree as original", () => {
    expect(treePathRule(sampleParsedTree)).toBe("original");
    // A blank segment is how the original rule saved names in other scripts
    expect(treePathRule(japaneseTree("/home/"))).toBe("original");
  });

  it("reads a tree saved with the multilingual rule as multilingual", () => {
    expect(treePathRule(japaneseTree("/home/保健"))).toBe("multilingual");
  });

  it("falls back to original for links neither rule would build", () => {
    expect(treePathRule(japaneseTree("/home/health"))).toBe("original");
  });
});

describe("the rule the setup editor writes", () => {
  it("is multilingual for a draft and the saved tree's own for a launched study", () => {
    expect(editorPathRule(japaneseTree("/home/"), "draft")).toBe("multilingual");
    expect(editorPathRule(japaneseTree("/home/"), "active")).toBe("original");
    expect(editorPathRule(japaneseTree("/home/保健"), "active")).toBe("multilingual");
  });
});
