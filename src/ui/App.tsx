import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATEGORY_LABEL,
  WEEKLY_GOAL,
  isQuarterPointCategory,
  pointsForCategory,
} from "../domain/category";
import { formatPoints } from "../domain/format";
import { parseWeekKey, weekRange } from "../domain/isoWeek";
import type { Entry, Food } from "../domain/types";
import { AddPlantDialog } from "./AddPlantDialog";
import { EntryDialog } from "./EntryDialog";
import { ChevronLeft, ChevronRight } from "./icons";
import { useTracker, type Tracker } from "./useTracker";

export function App() {
  const tracker = useTracker();
  if (tracker.loadError) {
    return (
      <div className="shell">
        <LoadError reason={tracker.loadError} />
      </div>
    );
  }
  const today = new Date();
  const weekLabel = formatWeekRange(tracker.weekKey, today);
  return (
    <div className="shell">
      <Header tracker={tracker} weekLabel={weekLabel} />
      <WeekStage key={tracker.weekKey} tracker={tracker} weekLabel={weekLabel} />
    </div>
  );
}

function LoadError({ reason }: { reason: "corrupt" | "unsupported-version" }) {
  const heading =
    reason === "unsupported-version" ? "This save needs a newer Flora" : "Couldn't read the save";
  return (
    <main className="load-error">
      <p className="display wordmark">Flora</p>
      <h1 className="display error-title">{heading}</h1>
      <p className="error-body">The original data was left untouched.</p>
    </main>
  );
}

function Header({ tracker, weekLabel }: { tracker: Tracker; weekLabel: string }) {
  const { year, week } = parseWeekKey(tracker.weekKey);
  const themeAria = `Theme: ${tracker.themeLabel}. Activate to cycle Auto, Light, and Dark. Showing ${tracker.resolvedThemeLabel}.`;
  return (
    <header className="header">
      <div className="header-top">
        <h1 className="display wordmark">Flora</h1>
        <button
          type="button"
          className="text-btn"
          onClick={tracker.cycleTheme}
          aria-label={themeAria}
        >
          {tracker.themeLabel}
        </button>
      </div>
      <div className="stepper" role="group" aria-label="Week">
        <button
          type="button"
          className="icon-btn"
          onClick={tracker.goPrev}
          aria-label="Previous week"
        >
          <ChevronLeft />
        </button>
        <div className="stepper-text">
          <p className="week-range">{weekLabel}</p>
          {tracker.isCurrentWeek ? null : <p className="hint">Editing an earlier week</p>}
          <p className="week-sub">
            {tracker.isCurrentWeek ? (
              "This week"
            ) : (
              <>
                <span>
                  {year} · Week {week}
                </span>
                <button type="button" className="link-btn" onClick={tracker.goToCurrent}>
                  This week
                </button>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={tracker.goNext}
          disabled={tracker.isCurrentWeek}
          aria-disabled={tracker.isCurrentWeek}
          aria-label="Next week"
        >
          <ChevronRight />
        </button>
      </div>
    </header>
  );
}

function WeekStage({ tracker, weekLabel }: { tracker: Tracker; weekLabel: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"add" | "replace">("add");
  const [replaceEntryId, setReplaceEntryId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const presentAdd = useRef<(() => void) | null>(null);

  const openAdd = useCallback(() => {
    setAddMode("add");
    setReplaceEntryId(null);
    setAddOpen(true);
    presentAdd.current?.();
  }, []);
  const registerAddOpener = tracker.registerAddOpener;

  useEffect(() => registerAddOpener(openAdd), [openAdd, registerAddOpener]);

  const activeEntry = tracker.entries.find((entry) => entry.id === activeEntryId) ?? null;
  const activeFood = activeEntry ? (tracker.foods.get(activeEntry.foodId) ?? null) : null;
  const loggedFoodIds = new Set(tracker.entries.map((entry) => entry.foodId));
  const foodList = [...tracker.foods.values()];
  const plants = ledgerRows(tracker.entries, tracker.foods, false);
  const quarters = ledgerRows(tracker.entries, tracker.foods, true);

  function closeAdd() {
    setAddOpen(false);
    setAddMode("add");
    setReplaceEntryId(null);
  }

  function openEntry(entryId: string) {
    setAddOpen(false);
    setActiveEntryId(entryId);
  }

  function closeEntry() {
    setActiveEntryId(null);
  }

  function removeActive() {
    if (!activeEntry) return;
    const name = activeFood?.canonicalName ?? "Unknown plant";
    const entryId = activeEntry.id;
    setActiveEntryId(null);
    tracker.remove(entryId, name);
  }

  function startReplace() {
    if (!activeEntry) return;
    const entrySheet = document.getElementById("entry-sheet");
    if (entrySheet instanceof HTMLDialogElement) entrySheet.close();
    setAddMode("replace");
    setReplaceEntryId(activeEntry.id);
    setActiveEntryId(null);
    setAddOpen(true);
    presentAdd.current?.();
  }

  return (
    <>
      <main className="main">
        {tracker.saveError ? (
          <p className="save-error" role="alert">
            {tracker.saveError}
          </p>
        ) : null}
        <Hero score={tracker.score} weekKey={tracker.weekKey} />
        {tracker.entries.length === 0 ? (
          <EmptyLedger current={tracker.isCurrentWeek} />
        ) : (
          <div className="ledger">
            <LedgerGroup id="plants-heading" label="Plants" rows={plants} onOpen={openEntry} />
            <LedgerGroup
              id="quarter-heading"
              label="Nuts, seeds, herbs and spices"
              rows={quarters}
              onOpen={openEntry}
            />
          </div>
        )}
      </main>
      <footer className="dock">
        <button type="button" className="primary-btn" onClick={openAdd}>
          Log a plant
        </button>
      </footer>
      {tracker.undo && !addOpen ? (
        <div className="snackbar" role="status">
          <p>{tracker.undo.message}</p>
          <button type="button" onClick={tracker.performUndo}>
            Undo
          </button>
        </div>
      ) : null}
      <AddPlantDialog
        presentRef={presentAdd}
        open={addOpen}
        weekLabel={weekLabel}
        loggedFoodIds={loggedFoodIds}
        foods={foodList}
        mode={addMode}
        undoMessage={addOpen ? (tracker.undo?.message ?? null) : null}
        onUndo={tracker.performUndo}
        onClose={closeAdd}
        onPick={(food) =>
          addMode === "replace" && replaceEntryId
            ? tracker.replace(replaceEntryId, food)
            : tracker.addFood(food)
        }
        onCreate={(name, category) =>
          tracker.createCustom(
            name,
            category,
            addMode === "replace" ? (replaceEntryId ?? undefined) : undefined,
          )
        }
        onAdded={() => undefined}
      />
      <EntryDialog
        open={activeEntry !== null}
        entry={activeEntry}
        food={activeFood}
        onClose={closeEntry}
        onRemove={removeActive}
        onReplace={startReplace}
        onSaveCustom={(patch) => {
          if (!activeFood) return { ok: false, error: "not-custom" };
          return tracker.updateCustom(activeFood.id, patch);
        }}
      />
    </>
  );
}

function Hero({ score, weekKey }: { score: number; weekKey: string }) {
  const caption = scoreCaption(score);
  const valueNow = Math.min(Math.max(score, 0), WEEKLY_GOAL);
  const width = Math.min(100, Math.max(0, (score / WEEKLY_GOAL) * 100));
  const scoreRef = useRef<HTMLSpanElement>(null);
  const previous = useRef({ score, weekKey });

  useEffect(() => {
    const before = previous.current;
    previous.current = { score, weekKey };
    if (before.weekKey !== weekKey) return;
    if (before.score >= WEEKLY_GOAL || score < WEEKLY_GOAL) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = scoreRef.current;
    if (!element) return;
    element.classList.remove("score-arrive");
    void element.offsetWidth;
    element.classList.add("score-arrive");
    const onEnd = () => element.classList.remove("score-arrive");
    element.addEventListener("animationend", onEnd, { once: true });
  }, [score, weekKey]);

  return (
    <section className="hero" aria-live="polite" aria-atomic="true">
      <p className="score-line">
        <span ref={scoreRef} className="display score-num">
          {formatPoints(score)}
        </span>
        <span className="score-goal">/ {WEEKLY_GOAL}</span>
      </p>
      <div
        className="track"
        role="progressbar"
        aria-label="Weekly score"
        aria-valuemin={0}
        aria-valuemax={WEEKLY_GOAL}
        aria-valuenow={valueNow}
        aria-valuetext={caption}
      >
        <span className="bar-fill" style={{ width: `${width}%` }} />
        <span className="tick" style={{ left: "33.333%" }} aria-hidden="true" />
        <span className="tick" style={{ left: "66.666%" }} aria-hidden="true" />
      </div>
      <p className="caption">{caption}</p>
    </section>
  );
}

function EmptyLedger({ current }: { current: boolean }) {
  if (!current) {
    return (
      <div className="empty">
        <h2 className="display">Nothing logged this week.</h2>
      </div>
    );
  }
  return (
    <div className="empty">
      <h2 className="display">Nothing logged yet.</h2>
      <p>Fruit, grains, nuts, herbs, and spices all count. Each plant counts once.</p>
    </div>
  );
}

function LedgerGroup({
  id,
  label,
  rows,
  onOpen,
}: {
  id: string;
  label: string;
  rows: LedgerRow[];
  onOpen: (entryId: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="ledger-section" aria-labelledby={id}>
      <h2 id={id} className="section-label">
        <span>{label}</span>
        <span className="section-count">{rows.length}</span>
      </h2>
      <ul className="ledger-list">
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" className="ledger-row" onClick={() => onOpen(row.id)}>
              <span className="ledger-copy">
                <span className="ledger-name">{row.name}</span>
                {row.categoryLabel ? (
                  <span className="ledger-category">{row.categoryLabel}</span>
                ) : null}
              </span>
              {row.pointsLabel ? <span className="ledger-points">{row.pointsLabel}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type LedgerRow = {
  id: string;
  name: string;
  categoryLabel: string | null;
  pointsLabel: string | null;
};

function ledgerRows(
  entries: readonly Entry[],
  foods: ReadonlyMap<string, Food>,
  quarter: boolean,
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const entry of entries) {
    const food = foods.get(entry.foodId);
    if (!food) {
      if (!quarter) {
        rows.push({ id: entry.id, name: "Unknown plant", categoryLabel: null, pointsLabel: null });
      }
      continue;
    }
    if (isQuarterPointCategory(food.category) !== quarter) continue;
    rows.push({
      id: entry.id,
      name: food.canonicalName,
      categoryLabel: CATEGORY_LABEL[food.category],
      pointsLabel: formatPoints(pointsForCategory(food.category)),
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return rows;
}

function scoreCaption(score: number): string {
  if (score <= 0) return "A fresh week.";
  if (score < WEEKLY_GOAL) return `${formatPoints(WEEKLY_GOAL - score)} to thirty`;
  if (score === WEEKLY_GOAL) return "Thirty distinct plants this week.";
  return `${formatPoints(score - WEEKLY_GOAL)} past thirty`;
}

function formatWeekRange(weekKey: string, today: Date): string {
  const { start, end } = weekRange(weekKey);
  const crossesYear = start.getFullYear() !== end.getFullYear();
  const todayYear = today.getFullYear();
  const format = (date: Date) =>
    new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      ...(crossesYear || date.getFullYear() !== todayYear ? { year: "numeric" } : {}),
    }).format(date);
  return `${format(start)} – ${format(end)}`;
}
