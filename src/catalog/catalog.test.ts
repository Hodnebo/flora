import { describe, expect, it } from "vitest";
import { isCategory } from "../domain/category";
import { catalogFoods } from "../domain/foods";
import { findFoodByExactName, normalizeQuery } from "../domain/search";

describe("catalog", () => {
  const foods = catalogFoods();

  function idFor(name: string): string {
    const food = findFoodByExactName(foods, name);
    if (!food) throw new Error(`missing catalog food for "${name}"`);
    return food.id;
  }

  function foodFor(name: string) {
    const food = findFoodByExactName(foods, name);
    if (!food) throw new Error(`missing catalog food for "${name}"`);
    return food;
  }

  it("shares one id across aliases and the canonical name", () => {
    expect(idFor("shallot")).toBe(idFor("onion"));
    expect(idFor("broccolini")).toBe(idFor("broccoli"));
    expect(idFor("granny smith")).toBe(idFor("apple"));
    expect(idFor("red bell pepper")).toBe(idFor("yellow bell pepper"));
    expect(idFor("cinnamon stick")).toBe(idFor("cinnamon"));
    expect(idFor("almond butter")).toBe(idFor("almond"));
    expect(idFor("sun-dried tomato")).toBe(idFor("tomato"));
    expect(idFor("paprika")).toBe(idFor("chili"));
    expect(idFor("peanut butter")).toBe(idFor("peanut"));
    expect(idFor("blåbær")).toBe(idFor("bilberry"));
  });

  it("keeps chili distinct from bell pepper and blueberry distinct from bilberry", () => {
    expect(idFor("chili")).not.toBe(idFor("bell pepper"));
    expect(idFor("blueberry")).not.toBe(idFor("bilberry"));
  });

  it("assigns the plant-food categories used for scoring", () => {
    expect(foodFor("peanut").category).toBe("legume");
    expect(foodFor("almond").category).toBe("nut");
    expect(foodFor("cinnamon").category).toBe("spice");
    expect(foodFor("broccoli").category).toBe("vegetable");
  });

  it("has unique kebab-case ids, valid categories, and exclusive normalized names", () => {
    const ids = new Set<string>();
    const labels = new Map<string, string>();
    const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    for (const food of foods) {
      if (ids.has(food.id)) throw new Error(`duplicate id ${food.id}`);
      ids.add(food.id);
      expect(food.id).toMatch(kebab);
      expect(isCategory(food.category)).toBe(true);
      expect(food.source).toBe("catalog");

      for (const label of [food.canonicalName, ...food.aliases]) {
        const key = normalizeQuery(label);
        expect(key.length).toBeGreaterThan(0);
        const owner = labels.get(key);
        if (owner !== undefined && owner !== food.id) {
          throw new Error(`"${label}" (${key}) is owned by ${owner} and ${food.id}`);
        }
        labels.set(key, food.id);
      }
    }

    expect(foods.length).toBeGreaterThanOrEqual(160);
  });
});
