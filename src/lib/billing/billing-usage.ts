export type BillingUsageMetrics = {
  usagePercent: number;
  isAtLimit: boolean;
  remaining: number;
};

/** Derives billing UI metrics; safe when studyLimit is 0 (no division by zero). */
export function getBillingUsageMetrics(studyCount: number, studyLimit: number): BillingUsageMetrics {
  if (studyLimit > 0) {
    const usagePercent = Math.min(Math.round((studyCount / studyLimit) * 100), 100);
    const isAtLimit = studyCount >= studyLimit;
    const remaining = Math.max(studyLimit - studyCount, 0);
    return { usagePercent, isAtLimit, remaining };
  }

  // Limit 0 means no capacity (matches canCreateStudy / server action), even when studyCount is 0.
  return {
    usagePercent: studyCount > 0 ? 100 : 0,
    isAtLimit: true,
    remaining: 0,
  };
}
