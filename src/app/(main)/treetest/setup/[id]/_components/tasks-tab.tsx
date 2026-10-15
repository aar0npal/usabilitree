"use client";

import * as React from "react";
import { ArrowUp, Check, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StudyFormData } from "@/lib/types/tree-test";
import { SETUP_TOUR_STEP_IDS } from "@/lib/constants";
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
  onChange: (data: StudyFormData) => void;
}

const SHOWN = { height: "auto", opacity: 1 };
const HIDDEN = { height: 0, opacity: 0 };

export function TasksTab({ data, studyId, status, onChange }: TasksTabProps) {
  // Tasks can be added and removed only before launch; answers and wording stay editable
  const draft = status === "draft";
  const items = data.tasks.items;
  const allowParents = data.tasks.allowNonLeafAnswers ?? false;
  const keys = useTaskKeys(items.length);
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const reduce = useReducedMotion();
  // The form as of this render, for an Undo clicked after later edits
  const latest = React.useRef(data);
  latest.current = data;

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

  const deleteTask = (index: number) => {
    const removed = items[index];
    keys.remove(index);
    setTasks({ items: items.filter((_, i) => i !== index) });
    toast(`Deleted task ${index + 1}`, {
      action: {
        label: "Undo",
        onClick: () => {
          const current = latest.current;
          const at = Math.min(index, current.tasks.items.length);
          keys.insert(at);
          onChange({
            ...current,
            tasks: {
              ...current.tasks,
              items: [
                ...current.tasks.items.slice(0, at),
                removed,
                ...current.tasks.items.slice(at),
              ],
            },
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
            <div className="-mb-3">
              <AnimatePresence initial={false} presenceAffectsLayout={false}>
                {items.map((task, index) => (
                  <motion.div
                    key={keys.list[index]}
                    initial={HIDDEN}
                    animate={SHOWN}
                    exit={HIDDEN}
                    transition={
                      reduce ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.8, 0.25, 1] }
                    }
                    className="overflow-hidden"
                  >
                    <TaskCard
                      number={index + 1}
                      task={task}
                      draft={draft}
                      options={options}
                      answerByPath={answerByPath}
                      allowParents={allowParents}
                      takeFocus={keys.list[index] === focusKey}
                      onChange={(patch) => updateTask(index, patch)}
                      onDelete={() => deleteTask(index)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
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
  options: AnswerOption[];
  answerByPath: Map<string, AnswerOption>;
  allowParents: boolean;
  /** A task just added: its field takes the focus */
  takeFocus: boolean;
  onChange: (patch: Partial<Task>) => void;
  onDelete: () => void;
}

function TaskCard({
  number,
  task,
  draft,
  options,
  answerByPath,
  allowParents,
  takeFocus,
  onChange,
  onDelete,
}: TaskCardProps) {
  const addAnswer = React.useRef<HTMLButtonElement>(null);
  const answers = splitAnswers(task.answer);
  const toggle = (path: string) => onChange({ answer: toggleAnswer(task.answer, path) });

  return (
    <div className="mb-3 rounded-lg border bg-background p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-neutral-600"
          aria-hidden
        >
          {number}
        </span>
        <QuestionField
          id={`task-${number - 1}`}
          aria-label={`Task ${number}`}
          value={task.description}
          takeFocus={takeFocus}
          onChange={(description) => onChange({ description })}
          onEnter={() => addAnswer.current?.focus()}
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
  ...props
}: {
  id: string;
  "aria-label": string;
  value: string;
  takeFocus: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
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
        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
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
  };
}
