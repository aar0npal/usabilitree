import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StudyFormData, TreeNode } from "@/lib/types/tree-test";
import { sanitizeTreeTestLink } from "@/lib/utils";
import { PlusIcon, TrashIcon, CheckIcon } from "@/components/icons";
import { ArrowUp } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CopyTasksDialog } from "./copy-tasks-dialog";
import { SETUP_TOUR_STEP_IDS } from "@/lib/constants";

interface TasksTabProps {
  data: StudyFormData;
  studyId: string;
  status: string;
  onChange: (data: StudyFormData) => void;
}

export function TasksTab({ data, studyId, status, onChange }: TasksTabProps) {
  const [openPopover, setOpenPopover] = useState<number | null>(null);
  const [validationResults, setValidationResults] = useState<
    Record<number, { valid: string[]; invalid: string[]; missing: boolean } | null>
  >({});

  // Recursive function to get all available paths from the tree.
  // Uses sanitizeTreeTestLink (same as tree-tab.tsx) so paths are byte-identical
  // to what the participant flow produces.
  const getAllPaths = (nodes: TreeNode[], parentPath = ""): string[] => {
    let paths: string[] = [];
    nodes.forEach((node) => {
      const currentPath = `${parentPath}/${sanitizeTreeTestLink(node.name)}`;
      if (node.link) {
        paths.push(node.link);
      } else if (data.tasks.allowNonLeafAnswers) {
        // Non-leaf: generate the path the same way tree-tab.tsx does for leaves
        paths.push(currentPath);
      }
      if (node.children) {
        paths = [...paths, ...getAllPaths(node.children, currentPath)];
      }
    });
    return paths;
  };

  const availablePaths = getAllPaths(data.tree.parsed);

  const addTask = () => {
    onChange({
      ...data,
      tasks: {
        ...data.tasks,
        items: [...data.tasks.items, { description: "", answer: "" }],
      },
    });
  };

  const deleteTask = (index: number) => {
    const newTasks = data.tasks.items.filter((_, i) => i !== index);
    onChange({
      ...data,
      tasks: { ...data.tasks, items: newTasks },
    });
  };

  const updateTask = (index: number, field: "description" | "answer", value: string) => {
    const newTasks = [...data.tasks.items];
    newTasks[index] = { ...newTasks[index], [field]: value };
    onChange({
      ...data,
      tasks: { ...data.tasks, items: newTasks },
    });

    // Clear validation results when answer changes
    if (field === "answer" && validationResults[index]) {
      setValidationResults((prev) => {
        const newResults = { ...prev };
        delete newResults[index];
        return newResults;
      });
    }
  };

  // Check membership against the already-computed availablePaths set (includes
  // non-leaf paths when allowNonLeafAnswers is on) so validation and picker agree.
  const checkPathInTree = (_nodes: TreeNode[], path: string): boolean => {
    return availablePaths.includes(path);
  };

  const validateAnswer = (index: number) => {
    const task = data.tasks.items[index];
    if (!task.answer) {
      setValidationResults((prev) => ({
        ...prev,
        [index]: { valid: [], invalid: [], missing: true },
      }));
      return;
    }

    const answerPaths = task.answer
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean);
    const validPaths: string[] = [];
    const invalidPaths: string[] = [];

    answerPaths.forEach((path) => {
      // Invalidate paths that don't start with /
      if (!path.startsWith("/")) {
        invalidPaths.push(path);
        return;
      }

      if (checkPathInTree(data.tree.parsed, path)) {
        validPaths.push(path);
      } else {
        invalidPaths.push(path);
      }
    });

    setValidationResults((prev) => ({
      ...prev,
      [index]: { valid: validPaths, invalid: invalidPaths, missing: false },
    }));
  };

  const toggleTaskAnswer = (index: number, path: string) => {
    const currentAnswers = data.tasks.items[index].answer
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    let newAnswers: string[];

    if (currentAnswers.includes(path)) {
      // Remove the path if it's already selected
      newAnswers = currentAnswers.filter((p) => p !== path);
    } else {
      // Add the path if it's not selected
      newAnswers = [...currentAnswers, path];
    }

    // Update the task with the new comma-separated answers
    updateTask(index, "answer", newAnswers.join(", "));
  };

  return (
    <div id={SETUP_TOUR_STEP_IDS.TASKS} className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <Switch
          id="randomize-tasks"
          checked={data.tasks.randomizeTasks ?? false}
          onCheckedChange={(checked) =>
            onChange({ ...data, tasks: { ...data.tasks, randomizeTasks: checked } })
          }
        />
        <Label htmlFor="randomize-tasks" className="cursor-pointer">
          Randomize task order for each participant
        </Label>
      </div>
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <Switch
          id="allow-non-leaf-answers"
          checked={data.tasks.allowNonLeafAnswers ?? false}
          onCheckedChange={(checked) =>
            onChange({ ...data, tasks: { ...data.tasks, allowNonLeafAnswers: checked } })
          }
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="allow-non-leaf-answers" className="cursor-pointer">
            Allow non-leaf (parent) nodes as answers
          </Label>
          <p className="text-xs text-muted-foreground">
            When on, parent category nodes can be set as correct answers for tasks.
          </p>
        </div>
      </div>
      {data.tasks.items.map((task, index) => (
        <div key={index} className="relative space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor={`task-${index}`} className="text-base font-medium">
              Task {index + 1}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/90"
              onClick={() => deleteTask(index)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`task-${index}`} className="text-sm text-muted-foreground">
              Description
            </Label>
            <Input
              id={`task-${index}`}
              value={task.description}
              onChange={(e) => updateTask(index, "description", e.target.value)}
              placeholder="Enter task description"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`answer-${index}`} className="text-sm text-muted-foreground">
                Correct Answer(s)
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 px-2 py-1 text-xs"
                onClick={() => validateAnswer(index)}
              >
                <CheckIcon className="h-3 w-3" /> Check
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              All paths must start with{" "}
              <code className="rounded bg-muted px-1 py-0.5">/</code>
              {data.tasks.allowNonLeafAnswers
                ? " and must exist in the tree (leaf or parent node, e.g., /home/products or /home)"
                : " and must be a leaf (final destination) in the tree (e.g., /home/products)"}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Popover
                open={openPopover === index}
                onOpenChange={(open) => setOpenPopover(open ? index : null)}
              >
                <PopoverTrigger asChild>
                  <div className="flex-1">
                    <Textarea
                      id={`answer-${index}`}
                      value={task.answer}
                      onChange={(e) => updateTask(index, "answer", e.target.value)}
                      placeholder="Enter paths (e.g., /home/products, /products)"
                      rows={2}
                      className={cn(
                        "w-full resize-none",
                        !task.answer && task.description?.trim()
                          ? "border-red-500 bg-red-50"
                          : !task.answer
                                .split(",")
                                .some((path) => availablePaths.includes(path.trim())) && task.answer
                            ? "border-yellow-500"
                            : ""
                      )}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search paths... (try typing page or section names)"
                      className="h-9"
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>
                        <div className="flex flex-col items-center gap-2 p-4 text-center">
                          <span className="text-muted-foreground">
                            No paths found matching your search
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Try searching for specific page or section names
                          </span>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading={`Available Paths (${availablePaths.length})`}>
                        {availablePaths
                          .sort((a, b) => {
                            // Sort by depth first (fewer slashes = higher priority)
                            const depthA = (a.match(/\//g) || []).length;
                            const depthB = (b.match(/\//g) || []).length;
                            if (depthA !== depthB) return depthA - depthB;
                            // Then alphabetically
                            return a.localeCompare(b);
                          })
                          .map((path) => {
                            const isSelected = task.answer
                              .split(",")
                              .map((p) => p.trim())
                              .includes(path);

                            return (
                              <CommandItem
                                key={path}
                                value={path}
                                className="flex items-center justify-between p-3 hover:bg-accent/50"
                                onSelect={() => {
                                  toggleTaskAnswer(index, path);
                                }}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  {isSelected && (
                                    <CheckIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
                                  )}
                                  <span
                                    className={cn(
                                      "break-all font-mono text-xs sm:text-sm",
                                      isSelected && "font-semibold text-green-700"
                                    )}
                                  >
                                    {path}
                                  </span>
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Validation Results */}
            {validationResults[index] && (
              <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                {validationResults[index]?.missing ? (
                  <div className="text-red-600">Please enter at least one answer path</div>
                ) : (
                  <div className="space-y-2">
                    {validationResults[index]?.valid &&
                      validationResults[index].valid.length > 0 && (
                        <div>
                          <div className="font-medium text-green-700">Valid paths:</div>
                          <ul className="ml-4 list-disc space-y-1">
                            {validationResults[index].valid.map((path, i) => (
                              <li key={i} className="font-mono text-green-600">
                                {path}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {validationResults[index]?.invalid &&
                      validationResults[index].invalid.length > 0 && (
                        <div>
                          <div className="font-medium text-red-700">
                            Invalid paths (not found in tree):
                          </div>
                          <ul className="ml-4 list-disc space-y-1">
                            {validationResults[index].invalid.map((path, i) => (
                              <li key={i} className="font-mono text-red-600">
                                {path}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {validationResults[index]?.valid &&
                      validationResults[index].valid.length > 0 &&
                      validationResults[index]?.invalid &&
                      validationResults[index].invalid.length === 0 && (
                        <div className="font-medium text-green-700">All paths are valid!</div>
                      )}
                  </div>
                )}
              </div>
            )}
            {!task.answer && task.description?.trim() && (
              <p className="text-sm text-red-600">
                This task needs a correct answer to be saved properly
              </p>
            )}
            {task.answer &&
              !task.answer.split(",").some((path) => availablePaths.includes(path.trim())) && (
                <p className="text-sm text-yellow-500">
                  Warning: None of the paths are in the tree structure
                </p>
              )}
          </div>
        </div>
      ))}

      {status === "draft" && (
        <div className="flex items-center gap-2">
          <Button onClick={addTask} variant="outline" className="gap-2">
            <PlusIcon className="h-4 w-4" /> Add Task
          </Button>
          <CopyTasksDialog
            studyId={studyId}
            onCopyTasks={(tasks) => {
              onChange({
                ...data,
                tasks: {
                  ...data.tasks,
                  items: [...data.tasks.items, ...tasks],
                },
              });
            }}
          />
          {/* Back to top button */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  size="icon"
                  variant="outline"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to top</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
