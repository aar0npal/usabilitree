import type { TreeNode } from "@/lib/types/tree-test";
import { sanitizeTreeTestLink } from "@/lib/utils";

/**
 * How an item's name becomes one segment of its path: the string that task
 * answers, participants' clicks and results all store.
 *
 * - "original" keeps a–z, 0–9, "_" and "-" (after ñ → n). A name in another
 *   script comes out blank, so two such siblings share one path.
 * - "multilingual" gives the same segment wherever that keeps a letter or
 *   digit, so no path that works today changes. A name the original rule
 *   blanks keeps its own letters and digits, in any script; a name of symbols
 *   alone keeps those.
 *
 * A study never switches rule under answers it has collected: the rule is
 * read back from the links its saved tree holds (treePathRule), and only a
 * draft's tree is written with the multilingual rule.
 */
export type PathRule = "original" | "multilingual";

// Not a letter, mark or digit in any script, a space, "_" or "-". Built with the constructor: the
// TypeScript target predates the u flag, though every browser the app supports has it
const NOT_LETTERS = new RegExp("[^\\p{L}\\p{M}\\p{N}\\s_-]", "gu");

export function pathSegment(name: string, rule: PathRule): string {
  const original = sanitizeTreeTestLink(name);
  if (rule === "original" || !isBlank(original)) return original;
  const letters = name
    .normalize("NFC")
    .toLowerCase()
    .replace(NOT_LETTERS, "")
    .trim()
    .replace(/\s+/g, "-");
  if (!isBlank(letters)) return letters;
  // Symbols alone: keep them, but not what splits a path (/) or a list of answers (,)
  return name
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[\s/,]+/g, "-");
}

/** An item's path from its ancestors' names and its own */
export function pathOf(names: string[], rule: PathRule): string {
  return `/${names.map((name) => pathSegment(name, rule)).join("/")}`;
}

/** A segment with nothing in it but separators, which can't tell one item from another */
export function isBlank(segment: string): boolean {
  return !/[^_-]/.test(segment);
}

/**
 * The rule a saved tree's leaf links were built with. A tree reads as
 * multilingual only when every link matches that rule and at least one
 * differs from the original; anything else, including a tree whose names come
 * out the same both ways, reads as original.
 */
export function treePathRule(tree: TreeNode[]): PathRule {
  let multilingual = false;
  const matches = (nodes: TreeNode[], trail: string[]): boolean =>
    nodes.every((node) => {
      const names = [...trail, node.name];
      if (node.link && node.link !== pathOf(names, "original")) {
        if (node.link !== pathOf(names, "multilingual")) return false;
        multilingual = true;
      }
      return !node.children || matches(node.children, names);
    });
  return matches(tree, []) && multilingual ? "multilingual" : "original";
}

/**
 * The rule the setup editor writes a tree with. A draft has no answers yet, so
 * it gets multilingual paths; a launched study keeps the rule its answers and
 * results were recorded with.
 */
export function editorPathRule(tree: TreeNode[], status: string): PathRule {
  return status === "draft" ? "multilingual" : treePathRule(tree);
}
