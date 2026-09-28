export const CATEGORIES = [
  "vegetable",
  "fruit",
  "berry",
  "legume",
  "grain",
  "nut",
  "seed",
  "herb",
  "spice",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const QUARTER_POINT_CATEGORIES = [
  "nut",
  "seed",
  "herb",
  "spice",
] as const satisfies readonly Category[];

export const WEEKLY_GOAL = 30;

const CATEGORY_SET: ReadonlySet<string> = new Set(CATEGORIES);

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

export function pointsForCategory(category: Category): number {
  return (QUARTER_POINT_CATEGORIES as readonly string[]).includes(category) ? 0.25 : 1;
}

export function isQuarterPointCategory(category: Category): boolean {
  return pointsForCategory(category) === 0.25;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  vegetable: "Vegetable",
  fruit: "Fruit",
  berry: "Berry",
  legume: "Legume",
  grain: "Grain",
  nut: "Nut",
  seed: "Seed",
  herb: "Herb",
  spice: "Spice",
  other: "Other",
};
