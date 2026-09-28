import { describe, expect, it } from "vitest";
import { findFoodByExactName, matchFoods, normalizeQuery } from "./search";
import type { Food } from "./types";

const apple: Food = {
  id: "apple",
  canonicalName: "Apple",
  category: "fruit",
  aliases: [],
  source: "catalog",
};

const pineapple: Food = {
  id: "pineapple",
  canonicalName: "Pineapple",
  category: "fruit",
  aliases: [],
  source: "catalog",
};

const acai: Food = {
  id: "acai",
  canonicalName: "Açaí",
  category: "berry",
  aliases: ["acai berry"],
  source: "catalog",
};

const customApple: Food = {
  id: "custom:applecopy",
  canonicalName: "Apple",
  category: "fruit",
  aliases: [],
  source: "custom",
};

describe("normalizeQuery", () => {
  it("strips diacritics and Scandinavian letters", () => {
    expect(normalizeQuery("  Jalapeño ")).toBe("jalapeno");
    expect(normalizeQuery("blåbær")).toBe("blabaer");
  });
});

describe("matchFoods", () => {
  const foods = [pineapple, apple, acai];

  it("ranks a canonical prefix ahead of a substring", () => {
    expect(matchFoods(foods, "app").map((match) => match.food.id)).toEqual(["apple", "pineapple"]);
  });

  it("matches a longer query that extends the canonical name", () => {
    const matches = matchFoods(foods, "apples");
    expect(matches.map((match) => match.food.id)).toEqual(["apple"]);
    expect(matches[0]?.matchedLabel).toBe("Apple");
    expect(matches[0]?.tier).toBe(6);
  });

  it("matches Açaí from the folded query acai", () => {
    const matches = matchFoods(foods, "acai");
    expect(matches[0]?.food.id).toBe("acai");
    expect(matches[0]?.matchedLabel).toBe("Açaí");
  });

  it("returns nothing for an empty query", () => {
    expect(matchFoods(foods, "   ")).toEqual([]);
  });
});

describe("findFoodByExactName", () => {
  it("prefers the catalog food when a custom food shares the name", () => {
    const found = findFoodByExactName([customApple, apple], "APPLE");
    expect(found?.source).toBe("catalog");
    expect(found?.id).toBe("apple");
  });
});
