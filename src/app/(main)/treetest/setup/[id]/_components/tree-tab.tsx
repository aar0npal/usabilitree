"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TreeNode, StudyFormData } from "@/lib/types/tree-test";
import { sanitizeTreeTestLink } from "@/lib/utils";
import { InfoCircledIcon } from "@/components/icons";
import { TreePreview } from "@/components/tree-preview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp } from "lucide-react";
import * as Sentry from "@sentry/react";
import { SETUP_TOUR_STEP_IDS } from "@/lib/constants";

interface TreeTabProps {
  data: StudyFormData;
  onChange: (data: StudyFormData) => void;
}

export function TreeTab({ data, onChange }: TreeTabProps) {
  const [error, setError] = React.useState<string>("");

  const parseQuotedString = (str: string): string => {
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1);
    }
    return str;
  };

  const validateLine = (
    line: string,
    lineNumber: number,
    prevLevel: number
  ): { isValid: boolean; level: number; error?: string } => {
    const commas = line.match(/^,*/)?.[0].length || 0;

    if (line.trim().endsWith(",")) {
      return {
        isValid: false,
        level: commas,
        error: `Line ${lineNumber}: Extra comma(s) at the end of the line`,
      };
    }

    if (commas > prevLevel + 1) {
      return {
        isValid: false,
        level: commas,
        error: `Line ${lineNumber}: Skipped level (missing parent menu). Found level ${commas} after level ${prevLevel}`,
      };
    }

    return { isValid: true, level: commas };
  };

  const buildTreeStructure = (lines: string[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const stack: { node: TreeNode; level: number; path: string }[] = [];
    const lineNodes: { node: TreeNode; level: number; path: string }[] = [];
    let prevLevel = 0;

    // First pass: create all nodes without links
    lines.forEach((line, index) => {
      if (!line.trim()) return;

      const validation = validateLine(line, index + 1, prevLevel);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const level = validation.level;
      const name = parseQuotedString(line.slice(level).trim());
      const node: TreeNode = { name };

      // Clean up stack for current level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      // Calculate the current path
      const parentPath = stack.length > 0 ? stack[stack.length - 1].path : "";
      const currentPath = `${parentPath}/${sanitizeTreeTestLink(name)}`;

      if (level === 0) {
        root.push(node);
        stack.push({ node, level, path: `/${sanitizeTreeTestLink(name)}` });
      } else if (stack.length > 0) {
        const parent = stack[stack.length - 1].node;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        stack.push({ node, level, path: currentPath });
      }

      lineNodes.push({ node, level, path: currentPath });
      prevLevel = level;
    });

    // Second pass: identify leaf nodes and add links with full paths
    lineNodes.forEach(({ node, path }) => {
      const isLeaf = !node.children || node.children.length === 0;
      if (isLeaf) {
        node.link = path;
      }
    });

    return root;
  };

  const handleParse = () => {
    try {
      setError("");

      if (!data.tree.structure.trim()) {
        setError("Tree structure cannot be empty");
        toast.error("Tree structure cannot be empty");
        return;
      }

      const lines = data.tree.structure
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/"/g, "")); // Remove quotes

      const parsedTree = buildTreeStructure(lines);

      onChange({
        ...data,
        tree: {
          ...data.tree,
          parsed: parsedTree,
        },
      });

      toast.success("Tree structure parsed successfully");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      Sentry.captureException(error);
    }
  };

  return (
    <div id={SETUP_TOUR_STEP_IDS.TREE} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="tree-structure">Tree Structure</Label>
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
                  <strong>Unique leaf names:</strong> Each final item (leaf node) should have a
                  unique name. Duplicate names may cause incorrect results when updating correct
                  answers.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Textarea
          id="tree-structure"
          value={data.tree.structure}
          onChange={(e) =>
            onChange({
              ...data,
              tree: { ...data.tree, structure: e.target.value },
            })
          }
          placeholder={`Enter tree structure (use commas for next level)\nExample:\nHome - City of Manila\n,Services\n,,Business Permits\n,,Health Services\n,About Us`}
          className="min-h-[300px] font-mono"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleParse}>Parse Structure</Button>

      {data.tree.parsed.length > 0 && (
        <div className="space-y-2">
          <Label>Interactive Tree Preview</Label>
          <TreePreview
            nodes={data.tree.parsed}
            allowNonLeafAnswers={data.tasks.allowNonLeafAnswers ?? false}
            selectAsAnswerText={data.customText.selectAsAnswer}
            onAllowNonLeafAnswersChange={(checked) =>
              onChange({ ...data, tasks: { ...data.tasks, allowNonLeafAnswers: checked } })
            }
          />
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
        </div>
      )}
    </div>
  );
}
