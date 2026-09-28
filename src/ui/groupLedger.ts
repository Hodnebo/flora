import { CATEGORIES, pointsForCategory, type Category } from "../domain/category";
import { formatPoints } from "../domain/format";
import type { Entry, Food } from "../domain/types";

export type LedgerRow = {
  id: string;
  name: string;
  pointsLabel: string | null;
};

export type LedgerSection =
  | { kind: "category"; category: Category; label: string; rows: LedgerRow[] }
  | { kind: "unknown"; label: string; rows: LedgerRow[] };

export function groupLedgerByCategory(args: {
  entries: readonly Entry[];
  foods: ReadonlyMap<string, Food>;
  dateLocale: string;
  categoryLabels: Record<Category, string>;
  unknownPlantLabel: string;
  nameOf: (food: Food) => string;
}): LedgerSection[] {
  const { entries, foods, dateLocale, categoryLabels, unknownPlantLabel, nameOf } = args;
  const byCategory = new Map<Category, LedgerRow[]>();
  const unknown: LedgerRow[] = [];

  for (const entry of entries) {
    const food = foods.get(entry.foodId);
    if (!food) {
      unknown.push({
        id: entry.id,
        name: unknownPlantLabel,
        pointsLabel: null,
      });
      continue;
    }
    const row: LedgerRow = {
      id: entry.id,
      name: nameOf(food),
      pointsLabel: formatPoints(pointsForCategory(food.category)),
    };
    const bucket = byCategory.get(food.category);
    if (bucket) bucket.push(row);
    else byCategory.set(food.category, [row]);
  }

  const sortRows = (rows: LedgerRow[]) =>
    rows.sort((a, b) => a.name.localeCompare(b.name, dateLocale, { sensitivity: "base" }));

  const sections: LedgerSection[] = [];
  for (const category of CATEGORIES) {
    const rows = byCategory.get(category);
    if (!rows || rows.length === 0) continue;
    sortRows(rows);
    sections.push({
      kind: "category",
      category,
      label: categoryLabels[category],
      rows,
    });
  }

  if (unknown.length > 0) {
    sortRows(unknown);
    sections.push({ kind: "unknown", label: unknownPlantLabel, rows: unknown });
  }

  return sections;
}
