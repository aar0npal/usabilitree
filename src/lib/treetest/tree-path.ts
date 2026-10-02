// Tree paths ("/home/news/latest") compared by whole segments, so "/news" never matches
// "/newsletter".

function pathSegments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Whether `path` begins with every segment of `prefix`. */
export function pathStartsWith(path: string, prefix: string): boolean {
  const segments = pathSegments(path);
  const prefixSegments = pathSegments(prefix);
  return (
    prefixSegments.length <= segments.length &&
    prefixSegments.every((segment, i) => segments[i] === segment)
  );
}

/** Whether `path` contains the segments of `part` as a consecutive run, anywhere. */
export function pathIncludes(path: string, part: string): boolean {
  const segments = pathSegments(path);
  const partSegments = pathSegments(part);
  for (let start = 0; start + partSegments.length <= segments.length; start++) {
    if (partSegments.every((segment, i) => segments[start + i] === segment)) return true;
  }
  return false;
}
