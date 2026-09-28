import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Category } from "../domain/category";
import { foodMap } from "../domain/foods";
import { compareWeekKeys, isoWeekKey, isWeekKey, shiftWeek } from "../domain/isoWeek";
import {
  cleanName,
  logCustomFood,
  logFood,
  removeEntry,
  replaceEntryFood,
  replaceEntryWithCustomFood,
  setTheme,
  updateCustomFood,
} from "../domain/log";
import { entriesForWeek, scoreWeek } from "../domain/scoring";
import { findFoodByExactName } from "../domain/search";
import {
  emptyState,
  type DomainError,
  type Food,
  type PersistedState,
  type ThemeSetting,
} from "../domain/types";
import { browserStore } from "../persistence/browserStore";

export type LogStatus = { ok: true } | { ok: false; error: DomainError | "save-failed" };

type UndoState = {
  message: string;
  snapshot: PersistedState;
};

const THEME_ORDER: readonly ThemeSetting[] = ["system", "light", "dark"];

const THEME_LABEL: Record<ThemeSetting, string> = {
  system: "Auto",
  light: "Light",
  dark: "Dark",
};

const SAVE_ERROR = "Couldn't save on this device.";

let didBackup = false;

function subscribeDark(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function systemIsDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readWeekParam(): string | null {
  return new URLSearchParams(window.location.search).get("week");
}

function hrefForWeek(weekKey: string, currentWeek: string): string {
  const url = new URL(window.location.href);
  if (weekKey === currentWeek) url.searchParams.delete("week");
  else url.searchParams.set("week", weekKey);
  return `${url.pathname}${url.search}${url.hash}`;
}

function hereHref(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function readWeekKey(): string {
  const current = isoWeekKey(new Date());
  const param = readWeekParam();
  if (param && isWeekKey(param) && compareWeekKeys(param, current) <= 0) return param;
  return current;
}

function canonicalWeekHref(): string | null {
  const current = isoWeekKey(new Date());
  const param = readWeekParam();
  if (param === null) return null;
  const keep = isWeekKey(param) && compareWeekKeys(param, current) < 0;
  if (keep) return null;
  return hrefForWeek(current, current);
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#121410" : "#f4f0e8");
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useTracker() {
  const [initialLoad] = useState(() => browserStore.load());
  const [state, setState] = useState<PersistedState>(
    initialLoad.ok ? initialLoad.state : emptyState(),
  );
  const stateRef = useRef(state);
  const [weekKey, setWeekKey] = useState(readWeekKey);
  const weekKeyRef = useRef(weekKey);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<number | null>(null);
  const openAddRef = useRef<(() => void) | null>(null);
  const systemDark = useSyncExternalStore(subscribeDark, systemIsDark, () => false);

  const theme = state.settings.theme;
  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useLayoutEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (didBackup || initialLoad.ok) return;
    const raw = initialLoad.raw;
    if (typeof raw !== "string") return;
    didBackup = true;
    browserStore.backup(raw);
  }, [initialLoad]);

  useEffect(() => {
    const href = canonicalWeekHref();
    if (href !== null && href !== hereHref()) window.history.replaceState(null, "", href);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const href = canonicalWeekHref();
      if (href !== null) window.history.replaceState(null, "", href);
      const next = readWeekKey();
      weekKeyRef.current = next;
      setWeekKey(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const registerAddOpener = useCallback((opener: () => void) => {
    openAddRef.current = opener;
    return () => {
      if (openAddRef.current === opener) openAddRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.isComposing)
        return;
      if (event.key !== "/" && event.key !== "n" && event.key !== "N") return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      openAddRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function clearUndoTimer() {
    if (undoTimer.current !== null) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  }

  function commit(next: PersistedState, undoMessage?: string): boolean {
    const saved = browserStore.save(next);
    if (!saved.ok) {
      setSaveError(SAVE_ERROR);
      return false;
    }
    setSaveError(null);
    if (undoMessage) {
      const snapshot = stateRef.current;
      clearUndoTimer();
      setUndo({ message: undoMessage, snapshot });
      undoTimer.current = window.setTimeout(() => {
        undoTimer.current = null;
        setUndo(null);
      }, 5000);
    }
    stateRef.current = next;
    setState(next);
    return true;
  }

  function performUndo() {
    if (!undo) return;
    const saved = browserStore.save(undo.snapshot);
    if (!saved.ok) {
      setSaveError(SAVE_ERROR);
      return;
    }
    setSaveError(null);
    clearUndoTimer();
    stateRef.current = undo.snapshot;
    setState(undo.snapshot);
    setUndo(null);
  }

  function goToWeek(next: string) {
    const current = isoWeekKey(new Date());
    if (!isWeekKey(next) || compareWeekKeys(next, current) > 0) return;
    const href = hrefForWeek(next, current);
    if (hereHref() !== href) window.history.pushState(null, "", href);
    weekKeyRef.current = next;
    setWeekKey(next);
  }

  function goPrev() {
    goToWeek(shiftWeek(weekKeyRef.current, -1));
  }

  function goNext() {
    const current = isoWeekKey(new Date());
    if (compareWeekKeys(weekKeyRef.current, current) >= 0) return;
    goToWeek(shiftWeek(weekKeyRef.current, 1));
  }

  function goToCurrent() {
    goToWeek(isoWeekKey(new Date()));
  }

  function cycleTheme() {
    const current = stateRef.current.settings.theme;
    const index = THEME_ORDER.indexOf(current);
    const next = THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? "system";
    commit(setTheme(stateRef.current, next));
  }

  function addFood(food: Food): LogStatus {
    const result = logFood(stateRef.current, food.id, weekKeyRef.current);
    if (!result.ok) return result;
    if (!commit(result.value, `Added ${food.canonicalName}`))
      return { ok: false, error: "save-failed" };
    return { ok: true };
  }

  function remove(entryId: string, name: string) {
    const result = removeEntry(stateRef.current, entryId);
    if (!result.ok) return;
    commit(result.value, `Removed ${name}`);
  }

  function replace(entryId: string, food: Food): LogStatus {
    const current = stateRef.current;
    const result = replaceEntryFood(current, entryId, food.id);
    if (!result.ok) return result;
    if (result.value === current) return { ok: true };
    if (!commit(result.value, `Replaced with ${food.canonicalName}`)) {
      return { ok: false, error: "save-failed" };
    }
    return { ok: true };
  }

  function createCustom(name: string, category: Category, replaceEntryId?: string): LogStatus {
    const current = stateRef.current;
    const known = [...foodMap(current.customFoods).values()];
    const existing = findFoodByExactName(known, name);
    if (existing) {
      if (replaceEntryId) return replace(replaceEntryId, existing);
      return addFood(existing);
    }

    const label = cleanName(name);
    if (replaceEntryId) {
      const replaced = replaceEntryWithCustomFood(current, replaceEntryId, name, category);
      if (!replaced.ok) return replaced;
      if (!commit(replaced.value, `Replaced with ${label}`)) {
        return { ok: false, error: "save-failed" };
      }
      return { ok: true };
    }

    const created = logCustomFood(current, name, category, weekKeyRef.current);
    if (!created.ok) return created;
    if (!commit(created.value, `Added ${label}`)) return { ok: false, error: "save-failed" };
    return { ok: true };
  }

  function updateCustom(foodId: string, patch: { name?: string; category?: Category }): LogStatus {
    const result = updateCustomFood(stateRef.current, foodId, patch);
    if (!result.ok) return result;
    const updated = result.value.customFoods.find((food) => food.id === foodId);
    const name = updated?.canonicalName ?? patch.name ?? "plant";
    if (!commit(result.value, `Updated ${name}`)) return { ok: false, error: "save-failed" };
    return { ok: true };
  }

  const foods = foodMap(state.customFoods);
  const currentWeek = isoWeekKey(new Date());

  return {
    loadError: initialLoad.ok ? null : initialLoad.reason,
    saveError,
    weekKey,
    isCurrentWeek: compareWeekKeys(weekKey, currentWeek) === 0,
    goToWeek,
    goToCurrent,
    goPrev,
    goNext,
    score: scoreWeek(state, weekKey),
    entries: entriesForWeek(state, weekKey),
    foods,
    undo: undo ? { message: undo.message } : null,
    performUndo,
    cycleTheme,
    theme,
    themeLabel: THEME_LABEL[theme],
    resolvedTheme,
    resolvedThemeLabel: resolvedTheme === "dark" ? "Dark" : "Light",
    addFood,
    remove,
    replace,
    createCustom,
    updateCustom,
    registerAddOpener,
  };
}

export type Tracker = ReturnType<typeof useTracker>;

export function actionMessage(error: string): string {
  if (error === "duplicate-food") return "Already counted this week.";
  if (error === "empty-name") return "Enter a name.";
  if (error === "food-exists") return "That plant is already in your list.";
  return SAVE_ERROR;
}
