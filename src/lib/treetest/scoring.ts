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
