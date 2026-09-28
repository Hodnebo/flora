import { catalog, type CatalogFood } from "../catalog/foods";
import type { Food } from "./types";

export function toCatalogFood(item: CatalogFood): Food {
  return {
    id: item.id,
    canonicalName: item.name,
    category: item.category,
    aliases: item.aliases,
    source: "catalog",
  };
}

export function catalogFoods(): Food[] {
  return catalog.map(toCatalogFood);
}

export function foodMap(customFoods: readonly Food[]): Map<string, Food> {
  const map = new Map<string, Food>();
  for (const food of catalogFoods()) {
    map.set(food.id, food);
  }
  for (const food of customFoods) {
    if (!food.id.startsWith("custom:")) continue;
    if (map.has(food.id)) continue;
    map.set(food.id, food);
  }
  return map;
}
