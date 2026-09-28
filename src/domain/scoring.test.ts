import { describe, expect, it } from "vitest";
import { logCustomFood, logFood, removeEntry, replaceEntryFood, updateCustomFood } from "./log";
import { entriesForWeek, scoreWeek } from "./scoring";
import { emptyState, type Entry, type Food, type PersistedState, type Result } from "./types";

const WEEK = "2026-W12";
const OTHER = "2026-W11";
const NOW = new Date("2026-03-20T15:00:00.000Z");

function must<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function food(id: string, canonicalName: string, category: Food["category"]): Food {
  return { id, canonicalName, category, aliases: [], source: "custom" };
}

function entry(id: string, foodId: string, weekKey: string, loggedAt: string): Entry {
  return { id, foodId, weekKey, loggedAt };
}

const broccoli = food("custom:broccoli01", "Broccoli", "vegetable");
const apple = food("custom:apple00001", "Apple", "fruit");
const almond = food("custom:almond0001", "Almond", "nut");
const cinnamon = food("custom:cinnamon01", "Cinnamon", "spice");

function stateOf(foods: Food[], entries: Entry[]): PersistedState {
  return { ...emptyState(), customFoods: foods, entries };
}

describe("scoreWeek", () => {
  it("scores an empty week as 0", () => {
    expect(scoreWeek(emptyState(), WEEK)).toBe(0);
    expect(entriesForWeek(emptyState(), WEEK)).toEqual([]);
  });

  it("scores one vegetable as 1 and one nut as 0.25", () => {
    const vegetables = stateOf(
      [broccoli],
      [entry("e-broc", broccoli.id, WEEK, "2026-03-16T00:00:00.000Z")],
    );
    const nuts = stateOf([almond], [entry("e-alm", almond.id, WEEK, "2026-03-16T00:00:00.000Z")]);
    expect(scoreWeek(vegetables, WEEK)).toBe(1);
    expect(scoreWeek(nuts, WEEK)).toBe(0.25);
  });

  it("scores a vegetable, fruit, nut, and spice as 2.5", () => {
    const state = stateOf(
      [broccoli, apple, almond, cinnamon],
      [broccoli, apple, almond, cinnamon].map((item, index) =>
        entry(`e-${index}`, item.id, WEEK, `2026-03-16T0${index}:00:00.000Z`),
      ),
    );
    expect(scoreWeek(state, WEEK)).toBe(2.5);
  });

  it("does not change the score when the same food is logged twice in one week", () => {
    const state = stateOf([almond], [entry("e1", almond.id, WEEK, NOW.toISOString())]);
    const again = logFood(state, almond.id, WEEK, NOW, "e2");
    expect(again).toEqual({ ok: false, error: "duplicate-food" });
    expect(scoreWeek(state, WEEK)).toBe(0.25);
    expect(state.entries).toHaveLength(1);
  });

  it("scores the same food in each week it was logged", () => {
    const state = stateOf(
      [broccoli],
      [
        entry("e1", broccoli.id, WEEK, NOW.toISOString()),
        entry("e2", broccoli.id, OTHER, NOW.toISOString()),
      ],
    );
    expect(scoreWeek(state, WEEK)).toBe(1);
    expect(scoreWeek(state, OTHER)).toBe(1);
  });

  it("drops a food's points when its entry is removed", () => {
    const state = stateOf(
      [broccoli, almond],
      [
        entry("e-broc", broccoli.id, WEEK, "2026-03-16T00:00:00.000Z"),
        entry("e-alm", almond.id, WEEK, "2026-03-16T01:00:00.000Z"),
      ],
    );
    expect(scoreWeek(state, WEEK)).toBe(1.25);
    const removed = must(removeEntry(state, "e-broc"));
    expect(scoreWeek(removed, WEEK)).toBe(0.25);
  });

  it("updates the score when an entry's food is replaced", () => {
    const state = stateOf(
      [broccoli, almond, cinnamon],
      [
        entry("e-broc", broccoli.id, WEEK, "2026-03-16T00:00:00.000Z"),
        entry("e-alm", almond.id, WEEK, "2026-03-16T01:00:00.000Z"),
      ],
    );
    const swapped = must(replaceEntryFood(state, "e-broc", cinnamon.id));
    expect(scoreWeek(swapped, WEEK)).toBe(0.5);
    expect(swapped.entries.find((item) => item.id === "e-broc")).toEqual({
      id: "e-broc",
      foodId: cinnamon.id,
      weekKey: WEEK,
      loggedAt: "2026-03-16T00:00:00.000Z",
    });

    const blocked = replaceEntryFood(state, "e-broc", almond.id);
    expect(blocked).toEqual({ ok: false, error: "duplicate-food" });
    expect(scoreWeek(state, WEEK)).toBe(1.25);
  });

  it("counts a duplicated food id only once and ignores missing foods", () => {
    const state = stateOf(
      [broccoli],
      [
        entry("e1", broccoli.id, WEEK, "2026-03-16T00:00:00.000Z"),
        entry("e2", broccoli.id, WEEK, "2026-03-16T02:00:00.000Z"),
        entry("e3", "custom:missing01", WEEK, "2026-03-16T03:00:00.000Z"),
      ],
    );
    expect(scoreWeek(state, WEEK)).toBe(1);
  });

  it("sorts a week's entries by loggedAt then id", () => {
    const state = stateOf(
      [broccoli, apple, almond],
      [
        entry("b", broccoli.id, WEEK, "2026-03-02T00:00:00.000Z"),
        entry("c", apple.id, WEEK, "2026-03-01T00:00:00.000Z"),
        entry("a", almond.id, WEEK, "2026-03-01T00:00:00.000Z"),
        entry("z", cinnamon.id, OTHER, "2026-03-01T00:00:00.000Z"),
      ],
    );
    expect(entriesForWeek(state, WEEK).map((item) => item.id)).toEqual(["a", "c", "b"]);
  });

  it("applies a category change in every week and ignores a rename", () => {
    let state = must(
      logCustomFood(emptyState(), "Homemade nettle", "vegetable", WEEK, NOW, {
        foodId: "custom:nettle0001",
        entryId: "e-a",
      }),
    );
    state = must(logFood(state, "custom:nettle0001", OTHER, NOW, "e-b"));
    expect(scoreWeek(state, WEEK)).toBe(1);
    expect(scoreWeek(state, OTHER)).toBe(1);

    const entries = state.entries;
    state = must(updateCustomFood(state, "custom:nettle0001", { category: "herb" }));
    expect(state.entries).toEqual(entries);
    expect(scoreWeek(state, WEEK)).toBe(0.25);
    expect(scoreWeek(state, OTHER)).toBe(0.25);

    state = must(updateCustomFood(state, "custom:nettle0001", { name: "Wild nettle" }));
    expect(scoreWeek(state, WEEK)).toBe(0.25);
    expect(scoreWeek(state, OTHER)).toBe(0.25);
    expect(state.customFoods[0]?.canonicalName).toBe("Wild nettle");
  });

  it("updates only the older week when logging retrospectively", () => {
    const older = "2026-W08";
    const state = must(
      logCustomFood(emptyState(), "Homemade nettle", "vegetable", older, NOW, {
        foodId: "custom:nettle0001",
        entryId: "e-old",
      }),
    );
    expect(scoreWeek(state, older)).toBe(1);
    expect(scoreWeek(state, WEEK)).toBe(0);
  });

  it("does not store the weekly goal on the saved state", () => {
    const state = stateOf([broccoli], [entry("e1", broccoli.id, WEEK, NOW.toISOString())]);
    expect(state).not.toHaveProperty("goal");
    expect(state.settings).toEqual({ theme: "system" });
    expect(JSON.parse(JSON.stringify(state))).not.toHaveProperty("goal");
  });
});
