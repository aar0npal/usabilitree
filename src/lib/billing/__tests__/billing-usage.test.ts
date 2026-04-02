import { describe, it, expect } from "vitest";
import { getBillingUsageMetrics } from "../billing-usage";

describe("getBillingUsageMetrics", () => {
  it("computes percent and remaining when studyLimit is positive", () => {
    expect(getBillingUsageMetrics(1, 3)).toEqual({
      usagePercent: 33,
      isAtLimit: false,
      remaining: 2,
    });
    expect(getBillingUsageMetrics(3, 3)).toEqual({
      usagePercent: 100,
      isAtLimit: true,
      remaining: 0,
    });
  });

  it("caps usage percent at 100", () => {
    expect(getBillingUsageMetrics(10, 3).usagePercent).toBe(100);
  });

  it("avoids division by zero when studyLimit is 0", () => {
    expect(getBillingUsageMetrics(0, 0)).toEqual({
      usagePercent: 0,
      isAtLimit: false,
      remaining: 0,
    });
    expect(getBillingUsageMetrics(2, 0)).toEqual({
      usagePercent: 100,
      isAtLimit: true,
      remaining: 0,
    });
    const m = getBillingUsageMetrics(1, 0);
    expect(Number.isFinite(m.usagePercent)).toBe(true);
    expect(Number.isNaN(m.usagePercent)).toBe(false);
  });
});
