import { makeRow, type OutlineRow } from "@/lib/treetest/tree-outline";

export interface TreeImport {
  rows: OutlineRow[];
  /** A first row of column headings ("level 1, level 2, …") was left out */
  skippedHeader: boolean;
  /** Items more than one level below the item above them, moved up to nest under it */
  levelFixes: number;
}

// One column heading as Optimal Workshop's tree export writes them ("level 1"), or its trailing "..."
const HEADING = /^(?:level|lvl|tier)\s*\d+$|^(?:\.\.\.|…)$/i;
// A list marker: a bullet, "1." or "1)", a dotted number ("1.2" or "1.2."), or "a." / "a)"
const MARKER = /^(?:[-*•◦▪‣–—+]|\d+[.)]|\d+(?:\.\d+)+\.?|[a-zA-Z][.)])\s+/;
const DOTTED = /^(\d+(?:\.\d+)*)[.)]?\s+/;

type Line = { level: number; name: string };

/**
 * Reads a tree from pasted or uploaded text in any of the shapes people
 * already have: leading commas (one per level), Optimal Workshop's tree CSV (with its
 * "level 1, level 2" header), spreadsheet cells (CSV, or tab-separated as a
 * copy from Excel or Sheets pastes them), outlines indented with tabs or
 * spaces, and bulleted or numbered lists.
 */
export function parseTreeText(text: string): TreeImport {
  const raw = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    // Blank lines, and a spreadsheet's empty rows (",,,")
    .filter((line) => !/^[\s,]*$/.test(line));

  let lines: Line[];
  let cells: string[][] | null = null;
  if (raw.some((line) => line.includes("\t"))) {
    cells = raw.map((line) => line.split("\t").map(unquote));
    lines = cells.map(fromCells);
  } else if (raw.some((line) => /^ +\S/.test(line)) && !raw.some((line) => /^\s*,/.test(line))) {
    // Indented with spaces: the smallest indent is one level
    const indents = raw.map((line) => line.match(/^ */)![0].length);
    const unit = Math.min(...indents.filter((n) => n > 0));
    lines = raw.map((line, i) => ({ level: Math.round(indents[i] / unit), name: line.trim() }));
  } else {
    cells = raw.map(csvFields);
    lines = cells.map(fromCells);
  }

  // A first row of column headings, as Optimal Workshop exports its tree
  let skippedHeader = false;
  if (cells && cells.length > 1) {
    const filled = cells[0].map((cell) => cell.trim()).filter(Boolean);
    if (filled.length > 0 && filled.every((cell) => HEADING.test(cell))) {
      lines = lines.slice(1);
      skippedHeader = true;
    }
  }

  // List markers come off when most lines have one, so a name like "- 10 tips" alone is left whole
  const marked = lines.filter((line) => MARKER.test(line.name)).length;
  if (marked > 0 && marked * 2 >= lines.length) {
    // A numbered list with no indentation keeps its depth in its numbers: 1, 1.1, 1.1.1
    const flat = lines.every((line) => line.level === 0);
    const numbered = flat && lines.every((line) => DOTTED.test(line.name));
    lines = lines.map((line) => {
      const depth = numbered ? line.name.match(DOTTED)![1].split(".").length - 1 : line.level;
      return { level: depth, name: line.name.replace(MARKER, "").trim() };
    });
  }

  // The shallowest item is the top level, and no item sits more than one level below the item above it
  let levelFixes = 0;
  const top = Math.min(...lines.map((line) => line.level));
  let previous = -1;
  const rows = lines
    .filter((line) => line.name !== "")
    .map((line) => {
      let level = line.level - top;
      if (level > previous + 1) {
        level = previous + 1;
        levelFixes += 1;
      }
      previous = level;
      return makeRow(line.name, level);
    });

  return { rows, skippedHeader, levelFixes };
}

/** One line's fields, as a CSV reader splits them: commas outside double quotes, "" inside them */
function csvFields(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.trim() === "") {
      field = "";
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else field += char;
  }
  fields.push(field);
  return fields;
}

function unquote(cell: string) {
  const trimmed = cell.trim();
  return trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1).replace(/""/g, '"')
    : trimmed;
}

/** A row of cells: its level is the column of its first filled cell */
function fromCells(cells: string[]): Line {
  const first = cells.findIndex((cell) => cell.trim() !== "");
  let last = cells.length - 1;
  while (last > first && cells[last].trim() === "") last -= 1;
  // Commas inside a name are part of it: "Home, Garden" is one item
  return {
    level: first,
    name: cells
      .slice(first, last + 1)
      .join(",")
      .trim(),
  };
}
