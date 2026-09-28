import { describe, expect, it } from "vitest";
import { catalogFoods } from "./foods";
import {
  logCustomFood,
  logFood,
  removeEntry,
  replaceEntryFood,
  replaceEntryWithCustomFood,
  setLanguage,
  setTheme,
  updateCustomFood,
} from "./log";
import { findFoodByExactName } from "./search";
import { emptyState, type Food, type PersistedState, type Result } from "./types";

const WEEK = "2026-W12";
const OTHER = "2026-W09";
const NOW = new Date("2026-03-20T15:00:00.000Z");

function must<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function custom(id: string, canonicalName: string, category: Food["category"]): Food {
  return { id, canonicalName, category, aliases: [], source: "custom" };
}

function withFoods(foods: Food[]): PersistedState {
  return { ...emptyState(), customFoods: foods };
}

describe("logFood", () => {
  const kale = custom("custom:kale000001", "Garden kale", "vegetable");

  it("appends an entry for a known food", () => {
    const state = must(logFood(withFoods([kale]), kale.id, WEEK, NOW, "entry-1"));
    expect(state.entries).toEqual([
      { id: "entry-1", foodId: kale.id, weekKey: WEEK, loggedAt: NOW.toISOString() },
    ]);
  });

  it("rejects a second log of the same food in the same week", () => {
    const once = must(logFood(withFoods([kale]), kale.id, WEEK, NOW, "entry-1"));
    const twice = logFood(once, kale.id, WEEK, NOW, "entry-2");
    expect(twice).toEqual({ ok: false, error: "duplicate-food" });
    expect(once.entries).toHaveLength(1);
  });

  it("logs the same food into a second week", () => {
    const once = must(logFood(withFoods([kale]), kale.id, WEEK, NOW, "entry-1"));
    const twice = must(logFood(once, kale.id, OTHER, NOW, "entry-2"));
    expect(twice.entries.map((entry) => entry.weekKey)).toEqual([WEEK, OTHER]);
  });

  it("rejects an invalid week before an unknown food", () => {
    expect(logFood(emptyState(), "custom:missing01", "2026-W54", NOW)).toEqual({
      ok: false,
      error: "invalid-week",
    });
  });

  it("rejects an unknown food id", () => {
    expect(logFood(emptyState(), "custom:missing01", WEEK, NOW)).toEqual({
      ok: false,
      error: "unknown-food",
    });
  });
});

describe("removeEntry and replaceEntryFood", () => {
  const kale = custom("custom:kale000001", "Garden kale", "vegetable");
  const walnut = custom("custom:walnut0001", "Garden walnut", "nut");

  function seeded(): PersistedState {
    return {
      ...emptyState(),
      customFoods: [kale, walnut],
      entries: [
        { id: "e-kale", foodId: kale.id, weekKey: WEEK, loggedAt: "2026-03-16T00:00:00.000Z" },
        { id: "e-nut", foodId: walnut.id, weekKey: OTHER, loggedAt: "2026-03-09T00:00:00.000Z" },
      ],
    };
  }

  it("removes an entry and rejects an unknown id", () => {
    const removed = must(removeEntry(seeded(), "e-kale"));
    expect(removed.entries.map((entry) => entry.id)).toEqual(["e-nut"]);
    expect(removeEntry(removed, "e-kale")).toEqual({ ok: false, error: "unknown-entry" });
  });

  it("replaces the food id and keeps the entry id and loggedAt", () => {
    const replaced = must(replaceEntryFood(seeded(), "e-kale", walnut.id));
    expect(replaced.entries[0]).toEqual({
      id: "e-kale",
      foodId: walnut.id,
      weekKey: WEEK,
      loggedAt: "2026-03-16T00:00:00.000Z",
    });
  });

  it("rejects a food already logged in that week and an unknown food", () => {
    const state = seeded();
    const sameWeek = must(logFood(state, walnut.id, WEEK, NOW, "e-nut-2"));
    expect(replaceEntryFood(sameWeek, "e-kale", walnut.id)).toEqual({
      ok: false,
      error: "duplicate-food",
    });
    expect(sameWeek.entries.find((entry) => entry.id === "e-kale")?.foodId).toBe(kale.id);
    expect(replaceEntryFood(state, "missing", walnut.id)).toEqual({
      ok: false,
      error: "unknown-entry",
    });
    expect(replaceEntryFood(state, "e-kale", "custom:missing01")).toEqual({
      ok: false,
      error: "unknown-food",
    });
    expect(replaceEntryFood(state, "e-kale", kale.id)).toEqual({ ok: true, value: state });
  });
});

describe("logCustomFood", () => {
  it("rejects a second custom food with the same name under different case and spacing", () => {
    const first = must(
      logCustomFood(emptyState(), "Nettle pesto", "other", WEEK, NOW, {
        foodId: "custom:pesto00001",
        entryId: "e1",
      }),
    );
    const second = logCustomFood(first, "  NETTLE   pesto ", "vegetable", WEEK, NOW, {
      foodId: "custom:pesto00002",
      entryId: "e2",
    });
    expect(second).toEqual({ ok: false, error: "food-exists" });
    expect(first.customFoods).toHaveLength(1);
    expect(first.entries).toHaveLength(1);
    expect(first.customFoods[0]?.canonicalName).toBe("Nettle pesto");
  });

  it("rejects an empty or oversized name", () => {
    expect(logCustomFood(emptyState(), "   ", "other", WEEK, NOW)).toEqual({
      ok: false,
      error: "empty-name",
    });
    expect(logCustomFood(emptyState(), "n".repeat(81), "other", WEEK, NOW)).toEqual({
      ok: false,
      error: "empty-name",
    });
  });

  it("rejects a custom food whose name matches Apple in the catalog", async (ctx) => {
    try {
      await import("../catalog/foods");
    } catch {
      ctx.skip();
      return;
    }
    const found = findFoodByExactName(catalogFoods(), "Apple");
    expect(found?.id).toBe("apple");
    const result = logCustomFood(emptyState(), "Apple", "fruit", WEEK, NOW, {
      foodId: "custom:notapple01",
      entryId: "e-apple",
    });
    expect(result).toEqual({ ok: false, error: "food-exists" });
  });

  it("renames without touching entries and rejects a catalog collision", () => {
    const state = must(
      logCustomFood(emptyState(), "Nettle pesto", "other", WEEK, NOW, {
        foodId: "custom:pesto00001",
        entryId: "e1",
      }),
    );
    const renamed = must(updateCustomFood(state, "custom:pesto00001", { name: "  Wild   pesto " }));
    expect(renamed.customFoods[0]?.canonicalName).toBe("Wild pesto");
    expect(renamed.entries).toEqual(state.entries);
    expect(updateCustomFood(state, "apple", { name: "Nope" })).toEqual({
      ok: false,
      error: "not-custom",
    });
    expect(updateCustomFood(state, "custom:pesto00001", { name: "Apple" })).toEqual({
      ok: false,
      error: "food-exists",
    });
  });
});

describe("replaceEntryWithCustomFood", () => {
  it("keeps the original entry id and logged time", () => {
    const state = must(logFood(emptyState(), "apple", WEEK, NOW, "e1"));
    const replaced = must(
      replaceEntryWithCustomFood(state, "e1", "Calamansi", "fruit", "custom:calamansi1"),
    );
    expect(replaced.entries).toEqual([
      {
        id: "e1",
        foodId: "custom:calamansi1",
        weekKey: WEEK,
        loggedAt: NOW.toISOString(),
      },
    ]);
    expect(replaced.customFoods[0]?.canonicalName).toBe("Calamansi");
    expect(replaced.customFoods[0]?.category).toBe("fruit");
  });
});

describe("setTheme", () => {
  it("round-trips the theme without dropping logged data", () => {
    const logged = must(
      logCustomFood(emptyState(), "Nettle pesto", "other", WEEK, NOW, {
        foodId: "custom:pesto00001",
        entryId: "e1",
      }),
    );
    const dark = setTheme(logged, "dark");
    expect(dark.settings.theme).toBe("dark");
    expect(dark.entries).toEqual(logged.entries);
    expect(dark.customFoods).toEqual(logged.customFoods);
    const restored = JSON.parse(JSON.stringify(dark)) as PersistedState;
    expect(restored.settings.theme).toBe("dark");
    expect(setTheme(dark, "light").settings.theme).toBe("light");
    expect(dark.settings.theme).toBe("dark");
  });
});

describe("setLanguage", () => {
  it("round-trips the language without dropping logged data", () => {
    const logged = must(
      logCustomFood(emptyState(), "Nettle pesto", "other", WEEK, NOW, {
        foodId: "custom:pesto00001",
        entryId: "e1",
      }),
    );
    const norwegian = setLanguage(logged, "nb");
    expect(norwegian.settings.language).toBe("nb");
    expect(norwegian.entries).toEqual(logged.entries);
    expect(norwegian.customFoods).toEqual(logged.customFoods);
    const restored = JSON.parse(JSON.stringify(norwegian)) as PersistedState;
    expect(restored.settings.language).toBe("nb");
    expect(setLanguage(norwegian, "en").settings.language).toBe("en");
    expect(norwegian.settings.language).toBe("nb");
  });
});
