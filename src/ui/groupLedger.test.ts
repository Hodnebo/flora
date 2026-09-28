import { describe, expect, it } from "vitest";
import type { Category } from "../domain/category";
import type { Entry, Food } from "../domain/types";
import { groupLedgerByCategory } from "./groupLedger";
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

function entry(id: string, foodId: string): Entry {
  return { id, foodId, weekKey: "2025-W01", loggedAt: "2025-01-01T12:00:00.000Z" };
}

describe("groupLedgerByCategory", () => {
  const copy = copyFor("en");
  const categoryLabels = copy.category;

  it("orders sections by CATEGORIES and omits empty categories", () => {
    const foods = new Map<string, Food>([
      ["f1", food("f1", "Zucchini", "vegetable")],
      ["f2", food("f2", "Apple", "fruit")],
      ["f3", food("f3", "Almond", "nut")],
    ]);
    const entries = [entry("e1", "f2"), entry("e2", "f1"), entry("e3", "f3")];
    const sections = groupLedgerByCategory({
      entries,
      foods,
      dateLocale: copy.dateLocale,
      categoryLabels,
      unknownPlantLabel: copy.unknownPlant,
      nameOf: (f) => f.canonicalName,
    });
    expect(sections.map((s) => (s.kind === "category" ? s.category : "unknown"))).toEqual([
      "vegetable",
      "fruit",
      "nut",
    ]);
  });

  it("sorts rows within a section by localized name", () => {
    const foods = new Map<string, Food>([
      ["f1", food("f1", "Carrot", "vegetable")],
      ["f2", food("f2", "Broccoli", "vegetable")],
    ]);
    const sections = groupLedgerByCategory({
      entries: [entry("e1", "f1"), entry("e2", "f2")],
      foods,
      dateLocale: copy.dateLocale,
      categoryLabels,
      unknownPlantLabel: copy.unknownPlant,
      nameOf: (f) => f.canonicalName,
    });
    expect(sections[0]?.rows.map((r) => r.name)).toEqual(["Broccoli", "Carrot"]);
  });

  it("puts missing foods in a final unknown section without points", () => {
    const foods = new Map<string, Food>([["f1", food("f1", "Kale", "vegetable")]]);
    const sections = groupLedgerByCategory({
      entries: [entry("e1", "f1"), entry("e2", "missing")],
      foods,
      dateLocale: copy.dateLocale,
      categoryLabels,
      unknownPlantLabel: copy.unknownPlant,
      nameOf: (f) => f.canonicalName,
    });
    expect(sections).toHaveLength(2);
    const unknown = sections[1];
    expect(unknown?.kind).toBe("unknown");
    if (unknown?.kind === "unknown") {
      expect(unknown.rows).toHaveLength(1);
      expect(unknown.rows[0]?.name).toBe(copy.unknownPlant);
      expect(unknown.rows[0]?.pointsLabel).toBeNull();
    }
  });
});
