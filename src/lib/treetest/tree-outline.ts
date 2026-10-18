import type { TreeNode } from "@/lib/types/tree-test";
import { isBlank, pathSegment, type PathRule } from "@/lib/treetest/path-rule";

/**
 * The tree as the setup editor holds it: a flat list in reading order, each
 * row with its depth. A row is a parent when the row after it is deeper.
 */
export interface OutlineRow {
  id: string;
  name: string;
  level: number;
}

let rowCount = 0;

export function makeRow(name: string, level: number): OutlineRow {
  rowCount += 1;
  return { id: `row-${rowCount}`, name, level };
}

export function rowsFromTree(nodes: TreeNode[]): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const walk = (list: TreeNode[], level: number) => {
    for (const node of list) {
      rows.push(makeRow(node.name, level));
      if (node.children?.length) walk(node.children, level + 1);
    }
  };
  walk(nodes, 0);
  return rows;
}

export function isParentRow(rows: OutlineRow[], index: number) {
  return index + 1 < rows.length && rows[index + 1].level > rows[index].level;
}

/**
 * Each row's path: its ancestors' names and its own, each made a segment by
 * the study's rule. Task answers and recorded results store these strings.
 */
export function rowPaths(rows: OutlineRow[], rule: PathRule): string[] {
  const trail: string[] = [];
  return rows.map((row) => {
    trail.length = row.level;
    trail.push(pathSegment(row.name.trim(), rule));
    return `/${trail.join("/")}`;
  });
}

/** The tree participants see, with every leaf's `link` set to its path */
export function treeFromRows(rows: OutlineRow[], rule: PathRule): TreeNode[] {
  const paths = rowPaths(rows, rule);
  const root: TreeNode[] = [];
  const stack: TreeNode[] = [];
  rows.forEach((row, index) => {
    const node: TreeNode = { name: row.name.trim() };
    stack.length = row.level;
    if (row.level === 0) root.push(node);
    else {
      const parent = stack[row.level - 1];
      (parent.children ??= []).push(node);
    }
    stack.push(node);
    if (!isParentRow(rows, index)) node.link = paths[index];
  });
  return root;
}

/** The tree as comma text, one line per item and one leading comma per level: the form `tree_structure` stores */
export function structureFromRows(rows: OutlineRow[]): string {
  return rows.map((row) => `${",".repeat(row.level)}${row.name.trim()}`).join("\n");
}

/**
 * The rows to save: an unnamed row (a field just opened) is left out, and a
 * row left more than one level below the row above it, its unnamed parent
 * gone, moves up to nest under that row.
 */
export function rowsToSave(rows: OutlineRow[]): OutlineRow[] {
  let previous = -1;
  return rows
    .filter((row) => row.name.trim() !== "")
    .map((row) => {
      const level = Math.min(row.level, previous + 1);
      previous = level;
      return level === row.level ? row : { ...row, level };
    });
}

export type PathIssue =
  | { kind: "duplicate"; withName: string }
  /** The name keeps no character the path can use, so its path segment is empty */
  | { kind: "empty" };

/**
 * Rows whose path can't tell them apart from another item. Answers and
 * clicks are recorded as paths, so two items on one path are one item in the
 * results. Paths drop symbols, so names that differ only by them ("C++",
 * "C#") collide; under the original rule, so do names in other scripts
 * (Japanese, Cyrillic, Arabic…), whose segments come out blank.
 */
export function findPathIssues(rows: OutlineRow[], rule: PathRule): Map<string, PathIssue> {
  const issues = new Map<string, PathIssue>();
  const paths = rowPaths(rows, rule);
  const firstByPath = new Map<string, number>();
  rows.forEach((row, index) => {
    if (!row.name.trim()) return;
    if (isBlank(pathSegment(row.name.trim(), rule))) {
      issues.set(row.id, { kind: "empty" });
    }
    const first = firstByPath.get(paths[index]);
    if (first === undefined) {
      firstByPath.set(paths[index], index);
      return;
    }
    if (!issues.has(row.id))
      issues.set(row.id, { kind: "duplicate", withName: rows[first].name.trim() });
    if (!issues.has(rows[first].id))
      issues.set(rows[first].id, { kind: "duplicate", withName: row.name.trim() });
  });
  return issues;
}

/** The index just past a row's last descendant */
export function subtreeEnd(rows: OutlineRow[], index: number) {
  let end = index + 1;
  while (end < rows.length && rows[end].level > rows[index].level) end += 1;
  return end;
}

/** A row can nest under the row above it only if that row is at its level or deeper */
export function canIndent(rows: OutlineRow[], index: number) {
  return index > 0 && rows[index - 1].level >= rows[index].level;
}

export function canOutdent(rows: OutlineRow[], index: number) {
  return rows[index]?.level > 0;
}

/** Shifts a row and everything under it; the rows' order never changes */
function shiftSubtree(rows: OutlineRow[], index: number, by: number) {
  const end = subtreeEnd(rows, index);
  return rows.map((row, i) => (i >= index && i < end ? { ...row, level: row.level + by } : row));
}

export function indentRow(rows: OutlineRow[], index: number) {
  return canIndent(rows, index) ? shiftSubtree(rows, index, 1) : rows;
}

export function outdentRow(rows: OutlineRow[], index: number) {
  return canOutdent(rows, index) ? shiftSubtree(rows, index, -1) : rows;
}

/**
 * Where a new item goes when it's added from a row: a parent whose children
 * are showing gets it as its first child, as an outliner does; any other row
 * gets it as the next sibling, after its own children.
 */
export function insertionPoint(rows: OutlineRow[], index: number, collapsed = false) {
  if (isParentRow(rows, index) && !collapsed)
    return { at: index + 1, level: rows[index].level + 1 };
  return { at: subtreeEnd(rows, index), level: rows[index].level };
}

export function insertRows(rows: OutlineRow[], at: number, added: OutlineRow[]) {
  return [...rows.slice(0, at), ...added, ...rows.slice(at)];
}

/** Removes a row and everything under it */
export function removeRow(rows: OutlineRow[], index: number) {
  return [...rows.slice(0, index), ...rows.slice(subtreeEnd(rows, index))];
}

/**
 * The levels a moved row can take in the gap between two shown rows. It can
 * nest at most one level under the row above, and no shallower than the row
 * below, or it would take that row (and its siblings) as its own children.
 */
export function dropLevels(above: OutlineRow | undefined, below: OutlineRow | undefined) {
  return { min: below?.level ?? 0, max: above ? above.level + 1 : 0 };
}

export interface DropTarget {
  /** The shown rows the gap is between; none above is the top, none below the end */
  above?: string;
  below?: string;
  level: number;
}

/**
 * Moves a row, with everything under it, into a gap at a level `dropLevels`
 * allows. Deeper than the row above, it becomes that row's first child, even
 * when that row's children are hidden; otherwise it goes just before the row
 * below, after anything hidden under the row above.
 */
export function moveRow(rows: OutlineRow[], index: number, target: DropTarget) {
  const end = subtreeEnd(rows, index);
  const shift = target.level - rows[index].level;
  const block = rows.slice(index, end).map((row) => ({ ...row, level: row.level + shift }));
  const rest = [...rows.slice(0, index), ...rows.slice(end)];
  const above = rest.findIndex((row) => row.id === target.above);
  const below = rest.findIndex((row) => row.id === target.below);
  const at =
    above !== -1 && target.level > rest[above].level
      ? above + 1
      : below !== -1
        ? below
        : rest.length;
  return insertRows(rest, at, block);
}

/** Swaps a row, with everything under it, with its sibling above (-1) or below (1); null when it has none */
export function moveAmongSiblings(rows: OutlineRow[], index: number, by: 1 | -1) {
  const level = rows[index].level;
  const end = subtreeEnd(rows, index);
  if (by === 1) {
    if (rows[end]?.level !== level) return null;
    const nextEnd = subtreeEnd(rows, end);
    return [
      ...rows.slice(0, index),
      ...rows.slice(end, nextEnd),
      ...rows.slice(index, end),
      ...rows.slice(nextEnd),
    ];
  }
  let previous = index - 1;
  while (previous >= 0 && rows[previous].level > level) previous -= 1;
  if (previous < 0 || rows[previous].level !== level) return null;
  return [
    ...rows.slice(0, previous),
    ...rows.slice(index, end),
    ...rows.slice(previous, index),
    ...rows.slice(end),
  ];
}

/**
 * Follows each row's answers through an edit. It remembers, by row id, the
 * last path each row had that no other row shared: answers point there. When
 * a row's path is unique again and different, its answers move from the
 * remembered path to the new one. So a rename arrives even when it passes
 * through a blank field or another item's name, and a draft saved under the
 * original rule (whose remembered paths were built by it) moves its answers
 * onto its multilingual paths. Returns the moves, old path to new, and the
 * paths to remember for the next edit.
 */
export function followPaths(
  rows: OutlineRow[],
  rule: PathRule,
  last: ReadonlyMap<string, string> = new Map()
) {
  const saved = rowsToSave(rows);
  const paths = rowPaths(saved, rule);
  const counts = new Map<string, number>();
  for (const path of paths) counts.set(path, (counts.get(path) ?? 0) + 1);
  const remembered = new Map(last);
  const moves = new Map<string, string>();
  saved.forEach((row, i) => {
    if (counts.get(paths[i]) !== 1) return;
    const was = last.get(row.id);
    if (was !== undefined && was !== paths[i]) moves.set(was, paths[i]);
    remembered.set(row.id, paths[i]);
  });
  return { moves, paths: remembered };
}

/**
 * The parents Collapse all closes: every one, except a lone top-level item,
 * which stays open so its children show, as the test opens it for
 * participants.
 */
export function collapseAllIds(rows: OutlineRow[]) {
  const roots = rows.filter((row) => row.level === 0);
  const keep = roots.length === 1 ? roots[0].id : null;
  return rows
    .filter((row, index) => row.id !== keep && isParentRow(rows, index))
    .map((row) => row.id);
}

/** Rows not hidden inside a collapsed parent */
export function visibleRows(rows: OutlineRow[], collapsed: ReadonlySet<string>) {
  const visible: { row: OutlineRow; index: number }[] = [];
  let hideBelow: number | null = null;
  rows.forEach((row, index) => {
    if (hideBelow !== null && row.level > hideBelow) return;
    hideBelow = null;
    visible.push({ row, index });
    if (collapsed.has(row.id) && isParentRow(rows, index)) hideBelow = row.level;
  });
  return visible;
}

/**
 * A path short enough for `max` characters, dropping whole segments from its
 * start: the end tells two items apart, and a cut never lands mid-word.
 */
export function fitPath(path: string, max: number) {
  if (path.length <= max) return path;
  const parts = path.split("/").filter(Boolean);
  while (parts.length > 1 && `…/${parts.join("/")}`.length > max) parts.shift();
  return `…/${parts.join("/")}`;
}
