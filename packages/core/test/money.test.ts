import { describe, expect, it } from "vitest";
import { fromCents, isPositive, MoneyError, toCents } from "../src/money.js";

describe("money", () => {
  it("converts safe integer cents to BigInt and back", () => {
    expect(toCents(100)).toBe(100n);
    expect(fromCents(100n)).toBe(100);
    expect(fromCents(toCents(12_345))).toBe(12_345);
  });

  it("rejects non-safe-integer cents", () => {
    expect(() => toCents(1.5)).toThrow(MoneyError);
    expect(() => toCents(Number.MAX_SAFE_INTEGER + 2)).toThrow(MoneyError);
  });

  it("rejects BigInt values outside safe integer range on conversion back", () => {
    expect(() => fromCents(9_007_199_254_740_992n)).toThrow(MoneyError);
  });

  it("validates positive amounts", () => {
    expect(isPositive(1)).toBe(true);
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-5)).toBe(false);
    expect(isPositive(2.5)).toBe(false);
  });
});
