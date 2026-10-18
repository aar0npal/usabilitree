"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Item } from "@/lib/types/tree-test";
import { pathSegment, treePathRule } from "@/lib/treetest/path-rule";
import { isTreePathOpen, toggleTreePath } from "@/lib/treetest/navigation-state";
import { cn } from "@/lib/utils";

interface NavigationProps {
  items: Item[];
  onSelect: (link: string) => void;
  resetKey: number;
  setPathTaken: Dispatch<SetStateAction<string>>;
  allowNonLeafAnswers: boolean;
  customText: {
    findItHere: string;
    selectAsAnswer: string;
  };
}

export const Navigation = ({
  items,
  onSelect,
  resetKey,
  setPathTaken,
  allowNonLeafAnswers,
  customText,
}: NavigationProps) => {
  const [openPath, setOpenPath] = useState<number[]>(items.length === 1 ? [0] : []);
  const [selectedKey, setSelectedKey] = useState<string>();
  // Keep click paths compatible with this study's saved leaf links.
  const pathRule = useMemo(() => treePathRule(items), [items]);
  const segment = (name: string) => pathSegment(name, pathRule);

  useEffect(() => {
    const singleRoot = items.length === 1;
    const initialRootLink = singleRoot ? "/" + pathSegment(items[0].name, pathRule) : "";

    setOpenPath(items.length === 1 ? [0] : []);
    setSelectedKey(undefined);
    setPathTaken(initialRootLink);
  }, [resetKey, items, pathRule, setPathTaken]);

  const appendPath = (prev: string, name: string) => {
    const step = segment(name);
    const newPath = `${prev}/${step}`;
    // Prevent duplicate when toggling the same folder repeatedly
    return prev.endsWith(`/${step}`) ? prev : newPath;
  };

  const toggleExpand = (path: string[], indexPath: number[]) => {
    setSelectedKey(undefined);
    setOpenPath((prev) => toggleTreePath(prev, indexPath));

    setPathTaken((prev) => appendPath(prev, path[path.length - 1]));
  };

  const handleLinkClick = (key: string, name: string) => {
    setSelectedKey(key);
    // Always append for leaf clicks - a leaf can share a name with its parent folder
    setPathTaken((prev) => `${prev}/${segment(name)}`);
  };

  const handleSelectNonLeaf = (currentPath: string[], key: string) => {
    const nodeLink = "/" + currentPath.map(segment).join("/");
    setSelectedKey(key);
    // Use the dedupe-aware append so expand-then-select doesn't double-append the segment
    setPathTaken((prev) => appendPath(prev, currentPath[currentPath.length - 1]));
    onSelect(nodeLink);
  };

  const renderItems = (items: Item[], parentPath: string[] = [], parentIndexes: number[] = []) => {
    return items.map((item, index) => {
      const currentPath = [...parentPath, item.name];
      const indexPath = [...parentIndexes, index];
      const key = indexPath.join(".");
      const isExpanded = isTreePathOpen(openPath, indexPath);
      const isSelected = selectedKey === key;

      return (
        <div key={key} className={`${parentPath.length ? "ml-4" : ""} mb-2`}>
          {item.children?.length ? (
            <div>
              {allowNonLeafAnswers ? (
                // When non-leaf answers are enabled: split row into toggle + reveal button.
                // The outer div is the visual container; toggle is a flex-1 button so the
                // expand/collapse affordance keeps its full natural click area.
                <div
                  className={cn(
                    "group flex w-full items-center rounded transition-colors duration-200",
                    isSelected
                      ? "border border-green-700 bg-[#e6f3d8]"
                      : "bg-gray-200 [@media(hover:hover)]:hover:bg-gray-300"
                  )}
                >
                  {/* Toggle button — expands/collapses; takes all remaining space */}
                  <button
                    onClick={() => toggleExpand(currentPath, indexPath)}
                    className="flex min-w-0 flex-1 items-center px-3 py-2 text-sm"
                    aria-expanded={isExpanded}
                  >
                    {/* Label with gradient fade before the reveal button */}
                    <span className="relative min-w-0 flex-1 text-left">
                      <span
                        className={cn(
                          // Mobile: button is always visible, so always fade.
                          // Desktop (sm+): fade only while the button is revealed.
                          "block truncate [mask-image:linear-gradient(to_right,black_70%,transparent_100%)]",
                          !(isExpanded || isSelected) &&
                            "sm:[mask-image:none] sm:group-focus-within:[mask-image:linear-gradient(to_right,black_70%,transparent_100%)] sm:[@media(hover:hover)]:group-hover:[mask-image:linear-gradient(to_right,black_70%,transparent_100%)]"
                        )}
                      >
                        {item.name}
                      </span>
                    </span>
                  </button>

                  {/* "Select as answer" button — sits before the chevron so the chevron stays
                      flush right like every other row. Always visible on mobile (focus-based
                      reveal is unreliable on touch); on sm+ revealed on hover/focus or when
                      expanded/selected. */}
                  <div
                    className={cn(
                      "shrink-0 opacity-100 transition-opacity duration-150",
                      !(isExpanded || isSelected) &&
                        "sm:opacity-0 sm:group-focus-within:opacity-100 sm:[@media(hover:hover)]:group-hover:opacity-100"
                    )}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      className={cn(
                        "text-xs",
                        isSelected
                          ? "bg-[#72FFA4] text-black [@media(hover:hover)]:hover:bg-[#00D9C2]"
                          : "bg-gray-300 [@media(hover:hover)]:hover:bg-[#72FFA4] [@media(hover:hover)]:hover:text-black"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectNonLeaf(currentPath, key);
                      }}
                    >
                      {customText.selectAsAnswer}
                    </Button>
                  </div>

                  {/* Chevron toggle — duplicate convenience target; the label button is the
                      accessible one, so hide this from keyboard and screen readers */}
                  <button
                    onClick={() => toggleExpand(currentPath, indexPath)}
                    className="shrink-0 py-2 pl-2 pr-3"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : (
                // Default: single expand/collapse button, no answer selection
                <button
                  onClick={() => toggleExpand(currentPath, indexPath)}
                  className="flex w-full items-center justify-between rounded bg-gray-200 px-3 py-2 text-sm transition-colors duration-200 [@media(hover:hover)]:hover:bg-gray-300"
                  aria-expanded={isExpanded}
                >
                  <span>{item.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {isExpanded && (
                <div className="mt-2">{renderItems(item.children, currentPath, indexPath)}</div>
              )}
            </div>
          ) : (
            <div
              className={`my-1 flex items-center justify-between rounded p-2 transition-colors duration-200 ${
                isSelected
                  ? "border border-green-700 bg-[#e6f3d8]"
                  : "bg-gray-200 [@media(hover:hover)]:hover:bg-gray-300"
              }`}
              onClick={() => handleLinkClick(key, item.name)}
            >
              <span className="text-sm">{item.name}</span>
              {isSelected && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-[#72FFA4] text-black [@media(hover:hover)]:hover:bg-[#00D9C2]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(item.link ?? "");
                  }}
                >
                  {customText.findItHere}
                </Button>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return <div className="mt-4">{renderItems(items)}</div>;
};
