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
 * be answers and Enter picks one; a finger taps them. The list fills in, and
 * follows the search, in background renders, so a long tree never holds up
 * the popover opening or a keystroke.
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
  // The first render shows the search alone; the items follow straight after
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    React.startTransition(() => setReady(true));
  }, []);
  const rows = useRows({ options, allowParents, selected }, search, ready);
  const pickable = rows.filter((row) => row.pickable);
  const [active, setActive] = React.useState(0);
  const activeIndex = pickable[Math.min(active, pickable.length - 1)]?.index;
  const list = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => setActive(0), [search]);
  // The rows get handlers that never change, so picking or hovering one re-renders only the rows it changes
  const latest = React.useRef({ pickable, onToggle });
  latest.current = { pickable, onToggle };
  const toggle = React.useCallback((path: string) => latest.current.onToggle(path), []);
  const hover = React.useCallback((index: number) => {
    const at = latest.current.pickable.findIndex((row) => row.index === index);
    if (at !== -1) setActive(at);
  }, []);

  // Keeps the active row in view inside the list, never by scrolling the page
  React.useEffect(() => {
    const box = list.current;
    const row = box?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!box || !row || touch) return;
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop - 4;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 4;
  }, [activeIndex, touch]);

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
        {!ready ? null : rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {options.length === 0
              ? "Add your tree on the Tree tab first."
              : `No items match “${search.trim()}”.`}
          </p>
        ) : (
          rows.map(({ index, option, pickable: canPick, picked }) => (
            <PickerRow
              key={index}
              id={`${id}-${index}`}
              index={index}
              option={option}
              query={search}
              pickable={canPick}
              picked={picked}
              active={!touch && index === activeIndex}
              touch={touch}
              onToggle={toggle}
              onHover={touch ? undefined : hover}
            />
          ))
        )}
      </div>
    </div>
  );
}

/** One item: an answer to pick, or a parent shown only to say where its items sit */
const PickerRow = React.memo(function PickerRow({
  id,
  index,
  option,
  query,
  pickable,
  picked,
  active,
  touch,
  onToggle,
  onHover,
}: {
  id: string;
  index: number;
  option: AnswerOption;
  query: string;
  pickable: boolean;
  picked: boolean;
  active: boolean;
  touch: boolean;
  onToggle: (path: string) => void;
  onHover?: (index: number) => void;
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
      data-index={index}
      onClick={() => onToggle(option.path)}
      // The search keeps the focus, so the arrow keys carry on after a click
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={onHover ? () => !active && onHover(index) : undefined}
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

/** The rows a search shows; none when nothing it shows can be picked */
function useRows(
  { options, allowParents, selected }: Omit<ListProps, "onToggle">,
  query: string,
  ready: boolean
) {
  return React.useMemo(() => {
    if (!ready) return [];
    const shown = searchOptions(options, query);
    const picked = new Set(selected);
    const rows = options
      .map((option, index) => ({
        index,
        option,
        pickable: !option.parent || allowParents,
        picked: picked.has(option.path),
      }))
      .filter(({ index }) => shown.has(index));
    return rows.some((row) => row.pickable) ? rows : [];
  }, [options, allowParents, selected, query, ready]);
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
