/** Positional paths keep same-named siblings distinct without changing saved answer links. */
export function isTreePathOpen(openPath: readonly number[], path: readonly number[]): boolean {
  return path.length <= openPath.length && path.every((index, depth) => openPath[depth] === index);
}

/** Only one branch stays open at each level. Closing a branch also closes its descendants. */
export function toggleTreePath(openPath: number[], path: number[]): number[] {
  return isTreePathOpen(openPath, path) ? path.slice(0, -1) : path;
}
