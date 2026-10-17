import type { TreeNode } from "@/lib/types/tree-test";
import { pathOf, type PathRule } from "@/lib/treetest/path-rule";

/** An item of the tree as the answer picker lists it, in reading order */
export interface AnswerOption {
  path: string;
  name: string;
  /** Its ancestors' names, top first */
  trail: string[];
  level: number;
  parent: boolean;
}

/**
 * Every item that could be a task's answer. A leaf's path is the link its
 * tree saved, which is what a participant's click records; a parent's is
 * built by the study's rule, as the participant view builds it.
 */
export function answerOptions(tree: TreeNode[], rule: PathRule): AnswerOption[] {
  const options: AnswerOption[] = [];
  const walk = (nodes: TreeNode[], trail: string[]) => {
    for (const node of nodes) {
      const parent = !!node.children?.length;
      options.push({
        path: !parent && node.link ? node.link : pathOf([...trail, node.name], rule),
        name: node.name,
        trail,
        level: trail.length,
        parent,
      });
      if (node.children?.length) walk(node.children, [...trail, node.name]);
    }
  };
  walk(tree, []);
  return options;
}

/** A task's answers: its stored text is the paths, comma-separated */
export function splitAnswers(answer: string): string[] {
  return Array.from(
    new Set(
      answer
        .split(",")
        .map((path) => path.trim())
        .filter(Boolean)
    )
  );
}

/** Points a task's answers at their items' new paths, after items were renamed or moved */
export function carryAnswers(answer: string, changes: ReadonlyMap<string, string>): string {
  if (changes.size === 0) return answer;
  const paths = splitAnswers(answer);
  const next = paths.map((path) => changes.get(path) ?? path);
  return next.some((path, i) => path !== paths[i]) ? Array.from(new Set(next)).join(", ") : answer;
}

/** Adds the path to the answers, or takes it out if it's there */
export function toggleAnswer(answer: string, path: string): string {
  const paths = splitAnswers(answer);
  const next = paths.includes(path) ? paths.filter((p) => p !== path) : [...paths, path];
  return next.join(", ");
}

// Combining marks, dropped so a search without accents finds names with them. Built with the
// constructor: the TypeScript target predates the u flag, though every supported browser has it
const MARKS = new RegExp("\\p{M}", "gu");

const fold = (text: string) => text.normalize("NFD").replace(MARKS, "").toLowerCase();

/**
 * The options a search shows: those whose name contains it (ignoring case and
 * accents), the parents they sit under, so each keeps its place in the tree,
 * and everything under a matching parent, so a section can be found by name
 * and picked from. An empty search shows every option.
 */
export function searchOptions(options: AnswerOption[], query: string): Set<number> {
  const needle = fold(query.trim());
  if (!needle) return new Set(options.map((_, index) => index));
  const shown = new Set<number>();
  options.forEach((option, index) => {
    if (!fold(option.name).includes(needle)) return;
    shown.add(index);
    let level = option.level;
    for (let i = index - 1; i >= 0 && level > 0; i -= 1) {
      if (options[i].level < level) {
        shown.add(i);
        level = options[i].level;
      }
    }
    for (let i = index + 1; i < options.length && options[i].level > option.level; i += 1) {
      shown.add(i);
    }
  });
  return shown;
}
