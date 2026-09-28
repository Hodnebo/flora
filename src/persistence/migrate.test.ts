import { describe, expect, it } from "vitest";
import { emptyState, type PersistedState } from "../domain/types";
import { migrate } from "./migrate";

const nettle: PersistedState["customFoods"][number] = {
  id: "custom:homemade1",
  canonicalName: "Nettle",
  category: "herb",
  aliases: ["stinging nettle"],
  source: "custom",
};

const nettleEntry: PersistedState["entries"][number] = {
  id: "e1",
  foodId: "custom:homemade1",
  weekKey: "2026-W10",
  loggedAt: "2026-03-02T08:00:00.000Z",
};

describe("migrate", () => {
  it("turns null into an empty v1 state with the system theme", () => {
    expect(migrate(null)).toEqual({ ok: true, state: emptyState() });
    expect(migrate(undefined)).toEqual({ ok: true, state: emptyState() });
  });

  it("rejects non-objects as corrupt", () => {
    expect(migrate([])).toEqual({ ok: false, reason: "corrupt" });
    expect(migrate("flora")).toEqual({ ok: false, reason: "corrupt" });
    expect(migrate(1)).toEqual({ ok: false, reason: "corrupt" });
  });

  it("repairs a missing version into empty v1", () => {
    expect(migrate({})).toEqual({ ok: true, state: emptyState() });
  });

  it("round-trips a valid v1 custom food, entry, and theme", () => {
    const state: PersistedState = {
      schemaVersion: 1,
      customFoods: [nettle],
      entries: [nettleEntry],
      settings: { theme: "dark", language: "en" },
    };
    expect(migrate(state)).toEqual({ ok: true, state });
  });

  it("drops unknown top-level fields", () => {
    const result = migrate({
      schemaVersion: 1,
      customFoods: [],
      entries: [],
      settings: { theme: "light" },
      goal: 30,
    });
    expect(result).toEqual({
      ok: true,
      state: {
        schemaVersion: 1,
        customFoods: [],
        entries: [],
        settings: { theme: "light", language: "en" },
      },
    });
  });

  it("refuses a newer schema version", () => {
    expect(migrate({ schemaVersion: 2, settings: { theme: "dark" } })).toEqual({
      ok: false,
      reason: "unsupported-version",
    });
  });

  it("rejects a non-number or negative schema version", () => {
    expect(migrate({ schemaVersion: "1" })).toEqual({ ok: false, reason: "corrupt" });
    expect(migrate({ schemaVersion: -1 })).toEqual({ ok: false, reason: "corrupt" });
  });

  it("keeps the newest loggedAt when a week and food are duplicated", () => {
    const result = migrate({
      schemaVersion: 1,
      entries: [
        {
          id: "old",
          foodId: "apple",
          weekKey: "2026-W01",
          loggedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "new",
          foodId: "apple",
          weekKey: "2026-W01",
          loggedAt: "2026-01-03T00:00:00.000Z",
        },
      ],
    });
    expect(result).toEqual({
      ok: true,
      state: {
        ...emptyState(),
        entries: [
          {
            id: "new",
            foodId: "apple",
            weekKey: "2026-W01",
            loggedAt: "2026-01-03T00:00:00.000Z",
          },
        ],
      },
    });
  });

  it("keeps the later entry when loggedAt ties", () => {
    const result = migrate({
      schemaVersion: 1,
      entries: [
        {
          id: "first",
          foodId: "apple",
          weekKey: "2026-W01",
          loggedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "second",
          foodId: "apple",
          weekKey: "2026-W01",
          loggedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.entries.map((entry) => entry.id)).toEqual(["second"]);
    }
  });

  it("drops an invalid entry and keeps its sibling", () => {
    const result = migrate({
      schemaVersion: 1,
      entries: [
        {
          id: "bad",
          foodId: "apple",
          weekKey: "2021-W54",
          loggedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "good",
          foodId: "pear",
          weekKey: "2026-W02",
          loggedAt: "2026-01-08T00:00:00.000Z",
        },
      ],
    });
    expect(result).toEqual({
      ok: true,
      state: {
        ...emptyState(),
        entries: [
          {
            id: "good",
            foodId: "pear",
            weekKey: "2026-W02",
            loggedAt: "2026-01-08T00:00:00.000Z",
          },
        ],
      },
    });
  });

  it("drops a custom entry whose food was not kept", () => {
    const result = migrate({
      schemaVersion: 1,
      customFoods: [nettle],
      entries: [
        {
          id: "ghost",
          foodId: "custom:missing01",
          weekKey: "2026-W01",
          loggedAt: "2026-01-01T00:00:00.000Z",
        },
        nettleEntry,
        {
          id: "forward",
          foodId: "not-in-this-catalog",
          weekKey: "2026-W02",
          loggedAt: "2026-01-08T00:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.entries.map((entry) => entry.id)).toEqual(["e1", "forward"]);
    }
  });

  it("drops a custom food with an invalid category and accepts a legacy name", () => {
    const result = migrate({
      schemaVersion: 1,
      customFoods: [
        {
          id: "custom:badfood01",
          canonicalName: "Steak",
          category: "meat",
          aliases: [],
          source: "custom",
        },
        {
          id: "custom:goodfood1",
          name: "  Kale chips  ",
          category: "vegetable",
          aliases: ["chips", "", 4],
          source: "catalog",
        },
      ],
    });
    expect(result).toEqual({
      ok: true,
      state: {
        ...emptyState(),
        customFoods: [
          {
            id: "custom:goodfood1",
            canonicalName: "Kale chips",
            category: "vegetable",
            aliases: ["chips"],
            source: "custom",
          },
        ],
      },
    });
  });

  it("dedupes custom food ids and entry ids, keeping the first", () => {
    const result = migrate({
      schemaVersion: 1,
      customFoods: [nettle, { ...nettle, canonicalName: "Later nettle" }],
      entries: [
        {
          id: "same",
          foodId: "apple",
          weekKey: "2026-W01",
          loggedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "same",
          foodId: "pear",
          weekKey: "2026-W02",
          loggedAt: "2026-01-08T00:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.customFoods).toEqual([nettle]);
      expect(result.state.entries.map((entry) => entry.foodId)).toEqual(["apple"]);
    }
  });

  it("fills a partial settings object with the system theme", () => {
    expect(migrate({ schemaVersion: 1, settings: { contrast: "high" } })).toEqual({
      ok: true,
      state: emptyState(),
    });
  });

  it("defaults a missing language to en and keeps theme, foods, and entries", () => {
    expect(
      migrate({
        schemaVersion: 1,
        customFoods: [nettle],
        entries: [nettleEntry],
        settings: { theme: "dark" },
      }),
    ).toEqual({
      ok: true,
      state: {
        schemaVersion: 1,
        customFoods: [nettle],
        entries: [nettleEntry],
        settings: { theme: "dark", language: "en" },
      },
    });
    expect(migrate({ schemaVersion: 1, settings: { theme: "dark" } })).toEqual({
      ok: true,
      state: {
        ...emptyState(),
        settings: { theme: "dark", language: "en" },
      },
    });
  });

  it("keeps language nb and replaces fr or a non-string with en", () => {
    expect(
      migrate({
        schemaVersion: 1,
        customFoods: [nettle],
        entries: [nettleEntry],
        settings: { theme: "dark", language: "nb", contrast: "high" },
      }),
    ).toEqual({
      ok: true,
      state: {
        schemaVersion: 1,
        customFoods: [nettle],
        entries: [nettleEntry],
        settings: { theme: "dark", language: "nb" },
      },
    });
    expect(migrate({ schemaVersion: 1, settings: { theme: "light", language: "fr" } })).toEqual({
      ok: true,
      state: {
        ...emptyState(),
        settings: { theme: "light", language: "en" },
      },
    });
    expect(migrate({ schemaVersion: 1, settings: { theme: "system", language: 3 } })).toEqual({
      ok: true,
      state: emptyState(),
    });
  });
});
