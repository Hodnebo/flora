import { CATEGORIES, type Category } from "../domain/category";

export type Language = "en" | "nb";

export type Copy = {
  languageLabel: string;
  languageAria: string;
  themeAria: (themeLabel: string, resolvedLabel: string) => string;
  themeAuto: string;
  themeLight: string;
  themeDark: string;
  resolvedLight: string;
  resolvedDark: string;
  weekGroup: string;
  previousWeek: string;
  nextWeek: string;
  thisWeek: string;
  editingEarlierWeek: string;
  weekNumber: (year: number, week: number) => string;
  saveError: string;
  logPlant: string;
  undo: string;
  emptyCurrentTitle: string;
  emptyPastTitle: string;
  emptyCurrentBody: string;
  weeklyScore: string;
  freshWeek: string;
  toThirty: (remaining: string) => string;
  toNext: (remaining: string, goal: number) => string;
  unknownPlant: string;
  loadNeedsNewer: string;
  loadCorrupt: string;
  loadUntouched: string;
  replacePlant: string;
  addingTo: (weekLabel: string) => string;
  replacingIn: (weekLabel: string) => string;
  close: string;
  searchPlaceholder: string;
  searchPlants: string;
  oliveOilHint: string;
  searchHint: string;
  keepTyping: string;
  alreadyCounted: (name: string) => string;
  logged: string;
  addCustom: (name: string) => string;
  plantsOnePoint: string;
  quarterPoint: string;
  point: string;
  points: string;
  category: Record<Category, string>;
  replaceWithAnother: string;
  removeFromWeek: string;
  catalogNote: string;
  nameLabel: string;
  categoryUpdatesWeeks: string;
  saveChanges: string;
  loggedOn: (formatted: string) => string;
  added: (name: string) => string;
  removed: (name: string) => string;
  replacedWith: (name: string) => string;
  updated: (name: string) => string;
  duplicateFood: string;
  emptyName: string;
  foodExists: string;
  couldntSave: string;
  dateLocale: Language;
};

function categoryLabels(labels: { [K in Category]: string }): Record<Category, string> {
  const record = {} as Record<Category, string>;
  for (const category of CATEGORIES) {
    const label = labels[category];
    if (label === undefined) throw new Error(`Missing category label: ${category}`);
    record[category] = label;
  }
  return record;
}

const dictionary: Record<Language, Copy> = {
  en: {
    languageLabel: "English",
    languageAria: "Language: English. Activate to switch to Norwegian.",
    themeAria: (themeLabel, resolvedLabel) =>
      `Theme: ${themeLabel}. Activate to cycle Auto, Light, and Dark. Showing ${resolvedLabel}.`,
    themeAuto: "Auto",
    themeLight: "Light",
    themeDark: "Dark",
    resolvedLight: "Light",
    resolvedDark: "Dark",
    weekGroup: "Week",
    previousWeek: "Previous week",
    nextWeek: "Next week",
    thisWeek: "This week",
    editingEarlierWeek: "Editing an earlier week",
    weekNumber: (year, week) => `${year} · Week ${week}`,
    saveError: "Couldn't save on this device.",
    logPlant: "Log a plant",
    undo: "Undo",
    emptyCurrentTitle: "Nothing logged yet.",
    emptyPastTitle: "Nothing logged this week.",
    emptyCurrentBody: "Fruit, grains, nuts, herbs, and spices all count. Each plant counts once.",
    weeklyScore: "Weekly score",
    freshWeek: "A fresh week.",
    toThirty: (remaining) => `${remaining} to thirty`,
    toNext: (remaining, goal) => `${remaining} to ${goal}`,
    unknownPlant: "Unknown plant",
    loadNeedsNewer: "This save needs a newer Flora",
    loadCorrupt: "Couldn't read the save",
    loadUntouched: "The original data was left untouched.",
    replacePlant: "Replace plant",
    addingTo: (weekLabel) => `Adding to ${weekLabel}`,
    replacingIn: (weekLabel) => `Replacing in ${weekLabel}`,
    close: "Close",
    searchPlaceholder: "Broccoli, oats, cinnamon…",
    searchPlants: "Search plants",
    oliveOilHint: "Olive oil isn’t counted on its own. Log olives if you ate the fruit.",
    searchHint: "Search for a plant, or type a new one.",
    keepTyping: "Keep typing to search or add a plant.",
    alreadyCounted: (name) => `${name}, already counted this week`,
    logged: "Logged",
    addCustom: (name) => `Add “${name}”`,
    plantsOnePoint: "Plants, 1 point",
    quarterPoint: "Quarter point",
    point: "point",
    points: "points",
    category: categoryLabels({
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
    }),
    replaceWithAnother: "Replace with another plant",
    removeFromWeek: "Remove from this week",
    catalogNote: "This plant keeps its category. Replace it if this is the wrong food.",
    nameLabel: "Name",
    categoryUpdatesWeeks: "Changing the category updates every week that includes this plant.",
    saveChanges: "Save changes",
    loggedOn: (formatted) => `Logged ${formatted}`,
    added: (name) => `Added ${name}`,
    removed: (name) => `Removed ${name}`,
    replacedWith: (name) => `Replaced with ${name}`,
    updated: (name) => `Updated ${name}`,
    duplicateFood: "Already counted this week.",
    emptyName: "Enter a name.",
    foodExists: "That plant is already in your list.",
    couldntSave: "Couldn't save on this device.",
    dateLocale: "en",
  },
  nb: {
    languageLabel: "Norsk",
    languageAria: "Språk: Norsk. Aktiver for å bytte til engelsk.",
    themeAria: (themeLabel, resolvedLabel) =>
      `Tema: ${themeLabel}. Aktiver for å veksle mellom Automatisk, Lys og Mørk. Viser ${resolvedLabel}.`,
    themeAuto: "Auto",
    themeLight: "Lys",
    themeDark: "Mørk",
    resolvedLight: "lys",
    resolvedDark: "mørk",
    weekGroup: "Uke",
    previousWeek: "Forrige uke",
    nextWeek: "Neste uke",
    thisWeek: "Denne uken",
    editingEarlierWeek: "Redigerer en tidligere uke",
    weekNumber: (year, week) => `${year} · Uke ${week}`,
    saveError: "Kunne ikke lagre på denne enheten.",
    logPlant: "Logg en plante",
    undo: "Angre",
    emptyCurrentTitle: "Ingenting er logget ennå.",
    emptyPastTitle: "Ingenting er logget denne uken.",
    emptyCurrentBody:
      "Frukt, korn, nøtter, urter og krydder teller med. Hver plante teller én gang.",
    weeklyScore: "Ukespoeng",
    freshWeek: "En ny uke.",
    toThirty: (remaining) => `${remaining} til tretti`,
    toNext: (remaining, goal) => `${remaining} til ${goal}`,
    unknownPlant: "Ukjent plante",
    loadNeedsNewer: "Denne lagringen trenger en nyere Flora",
    loadCorrupt: "Kunne ikke lese lagringen",
    loadUntouched: "De opprinnelige dataene ble liggende urørt.",
    replacePlant: "Erstatt plante",
    addingTo: (weekLabel) => `Legger til i ${weekLabel}`,
    replacingIn: (weekLabel) => `Erstatter i ${weekLabel}`,
    close: "Lukk",
    searchPlaceholder: "Brokkoli, havre, kanel…",
    searchPlants: "Søk etter planter",
    oliveOilHint: "Olivenolje teller ikke for seg selv. Logg oliven hvis du spiste frukten.",
    searchHint: "Søk etter en plante, eller skriv en ny.",
    keepTyping: "Skriv mer for å søke eller legge til en plante.",
    alreadyCounted: (name) => `${name}, allerede telt denne uken`,
    logged: "Logget",
    addCustom: (name) => `Legg til «${name}»`,
    plantsOnePoint: "Planter, 1 poeng",
    quarterPoint: "Kvart poeng",
    point: "poeng",
    points: "poeng",
    category: categoryLabels({
      vegetable: "Grønnsak",
      fruit: "Frukt",
      berry: "Bær",
      legume: "Belgvekst",
      grain: "Korn",
      nut: "Nøtt",
      seed: "Frø",
      herb: "Urt",
      spice: "Krydder",
      other: "Annet",
    }),
    replaceWithAnother: "Erstatt med en annen plante",
    removeFromWeek: "Fjern fra denne uken",
    catalogNote: "Denne planten beholder kategorien sin. Erstatt den hvis dette er feil mat.",
    nameLabel: "Navn",
    categoryUpdatesWeeks:
      "Endring av kategorien oppdaterer alle uker som inkluderer denne planten.",
    saveChanges: "Lagre endringer",
    loggedOn: (formatted) => `Logget ${formatted}`,
    added: (name) => `La til ${name}`,
    removed: (name) => `Fjernet ${name}`,
    replacedWith: (name) => `Erstattet med ${name}`,
    updated: (name) => `Oppdaterte ${name}`,
    duplicateFood: "Allerede telt denne uken.",
    emptyName: "Skriv inn et navn.",
    foodExists: "Den planten er allerede i listen din.",
    couldntSave: "Kunne ikke lagre på denne enheten.",
    dateLocale: "nb",
  },
};

export function copyFor(language: Language): Copy {
  return dictionary[language];
}
