"use client";

import * as React from "react";
import { Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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

/**
 * The tree, to pick a task's answers from. It opens as a popover by its
 * button, or as a drawer on a phone, where there's no room beside it. It stays
 * open while answers are picked, since a task can have several.
 */
export function AnswerPicker({ taskNumber, children, ...list }: AnswerPickerProps) {
  const [open, setOpen] = React.useState(false);
  const wide = useMediaQuery("(min-width: 640px)");
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
    <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="h-[85dvh]">
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

function PickerList({
  options,
  allowParents,
  selected,
  onToggle,
  onDone,
  touch = false,
}: Omit<AnswerPickerProps, "taskNumber" | "children"> & { onDone?: () => void; touch?: boolean }) {
  const [query, setQuery] = React.useState("");
  const shown = React.useMemo(() => searchOptions(options, query), [options, query]);
  const picked = new Set(selected);
  const pickable = (option: AnswerOption) => !option.parent || allowParents;
  const anyShown = options.some((option, index) => shown.has(index) && pickable(option));

  return (
    // The list is filtered here, so a match keeps the parents above it; cmdk only moves the highlight
    <Command shouldFilter={false} loop className="min-h-0 flex-1 rounded-none">
      <div className="flex items-center gap-1 border-b pr-2 [&>[cmdk-input-wrapper]]:flex-1 [&>[cmdk-input-wrapper]]:border-b-0">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search the tree"
          aria-label="Search the tree"
          className={cn(touch && "h-11 text-base")}
        />
        {onDone && (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2" onClick={onDone}>
            <CheckCheck className="h-3.5 w-3.5" aria-hidden />
            Done
          </Button>
        )}
      </div>
      <CommandList
        className={cn("p-1", touch ? "max-h-none flex-1 pb-6" : "max-h-[min(340px,50vh)]")}
      >
        {!anyShown && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {options.length === 0
              ? "Add your tree on the Tree tab first."
              : `No items match “${query.trim()}”.`}
          </p>
        )}
        {anyShown &&
          options.map((option, index) => {
            if (!shown.has(index)) return null;
            const indent = { paddingLeft: 8 + option.level * 14 };
            if (!pickable(option)) {
              return (
                <div
                  key={index}
                  role="presentation"
                  style={indent}
                  className={cn(
                    "flex items-center pr-2 text-[13px] text-muted-foreground",
                    // Not tappable, so a label's height, not a target's
                    touch ? "h-9" : "h-8"
                  )}
                >
                  <span className="truncate">
                    <Name name={option.name} query={query} />
                  </span>
                </div>
              );
            }
            const on = picked.has(option.path);
            return (
              <CommandItem
                key={index}
                value={String(index)}
                onSelect={() => onToggle(option.path)}
                aria-checked={on}
                style={indent}
                className={cn(
                  "cursor-pointer gap-2 pr-2",
                  // A touch has no highlight to move with keys, so none shows until a row is pressed
                  touch
                    ? "h-11 text-[15px] active:bg-accent data-[selected=true]:bg-transparent"
                    : "h-8 text-[13px]",
                  on && "text-green-800 data-[selected=true]:text-green-800"
                )}
              >
                <span className="min-w-0 flex-1 truncate">
                  <Name name={option.name} query={query} />
                </span>
                <Check className={cn("h-4 w-4 text-green-600", !on && "invisible")} aria-hidden />
              </CommandItem>
            );
          })}
      </CommandList>
    </Command>
  );
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
