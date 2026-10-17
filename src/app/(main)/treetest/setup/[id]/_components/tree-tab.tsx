"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TreeNode, StudyFormData } from "@/lib/types/tree-test";
import { InfoCircledIcon } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp } from "lucide-react";
import { SETUP_TOUR_STEP_IDS } from "@/lib/constants";
import {
  pathChanges,
  rowsFromTree,
  rowsToSave,
  structureFromRows,
  treeFromRows,
  type OutlineRow,
} from "@/lib/treetest/tree-outline";
import { editorPathRule } from "@/lib/treetest/path-rule";
import { carryAnswers } from "@/lib/treetest/task-answers";
import { TreeEditor } from "./tree-editor";

interface TreeTabProps {
  data: StudyFormData;
  status: string;
  onChange: (data: StudyFormData) => void;
}

export function TreeTab({ data, status, onChange }: TreeTabProps) {
  const [rows, setRows] = React.useState<OutlineRow[]>(() => rowsFromTree(data.tree.parsed));
  // The tree this tab last saved into the form, to tell its own edits from a tree loaded or copied in
  const emitted = React.useRef<TreeNode[]>(data.tree.parsed);

  React.useEffect(() => {
    if (data.tree.parsed === emitted.current) return;
    emitted.current = data.tree.parsed;
    setRows(rowsFromTree(data.tree.parsed));
  }, [data.tree.parsed]);

  const pathRule = React.useMemo(
    () => editorPathRule(data.tree.parsed, status),
    [data.tree.parsed, status]
  );

  const handleRowsChange = (next: OutlineRow[]) => {
    // A draft's answers follow their items when they're renamed or moved. A launched study's stay
    // put: its participants' answers were recorded against the old paths
    const changes =
      status === "draft" ? pathChanges(rows, next, pathRule) : new Map<string, string>();
    setRows(next);
    const saved = rowsToSave(next);
    const parsed = treeFromRows(saved, pathRule);
    emitted.current = parsed;
    const tasks =
      changes.size === 0
        ? data.tasks
        : {
            ...data.tasks,
            items: data.tasks.items.map((task) => ({
              ...task,
              answer: carryAnswers(task.answer, changes),
            })),
          };
    onChange({ ...data, tree: { structure: structureFromRows(saved), parsed }, tasks });
  };

  // Long trees get a way back up
  const long = rowsToSave(rows).length > 15;
  // Comma text saved without a tree built from it
  const unparsedText =
    data.tree.parsed.length === 0 && data.tree.structure.trim() ? data.tree.structure : undefined;

  return (
    <div id={SETUP_TOUR_STEP_IDS.TREE} className="space-y-4">
      <Accordion type="single" collapsible className="rounded-lg border bg-background px-4">
        <AccordionItem value="notes" className="border-b-0">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium">
              <InfoCircledIcon className="h-4 w-4" />
              Important Notes
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">
            <ul className="list-disc space-y-2 pl-4">
              <li>
                <strong>Single root behavior:</strong> If you want automatic expansion of the root
                level (like Optimal Workshop), create exactly one top-level item. Multiple root
                items will start collapsed.
              </li>
              <li>
                <strong>Unique leaf names:</strong> Each final item (leaf node) should have a unique
                name. Duplicate names may cause incorrect results when updating correct answers.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <TreeEditor
        rows={rows}
        onRowsChange={handleRowsChange}
        pathRule={pathRule}
        allowNonLeafAnswers={data.tasks.allowNonLeafAnswers ?? false}
        unparsedText={unparsedText}
        selectAsAnswerText={data.customText.selectAsAnswer}
      />

      {long && (
        <div className="flex justify-end">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                >
                  <ArrowUp className="h-4 w-4" />
                  Back to top
                </Button>
              </TooltipTrigger>
              <TooltipContent>Scroll to top of page</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
