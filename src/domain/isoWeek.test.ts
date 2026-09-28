import { describe, expect, it } from "vitest";
import { compareWeekKeys, isoWeekKey, isWeekKey, shiftWeek, weekRange } from "./isoWeek";

describe("isoWeekKey", () => {
  it("maps the end of 2020 and the start of 2021 onto week 53", () => {
    expect(isoWeekKey(new Date(2020, 11, 31))).toBe("2020-W53");
    expect(isoWeekKey(new Date(2021, 0, 1))).toBe("2020-W53");
    expect(isoWeekKey(new Date(2021, 0, 3))).toBe("2020-W53");
    expect(isoWeekKey(new Date(2021, 0, 4))).toBe("2021-W01");
  });

  it("keeps Monday 4 Jan 2021 local when that instant is still Sunday in UTC", () => {
    const date = new Date(2021, 0, 4, 0, 30, 0);
    expect(date.toISOString().startsWith("2021-01-03")).toBe(true);
    expect(isoWeekKey(date)).toBe("2021-W01");
  });

  it("keeps the week key of the local calendar date across DST boundaries", () => {
    const samples = [
      { year: 2026, month: 2, day: 29 },
      { year: 2026, month: 9, day: 25 },
    ];
    for (const sample of samples) {
      const noon = new Date(sample.year, sample.month, sample.day, 12, 0, 0, 0);
      const early = new Date(sample.year, sample.month, sample.day, 0, 30, 0, 0);
      const late = new Date(sample.year, sample.month, sample.day, 23, 30, 0, 0);
      expect(isoWeekKey(early)).toBe(isoWeekKey(noon));
      expect(isoWeekKey(late)).toBe(isoWeekKey(noon));
    }
  });
});

describe("weekRange", () => {
  it("returns Monday 4 Jan 2021 through Sunday 10 Jan 2021 for 2021-W01", () => {
    const { start, end } = weekRange("2021-W01");
    expect(start.getFullYear()).toBe(2021);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(4);
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
    expect(end.getFullYear()).toBe(2021);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(10);
    expect(end.getDay()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it("returns 28 Dec 2020 through 3 Jan 2021 for 2020-W53", () => {
    const { start, end } = weekRange("2020-W53");
    expect(start.getFullYear()).toBe(2020);
    expect(start.getMonth()).toBe(11);
    expect(start.getDate()).toBe(28);
    expect(end.getFullYear()).toBe(2021);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(3);
  });
});

describe("week navigation", () => {
  it("shifts across the 2020/2021 boundary", () => {
    expect(shiftWeek("2020-W53", 1)).toBe("2021-W01");
    expect(shiftWeek("2021-W01", -1)).toBe("2020-W53");
  });

  it("compares week keys lexicographically", () => {
    expect(compareWeekKeys("2020-W53", "2021-W01")).toBeLessThan(0);
  });

  it("rejects week numbers outside 01–53", () => {
    expect(isWeekKey("2021-W00")).toBe(false);
    expect(isWeekKey("2021-W54")).toBe(false);
    expect(isWeekKey("2020-W53")).toBe(true);
    expect(isWeekKey("2021-W01")).toBe(true);
  });
});
