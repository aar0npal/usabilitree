import { describe, it, expect } from "vitest";
import { parseOptionalNonNegativeInt } from "../parse-env-int";

describe("parseOptionalNonNegativeInt", () => {
  it("returns undefined for undefined", () => {
    expect(parseOptionalNonNegativeInt(undefined)).toBeUndefined();
  });

  it("returns undefined for empty or whitespace", () => {
    expect(parseOptionalNonNegativeInt("")).toBeUndefined();
    expect(parseOptionalNonNegativeInt("   ")).toBeUndefined();
  });

  it("returns undefined for invalid values so Zod default can apply", () => {
    expect(parseOptionalNonNegativeInt("abc")).toBeUndefined();
    expect(parseOptionalNonNegativeInt("12.5")).toBeUndefined();
  });

  it("parses valid non-negative integers", () => {
    expect(parseOptionalNonNegativeInt("0")).toBe(0);
    expect(parseOptionalNonNegativeInt("7")).toBe(7);
  });
});
