"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Check, GripVertical, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StudyFormData } from "@/lib/types/tree-test";
import { SETUP_TOUR_STEP_IDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { usePointerDrag, type DragPoint } from "@/lib/hooks/use-pointer-drag";
import { treePathRule } from "@/lib/treetest/path-rule";
import {
  answerOptions,
  splitAnswers,
  toggleAnswer,
  type AnswerOption,
} from "@/lib/treetest/task-answers";
import { AnswerPicker } from "./answer-picker";
import { CopyTasksDialog } from "./copy-tasks-dialog";

type Task = StudyFormData["tasks"]["items"][number];

interface TasksTabProps {
  data: StudyFormData;
  studyId: string;
  status: string;
  /** The form's setter; an Undo passes it an update, to apply to the form as it is by then */
  onChange: React.Dispatch<React.SetStateAction<StudyFormData>>;
}

const SHOWN = { height: "auto", opacity: 1 };
const HIDDEN = { height: 0, opacity: 0 };

/** A task being dragged: where it was picked up, and the cards it can land between */
interface DragSession {
  key: string;
  /** The other cards, in page coordinates */
  others: { key: string; top: number; bottom: number }[];
  listTop: number;
  grabY: number;
  left: number;
  width: number;
  transform: string;
  /** The card it would land before; null for the end */
  before: string | null;
}

export function TasksTab({ data, studyId, status, onChange }: TasksTabProps) {
  // Tasks can be added and removed only before launch; answers and wording stay editable
  const draft = status === "draft";
  const items = data.tasks.items;
  const allowParents = data.tasks.allowNonLeafAnswers ?? false;
  const keys = useTaskKeys(items.length);
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const reduce = useReducedMotion();
  const coarse = useMediaQuery("(pointer: coarse)");
  // A task being dragged, and the line where it would land
  const [dragging, setDragging] = React.useState<{ key: string; number: number } | null>(null);
  const session = React.useRef<DragSession | null>(null);
  const cards = React.useRef(new Map<string, HTMLDivElement>());
  const listRef = React.useRef<HTMLDivElement>(null);
  // Moved straight on the elements, so dragging re-renders nothing until the drop
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const lineRef = React.useRef<HTMLDivElement>(null);
  // The task list as of this render, so an Undo puts its card's key where the task returns
  const latest = React.useRef(items);
  latest.current = items;

  const options = React.useMemo(
    () => answerOptions(data.tree.parsed, treePathRule(data.tree.parsed)),
    [data.tree.parsed]
  );
  // The answers a participant can give, by path: every leaf, and parents when they're allowed
  const answerByPath = React.useMemo(() => {
    const byPath = new Map<string, AnswerOption>();
    for (const option of options) {
      if ((!option.parent || allowParents) && !byPath.has(option.path))
        byPath.set(option.path, option);
    }
    return byPath;
  }, [options, allowParents]);

  const setTasks = (patch: Partial<StudyFormData["tasks"]>) =>
    onChange({ ...data, tasks: { ...data.tasks, ...patch } });

  const updateTask = (index: number, patch: Partial<Task>) =>
    setTasks({ items: items.map((task, i) => (i === index ? { ...task, ...patch } : task)) });

  const addTask = () => {
    setFocusKey(keys.insert(items.length));
    setTasks({ items: [...items, { description: "", answer: "" }] });
  };

  /** Moves a task, its key with it, so its card glides to its new place */
  const moveTask = (from: number, to: number) => {
    if (to < 0 || to >= items.length || to === from) return;
    keys.move(from, to);
    const next = [...items];
    next.splice(to, 0, ...next.splice(from, 1));
    setTasks({ items: next });
  };

  // Reordering by dragging: by the number with a mouse, by a long-press on a touch screen.
  // Only before launch, as a launched study's results are matched to its tasks by position

  const startMove = (key: string, point: DragPoint) => {
    const el = cards.current.get(key);
    const list = listRef.current;
    if (!el || !list) return;
    const scrollY = window.scrollY;
    const box = el.getBoundingClientRect();
    session.current = {
      key,
      others: keys.list.flatMap((other) => {
        const card = other === key ? null : cards.current.get(other)?.getBoundingClientRect();
        return card ? [{ key: other, top: card.top + scrollY, bottom: card.bottom + scrollY }] : [];
      }),
      listTop: list.getBoundingClientRect().top + scrollY,
      grabY: point.y - box.top,
      left: box.left,
      width: box.width,
      transform: "",
      before: null,
    };
    setDragging({ key, number: keys.list.indexOf(key) + 1 });
    followMove(point);
  };

  const followMove = (point: DragPoint) => {
    const info = session.current;
    if (!info) return;
    const y = point.y + window.scrollY;
    const at = info.others.findIndex((other) => (other.top + other.bottom) / 2 > y);
    const below = at === -1 ? undefined : info.others[at];
    const above = at === -1 ? info.others[info.others.length - 1] : info.others[at - 1];
    info.before = below?.key ?? null;
    // In the gap just under the card above (cards sit 12px apart). Not midway to the card below:
    // the dragged card stays in place, faded, and may sit between the two
    const line = (above ? above.bottom + 6 : (below?.top ?? info.listTop) - 6) - info.listTop;
    if (lineRef.current) {
      lineRef.current.style.top = `${line - 1}px`;
      lineRef.current.style.opacity = "1";
    }
    info.transform = `translate3d(${info.left}px, ${point.y - info.grabY}px, 0) scale(1.02)`;
    if (ghostRef.current) ghostRef.current.style.transform = info.transform;
  };

  const endMove = () => {
    session.current = null;
    setDragging(null);
  };

  const dropMove = () => {
    const info = session.current;
    endMove();
    if (!info) return;
    const from = keys.list.indexOf(info.key);
    const rest = keys.list.filter((key) => key !== info.key);
    const to = info.before === null ? rest.length : rest.indexOf(info.before);
    if (from !== -1 && to !== -1) moveTask(from, to);
  };

  const drag = usePointerDrag<string>({
    onStart: startMove,
    onMove: followMove,
    onDrop: dropMove,
    onCancel: endMove,
  });

  const deleteTask = (index: number) => {
    const removed = items[index];
    keys.remove(index);
    setTasks({ items: items.filter((_, i) => i !== index) });
    toast(`Deleted task ${index + 1}`, {
      action: {
        label: "Undo",
        // Puts the task back into the form as it is now, touching only the task list, so edits
        // made since, here or on another tab, stay. It works even after you leave this tab
        onClick: () => {
          keys.insert(Math.min(index, latest.current.length));
          onChange((form) => {
            const list = form.tasks.items;
            const at = Math.min(index, list.length);
            return {
              ...form,
              tasks: { ...form.tasks, items: [...list.slice(0, at), removed, ...list.slice(at)] },
            };
          });
        },
      },
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <div id={SETUP_TOUR_STEP_IDS.TASKS} data-tasks-editor className="space-y-4">
          {/* On a phone the switches take their own row under the label */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Label className="basis-full sm:mr-auto sm:basis-auto">Tasks</Label>
            <Setting
              id="randomize-tasks"
              label="Randomize order"
              hint="Each participant gets the tasks in a different order."
              checked={data.tasks.randomizeTasks ?? false}
              onCheckedChange={(randomizeTasks) => setTasks({ randomizeTasks })}
            />
            <Setting
              id="allow-non-leaf-answers"
              label={
                <>
                  <span className="sm:hidden">Parent answers</span>
                  <span className="hidden sm:inline">Allow parent answers</span>
                </>
              }
              hint="Items with others under them can be correct answers too, not only the items at the end of a branch."
              checked={allowParents}
              onCheckedChange={(allowNonLeafAnswers) => setTasks({ allowNonLeafAnswers })}
            />
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-10 text-center">
              <p className="text-sm font-semibold">No tasks yet</p>
              <p className="mt-1 text-balance text-[13px] text-muted-foreground">
                Each task asks participants to find something, and its answer is the item in your
                tree where they should find it.
              </p>
            </div>
          ) : (
            // Each card's gap below it is its margin, inside the clip, so it closes with the height
            <div ref={listRef} className="relative -mb-3">
              {dragging && (
                <div
                  ref={lineRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-blue-500 opacity-0"
                />
              )}
              <AnimatePresence initial={false} presenceAffectsLayout={false}>
                {items.map((task, index) => {
                  const key = keys.list[index];
                  return (
                    <motion.div
                      key={key}
                      ref={(el: HTMLDivElement | null) => {
                        if (el) cards.current.set(key, el);
                        else cards.current.delete(key);
                      }}
                      initial={HIDDEN}
                      animate={SHOWN}
                      exit={HIDDEN}
                      // Reordered cards glide to their places
                      layout="position"
                      transition={
                        reduce ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.8, 0.25, 1] }
                      }
                      className="overflow-hidden"
                    >
                      <TaskCard
                        number={index + 1}
                        task={task}
                        draft={draft}
                        coarse={coarse}
                        dragged={dragging?.key === key}
                        options={options}
                        answerByPath={answerByPath}
                        allowParents={allowParents}
                        takeFocus={key === focusKey}
                        onChange={(patch) => updateTask(index, patch)}
                        onDelete={() => deleteTask(index)}
                        onGrab={(event) => drag.fromHandle(event, key)}
                        onPress={(event) => {
                          // The field and buttons keep their own long-press (selecting text, tapping)
                          if ((event.target as Element).closest("textarea, button, input, a"))
                            return;
                          drag.fromPress(event, key);
                        }}
                        onShift={(by) => moveTask(index, index + by)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* The dragged task, lifted, following the pointer */}
          {dragging &&
            createPortal(
              <div
                ref={ghostRef}
                aria-hidden
                className="pointer-events-none fixed left-0 top-0 z-[60] flex items-start gap-3 rounded-lg border bg-background p-3 shadow-lg sm:p-4"
                style={{ width: session.current?.width, transform: session.current?.transform }}
              >
                <span className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-neutral-600">
                  {dragging.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-base font-medium leading-6 sm:text-sm sm:leading-6">
                  {items[dragging.number - 1]?.description || "Untitled task"}
                </span>
              </div>,
              document.body
            )}

          {draft && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={addTask}>
                <Plus className="h-4 w-4" aria-hidden />
                Add task
              </Button>
              <CopyTasksDialog
                studyId={studyId}
                onCopyTasks={(copied) => setTasks({ items: [...items, ...copied] })}
              />
              {items.length > 3 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Back to top"
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to top</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}

interface TaskCardProps {
  number: number;
  task: Task;
  draft: boolean;
  coarse: boolean;
  /** Being dragged: it stays faint in place until it lands */
  dragged: boolean;
  options: AnswerOption[];
  answerByPath: Map<string, AnswerOption>;
  allowParents: boolean;
  /** A task just added: its field takes the focus */
  takeFocus: boolean;
  onChange: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onGrab: (event: React.PointerEvent) => void;
  onPress: (event: React.TouchEvent) => void;
  /** ⌥↑ / ⌥↓ in the question: moves the task one place */
  onShift: (by: 1 | -1) => void;
}

function TaskCard({
  number,
  task,
  draft,
  coarse,
  dragged,
  options,
  answerByPath,
  allowParents,
  takeFocus,
  onChange,
  onDelete,
  onGrab,
  onPress,
  onShift,
}: TaskCardProps) {
  const addAnswer = React.useRef<HTMLButtonElement>(null);
  const answers = splitAnswers(task.answer);
  const toggle = (path: string) => onChange({ answer: toggleAnswer(task.answer, path) });
  const touchDrag = draft && coarse;

  return (
    <div
      onTouchStart={touchDrag ? onPress : undefined}
      // A long-press lifts the card, so it opens no menu, selects no text and shows no iOS callout
      onContextMenu={touchDrag ? (event) => event.preventDefault() : undefined}
      className={cn(
        "group/card mb-3 rounded-lg border bg-background p-3 transition-opacity duration-200 motion-reduce:transition-none sm:p-4",
        touchDrag && "select-none [-webkit-touch-callout:none]",
        dragged && "opacity-40"
      )}
    >
      <div className="flex items-start gap-3">
        {draft && !coarse ? (
          // The number is the handle: on hover it turns into a grip
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Drag to move task ${number}`}
            onPointerDown={onGrab}
            className="mt-px grid h-[22px] w-[22px] shrink-0 cursor-grab place-items-center rounded-full bg-muted text-xs font-semibold text-neutral-600 active:cursor-grabbing"
          >
            <span className="group-hover/card:hidden">{number}</span>
            <GripVertical className="hidden h-3.5 w-3.5 group-hover/card:block" aria-hidden />
          </button>
        ) : (
          <span
            className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-neutral-600"
            aria-hidden
          >
            {number}
          </span>
        )}
        <QuestionField
          id={`task-${number - 1}`}
          aria-label={`Task ${number}`}
          value={task.description}
          takeFocus={takeFocus}
          onChange={(description) => onChange({ description })}
          onEnter={() => addAnswer.current?.focus()}
          onShift={draft ? onShift : undefined}
        />
        {draft && (
          <Button
            variant="ghost"
            size="icon"
            className="-my-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Delete task ${number}`}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-[34px]">
        {answers.map((path) => {
          const option = answerByPath.get(path);
          return option ? (
            <AnswerChip key={path} option={option} onRemove={() => toggle(path)} />
          ) : (
            <StaleChip key={path} path={path} onRemove={() => toggle(path)} />
          );
        })}
        <AnswerPicker
          taskNumber={number}
          options={options}
          allowParents={allowParents}
          selected={answers}
          onToggle={toggle}
        >
          <Button
            ref={addAnswer}
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[13px] text-muted-foreground"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add answer
          </Button>
        </AnswerPicker>
      </div>

      {task.description.trim() && answers.length === 0 && (
        <p className="mt-2 text-[13px] text-red-600 sm:pl-[34px]">
          Add the item participants should find, so this task can be scored.
        </p>
      )}
    </div>
  );
}

/** An answer, named as the participant sees it, with the items above it */
function AnswerChip({ option, onRemove }: { option: AnswerOption; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-md border border-green-200 bg-green-50 pl-2 pr-0.5 text-[13px] text-green-800">
      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {/* The name keeps its width and the trail takes what's left; a name too long for the chip
          stops short of the icon, the gaps and the remove button (56px) */}
      <span className="max-w-[calc(100%-56px)] shrink-0 truncate font-medium">{option.name}</span>
      {option.trail.length > 0 && (
        <span className="min-w-0 truncate text-green-700/75">{option.trail.join(" › ")}</span>
      )}
      <ChipRemove label={`Remove answer ${option.name}`} onClick={onRemove} />
    </span>
  );
}

/** An answer no participant can give: its item left the tree, or it's a parent while parents aren't answers */
function StaleChip({ path, onRemove }: { path: string; onRemove: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 pl-2 pr-0.5 text-[13px] text-amber-900">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-label="Not in the tree" />
          <span className="min-w-0 truncate">{path}</span>
          <ChipRemove label={`Remove answer ${path}`} onClick={onRemove} />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        No item in the tree has this path, or it&apos;s a parent while parent answers are off.
        Remove it and add the answer again.
      </TooltipContent>
    </Tooltip>
  );
}

function ChipRemove({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-6 w-6 shrink-0 place-items-center rounded opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100"
    >
      <X className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** The task's wording, edited in place. It grows with its text; Enter moves on to its answers */
function QuestionField({
  value,
  takeFocus,
  onChange,
  onEnter,
  onShift,
  ...props
}: {
  id: string;
  "aria-label": string;
  value: string;
  takeFocus: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
  onShift?: (by: 1 | -1) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fit = React.useCallback(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "0px";
    field.style.height = `${field.scrollHeight}px`;
  }, []);
  React.useLayoutEffect(fit, [value, fit]);
  // A narrower card wraps the text onto more lines
  React.useEffect(() => {
    const row = ref.current?.parentElement;
    if (!row) return;
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [fit]);
  React.useEffect(() => {
    if (takeFocus) ref.current?.focus();
  }, [takeFocus]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder="What should participants find?"
      onChange={(event) => onChange(event.target.value.replace(/\s*\n\s*/g, " "))}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (onShift && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
          event.preventDefault();
          onShift(event.key === "ArrowUp" ? -1 : 1);
          return;
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        onEnter();
      }}
      className="-mx-2 -my-0.5 min-w-0 flex-1 resize-none overflow-hidden rounded-md bg-transparent px-2 py-0.5 text-base font-medium leading-6 outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground hover:bg-muted/60 focus:bg-background focus:ring-1 focus:ring-ring sm:text-sm sm:leading-6"
      {...props}
    />
  );
}

/** A compact switch for the header line, with a tooltip saying what it does */
function Setting({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: React.ReactNode;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Label
          htmlFor={id}
          className="flex cursor-pointer items-center gap-2 text-[13px] font-normal text-muted-foreground"
        >
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
          />
          {label}
        </Label>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{hint}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Keys that follow each task through adds and deletes (tasks have no ids), so
 * the right card animates out. Tasks loaded or copied in get new keys.
 */
function useTaskKeys(count: number) {
  const state = React.useRef({ list: [] as string[], next: 0 });
  const make = () => `task-${(state.current.next += 1)}`;
  const { list } = state.current;
  if (list.length > count) list.length = count;
  while (list.length < count) list.push(make());
  return {
    list,
    insert: (at: number) => {
      const key = make();
      list.splice(at, 0, key);
      return key;
    },
    remove: (at: number) => {
      list.splice(at, 1);
    },
    move: (from: number, to: number) => {
      list.splice(to, 0, ...list.splice(from, 1));
    },
  };
}
