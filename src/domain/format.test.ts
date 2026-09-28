import { describe, expect, it } from "vitest";
import { formatPoints } from "./format";

describe("formatPoints", () => {
  it("prints whole numbers and quarter points without trailing zeros", () => {
    expect(formatPoints(0)).toBe("0");
    expect(formatPoints(1)).toBe("1");
    expect(formatPoints(0.25)).toBe("0.25");
    expect(formatPoints(0.5)).toBe("0.5");
    expect(formatPoints(0.75)).toBe("0.75");
    expect(formatPoints(23.5)).toBe("23.5");
    expect(formatPoints(23.75)).toBe("23.75");
  });
});
