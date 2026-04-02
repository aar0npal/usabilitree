export const STUDIES_PER_PURCHASE = 5;
/** Matches DB and env default for new users. */
export const DEFAULT_STUDY_LIMIT = 3;

/**
 * Returns the new study limit after a single purchase.
 * Pure function — no side effects. The actual DB update is done in the webhook handler.
 */
export function incrementStudyLimit(current: number): number {
  return current + STUDIES_PER_PURCHASE;
}

/** Returns true when the user has capacity to create another study. */
export function canCreateStudy(studyCount: number, studyLimit: number): boolean {
  return studyCount < studyLimit;
}

/**
 * Returns true when creating another study would exceed the user quota (server-side guard).
 * When studyLimit is 0, creation is always blocked.
 */
export function isStudyCreationBlocked(studyCount: number, studyLimit: number): boolean {
  return !canCreateStudy(studyCount, studyLimit);
}
