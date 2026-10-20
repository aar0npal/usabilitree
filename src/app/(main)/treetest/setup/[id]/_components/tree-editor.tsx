"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  FileUp,
  GripVertical,
  IndentDecrease,
  IndentIncrease,
  Keyboard,
  Plus,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
} from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TreePreview } from "@/components/tree-preview";
import { cn } from "@/lib/utils";
import { usePointerDrag, type DragPoint } from "@/lib/hooks/use-pointer-drag";
import { parseTreeText, type TreeImport } from "@/lib/treetest/tree-import";
import { emptyHistory, record, redo, undo, type EditHistory } from "@/lib/treetest/edit-history";
import type { PathRule } from "@/lib/treetest/path-rule";
import {
  canIndent,
  canOutdent,
  collapseAllIds,
  collapsedAtStart,
  dropLevels,
  findPathIssues,
  fitPath,
  indentRow,
  insertionPoint,
  insertRows,
  isParentRow,
  makeRow,
  moveAmongSiblings,
  moveRow,
  outdentRow,
  removeRow,
  rowPaths,
  rowsToSave,
  subtreeEnd,
  treeFromRows,
  visibleRows,
  type DropTarget,
  type OutlineRow,
  type PathIssue,
} from "@/lib/treetest/tree-outline";

const ACCEPT = ".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain";
// The touch toolbar's height, which the page leaves room for under its last row
const KEYBOARD_BAR = 52;
// iOS Safari floats its address bar over the foot of what it reports as the visible area while the
// keyboard is up (about 19pt of it on an iPhone), so the toolbar rises clear of it there
const IOS_ADDRESS_BAR = 28;
// Rows that animate in or out in one change. The rest of a big one (Expand all on a long tree)
// appear or go at once: they're off screen, and animating hundreds of heights drops frames
const ANIMATED_ROWS = 40;
const SHOWN = { height: "auto", opacity: 1 };
const HIDDEN = { height: 0, opacity: 0 };
// One level's indent, in px: rows step in by it, and a drag sideways by it changes the level
const INDENT = 16;

/** A drag in progress: what it was picked up from, and the rows it can land between */
interface DragSession {
  id: string;
  touch: boolean;
  startX: number;
  startLevel: number;
  /** The shown rows the dragged block can land between, in page coordinates */
  others: { row: OutlineRow; top: number; bottom: number }[];
  listTop: number;
  /** Where on the row it was picked up, so the lifted copy stays under the pointer */
  grabY: number;
  left: number;
  width: number;
  transform: string;
  target: DropTarget | null;
}

interface TreeEditorProps {
  rows: OutlineRow[];
  onRowsChange: (rows: OutlineRow[]) => void;
  pathRule: PathRule;
  /** Parents are answers too, so they show their paths */
  allowNonLeafAnswers: boolean;
  /** Comma text a study saved without ever turning it into a tree; the empty state offers to read it */
  unparsedText?: string;
  selectAsAnswerText?: string;
}

export function TreeEditor({
  rows,
  onRowsChange,
  pathRule,
  allowNonLeafAnswers,
  unparsedText,
  selectAsAnswerText,
}: TreeEditorProps) {
  const labelId = React.useId();
  const coarse = useCoarsePointer();
  const [showPaths, setShowPaths] = useShowPaths();
  const [listRef, listWidth] = useWidth();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const rowRefs = React.useRef(new Map<string, HTMLDivElement>());

  const [editingId, setEditingId] = React.useState<string | null>(null);
  // The row that takes Tab focus when the tree is reached by keyboard
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(
    () => new Set(collapsedAtStart(rows))
  );
  const [dragOver, setDragOver] = React.useState(false);
  const [pending, setPending] = React.useState<{ result: TreeImport; source: string } | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  // A row being dragged with what moves with it, and the gap it would land in
  const [dragging, setDragging] = React.useState<{
    id: string;
    ids: ReadonlySet<string>;
    name: string;
    under: number;
  } | null>(null);
  // The row a touch drag just placed. A phone has no Tab key, so a bar offers its level
  const [placedId, setPlacedId] = React.useState<string | null>(null);
  const session = React.useRef<DragSession | null>(null);
  // The lifted copy and the drop line move straight on the elements: a render per pointer move
  // would rebuild every row of a long tree
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const lineRef = React.useRef<HTMLDivElement>(null);
  const listEl = React.useRef<HTMLDivElement | null>(null);
  const setList = React.useCallback(
    (el: HTMLDivElement | null) => {
      listEl.current = el;
      listRef(el);
    },
    [listRef]
  );
  // Set while a keyboard move reorders the rows, so the moved field's blur doesn't end the edit
  const keepEditing = React.useRef(false);
  // A name as it was when editing began, so an emptied parent can get it back
  const startName = React.useRef("");
  // The row being edited as of the latest render, so a field's late blur can't end a newer edit
  const editingRef = React.useRef(editingId);
  editingRef.current = editingId;
  const reduce = useReducedMotion();
  const rowMotion = React.useMemo<Transition>(
    () => (reduce ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.8, 0.25, 1] }),
    [reduce]
  );
  const lift = useAppleTouch() ? IOS_ADDRESS_BAR : 0;
  const barSpace = KEYBOARD_BAR + lift;

  // Undo and redo cover this editor's own changes. Rows from outside (the study loading, a copy)
  // come with a new editor, as the Tree tab keys it, so they start a fresh history
  const history = React.useRef<EditHistory<OutlineRow[]>>(emptyHistory());

  // A delete or a move offers Undo in a toast. It's an undo step, so it may only reverse that one
  // change: any later edit or undo, or leaving the tab, takes the toast away
  const undoToast = React.useRef<string | number | null>(null);
  const dropUndoToast = () => {
    if (undoToast.current === null) return;
    toast.dismiss(undoToast.current);
    undoToast.current = null;
  };
  React.useEffect(() => dropUndoToast, []);
  /** Shows a toast whose Undo reverses the change just made */
  const offerUndo = (message: string) => {
    undoToast.current = toast(message, {
      action: {
        label: "Undo",
        onClick: () => {
          undoToast.current = null;
          latestStep.current("undo");
        },
      },
    });
  };

  /** Every edit goes through here, so it can be undone; keystrokes in one field undo as one step */
  const change = (next: OutlineRow[], group: string | null = null) => {
    dropUndoToast();
    history.current = record(history.current, rows, group);
    onRowsChange(next);
  };

  const step = (direction: "undo" | "redo") => {
    dropUndoToast();
    const result = (direction === "undo" ? undo : redo)(history.current, rows);
    if (!result) return;
    const [next, after] = result;
    history.current = after;
    onRowsChange(next);
    if (editingId && !next.some((row) => row.id === editingId)) setEditingId(null);
  };
  // A toast's Undo runs after renders it didn't see; this keeps it on the current rows
  const latestStep = React.useRef(step);
  latestStep.current = step;

  const onShortcut = (event: React.KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "z" || (key === "y" && event.ctrlKey && !event.metaKey)) {
      event.preventDefault();
      step(key === "y" || event.shiftKey ? "redo" : "undo");
    }
  };

  // Typing changes one row's name: its field shows each keystroke at once (it reads the name from
  // EditingName), and the list, with every row's path, follows in a background render that the
  // next keystroke can interrupt. A change to the tree's shape renders at once, so a row added by
  // Enter gets its field in the same keystroke and a phone's keyboard stays up
  const deferredRows = React.useDeferredValue(rows);
  const listRows =
    deferredRows.length === rows.length &&
    deferredRows.every((row, i) => row.id === rows[i].id && row.level === rows[i].level)
      ? deferredRows
      : rows;
  const paths = React.useMemo(() => rowPaths(listRows, pathRule), [listRows, pathRule]);
  const issues = React.useMemo(
    () => findPathIssues(listRows, pathRule, paths),
    [listRows, pathRule, paths]
  );
  // The chevron turns at once and the rows follow in a background render, so opening a big
  // subtree mounts its rows between animation frames instead of freezing them
  const listCollapsed = React.useDeferredValue(collapsed);
  // The rows as shown, for the keys and the toolbar; the list renders from listRows
  const shown = visibleRows(rows, listCollapsed);
  const lastShown = React.useRef<string[]>([]);
  const editingIndex = editingId ? rows.findIndex((row) => row.id === editingId) : -1;
  const placedIndex = placedId ? rows.findIndex((row) => row.id === placedId) : -1;
  // The row the toolbars act on: the one being edited, or one a touch drag just placed
  const toolIndex = editingIndex !== -1 ? editingIndex : placedIndex;
  const tabStop =
    activeId && listRows.some((row) => row.id === activeId) ? activeId : listRows[0]?.id;

  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [editingId]);

  // On a touch screen the keyboard and its bar cover the page's foot: keep the field above them
  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!coarse || !editingId || !viewport) return;
    const reveal = () => {
      const input = inputRef.current;
      if (!input) return;
      const limit = viewport.offsetTop + viewport.height - barSpace - 12;
      const bottom = input.getBoundingClientRect().bottom;
      if (bottom > limit)
        window.scrollBy({ top: bottom - limit, behavior: reduce ? "auto" : "smooth" });
    };
    // After the keyboard has risen
    const timer = window.setTimeout(reveal, 350);
    viewport.addEventListener("resize", reveal);
    return () => {
      window.clearTimeout(timer);
      viewport.removeEventListener("resize", reveal);
    };
  }, [coarse, editingId, reduce, barSpace]);

  const edit = (row: OutlineRow) => {
    setPlacedId(null);
    startName.current = row.name;
    setActiveId(row.id);
    setEditingId(row.id);
  };

  /** Ends editing and returns the rows: a row left unnamed goes, unless it has items under it, which keeps its old name */
  const finish = () => {
    setEditingId(null);
    if (editingIndex === -1) return rows;
    const row = rows[editingIndex];
    const name = row.name.trim();
    if (name && name === row.name) return rows;
    const next = name
      ? rows.map((r, i) => (i === editingIndex ? { ...r, name } : r))
      : isParentRow(rows, editingIndex)
        ? rows.map((r, i) => (i === editingIndex ? { ...r, name: startName.current } : r))
        : removeRow(rows, editingIndex);
    change(next, `rename:${row.id}`);
    return next;
  };

  const focusRow = (id: string | undefined) => {
    if (!id) return;
    setActiveId(id);
    requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
  };

  const rename = (name: string) => {
    change(
      rows.map((row) => (row.id === editingId ? { ...row, name } : row)),
      `rename:${editingId}`
    );
  };

  const indent = () => {
    if (toolIndex === -1 || !canIndent(rows, toolIndex)) return;
    // The row above becomes a parent: show its new child
    const above = rows
      .slice(0, toolIndex)
      .reverse()
      .find((r) => r.level === rows[toolIndex].level);
    if (above && collapsed.has(above.id)) {
      setCollapsed((current) => {
        const next = new Set(current);
        next.delete(above.id);
        return next;
      });
    }
    change(indentRow(rows, toolIndex));
  };

  const outdent = () => {
    if (toolIndex === -1) return;
    change(outdentRow(rows, toolIndex));
  };

  /** ⌥↑ / ⌥↓: swaps a row with its sibling, the keyboard's way to drag it */
  const shift = (index: number, by: 1 | -1, refocus: () => void) => {
    const next = moveAmongSiblings(rows, index, by);
    if (!next) return;
    keepEditing.current = true;
    change(next);
    requestAnimationFrame(() => {
      keepEditing.current = false;
      refocus();
    });
  };

  const add = () => {
    if (editingIndex === -1) return;
    const row = rows[editingIndex];
    // Enter on an empty row ends the list instead of adding another
    if (row.name.trim() === "") {
      finish();
      return;
    }
    const { at, level } = insertionPoint(rows, editingIndex, collapsed.has(row.id));
    const added = makeRow("", level);
    const next = insertRows(
      rows.map((r, i) => (i === editingIndex ? { ...r, name: r.name.trim() } : r)),
      at,
      [added]
    );
    change(next);
    edit(added);
  };

  const remove = () => {
    if (editingIndex === -1) return;
    const row = rows[editingIndex];
    const under = subtreeEnd(rows, editingIndex) - editingIndex - 1;
    change(removeRow(rows, editingIndex));
    // The edit moves to the row above, as an outliner's does
    const above = shown.filter(({ index }) => index < editingIndex).pop()?.row;
    if (above) edit(above);
    else setEditingId(null);
    if (!row.name.trim() && under === 0) return;
    const label = row.name.trim() || "Item";
    offerUndo(
      under > 0
        ? `Deleted “${label}” and ${under} ${under === 1 ? "item" : "items"} under it`
        : `Deleted “${label}”`
    );
  };

  /** Up or Down while editing: carries the edit to the shown row above or below */
  const go = (by: 1 | -1) => {
    const at = shown.findIndex(({ row }) => row.id === editingId);
    const target = shown[at + by];
    if (!target) return;
    finish();
    edit(target.row);
  };

  const toggle = (id: string, open?: boolean) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (open ?? next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const replaceTree = (result: TreeImport, source: string) => {
    setEditingId(null);
    setCollapsed(new Set(collapsedAtStart(result.rows)));
    change(result.rows);
    toast.success(describeImport(result, source));
  };

  /** Imports a whole tree: straight into an empty editor, after a confirmation over an existing one */
  const importText = (text: string, source: string) => {
    const result = parseTreeText(text);
    if (result.rows.length === 0) {
      toast.error(`No items found in ${source}.`);
      return;
    }
    if (rows.length > 0) setPending({ result, source });
    else replaceTree(result, source);
  };

  const importFile = async (file: File | undefined) => {
    if (file) importText(await file.text(), file.name);
  };

  // ⌘V / Ctrl+V on the empty editor imports a whole tree; a paste into a field is onFieldPaste's
  React.useEffect(() => {
    if (rows.length > 0) return;
    const onPaste = (event: ClipboardEvent) => {
      // A paste into any field is that field's; one on the page (or the document itself) is a tree
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      event.preventDefault();
      importText(text, "your clipboard");
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  /** A list pasted into a field becomes rows from that field down, nested under its level */
  const onFieldPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!/\n/.test(text.trim()) || editingIndex === -1) return;
    const { rows: pasted } = parseTreeText(text);
    if (pasted.length === 0) return;
    event.preventDefault();
    const row = rows[editingIndex];
    const shifted = pasted.map((r) => ({ ...r, level: r.level + row.level }));
    const replace = row.name.trim() === "" && !isParentRow(rows, editingIndex);
    const at = replace ? editingIndex : subtreeEnd(rows, editingIndex);
    const base = replace ? removeRow(rows, editingIndex) : rows;
    change(insertRows(base, at, shifted));
    edit(shifted[shifted.length - 1]);
  };

  const onFieldKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const row = rows[editingIndex];
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      shift(editingIndex, event.key === "ArrowUp" ? -1 : 1, () => inputRef.current?.focus());
      return;
    }
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        add();
        break;
      case "Tab":
        event.preventDefault();
        if (event.shiftKey) outdent();
        else indent();
        break;
      case "Escape": {
        event.preventDefault();
        const list = finish();
        focusRow(list.some((r) => r.id === row.id) ? row.id : list[0]?.id);
        break;
      }
      case "Backspace":
        if (row.name === "" && !isParentRow(rows, editingIndex)) {
          event.preventDefault();
          remove();
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        go(-1);
        break;
      case "ArrowDown":
        event.preventDefault();
        go(1);
        break;
    }
  };

  const onRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.target !== event.currentTarget) return;
    const at = shown.findIndex(({ row }) => row.id === id);
    if (at === -1) return;
    const { row, index } = shown[at];
    const parent = isParentRow(rows, index);
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      shift(index, event.key === "ArrowUp" ? -1 : 1, () => rowRefs.current.get(id)?.focus());
      return;
    }
    switch (event.key) {
      case "Enter":
      case "F2":
        event.preventDefault();
        edit(row);
        break;
      case "ArrowDown":
        event.preventDefault();
        focusRow(shown[at + 1]?.row.id);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusRow(shown[at - 1]?.row.id);
        break;
      case "ArrowRight":
        if (parent && collapsed.has(id)) toggle(id, true);
        break;
      case "ArrowLeft":
        if (parent && !collapsed.has(id)) toggle(id, false);
        break;
    }
  };

  const startTree = () => {
    const first = makeRow("", 0);
    change([first]);
    edit(first);
  };

  /** Adds after the last item: under a lone top-level item, as most trees have one ("Home") */
  const addAtEnd = () => {
    const list = finish();
    const roots = list.filter((row) => row.level === 0).length;
    const added = makeRow("", roots === 1 ? 1 : 0);
    change([...list, added]);
    edit(added);
  };

  const onDragOver = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const onDragLeave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
  };

  const onDrop = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDragOver(false);
    void importFile(event.dataTransfer.files[0]);
  };

  // Moving a row by dragging it: by its grip with a mouse, by a long-press on a touch screen

  const startMove = (id: string, point: DragPoint, touch: boolean) => {
    if (editingRef.current) finish();
    setPlacedId(null);
    const index = rows.findIndex((row) => row.id === id);
    const el = rowRefs.current.get(id);
    const list = listEl.current;
    if (index === -1 || !el || !list) return;
    const end = subtreeEnd(rows, index);
    const ids = new Set(rows.slice(index, end).map((row) => row.id));
    const scrollY = window.scrollY;
    const box = el.getBoundingClientRect();
    session.current = {
      id,
      touch,
      startX: point.x,
      startLevel: rows[index].level,
      others: shown.flatMap(({ row }) => {
        const other = ids.has(row.id) ? null : rowRefs.current.get(row.id)?.getBoundingClientRect();
        return other ? [{ row, top: other.top + scrollY, bottom: other.bottom + scrollY }] : [];
      }),
      listTop: list.getBoundingClientRect().top + scrollY,
      grabY: point.y - box.top,
      left: box.left,
      width: box.width,
      transform: "",
      target: null,
    };
    setDragging({ id, ids, name: rows[index].name.trim() || "Item", under: end - index - 1 });
    followMove(point);
  };

  /** Finds the gap under the pointer and the level for it; the lifted copy follows */
  const followMove = (point: DragPoint) => {
    const info = session.current;
    if (!info) return;
    const y = point.y + window.scrollY;
    const at = info.others.findIndex((other) => (other.top + other.bottom) / 2 > y);
    const below = at === -1 ? undefined : info.others[at];
    const above = at === -1 ? info.others[info.others.length - 1] : info.others[at - 1];
    const { min, max } = dropLevels(above?.row, below?.row);
    // A mouse sets the level by how far it has moved sideways; a finger lands beside the row above
    const wanted = info.touch
      ? (above?.row.level ?? 0)
      : info.startLevel + Math.round((point.x - info.startX) / INDENT);
    const level = Math.min(max, Math.max(min, wanted));
    // In the gap just under the row above (rows sit 8px apart). Not midway to the row below: the
    // dragged rows stay in place, faded, and may sit between the two
    const lineY = (above ? above.bottom + 4 : (below?.top ?? info.listTop) - 4) - info.listTop;
    info.target = { above: above?.row.id, below: below?.row.id, level };
    const line = lineRef.current;
    if (line) {
      line.style.top = `${lineY - 1}px`;
      line.style.left = `${level * INDENT}px`;
      line.style.opacity = "1";
    }
    info.transform = `translate3d(${info.left + (level - info.startLevel) * INDENT}px, ${point.y - info.grabY}px, 0) scale(1.02)`;
    if (ghostRef.current) ghostRef.current.style.transform = info.transform;
  };

  const endMove = () => {
    session.current = null;
    setDragging(null);
  };

  const dropMove = () => {
    const info = session.current;
    endMove();
    const index = info ? rows.findIndex((row) => row.id === info.id) : -1;
    if (!info?.target || index === -1) return;
    const next = moveRow(rows, index, info.target);
    if (next.every((row, i) => row.id === rows[i].id && row.level === rows[i].level)) return;
    // Nested into a closed parent: open it, so the row is seen where it landed
    const above = rows.find((row) => row.id === info.target?.above);
    if (above && collapsed.has(above.id) && info.target.level > above.level) toggle(above.id, true);
    change(next);
    if (info.touch) {
      // The bar it gets has Undo, and a toast would sit under it
      setPlacedId(info.id);
      return;
    }
    // Focus lands on the moved row, so ⌘Z and the arrow keys carry on from it
    focusRow(info.id);
    const at = next.findIndex((row) => row.id === info.id);
    const parent = next
      .slice(0, at)
      .reverse()
      .find((row) => row.level < next[at].level);
    const name = next[at].name.trim() || "Item";
    offerUndo(
      parent ? `Moved “${name}” under ${parent.name.trim()}` : `Moved “${name}” to the top level`
    );
  };

  const drag = usePointerDrag<string>({
    onStart: startMove,
    onMove: followMove,
    onDrop: dropMove,
    onCancel: endMove,
  });

  // Rows get one unchanging set of handlers that call this render's, so a keystroke or a toggle
  // re-renders only the rows it changes, not every row of a long tree
  const handlers: RowActions = {
    edit: (id) => {
      // A long-press ends with the tap it started as
      if (drag.justDragged()) return;
      const row = rows.find((r) => r.id === id);
      if (row) edit(row);
    },
    toggle,
    rowKeyDown: onRowKeyDown,
    register: (id, el) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    },
    rename,
    fieldKeyDown: onFieldKeyDown,
    fieldPaste: onFieldPaste,
    blur: (id) => {
      if (editingRef.current === id && !keepEditing.current) finish();
    },
    outdent,
    indent,
    add,
    remove,
    grab: drag.fromHandle,
    press: drag.fromPress,
  };
  const latest = React.useRef(handlers);
  React.useLayoutEffect(() => {
    latest.current = handlers;
  });
  const actions = React.useMemo<RowActions>(
    () => ({
      edit: (id) => latest.current.edit(id),
      toggle: (id) => latest.current.toggle(id),
      rowKeyDown: (event, id) => latest.current.rowKeyDown(event, id),
      register: (id, el) => latest.current.register(id, el),
      rename: (name) => latest.current.rename(name),
      fieldKeyDown: (event) => latest.current.fieldKeyDown(event),
      fieldPaste: (event) => latest.current.fieldPaste(event),
      blur: (id) => latest.current.blur(id),
      outdent: () => latest.current.outdent(),
      indent: () => latest.current.indent(),
      add: () => latest.current.add(),
      remove: () => latest.current.remove(),
      grab: (event, id) => latest.current.grab(event, id),
      press: (event, id) => latest.current.press(event, id),
    }),
    []
  );

  const draggedIds = dragging?.ids;
  // The rows, rebuilt only when what they show changes: not on a keystroke, whose name EditingName
  // carries to the field
  const list = React.useMemo(() => {
    const visible = visibleRows(listRows, listCollapsed);
    const ids = visible.map(({ row }) => row.id);
    const { entering, leaving } = planMotion(lastShown.current, ids);
    const items = visible.map(({ row, index }) => {
      const parent = isParentRow(listRows, index);
      const editing = row.id === editingId;
      const issue = issues.get(row.id);
      // A path problem shows even with paths hidden
      const hasPath =
        (!parent || allowNonLeafAnswers) && row.name.trim() !== "" && (showPaths || !!issue);
      // Below sm the path runs under the name, across the row; beside it, it gets what the name,
      // the toolbar and the chevron leave (a 14px name runs about 7.6px a character, a path 6.6 at
      // its 12px beside the name and 7.2 at its 13px under it)
      const beside = listWidth >= 640;
      const room =
        listWidth -
        row.level * INDENT -
        // The row's side padding; a mouse's rows keep room for the grip
        (coarse ? 24 : 32) -
        (beside
          ? row.name.length * 7.6 + 12 + (editing && !coarse ? 126 : 0) + (parent ? 32 : 0)
          : 0);
      return (
        <RowItem
          key={row.id}
          row={row}
          parent={parent}
          open={!collapsed.has(row.id)}
          editing={editing}
          tabStop={row.id === tabStop}
          path={
            hasPath
              ? fitPath(paths[index], Math.max(12, Math.floor((room - 16) / (beside ? 6.6 : 7.2))))
              : null
          }
          fullPath={paths[index]}
          issue={issue}
          pathRule={pathRule}
          coarse={coarse}
          dragged={!!draggedIds?.has(row.id)}
          placed={row.id === placedId}
          canIndent={editing && canIndent(listRows, index)}
          canOutdent={editing && canOutdent(listRows, index)}
          animateIn={entering.has(row.id)}
          transition={rowMotion}
          actions={actions}
          inputRef={inputRef}
        />
      );
    });
    return { ids, leaving, items };
  }, [
    listRows,
    listCollapsed,
    collapsed,
    editingId,
    placedId,
    draggedIds,
    tabStop,
    paths,
    issues,
    showPaths,
    listWidth,
    coarse,
    pathRule,
    allowNonLeafAnswers,
    rowMotion,
    actions,
  ]);
  React.useLayoutEffect(() => {
    lastShown.current = list.ids;
  });

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        {/* ⌘Z and ⇧⌘Z undo and redo anywhere in the editor, its fields included */}
        <div onKeyDownCapture={onShortcut}>
          <div className="mb-3 flex h-8 items-center gap-1">
            <Label id={labelId} className="mr-auto">
              Tree Structure
            </Label>
            {rows.length > 0 && (
              <>
                <Label
                  htmlFor={`${labelId}-paths`}
                  className="mr-1 flex cursor-pointer items-center gap-2 text-xs font-normal text-muted-foreground"
                >
                  <Switch
                    id={`${labelId}-paths`}
                    checked={showPaths}
                    onCheckedChange={setShowPaths}
                    className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                  />
                  Paths
                </Label>
                <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                <HeaderButton label="Expand all" onClick={() => setCollapsed(new Set())}>
                  <ChevronsUpDown className="h-4 w-4" />
                </HeaderButton>
                <HeaderButton
                  label="Collapse all"
                  onClick={() => setCollapsed(new Set(collapseAllIds(rows)))}
                >
                  <ChevronsDownUp className="h-4 w-4" />
                </HeaderButton>
                <HeaderButton
                  label="What participants will see"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4" />
                </HeaderButton>
                <HeaderButton label="Import a tree" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                </HeaderButton>
              </>
            )}
            {!coarse && <Shortcuts />}
          </div>

          <div
            data-tree-editor
            className={cn(
              "relative rounded-lg transition-[box-shadow,background-color]",
              dragOver && "bg-neutral-50 ring-[1.5px] ring-foreground"
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                void importFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            {rows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-muted text-neutral-600">
                  <FileUp className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="text-sm font-semibold">Start your tree</p>
                <p className="mt-1 text-balance text-[13px] text-muted-foreground">
                  {coarse
                    ? "Import a CSV, or add items one by one."
                    : "Paste a list, drop a CSV, or add items one by one."}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" aria-hidden />
                    Import CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={startTree}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Add item
                  </Button>
                </div>
                {unparsedText && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 text-[13px]"
                    onClick={() => importText(unparsedText, "the text you entered before")}
                  >
                    Use the tree text you entered before
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {issues.size > 0 && (
                  <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {issues.size === 1
                      ? "1 item has a path that can't be told apart from another's. It's marked below."
                      : `${issues.size} items have paths that can't be told apart from others'. They're marked below.`}
                  </p>
                )}

                <div ref={setList} role="tree" aria-labelledby={labelId} className="relative -mb-2">
                  {/* Where a dragged row would land, indented to the level it would take */}
                  {dragging && (
                    <div
                      ref={lineRef}
                      aria-hidden
                      className="pointer-events-none absolute right-0 z-10 h-0.5 rounded-full bg-blue-500 opacity-0"
                    />
                  )}
                  {/* Rows open and close in place: added, deleted, or shown and hidden by their parent.
                      A leaving row reads from `custom` whether it's one of the few that animate.
                      presenceAffectsLayout is off (there are no layout animations): left on, it hands
                      every row a new context on each render, re-rendering all of them per keystroke */}
                  <EditingName.Provider value={editingIndex !== -1 ? rows[editingIndex].name : ""}>
                    <AnimatePresence
                      initial={false}
                      custom={list.leaving}
                      presenceAffectsLayout={false}
                    >
                      {list.items}
                    </AnimatePresence>
                  </EditingName.Provider>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onMouseDown={keepFocus}
                  onClick={addAtEnd}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add item
                </Button>
                {/* Room to scroll the last rows up past the keyboard bar */}
                {coarse && toolIndex !== -1 && (
                  <div aria-hidden style={{ height: barSpace + 24 }} />
                )}
              </div>
            )}
          </div>

          {editingIndex !== -1 && coarse && (
            <KeyboardBar
              lift={lift}
              canIndent={canIndent(rows, editingIndex)}
              canOutdent={canOutdent(rows, editingIndex)}
              onOutdent={outdent}
              onIndent={indent}
              onAdd={add}
              onDelete={remove}
              onDone={() => {
                finish();
                inputRef.current?.blur();
              }}
            />
          )}
          {/* After a touch drag: the level, with no keyboard up */}
          {editingIndex === -1 && placedIndex !== -1 && coarse && (
            <KeyboardBar
              lift={lift}
              canIndent={canIndent(rows, placedIndex)}
              canOutdent={canOutdent(rows, placedIndex)}
              onOutdent={outdent}
              onIndent={indent}
              onUndo={() => {
                step("undo");
                setPlacedId(null);
              }}
              onDone={() => setPlacedId(null)}
            />
          )}

          {/* The dragged row, lifted, following the pointer; its children travel inside it */}
          {dragging &&
            createPortal(
              <div
                ref={ghostRef}
                aria-hidden
                className={cn(
                  "pointer-events-none fixed left-0 top-0 z-[60] flex min-h-9 items-center gap-2 rounded bg-white py-2 text-base text-gray-900 shadow-lg ring-1 ring-ring sm:text-sm",
                  // The row's own padding, so the name doesn't shift as it lifts
                  coarse ? "px-3" : "pl-5 pr-3"
                )}
                style={{ width: session.current?.width, transform: session.current?.transform }}
              >
                <span className="min-w-0 flex-1 truncate">{dragging.name}</span>
                {dragging.under > 0 && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 text-xs text-gray-600">
                    +{dragging.under}
                  </span>
                )}
              </div>,
              document.body
            )}

          <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Replace your tree?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pending &&
                    `Your ${rows.length} ${rows.length === 1 ? "item" : "items"} will be replaced by the ${pending.result.rows.length} in ${pending.source}. Task answers that point to items no longer in the tree will need updating on the Tasks tab.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (pending) replaceTree(pending.result, pending.source);
                    setPending(null);
                  }}
                >
                  Replace tree
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>What participants will see</DialogTitle>
                <DialogDescription>
                  Click through your tree the way a participant would.
                </DialogDescription>
              </DialogHeader>
              {previewOpen && (
                <TreePreview
                  nodes={treeFromRows(rowsToSave(rows), pathRule)}
                  allowNonLeafAnswers={allowNonLeafAnswers}
                  selectAsAnswerText={selectAsAnswerText}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}

/** The edited row's name as typed, which reaches its field without re-rendering the list */
const EditingName = React.createContext("");

function NameField({
  inputRef,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value"> & {
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const name = React.useContext(EditingName);
  return <input ref={inputRef} value={name} {...props} />;
}

interface RowActions {
  edit: (id: string) => void;
  toggle: (id: string) => void;
  rowKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, id: string) => void;
  register: (id: string, el: HTMLDivElement | null) => void;
  rename: (name: string) => void;
  fieldKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  fieldPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  blur: (id: string) => void;
  outdent: () => void;
  indent: () => void;
  add: () => void;
  remove: () => void;
  /** A mouse pressing a row's grip */
  grab: (event: React.PointerEvent, id: string) => void;
  /** A finger touching a row, which a long-press turns into a drag */
  press: (event: React.TouchEvent, id: string) => void;
}

interface RowItemProps {
  row: OutlineRow;
  parent: boolean;
  open: boolean;
  editing: boolean;
  tabStop: boolean;
  /** The path as it fits the row, or null when it's hidden */
  path: string | null;
  fullPath: string;
  issue: PathIssue | undefined;
  pathRule: PathRule;
  coarse: boolean;
  /** Part of the block being dragged, which stays faint in place until it lands */
  dragged: boolean;
  /** Just placed by a touch drag, with the bar for its level showing */
  placed: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  animateIn: boolean;
  transition: Transition;
  actions: RowActions;
  inputRef: React.RefObject<HTMLInputElement>;
}

/** One row, re-rendered only when its own props change */
const RowItem = React.memo(function RowItem({
  row,
  parent,
  open,
  editing,
  tabStop,
  path,
  fullPath,
  issue,
  pathRule,
  coarse,
  dragged,
  placed,
  canIndent,
  canOutdent,
  animateIn,
  transition,
  actions,
  inputRef,
}: RowItemProps) {
  const register = React.useCallback(
    (el: HTMLDivElement | null) => actions.register(row.id, el),
    [actions, row.id]
  );
  return (
    <motion.div
      role="none"
      initial={animateIn ? HIDDEN : false}
      animate={SHOWN}
      exit="leave"
      variants={{
        leave: (leaving?: Set<string>) => ({
          ...HIDDEN,
          transition: leaving?.has(row.id) ? transition : { duration: 0 },
        }),
      }}
      transition={transition}
      // The gap below a row is its margin, inside this clip: padding here wouldn't shrink with the
      // height, so a closed row would keep 8px until it's removed
      className="overflow-hidden"
    >
      <div
        ref={register}
        role="treeitem"
        aria-level={row.level + 1}
        aria-expanded={parent ? open : undefined}
        aria-selected={editing}
        tabIndex={editing ? -1 : tabStop ? 0 : -1}
        onKeyDown={(event) => actions.rowKeyDown(event, row.id)}
        onClick={() => !editing && actions.edit(row.id)}
        onTouchStart={coarse && !editing ? (event) => actions.press(event, row.id) : undefined}
        // A long-press lifts the row, so it opens no menu
        onContextMenu={coarse ? (event) => event.preventDefault() : undefined}
        style={{ marginLeft: row.level * INDENT }}
        className={cn(
          "group/row relative mb-2 flex min-h-9 cursor-text items-center gap-2 rounded text-base text-gray-900 outline-none transition-[margin,background-color,box-shadow,opacity] duration-200 motion-reduce:transition-none sm:text-sm",
          // A long-press lifts the row, so it doesn't select its text or show iOS's callout
          coarse ? "select-none px-3 [-webkit-touch-callout:none]" : "pl-5 pr-3",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          parent ? "bg-gray-100" : "bg-gray-50",
          (editing || placed) && "bg-white ring-1 ring-inset ring-ring",
          dragged && "opacity-40"
        )}
      >
        {!coarse && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Drag to move ${row.name}`}
            onPointerDown={(event) => {
              event.stopPropagation();
              actions.grab(event, row.id);
            }}
            onClick={(event) => event.stopPropagation()}
            className="absolute left-0.5 top-1/2 grid h-7 w-4 -translate-y-1/2 cursor-grab place-items-center rounded text-gray-400 opacity-0 transition-opacity hover:text-gray-700 focus-visible:opacity-100 active:cursor-grabbing group-hover/row:opacity-100 motion-reduce:transition-none"
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {editing ? (
            <NameField
              inputRef={inputRef}
              placeholder="Item name"
              aria-label="Item name"
              enterKeyHint="next"
              onChange={(event) => actions.rename(event.target.value)}
              onKeyDown={actions.fieldKeyDown}
              onPaste={actions.fieldPaste}
              onBlur={() => actions.blur(row.id)}
              className="w-full min-w-0 flex-1 bg-transparent p-0 outline-none placeholder:text-neutral-400"
            />
          ) : (
            <span className="min-w-0 max-w-full truncate">{row.name}</span>
          )}
          {path !== null && (
            <PathPill path={path} full={fullPath} issue={issue} pathRule={pathRule} />
          )}
        </div>
        {editing && !coarse && (
          <RowTools
            canIndent={canIndent}
            canOutdent={canOutdent}
            onOutdent={actions.outdent}
            onIndent={actions.indent}
            onAdd={actions.add}
            onDelete={actions.remove}
          />
        )}
        {parent && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? `Collapse ${row.name}` : `Expand ${row.name}`}
            onMouseDown={keepFocus}
            onClick={(event) => {
              event.stopPropagation();
              actions.toggle(row.id);
            }}
            className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded text-gray-600 hover:bg-gray-200"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform motion-reduce:transition-none",
                !open && "-rotate-90"
              )}
              aria-hidden
            />
          </button>
        )}
      </div>
    </motion.div>
  );
});

/** Which rows animate as the list changes: the first few to arrive and the first few to go, in list order */
function planMotion(before: string[], after: string[]) {
  const was = new Set(before);
  const is = new Set(after);
  return {
    entering: new Set(after.filter((id) => !was.has(id)).slice(0, ANIMATED_ROWS)),
    leaving: new Set(before.filter((id) => !is.has(id)).slice(0, ANIMATED_ROWS)),
  };
}

function PathPill({
  path,
  full,
  issue,
  pathRule,
}: {
  path: string;
  full: string;
  issue?: PathIssue;
  pathRule: PathRule;
}) {
  const pill = (
    <span
      title={issue ? undefined : full}
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded px-2 py-0.5 text-[13px] sm:text-xs",
        issue ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-700"
      )}
    >
      {issue && <TriangleAlert className="h-3 w-3 shrink-0" aria-label="Path problem" />}
      {path}
    </span>
  );
  if (!issue) return pill;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{issueText(issue, pathRule)}</TooltipContent>
    </Tooltip>
  );
}

interface ToolProps {
  canIndent: boolean;
  canOutdent: boolean;
  onOutdent: () => void;
  onIndent: () => void;
  onAdd: () => void;
  onDelete: () => void;
}

/** The selected row's toolbar; each tooltip names the button and teaches its key */
function RowTools({ canIndent, canOutdent, onOutdent, onIndent, onAdd, onDelete }: ToolProps) {
  const tool = (
    label: string,
    keys: string | null,
    icon: React.ReactNode,
    onClick: () => void,
    options: { disabled?: boolean; danger?: boolean } = {}
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-keyshortcuts={keys ?? undefined}
          disabled={options.disabled}
          onMouseDown={keepFocus}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-35",
            options.danger && "hover:bg-red-50 hover:text-red-600"
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}
        {keys && <kbd className="ml-2 font-sans text-neutral-400">{keys}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
  // It opens from no width as the row becomes the field, so the path beside it slides aside
  // rather than jumping (measuring only this one element as it goes)
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "auto" }}
      transition={reduce ? { duration: 0 } : { duration: 0.18, ease: [0.25, 0.8, 0.25, 1] }}
      className="-mr-1.5 flex shrink-0 items-center gap-0.5 overflow-hidden"
      role="toolbar"
      aria-label="Item actions"
    >
      {tool("Outdent", "⇧⇥ Shift Tab", <IndentDecrease className="h-4 w-4" />, onOutdent, {
        disabled: !canOutdent,
      })}
      {tool("Indent", "⇥ Tab", <IndentIncrease className="h-4 w-4" />, onIndent, {
        disabled: !canIndent,
      })}
      {tool("Add item", "↵ Enter", <Plus className="h-4 w-4" />, onAdd)}
      {tool("Delete item", null, <Trash2 className="h-4 w-4" />, onDelete, { danger: true })}
    </motion.div>
  );
}

/** On a touch screen the shortcuts ride on the keyboard: a phone has no Tab key */
/**
 * The touch toolbar. While a row is edited it rides the keyboard with Add and
 * Delete; for a row a drag just placed, with no keyboard up, it offers Undo
 * instead.
 */
function KeyboardBar({
  onDone,
  lift,
  ...tools
}: Omit<ToolProps, "onAdd" | "onDelete"> & {
  onAdd?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onDone: () => void;
  lift: number;
}) {
  // Placed from the viewport's own events, straight on the element: a React render per scroll
  // event trails the page. iOS still reports its viewport a beat late mid-fling
  const bar = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const el = bar.current;
    if (!viewport || !el) return;
    const place = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      el.style.transform = `translate3d(0, ${-inset}px, 0)`;
    };
    place();
    viewport.addEventListener("resize", place);
    viewport.addEventListener("scroll", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      viewport.removeEventListener("resize", place);
      viewport.removeEventListener("scroll", place);
      window.removeEventListener("scroll", place);
    };
  }, []);
  // Rendered only once a touch screen is detected, after mount, so document.body exists
  const press = (onClick: () => void) => ({
    onPointerDown: keepFocus,
    onMouseDown: keepFocus,
    onClick,
  });
  return createPortal(
    <div ref={bar} className="fixed inset-x-0 bottom-0 z-50 will-change-transform">
      {/* The lift is white, so Safari's address bar sits on the toolbar instead of over its buttons */}
      <div
        className="border-t bg-white duration-200 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
        style={{ paddingBottom: lift }}
      >
        <div
          role="toolbar"
          aria-label="Item actions"
          className="flex items-center gap-1.5 px-1.5 py-2"
          style={{ height: KEYBOARD_BAR }}
        >
          <Button
            variant="secondary"
            className="h-9 gap-1.5 px-2.5"
            disabled={!tools.canOutdent}
            {...press(tools.onOutdent)}
          >
            <IndentDecrease className="h-[18px] w-[18px]" aria-hidden />
            Outdent
          </Button>
          <Button
            variant="secondary"
            className="h-9 gap-1.5 px-2.5"
            disabled={!tools.canIndent}
            {...press(tools.onIndent)}
          >
            <IndentIncrease className="h-[18px] w-[18px]" aria-hidden />
            Indent
          </Button>
          {tools.onAdd && (
            <Button
              variant="secondary"
              className="h-9 w-10 px-0"
              aria-label="Add item"
              {...press(tools.onAdd)}
            >
              <Plus className="h-[18px] w-[18px]" aria-hidden />
            </Button>
          )}
          {tools.onDelete && (
            <Button
              variant="secondary"
              className="h-9 w-10 px-0 text-red-600"
              aria-label="Delete item"
              {...press(tools.onDelete)}
            >
              <Trash2 className="h-[18px] w-[18px]" aria-hidden />
            </Button>
          )}
          {tools.onUndo && (
            <Button
              variant="secondary"
              className="h-9 w-10 px-0"
              aria-label="Undo"
              {...press(tools.onUndo)}
            >
              <Undo2 className="h-[18px] w-[18px]" aria-hidden />
            </Button>
          )}
          <Button className="ml-auto h-9 px-4" {...press(onDone)}>
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** iPhones and iPads (an iPad reports itself as a Mac with touch) */
function useAppleTouch() {
  const [apple, setApple] = React.useState(false);
  React.useEffect(() => {
    setApple(
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);
  return apple;
}

/** Touch screens get the toolbar on the keyboard instead of on the row */
function useCoarsePointer() {
  const [coarse, setCoarse] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return coarse;
}

/** The rows' width, so a long path can be shortened to fit. A callback ref: the list mounts only once there are rows */
function useWidth() {
  const [node, setNode] = React.useState<HTMLElement | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width] as const;
}

/** Keeps the field focused (and a phone's keyboard up) when a toolbar button is pressed */
const keepFocus = (event: React.SyntheticEvent) => event.preventDefault();

function issueText(issue: PathIssue, rule: PathRule) {
  if (issue.kind === "duplicate")
    return `Same path as “${issue.withName}”, so answers to the two can't be told apart. Rename one.`;
  // A launched study keeps the rule its answers were recorded with
  return rule === "original"
    ? "This study's paths keep only a–z, 0–9, - and _, so this name's path is blank and answers to it can be mixed up with others. Add a word in a–z."
    : "This name has nothing a path can keep, so its path is blank and answers to it can be mixed up with others. Add a word.";
}

function describeImport(result: TreeImport, source: string) {
  const notes = [
    result.skippedHeader && "left out the header row",
    result.levelFixes > 0 &&
      `moved ${result.levelFixes} ${result.levelFixes === 1 ? "item that skipped a level" : "items that skipped a level"} under the item above`,
  ].filter(Boolean);
  const count = `${result.rows.length} ${result.rows.length === 1 ? "item" : "items"}`;
  return notes.length
    ? `Added ${count} from ${source}. We ${notes.join(" and ")}.`
    : `Added ${count} from ${source}.`;
}

/** Whether rows show their paths, remembered on this device */
function useShowPaths() {
  const [show, setShow] = React.useState(true);
  React.useEffect(() => {
    if (localStorage.getItem("tree-editor:paths") === "hidden") setShow(false);
  }, []);
  const update = (next: boolean) => {
    setShow(next);
    localStorage.setItem("tree-editor:paths", next ? "shown" : "hidden");
  };
  return [show, update] as const;
}

function HeaderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** The editor's keys, behind one button: a phone has no such keys, so it isn't shown there */
function Shortcuts() {
  const [mac, setMac] = React.useState(false);
  React.useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  const mod = mac ? "⌘" : "Ctrl";
  const keys: [string[], string][] = [
    [["Enter"], "Add an item below"],
    [["Tab"], "Indent"],
    [["Shift", "Tab"], "Outdent"],
    [["↑", "↓"], "Go to the item above or below"],
    [[mac ? "⌥" : "Alt", "↑", "↓"], "Move the item up or down"],
    [["Esc"], "Finish editing"],
    [["Backspace"], "Delete an empty item"],
    [[mod, "V"], "Paste a list as items"],
    [[mod, "Z"], "Undo"],
    [[mod, "Shift", "Z"], "Redo"],
  ];
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Keyboard shortcuts">
              <Keyboard className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Keyboard shortcuts</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80">
        <p className="mb-3 text-sm font-medium">Keyboard shortcuts</p>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-[13px]">
          {keys.map(([combo, action]) => (
            <React.Fragment key={action}>
              <dt className="flex gap-1">
                {combo.map((key) => (
                  <kbd
                    key={key}
                    className="inline-grid h-5 min-w-5 place-items-center rounded border bg-muted px-1.5 font-sans text-[11px] text-neutral-600"
                  >
                    {key}
                  </kbd>
                ))}
              </dt>
              <dd className="text-muted-foreground">{action}</dd>
            </React.Fragment>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
