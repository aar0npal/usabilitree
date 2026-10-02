import type { TreeNode } from "@/lib/types/tree-test";

/**
 * DFS-collect every leaf `link` from a parsed tree. Exposed separately from
 * the resolver so callers that match many pathTaken strings against the same
 * tree (e.g. recalculateStudyResults, saveStudyData) can hoist this O(nodes)
 * walk out of their per-result loop.
 */
export function collectValidLinks(tree: TreeNode[]): string[] {
  const validLinks: string[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.link) {
        validLinks.push(node.link);
      }
      if (node.children) {
        walk(node.children);
      }
    }
  };
  walk(tree);
  return validLinks;
}

/**
 * Produce the length-desc, lexicographic-tie-broken copy of `validLinks` that
 * `resolveSelectedLink` expects. Exposed so hot loops can precompute once and
 * pass the sorted list into every resolver call.
 *
 * The lexicographic tie-breaker matters: `Array.prototype.sort` is stable, so
 * without it same-length links would keep their DFS collection order — which
 * means reordering siblings in the tree could still flip which candidate wins
 * in the ambiguous-fallback path.
 */
export function sortValidLinks(validLinks: string[]): string[] {
  return [...validLinks].sort((a, b) => {
    const lengthDifference = b.length - a.length;
    return lengthDifference !== 0 ? lengthDifference : a.localeCompare(b);
  });
}

/**
 * Resolve the leaf a participant most likely selected by matching their
 * accumulated pathTaken string against the study's valid leaf links. Expects
 * `sortedLinks` to have been produced by `sortValidLinks` — the canonical
 * length-desc + lexicographic-tie-broken ordering is load-bearing for the
 * fallback's determinism.
 */
export function resolveSelectedLink(sortedLinks: string[], pathTaken: string): string | null {
  // First: check if pathTaken ends with a valid link (uses full path context to
  // avoid mismatches when different branches have nodes with the same name).
  // Because sortedLinks is length-desc the longest (most specific) match wins.
  for (const link of sortedLinks) {
    if (pathTaken.endsWith(link)) {
      return link;
    }
  }

  // Second: handle truncated paths from the updatePathTaken bug where parent
  // and child share the same sanitized name (e.g., pathTaken = "a/b" when the
  // actual selection was "a/b/b"). Check if repeating the last segment matches.
  const lastSegment = pathTaken.split("/").filter(Boolean).pop();
  if (lastSegment) {
    const withRepeated = `${pathTaken}/${lastSegment}`;
    for (const link of sortedLinks) {
      if (withRepeated.endsWith(link)) {
        return link;
      }
    }
  }

  // Third: multi-segment suffix matching for backtracking users.
  // When a participant navigates through multiple branches before selecting a leaf,
  // pathTaken accumulates segments from every branch visited (e.g. the user went
  // through "support" before landing on "about-us/contact-us", so pathTaken becomes
  // "/home/support/about-us/contact-us" while selectedLink is "/home/about-us/contact-us").
  // The simple endsWith() check above fails in this case because the extra branch segments
  // sit between the root prefix and the correct suffix.
  //
  // Fix: progressively build longer trailing suffixes of pathTaken (1 segment, 2, 3 …)
  // and check how many valid links end with each suffix. The first suffix length that
  // produces exactly one match unambiguously identifies the selected node.
  //
  // If every suffix length is ambiguous (e.g. two sibling leaves share the exact
  // same name at every ancestor level — extremely rare), return the first candidate
  // from the smallest ambiguous set seen so far (tracked in lastResortMatch below)
  // rather than returning null. Because we filter from `sortedLinks`, that first
  // candidate is the longest (most specific) match at that suffix level with a
  // lexicographic tie-breaker — not whatever happens to come first in tree order.
  const segments = pathTaken.split("/").filter(Boolean);
  let lastResortMatch: string | null = null;
  let currentBestMatchCount = Infinity;
  for (let numSegments = 1; numSegments <= segments.length; numSegments++) {
    const suffix = "/" + segments.slice(segments.length - numSegments).join("/");
    const matches = sortedLinks.filter((link) => link.endsWith(suffix));
    if (matches.length === 1) {
      return matches[0];
    }
    if (matches.length === 0) {
      // A longer suffix won't match either — stop early.
      break;
    }
    // Multiple matches: track the most specific (smallest) ambiguous set seen so far
    // so the fallback reflects the longest suffix that still matched something, rather
    // than the first (least-specific) ambiguous set.
    if (lastResortMatch === null || matches.length < currentBestMatchCount) {
      lastResortMatch = matches[0];
      currentBestMatchCount = matches.length;
    }
  }

  return lastResortMatch;
}

/** The leaf a stored result ended on: the recorded selection, or the best match for older rows. */
export function resultDestination(
  result: { selectedLink: string | null; pathTaken: string },
  sortedLinks: string[]
): string | null {
  return result.selectedLink ?? resolveSelectedLink(sortedLinks, result.pathTaken);
}
