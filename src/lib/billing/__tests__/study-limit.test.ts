import { describe, it, expect } from "vitest";
import {
  incrementStudyLimit,
  canCreateStudy,
  isStudyCreationBlocked,
  STUDIES_PER_PURCHASE,
  DEFAULT_STUDY_LIMIT,
} from "../study-limit";

describe("incrementStudyLimit", () => {
  it("adds STUDIES_PER_PURCHASE to the current limit", () => {
    expect(incrementStudyLimit(DEFAULT_STUDY_LIMIT)).toBe(
      DEFAULT_STUDY_LIMIT + STUDIES_PER_PURCHASE
    );
  });

  it("is stackable — each call adds another pack", () => {
    expect(incrementStudyLimit(incrementStudyLimit(DEFAULT_STUDY_LIMIT))).toBe(
      DEFAULT_STUDY_LIMIT + 2 * STUDIES_PER_PURCHASE
    );
  });

  it("works from zero", () => {
    expect(incrementStudyLimit(0)).toBe(STUDIES_PER_PURCHASE);
  });

  it("always increments by exactly STUDIES_PER_PURCHASE", () => {
    const before = 17;
    expect(incrementStudyLimit(before)).toBe(before + STUDIES_PER_PURCHASE);
  });
});

describe("canCreateStudy", () => {
  it("returns true when count is below limit", () => {
    expect(canCreateStudy(2, 3)).toBe(true);
  });

  it("returns false when count equals limit", () => {
    expect(canCreateStudy(3, 3)).toBe(false);
  });

  it("returns false when count exceeds limit", () => {
    expect(canCreateStudy(5, 3)).toBe(false);
  });

  it("returns true immediately after a purchase increases the limit", () => {
    const count = 3;
    const oldLimit = 3;
    const newLimit = incrementStudyLimit(oldLimit);
    expect(canCreateStudy(count, newLimit)).toBe(true);
  });

  it("treats limit 0 as no capacity", () => {
    expect(canCreateStudy(0, 0)).toBe(false);
    expect(isStudyCreationBlocked(0, 0)).toBe(true);
  });
});

describe("isStudyCreationBlocked", () => {
  it("mirrors negation of canCreateStudy", () => {
    expect(isStudyCreationBlocked(0, 5)).toBe(false);
    expect(isStudyCreationBlocked(5, 5)).toBe(true);
  });
});
