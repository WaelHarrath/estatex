import { describe, expect, it } from "vitest";
import { extendedEnd, isEnded, minimumNextBid, shouldExtend } from "../src/services/auction-rules.js";

describe("minimumNextBid", () => {
  it("adds the increment to the current price", () => {
    expect(minimumNextBid(720_000_00, 10_000_00)).toBe(730_000_00);
  });
});

describe("anti-sniping extension", () => {
  const endAt = new Date("2026-08-05T12:00:00Z");

  it("does not extend when outside the window", () => {
    const now = new Date("2026-08-05T11:50:00Z");
    expect(shouldExtend(now, endAt, 30)).toBe(false);
    expect(extendedEnd(now, endAt, 30)).toEqual({ extended: false, newEndAt: endAt });
  });

  it("extends when a bid lands inside the window", () => {
    const now = new Date("2026-08-05T11:59:40Z"); // 20s before end, window 30s
    const result = extendedEnd(now, endAt, 30);
    expect(result.extended).toBe(true);
    expect(result.newEndAt.toISOString()).toBe("2026-08-05T12:00:10.000Z");
  });

  it("extends when a bid lands exactly on the boundary", () => {
    const now = new Date("2026-08-05T11:59:30Z");
    expect(shouldExtend(now, endAt, 30)).toBe(true);
  });
});

describe("isEnded", () => {
  it("is false before the end time and true at/after it", () => {
    expect(isEnded(new Date("2026-08-05T11:59:59Z"), new Date("2026-08-05T12:00:00Z"))).toBe(false);
    expect(isEnded(new Date("2026-08-05T12:00:00Z"), new Date("2026-08-05T12:00:00Z"))).toBe(true);
  });
});
