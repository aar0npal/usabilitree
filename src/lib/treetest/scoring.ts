import { resultDestination } from "./selected-link";

/** Splits a task's stored answer into its accepted paths, as the participant UI always has. */
export function parseAcceptedAnswers(expectedAnswer: string): string[] {
  return expectedAnswer.split(",").map((answer) => answer.trim());
}

/**
 * Scores a new answer from what the participant did, never from the browser's verdict.
 * A null selection is a skip. A selection is direct when the path taken is exactly the
 * selected link; a skip is direct when no path was recorded.
 */
export function scoreSubmission(
  expectedAnswer: string,
  submission: { pathTaken: string; selectedLink: string | null }
): { successful: boolean; directPathTaken: boolean } {
  if (submission.selectedLink === null) {
    return { successful: false, directPathTaken: submission.pathTaken === "" };
  }
  return {
    successful: parseAcceptedAnswers(expectedAnswer).includes(submission.selectedLink),
    directPathTaken: submission.selectedLink === submission.pathTaken,
  };
}

/**
 * Re-scores a stored result against new accepted answers. Returns null for skipped results,
 * which stay unsuccessful whatever the answers become.
 */
export function rescoreResult(
  result: { skipped: boolean; selectedLink: string | null; pathTaken: string },
  acceptedAnswers: string[],
  sortedLinks: string[]
): boolean | null {
  if (result.skipped) return null;
  const destination = resultDestination(result, sortedLinks);
  return destination ? acceptedAnswers.includes(destination) : false;
}
