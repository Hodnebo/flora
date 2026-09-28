import { useCallback, useEffect, useRef, useState } from "react";
import { WEEKLY_GOAL } from "../domain/category";
import { formatPoints } from "../domain/format";
import { parseWeekKey, weekRange } from "../domain/isoWeek";
import { AddPlantDialog } from "./AddPlantDialog";
import { EntryDialog } from "./EntryDialog";
import { groupLedgerByCategory, type LedgerSection } from "./groupLedger";
import { CategoryIcon, ChevronLeft, ChevronRight } from "./icons";
import { useTracker, type Tracker } from "./useTracker";

export function App() {
  const tracker = useTracker();
  if (tracker.loadError) {
    return (
      <div className="shell">
        <LoadError reason={tracker.loadError} copy={tracker.copy} />
      </div>
    );
  }
  const today = new Date();
  const weekLabel = formatWeekRange(tracker.weekKey, today, tracker.copy.dateLocale);
  return (
    <div className="shell">
      <Header tracker={tracker} weekLabel={weekLabel} />
      <WeekStage key={tracker.weekKey} tracker={tracker} weekLabel={weekLabel} />
    </div>
  );
}

function LoadError({
  reason,
  copy,
}: {
  reason: "corrupt" | "unsupported-version";
  copy: Tracker["copy"];
}) {
  const heading = reason === "unsupported-version" ? copy.loadNeedsNewer : copy.loadCorrupt;
  return (
    <main className="load-error">
      <p className="display wordmark">Flora</p>
      <h1 className="display error-title">{heading}</h1>
      <p className="error-body">{copy.loadUntouched}</p>
    </main>
  );
}

function Header({ tracker, weekLabel }: { tracker: Tracker; weekLabel: string }) {
  const { year, week } = parseWeekKey(tracker.weekKey);
  const { copy } = tracker;
  const themeAria = copy.themeAria(tracker.themeLabel, tracker.resolvedThemeLabel);
  return (
    <header className="header">
      <div className="header-top">
        <h1 className="display wordmark">Flora</h1>
        <div className="header-actions">
          <button
            type="button"
            className="text-btn"
            onClick={tracker.cycleLanguage}
            aria-label={copy.languageAria}
          >
            {copy.languageLabel}
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={tracker.cycleTheme}
            aria-label={themeAria}
          >
            {tracker.themeLabel}
          </button>
        </div>
      </div>
      <div className="stepper" role="group" aria-label={copy.weekGroup}>
        <button
          type="button"
          className="icon-btn"
          onClick={tracker.goPrev}
          aria-label={copy.previousWeek}
        >
          <ChevronLeft />
        </button>
        <div className="stepper-text">
          <p className="week-range">{weekLabel}</p>
          {tracker.isCurrentWeek ? null : <p className="hint">{copy.editingEarlierWeek}</p>}
          <p className="week-sub">
            {tracker.isCurrentWeek ? (
              copy.thisWeek
            ) : (
              <>
                <span>{copy.weekNumber(year, week)}</span>
                <button type="button" className="link-btn" onClick={tracker.goToCurrent}>
                  {copy.thisWeek}
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
          aria-label={copy.nextWeek}
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
  const ledgerSections = groupLedgerByCategory({
    entries: tracker.entries,
    foods: tracker.foods,
    dateLocale: tracker.copy.dateLocale,
    categoryLabels: tracker.copy.category,
    unknownPlantLabel: tracker.copy.unknownPlant,
    nameOf: tracker.nameOf,
  });

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
    const name = activeFood ? tracker.nameOf(activeFood) : tracker.copy.unknownPlant;
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
        <Hero score={tracker.score} weekKey={tracker.weekKey} copy={tracker.copy} />
        {tracker.entries.length === 0 ? (
          <EmptyLedger current={tracker.isCurrentWeek} copy={tracker.copy} />
        ) : (
          <div className="ledger">
            {ledgerSections.map((section) => (
              <LedgerGroup
                key={section.kind === "category" ? section.category : "unknown"}
                section={section}
                onOpen={openEntry}
              />
            ))}
          </div>
        )}
      </main>
      <footer className="dock">
        <button type="button" className="primary-btn" onClick={openAdd}>
          {tracker.copy.logPlant}
        </button>
      </footer>
      {tracker.undo && !addOpen ? (
        <div className="snackbar" role="status">
          <p>{tracker.undo.message}</p>
          <button type="button" onClick={tracker.performUndo}>
            {tracker.copy.undo}
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
        copy={tracker.copy}
        language={tracker.language}
        nameOf={tracker.nameOf}
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
        copy={tracker.copy}
        language={tracker.language}
        nameOf={tracker.nameOf}
        onSaveCustom={(patch) => {
          if (!activeFood) return { ok: false, error: "not-custom" };
          return tracker.updateCustom(activeFood.id, patch);
        }}
      />
    </>
  );
}

function Hero({ score, weekKey, copy }: { score: number; weekKey: string; copy: Tracker["copy"] }) {
  const caption = scoreCaption(score, copy);
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
        aria-label={copy.weeklyScore}
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

function EmptyLedger({ current, copy }: { current: boolean; copy: Tracker["copy"] }) {
  if (!current) {
    return (
      <div className="empty">
        <h2 className="display">{copy.emptyPastTitle}</h2>
      </div>
    );
  }
  return (
    <div className="empty">
      <h2 className="display">{copy.emptyCurrentTitle}</h2>
      <p>{copy.emptyCurrentBody}</p>
    </div>
  );
}

function LedgerGroup({
  section,
  onOpen,
}: {
  section: LedgerSection;
  onOpen: (entryId: string) => void;
}) {
  const { rows, label } = section;
  const id = section.kind === "category" ? `ledger-${section.category}` : "ledger-unknown";
  return (
    <section className="ledger-section" aria-labelledby={id}>
      <h2 id={id} className="section-label section-title">
        {section.kind === "category" ? (
          <span className="section-title-start">
            <CategoryIcon category={section.category} />
            <span>{label}</span>
          </span>
        ) : (
          <span>{label}</span>
        )}
        <span className="section-count">{rows.length}</span>
      </h2>
      <ul className="ledger-list">
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" className="ledger-row" onClick={() => onOpen(row.id)}>
              <span className="ledger-copy">
                <span className="ledger-name">{row.name}</span>
              </span>
              {row.pointsLabel ? <span className="ledger-points">{row.pointsLabel}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function scoreCaption(score: number, copy: Tracker["copy"]): string {
  if (score <= 0) return copy.freshWeek;
  if (score < WEEKLY_GOAL) return copy.toThirty(formatPoints(WEEKLY_GOAL - score));
  if (score === WEEKLY_GOAL) return copy.thirtyExact;
  return copy.pastThirty(formatPoints(score - WEEKLY_GOAL));
}

function formatWeekRange(weekKey: string, today: Date, locale: string): string {
  const { start, end } = weekRange(weekKey);
  const crossesYear = start.getFullYear() !== end.getFullYear();
  const todayYear = today.getFullYear();
  const format = (date: Date) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      ...(crossesYear || date.getFullYear() !== todayYear ? { year: "numeric" } : {}),
    }).format(date);
  return `${format(start)} – ${format(end)}`;
}
