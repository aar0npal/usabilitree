/** For optional env-backed integers: empty/unset → undefined so Zod defaults apply; invalid → undefined. */
export function parseOptionalNonNegativeInt(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  return Number.parseInt(trimmed, 10);
}
