import { describe, expect, it } from "vitest";
import type { Category } from "../domain/category";
import type { Entry, Food } from "../domain/types";
import {
  formatDayLabel,
  formatWeekdayShort,
  groupLedgerByDay,
  activeGoal,
  layoutScoreBar,
  localDayKey,
  stretchTier,
  weekdayIndex,
} from "./weekDays";
import { copyFor } from "./copy";

function food(id: string, name: string, category: Category): Food {
  return {
    id,
    canonicalName: name,
    category,
    aliases: [],
    source: "catalog",
  };
}

function entry(id: string, foodId: string, loggedAt: string): Entry {
  return { id, foodId, weekKey: "2026-W12", loggedAt };
}

describe("localDayKey and weekday helpers", () => {
  const copy = copyFor("en");

  it("maps a late UTC instant to the next Oslo calendar day", () => {
    expect(localDayKey("2026-03-16T23:30:00.000Z")).toBe("2026-03-17");
  });

  it("uses Monday as weekday index 0 for 2026-03-16", () => {
    expect(weekdayIndex("2026-03-16")).toBe(0);
  });

  it("formats day labels from local day keys without UTC date-only shift", () => {
    const label = formatDayLabel("2026-03-16", copy.dateLocale);
    expect(label.length).toBeGreaterThan(0);
    expect(formatWeekdayShort("2026-03-16", copy.dateLocale)).toMatch(/Mon/i);
  });
});

describe("groupLedgerByDay", () => {
  const copy = copyFor("en");

  it("orders days ascending and rows by loggedAt then id", () => {
    const foods = new Map<string, Food>([
      ["f1", food("f1", "Apple", "fruit")],
      ["f2", food("f2", "Kale", "vegetable")],
    ]);
    const entries = [
      entry("e2", "f2", "2026-03-18T10:00:00.000Z"),
      entry("e1", "f1", "2026-03-17T12:00:00.000Z"),
      entry("e3", "f1", "2026-03-17T14:00:00.000Z"),
    ];
    const sections = groupLedgerByDay({
      entries,
      foods,
      dateLocale: copy.dateLocale,
      unknownPlantLabel: copy.unknownPlant,
      nameOf: (f) => f.canonicalName,
    });
    expect(sections.map((s) => s.dayKey)).toEqual(["2026-03-17", "2026-03-18"]);
    expect(sections[0]?.rows.map((r) => r.id)).toEqual(["e1", "e3"]);
    expect(sections[1]?.rows.map((r) => r.id)).toEqual(["e2"]);
  });

  it("counts unknown foods with null pointsLabel and zero points", () => {
    const foods = new Map<string, Food>([["f1", food("f1", "Kale", "vegetable")]]);
    const sections = groupLedgerByDay({
      entries: [
        entry("e1", "f1", "2026-03-16T12:00:00.000Z"),
        entry("e2", "missing", "2026-03-16T13:00:00.000Z"),
      ],
      foods,
      dateLocale: copy.dateLocale,
      unknownPlantLabel: copy.unknownPlant,
      nameOf: (f) => f.canonicalName,
    });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.count).toBe(2);
    expect(sections[0]?.points).toBe(1);
    const unknownRow = sections[0]?.rows[1];
    expect(unknownRow?.pointsLabel).toBeNull();
    expect(unknownRow?.category).toBeNull();
    expect(unknownRow?.name).toBe(copy.unknownPlant);
  });

  it("adds quarter points for nut/seed/herb/spice", () => {
    const foods = new Map<string, Food>([
      ["f1", food("f1", "Almond", "nut")],
      ["f2", food("f2", "Basil", "herb")],
    ]);
    const sections = groupLedgerByDay({
      entries: [
        entry("e1", "f1", "2026-03-16T12:00:00.000Z"),
        entry("e2", "f2", "2026-03-16T13:00:00.000Z"),
      ],
      foods,
      dateLocale: copy.dateLocale,
      unknownPlantLabel: copy.unknownPlant,
      nameOf: (f) => f.canonicalName,
    });
    expect(sections[0]?.count).toBe(2);
    expect(sections[0]?.points).toBe(0.5);
    expect(sections[0]?.rows[0]?.pointsLabel).toBe("0.25");
  });
});

describe("layoutScoreBar", () => {
  const monday = { dayKey: "2026-03-16", count: 10, points: 10 };
  const tuesday = { dayKey: "2026-03-17", count: 5, points: 5 };

  it("keeps earlier days on the 0–30 bar and marks only today", () => {
    const layout = layoutScoreBar([monday, tuesday], tuesday.dayKey);
    expect(layout.stretch).toBe(false);
    expect(layout.scaleMax).toBe(30);
    expect(layout.totalPoints).toBe(15);
    expect(layout.ticks).toEqual([33.33, 66.67]);
    expect(layout.segments).toEqual([
      { kind: "base", leftPercent: 0, widthPercent: 33.33 },
      { kind: "today", leftPercent: 33.33, widthPercent: 16.67 },
    ]);
    expect(layout.todayCount).toBe(5);
  });

  it("clears the bar at 30 so the stretch toward 40 starts empty", () => {
    const layout = layoutScoreBar([{ dayKey: "2026-03-16", count: 30, points: 30 }], "2026-03-16");
    expect(layout.stretch).toBe(true);
    expect(layout.scaleMax).toBe(40);
    expect(layout.ticks).toEqual([]);
    expect(layout.segments).toEqual([]);
    expect(layout.todayCount).toBeNull();
  });

  it("fills the cleared bar from 30 toward 40, with today in gold when today crossed the goal", () => {
    const layout = layoutScoreBar(
      [
        { dayKey: "2026-03-16", count: 28, points: 28 },
        { dayKey: "2026-03-17", count: 8, points: 8 },
      ],
      "2026-03-17",
    );
    expect(layout.stretch).toBe(true);
    expect(layout.scaleMax).toBe(40);
    expect(layout.segments).toEqual([{ kind: "today", leftPercent: 0, widthPercent: 60 }]);
    expect(layout.todayCount).toBe(8);
  });

  it("splits the stretch bar between points already past 30 and today", () => {
    const layout = layoutScoreBar(
      [
        { dayKey: "2026-03-16", count: 32, points: 32 },
        { dayKey: "2026-03-17", count: 4, points: 4 },
      ],
      "2026-03-17",
    );
    expect(layout.segments).toEqual([
      { kind: "base", leftPercent: 0, widthPercent: 20 },
      { kind: "today", leftPercent: 20, widthPercent: 40 },
    ]);
    expect(layout.todayCount).toBe(4);
  });

  it("clears again at 40 and fills toward 50", () => {
    const atForty = layoutScoreBar([{ dayKey: "2026-03-16", count: 40, points: 40 }], "2026-03-16");
    expect(atForty.scaleMax).toBe(50);
    expect(atForty.segments).toEqual([]);

    const towardFifty = layoutScoreBar(
      [
        { dayKey: "2026-03-16", count: 32, points: 32 },
        { dayKey: "2026-03-17", count: 12, points: 12 },
      ],
      "2026-03-17",
    );
    expect(towardFifty.totalPoints).toBe(44);
    expect(towardFifty.scaleMax).toBe(50);
    expect(towardFifty.segments).toEqual([{ kind: "today", leftPercent: 0, widthPercent: 40 }]);
  });

  it("opens the next ten after 50", () => {
    expect(activeGoal(50)).toBe(60);
    expect(activeGoal(53)).toBe(60);
    expect(stretchTier(29)).toBe(0);
    expect(stretchTier(30)).toBe(1);
    expect(stretchTier(40)).toBe(2);
    expect(stretchTier(50)).toBe(3);
    const layout = layoutScoreBar([{ dayKey: "2026-03-16", count: 53, points: 53 }], "2026-03-16");
    expect(layout.scaleMax).toBe(60);
    expect(layout.segments).toEqual([{ kind: "today", leftPercent: 0, widthPercent: 30 }]);
  });

  it("draws no today segment when the week is not the current one", () => {
    const layout = layoutScoreBar([monday, tuesday], null);
    expect(layout.segments).toEqual([{ kind: "base", leftPercent: 0, widthPercent: 50 }]);
    expect(layout.todayCount).toBeNull();
  });
});
