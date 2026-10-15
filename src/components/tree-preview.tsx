"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TreeNode } from "@/lib/types/tree-test";
import { cn } from "@/lib/utils";
import { pathOf, treePathRule } from "@/lib/treetest/path-rule";
import { Button } from "@/components/ui/button";

interface TreeNodeWithExpanded extends TreeNode {
  isExpanded?: boolean;
  children?: TreeNodeWithExpanded[];
}

interface TreePreviewProps {
  nodes: TreeNode[];
  className?: string;
  /** The study's "Allow non-leaf nodes as answers" setting (tasks tab) */
  allowNonLeafAnswers?: boolean;
  /** Custom label for the non-leaf "Select" button (messages tab) */
  selectAsAnswerText?: string;
}

/** The tree as participants click through it in the test, for trying it out from setup */
export function TreePreview({
  nodes,
  className,
  allowNonLeafAnswers = false,
  selectAsAnswerText,
}: TreePreviewProps) {
  const [selectedLink, setSelectedLink] = useState<string>();
  // Initialize all nodes as expanded
  const initializeExpandedTree = useCallback((nodes: TreeNode[]): TreeNodeWithExpanded[] => {
    return nodes.map((node) => ({
      ...node,
      isExpanded: true,
      children: node.children ? initializeExpandedTree(node.children) : undefined,
    }));
  }, []);

  const [treeState, setTreeState] = useState<TreeNodeWithExpanded[]>(initializeExpandedTree(nodes));
  const pathRule = useMemo(() => treePathRule(nodes), [nodes]);

  // Update tree state when nodes prop changes (e.g., after parsing)
  useEffect(() => {
    setTreeState(initializeExpandedTree(nodes));
  }, [nodes, initializeExpandedTree]);

  const expandAll = () => {
    const expandAllNodes = (nodes: TreeNodeWithExpanded[]): TreeNodeWithExpanded[] => {
      return nodes.map((node) => ({
        ...node,
        isExpanded: true,
        children: node.children ? expandAllNodes(node.children) : undefined,
      }));
    };
    setTreeState(expandAllNodes(treeState));
  };

  const collapseAll = () => {
    const hasSingleRoot = treeState.length === 1;

    if (hasSingleRoot) {
      // For single root, keep root expanded but collapse its children
      const collapseChildrenOnly = (nodes: TreeNodeWithExpanded[]): TreeNodeWithExpanded[] => {
        return nodes.map((node, index) => {
          if (index === 0) {
            // Keep root expanded, but collapse all children recursively
            const collapseRecursive = (
              children: TreeNodeWithExpanded[]
            ): TreeNodeWithExpanded[] => {
              return children.map((child) => ({
                ...child,
                isExpanded: false,
                children: child.children ? collapseRecursive(child.children) : undefined,
              }));
            };
            return {
              ...node,
              isExpanded: true, // Keep root expanded
              children: node.children ? collapseRecursive(node.children) : undefined,
            };
          }
          return {
            ...node,
            isExpanded: false,
            children: node.children ? collapseChildrenOnly(node.children) : undefined,
          };
        });
      };
      setTreeState(collapseChildrenOnly(treeState));
    } else {
      // For multiple roots, collapse everything
      const collapseAllNodes = (nodes: TreeNodeWithExpanded[]): TreeNodeWithExpanded[] => {
        return nodes.map((node) => ({
          ...node,
          isExpanded: false,
          children: node.children ? collapseAllNodes(node.children) : undefined,
        }));
      };
      setTreeState(collapseAllNodes(treeState));
    }
  };

  // As the test does it (tree-test.tsx): clear the selection and close the other branches
  const toggleExpand = (path: TreeNodeWithExpanded[]) => {
    setSelectedLink(undefined);

    // Convert path to string array for tree-test logic
    const pathNames = path.map((node) => node.name);

    setTreeState((prevState) => {
      const newState = [...prevState];

      // Helper function to update expansion states (from tree-test.tsx)
      const updateExpansion = (
        items: TreeNodeWithExpanded[],
        currentPath: string[]
      ): TreeNodeWithExpanded[] => {
        return items.map((item) => {
          if (!item.children) return item;

          const isTargetPath = currentPath[0] === item.name;

          if (isTargetPath) {
            // If this is the target item
            if (currentPath.length === 1) {
              // Close all other branches at this level
              const otherItemsClosed = items.map((otherItem) => ({
                ...otherItem,
                isExpanded: otherItem.name === item.name ? !item.isExpanded : false,
                children: otherItem.children ? updateExpansion(otherItem.children, []) : undefined,
              }));
              return otherItemsClosed.find((i) => i.name === item.name)!;
            } else {
              // Continue down the path
              return {
                ...item,
                isExpanded: true,
                children: updateExpansion(item.children, currentPath.slice(1)),
              };
            }
          }

          // Close this branch if it's not in the path
          return {
            ...item,
            isExpanded: false,
            children: item.children ? updateExpansion(item.children, []) : undefined,
          };
        });
      };

      return updateExpansion(newState, pathNames);
    });
  };

  const handleLinkClick = (link: string) => setSelectedLink(link);

  const handleSelectNonLeaf = (currentPath: TreeNodeWithExpanded[]) => {
    setSelectedLink(
      pathOf(
        currentPath.map((n) => n.name),
        pathRule
      )
    );
  };

  const renderNodes = (
    nodes: TreeNodeWithExpanded[],
    parentPath: TreeNodeWithExpanded[] = [],
    level: number = 0
  ) => {
    return nodes.map((node, index) => {
      const currentPath = [...parentPath, node];
      const hasChildren = node.children && node.children.length > 0;

      const nodeLink = pathOf(
        currentPath.map((n) => n.name),
        pathRule
      );

      return (
        <div key={`${node.name}-${level}-${index}`} className={level > 0 ? "ml-4" : ""}>
          {hasChildren ? (
            <div className="mb-2">
              {allowNonLeafAnswers ? (
                // Mirrors the participant UI (tree-test.tsx): label toggle, then "Select"
                // revealed on hover/focus or when expanded, then chevron flush right
                <div
                  className={cn(
                    "group flex w-full items-center rounded transition-colors duration-200",
                    nodeLink === selectedLink
                      ? "border border-green-700 bg-[#e6f3d8]"
                      : "bg-gray-200 [@media(hover:hover)]:hover:bg-gray-300"
                  )}
                >
                  <button
                    onClick={() => toggleExpand(currentPath)}
                    className="flex min-w-0 flex-1 items-center px-3 py-2 text-sm"
                    aria-expanded={node.isExpanded}
                  >
                    <span className="relative min-w-0 flex-1 text-left">
                      <span
                        className={cn(
                          // Mobile: button is always visible, so always fade.
                          // Desktop (sm+): fade only while the button is revealed.
                          "block truncate text-gray-900 [mask-image:linear-gradient(to_right,black_70%,transparent_100%)]",
                          !(node.isExpanded || nodeLink === selectedLink) &&
                            "sm:[mask-image:none] sm:group-focus-within:[mask-image:linear-gradient(to_right,black_70%,transparent_100%)] sm:[@media(hover:hover)]:group-hover:[mask-image:linear-gradient(to_right,black_70%,transparent_100%)]"
                        )}
                      >
                        {node.name}
                      </span>
                    </span>
                  </button>
                  <div
                    className={cn(
                      "shrink-0 opacity-100 transition-opacity duration-150",
                      !(node.isExpanded || nodeLink === selectedLink) &&
                        "sm:opacity-0 sm:group-focus-within:opacity-100 sm:[@media(hover:hover)]:group-hover:opacity-100"
                    )}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      className={cn(
                        "text-xs",
                        nodeLink === selectedLink
                          ? "bg-[#72FFA4] text-black [@media(hover:hover)]:hover:bg-[#00D9C2]"
                          : "bg-gray-300 [@media(hover:hover)]:hover:bg-[#72FFA4] [@media(hover:hover)]:hover:text-black"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectNonLeaf(currentPath);
                      }}
                    >
                      {selectAsAnswerText || "Select"}
                    </Button>
                  </div>
                  <button
                    onClick={() => toggleExpand(currentPath)}
                    className="shrink-0 py-2 pl-2 pr-3"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    {node.isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => toggleExpand(currentPath)}
                  className="flex w-full items-center justify-between rounded bg-gray-200 px-3 py-2 text-sm transition-colors duration-200 [@media(hover:hover)]:hover:bg-gray-300"
                  aria-expanded={node.isExpanded}
                >
                  <span className="text-left text-gray-900">{node.name}</span>
                  {node.isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              )}
              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  node.isExpanded ? "mt-2 grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  {node.children && renderNodes(node.children, currentPath, level + 1)}
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "mb-2 flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm transition-colors duration-200",
                selectedLink === node.link
                  ? "border border-green-700 bg-[#e6f3d8]"
                  : "bg-gray-200 [@media(hover:hover)]:hover:bg-gray-300"
              )}
              onClick={() => handleLinkClick(node.link || "")}
            >
              <span className="text-gray-900">{node.name}</span>
              {selectedLink === node.link && (
                <button className="rounded bg-[#72FFA4] px-2 py-1 text-xs text-black [@media(hover:hover)]:hover:bg-[#00D9C2]">
                  I&apos;d find it here
                </button>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  if (nodes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        <p>No tree structure to preview</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs">
          Collapse All
        </Button>
      </div>
      <div className="space-y-2">{renderNodes(treeState)}</div>
    </div>
  );
}
