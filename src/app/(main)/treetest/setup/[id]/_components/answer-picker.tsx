"use client";

import * as React from "react";
import { Check, CheckCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { searchOptions, type AnswerOption } from "@/lib/treetest/task-answers";

interface AnswerPickerProps {
  taskNumber: number;
  options: AnswerOption[];
  allowParents: boolean;
  /** The task's answers, as paths */
  selected: string[];
  onToggle: (path: string) => void;
  /** The button that opens it */
  children: React.ReactElement;
}

type ListProps = Omit<AnswerPickerProps, "taskNumber" | "children">;

/**
 * The tree, to pick a task's answers from. It opens as a popover by its
 * button, or as a drawer on a phone, where there's no room beside it. It stays
 * open while answers are picked, since a task can have several.
 */
export function AnswerPicker({ taskNumber, children, ...list }: AnswerPickerProps) {
  const [open, setOpen] = React.useState(false);
  const wide = useMediaQuery("(min-width: 640px)");
  const drawer = React.useRef<HTMLDivElement>(null);
  useKeyboardFit(drawer, open && !wide);
  const done = () => setOpen(false);

  if (wide) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={16}
          className="w-[min(380px,calc(100vw-32px))] p-0"
        >
          <PickerList {...list} onDone={done} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    // useKeyboardFit places the drawer above the keyboard; vaul's own guess left it half off screen
    <Drawer
      open={open}
      onOpenChange={setOpen}
      shouldScaleBackground={false}
      repositionInputs={false}
    >
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent ref={drawer} className="h-[85dvh]">
        <DrawerHeader className="flex items-center justify-between gap-3 px-4 pb-3 pt-3 text-left">
          <DrawerTitle className="text-base">Answer for task {taskNumber}</DrawerTitle>
          <Button size="sm" className="h-9 px-4" onClick={done}>
            Done
          </Button>
        </DrawerHeader>
        <DrawerDescription className="sr-only">
          Pick the items in your tree that answer this task.
        </DrawerDescription>
        <PickerList {...list} touch />
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The search and the tree's items. Arrow keys move through the items that can
 * be answers and Enter picks one; a finger taps them. Only the rows in view,
 * and a few past each edge, are drawn: every row is one line, so where each
 * sits is known without drawing it, and a tree of thousands opens as fast as
 * one of ten. The list follows the search in background renders, so
 * a keystroke never waits for it.
 *
 * Plain rows rather than cmdk: cmdk mounts slowly for hundreds of items, and
 * scrolls its highlighted row into view with the browser's own scrolling,
 * which on iOS with the keyboard up scrolls the whole page.
 */
function PickerList({
  options,
  allowParents,
  selected,
  onToggle,
  onDone,
  touch = false,
}: ListProps & { onDone?: () => void; touch?: boolean }) {
  const id = React.useId();
  const [query, setQuery] = React.useState("");
  const search = React.useDeferredValue(query);
  const [rows, tops] = useRows({ options, allowParents, selected }, search, touch);
  const pickable = React.useMemo(() => rows.filter((row) => row.pickable), [rows]);
  const [active, setActive] = React.useState(0);
  const activeRow = pickable[Math.min(active, pickable.length - 1)];
  const activeIndex = activeRow?.index;
  const list = React.useRef<HTMLDivElement>(null);
  const [start, end, measure] = useWindow(list, tops);
  // A new search starts at the top of its results
  React.useEffect(() => {
    setActive(0);
    if (list.current) list.current.scrollTop = 0;
  }, [search]);
  // The rows get handlers that never change, so picking or hovering one re-renders only the rows it changes
  const latest = React.useRef(onToggle);
  latest.current = onToggle;
  const toggle = React.useCallback((path: string) => latest.current(path), []);
  const hover = React.useCallback((place: number) => setActive(place - 1), []);

  // Keeps the active row in view inside the list, never by scrolling the page, and drawn at once,
  // for the search field's aria-activedescendant
  const activeAt = activeRow?.at;
  React.useEffect(() => {
    const box = list.current;
    if (!box || activeAt === undefined || touch) return;
    const top = LIST_PADDING + tops[activeAt];
    const bottom = LIST_PADDING + tops[activeAt + 1];
    if (top < box.scrollTop) box.scrollTop = top - 4;
    else if (bottom > box.scrollTop + box.clientHeight)
      box.scrollTop = bottom - box.clientHeight + 4;
    measure();
  }, [activeAt, tops, touch, measure]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (touch) {
      // Search drops the keyboard, so more of the tree shows
      if (event.key === "Enter") event.currentTarget.blur();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (pickable.length === 0) return;
      const by = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + by + pickable.length) % pickable.length);
    } else if (event.key === "Enter" && activeIndex !== undefined) {
      event.preventDefault();
      onToggle(options[activeIndex].path);
    }
  };

  return (
    <div className={cn("flex flex-col", touch && "min-h-0 flex-1")}>
      <div className="flex items-center gap-2 border-b pl-3 pr-2">
        <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        <input
          type="search"
          role="combobox"
          aria-expanded
          aria-controls={`${id}-list`}
          aria-activedescendant={
            !touch && activeIndex !== undefined ? `${id}-${activeIndex}` : undefined
          }
          aria-label="Search the tree"
          placeholder="Search the tree"
          enterKeyHint={touch ? "search" : undefined}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden",
            touch ? "h-11 text-base" : "h-10 text-sm"
          )}
        />
        {onDone && (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2" onClick={onDone}>
            <CheckCheck className="h-3.5 w-3.5" aria-hidden />
            Done
          </Button>
        )}
      </div>
      <div
        ref={list}
        id={`${id}-list`}
        role="listbox"
        aria-multiselectable
        aria-label="Items in the tree"
        className={cn(
          "relative overflow-y-auto overscroll-contain p-1",
          touch ? "min-h-0 flex-1 pb-8" : "max-h-[min(340px,50vh)]"
        )}
      >
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {options.length === 0
              ? "Add your tree on the Tree tab first."
              : `No items match “${search.trim()}”.`}
          </p>
        ) : (
          // The rows out of view are space above and below the ones drawn
          <div
            role="none"
            style={{ paddingTop: tops[start], paddingBottom: tops[rows.length] - tops[end] }}
          >
            {rows.slice(start, end).map(({ index, option, pickable: canPick, picked, place }) => (
              <PickerRow
                key={index}
                id={`${id}-${index}`}
                option={option}
                query={search}
                pickable={canPick}
                picked={picked}
                place={place}
                setSize={pickable.length}
                active={!touch && index === activeIndex}
                touch={touch}
                onToggle={toggle}
                onHover={touch ? undefined : hover}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** One item: an answer to pick, or a parent shown only to say where its items sit */
const PickerRow = React.memo(function PickerRow({
  id,
  option,
  query,
  pickable,
  picked,
  place,
  setSize,
  active,
  touch,
  onToggle,
  onHover,
}: {
  id: string;
  option: AnswerOption;
  query: string;
  pickable: boolean;
  picked: boolean;
  /** Its place among the items that can be picked, and their count: most aren't drawn */
  place: number;
  setSize: number;
  active: boolean;
  touch: boolean;
  onToggle: (path: string) => void;
  onHover?: (place: number) => void;
}) {
  const name = (
    <span className="min-w-0 flex-1 truncate">
      <Name name={option.name} query={query} />
    </span>
  );
  const indent = { paddingLeft: 8 + option.level * 14 };
  if (!pickable) {
    return (
      <div
        role="presentation"
        style={indent}
        className={cn(
          "flex items-center pr-2 text-[13px] text-muted-foreground",
          // Not tappable, so a label's height, not a target's
          touch ? "h-9" : "h-8"
        )}
      >
        {name}
      </div>
    );
  }
  return (
    // Keys reach the rows through the search field, which points at the active one (aria-activedescendant)
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      id={id}
      role="option"
      aria-selected={picked}
      aria-posinset={place}
      aria-setsize={setSize}
      onClick={() => onToggle(option.path)}
      // The search keeps the focus, so the arrow keys carry on after a click
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={onHover ? () => !active && onHover(place) : undefined}
      style={indent}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm pr-2",
        touch ? "h-11 text-[15px] active:bg-accent" : "h-8 text-[13px]",
        active && "bg-accent",
        picked && "text-green-800"
      )}
    >
      {name}
      <Check
        className={cn("h-4 w-4 shrink-0 text-green-600", !picked && "invisible")}
        aria-hidden
      />
    </div>
  );
});

/**
 * The rows a search shows, none when nothing it shows can be picked, and
 * where each starts (`tops`, by `rowTops`). Each row knows its place in the
 * list (`at`) and, if it can be picked, among the rows that can (`place`,
 * from 1). Picking changes only the rows' `picked`, so the list keeps its
 * scroll.
 */
function useRows(
  { options, allowParents, selected }: Omit<ListProps, "onToggle">,
  query: string,
  touch: boolean
) {
  const shown = React.useMemo(() => {
    const matches = searchOptions(options, query);
    let place = 0;
    const rows = options
      .map((option, index) => ({ option, index }))
      .filter(({ index }) => matches.has(index))
      .map(({ option, index }, at) => {
        const pickable = !option.parent || allowParents;
        if (pickable) place += 1;
        return { index, at, option, pickable, place };
      });
    return place > 0 ? rows : [];
  }, [options, allowParents, query]);
  const tops = React.useMemo(() => rowTops(shown, touch), [shown, touch]);
  const rows = React.useMemo(() => {
    const picked = new Set(selected);
    return shown.map((row) => ({ ...row, picked: picked.has(row.option.path) }));
  }, [shown, selected]);
  return [rows, tops] as const;
}

// The list's own padding, above its first row (p-1)
const LIST_PADDING = 4;
// Rendered past each edge of the list's view, so a quick scroll doesn't outrun the rows
const OVERSCAN = 400;

/**
 * Where each row starts in the list, and after the last, where it ends. The
 * heights are the rows' own: h-8 with a mouse; h-11 for an item a finger can
 * pick, h-9 for a parent it can't.
 */
function rowTops(rows: { pickable: boolean }[], touch: boolean) {
  const tops = [0];
  rows.forEach((row, i) => tops.push(tops[i] + (!touch ? 32 : row.pickable ? 44 : 36)));
  return tops;
}

/**
 * The rows to draw, [start, end), for the list's scroll and size, kept up as
 * it scrolls and resizes; and `measure`, to update them straight after
 * scrolling it by code.
 */
function useWindow(ref: React.RefObject<HTMLElement>, tops: number[]) {
  const [range, setRange] = React.useState<[number, number]>([0, 0]);
  const measure = React.useCallback(() => {
    const box = ref.current;
    if (!box) return;
    const top = box.scrollTop - LIST_PADDING - OVERSCAN;
    const bottom = box.scrollTop - LIST_PADDING + box.clientHeight + OVERSCAN;
    const next: [number, number] = [
      rowAt(tops, top),
      Math.min(tops.length - 1, rowAt(tops, bottom) + 1),
    ];
    setRange((current) => (current[0] === next[0] && current[1] === next[1] ? current : next));
  }, [ref, tops]);
  // Before paint, so the list never shows a frame without its rows
  React.useLayoutEffect(() => {
    const box = ref.current;
    measure();
    if (!box) return;
    box.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(box);
    return () => {
      box.removeEventListener("scroll", measure);
      resize.disconnect();
    };
  }, [ref, measure]);
  const [start, end] = range;
  return [Math.min(start, tops.length - 1), Math.min(end, tops.length - 1), measure] as const;
}

/** The row at a height in the list: the last whose top is at or above it */
function rowAt(tops: number[], y: number) {
  let low = 0;
  let high = tops.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (tops[mid] <= y) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * Keeps an open drawer above the iOS keyboard. iOS doesn't shrink the page for
 * it, so the drawer is lifted and sized to the visible area, its search at the
 * top and its list ending at the keyboard. Set on the element directly, as the
 * keyboard moves, without a render.
 */
function useKeyboardFit(ref: React.RefObject<HTMLElement>, active: boolean) {
  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const inset = window.innerHeight - viewport.height - viewport.offsetTop;
      // Under 80px is browser chrome moving, not a keyboard
      const keyboard = inset > 80;
      el.style.bottom = keyboard ? `${inset}px` : "";
      el.style.height = keyboard ? `${viewport.height - 8}px` : "";
    };
    fit();
    viewport.addEventListener("resize", fit);
    viewport.addEventListener("scroll", fit);
    return () => {
      viewport.removeEventListener("resize", fit);
      viewport.removeEventListener("scroll", fit);
    };
  }, [ref, active]);
}

/** A name with the searched letters in bold */
function Name({ name, query }: { name: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const at = needle ? name.toLowerCase().indexOf(needle) : -1;
  if (at === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, at)}
      <b className="font-semibold">{name.slice(at, at + needle.length)}</b>
      {name.slice(at + needle.length)}
    </>
  );
}
