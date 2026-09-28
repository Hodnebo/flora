import { describe, expect, it } from "vitest";
import { catalogFoods } from "../domain/foods";
import { findFoodByExactName, matchFoods, normalizeQuery } from "../domain/search";
import { catalog } from "./foods";
import { NB_NAMES, NB_SEARCH } from "./nb";

describe("norwegian catalog", () => {
  it("names every catalog id once", () => {
    const ids = catalog.map((food) => food.id).sort();
    expect(Object.keys(NB_NAMES).sort()).toEqual(ids);
    for (const name of Object.values(NB_NAMES)) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
    for (const id of Object.keys(NB_SEARCH)) {
      expect(NB_NAMES[id]).toBeDefined();
    }
  });

  it("keeps Norwegian labels exclusive across plants", () => {
    const labels = new Map<string, string>();
    function claim(id: string, label: string) {
      const key = normalizeQuery(label);
      expect(key.length).toBeGreaterThan(0);
      const owner = labels.get(key);
      if (owner !== undefined && owner !== id) {
        throw new Error(`"${label}" (${key}) is owned by ${owner} and ${id}`);
      }
      labels.set(key, id);
    }
    for (const [id, name] of Object.entries(NB_NAMES)) claim(id, name);
    for (const [id, terms] of Object.entries(NB_SEARCH)) {
      for (const term of terms) claim(id, term);
    }
  });

  it("resolves shared Norwegian names without moving an existing English log", () => {
    const foods = catalogFoods();
    expect(findFoodByExactName(foods, "eple", "en")?.id).toBe("apple");
    expect(findFoodByExactName(foods, "eple", "nb")?.id).toBe("apple");
    expect(findFoodByExactName(foods, "apple", "nb")?.id).toBe("apple");
    expect(findFoodByExactName(foods, "paprika", "en")?.id).toBe("chili");
    expect(matchFoods(foods, "paprika", 12, "en").map((match) => match.food.id)).toEqual(["chili"]);
    expect(findFoodByExactName(foods, "paprika", "nb")?.id).toBe("bell-pepper");
    expect(matchFoods(foods, "paprika", 12, "nb").map((match) => match.food.id)).toEqual([
      "bell-pepper",
    ]);
    expect(findFoodByExactName(foods, "blåbær", "nb")?.id).toBe("bilberry");
    expect(findFoodByExactName(foods, "hageblåbær", "nb")?.id).toBe("blueberry");
  });
});
