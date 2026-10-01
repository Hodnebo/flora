import { useCallback, useEffect, useRef, useState } from "react";
import { WEEKLY_GOAL } from "../domain/category";
import { formatPoints } from "../domain/format";
import { parseWeekKey, weekRange } from "../domain/isoWeek";
import { AddPlantDialog } from "./AddPlantDialog";
import { EntryDialog } from "./EntryDialog";
import { ChevronLeft, ChevronRight } from "./icons";
import {
  groupLedgerByDay,
  activeGoal,
  layoutScoreBar,
  localDayKey,
  stretchTier,
  type DayLedgerSection,
} from "./weekDays";
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
  const daySections = groupLedgerByDay({
    entries: tracker.entries,
    foods: tracker.foods,
    dateLocale: tracker.copy.dateLocale,
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
        <Hero
          score={tracker.score}
          weekKey={tracker.weekKey}
          copy={tracker.copy}
          daySections={daySections}
          todayKey={tracker.isCurrentWeek ? localDayKey(new Date().toISOString()) : null}
        />
        {tracker.entries.length === 0 ? (
          <EmptyLedger current={tracker.isCurrentWeek} copy={tracker.copy} />
        ) : (
          <div className="ledger">
            {daySections.map((section) => (
              <DayLedgerGroup key={section.dayKey} section={section} onOpen={openEntry} />
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

function Hero({
  score,
  weekKey,
  copy,
  daySections,
  todayKey,
}: {
  score: number;
  weekKey: string;
  copy: Tracker["copy"];
  daySections: readonly DayLedgerSection[];
  todayKey: string | null;
}) {
  const caption = scoreCaption(score, copy);
  const stage = barStage(score);
  const layout = layoutScoreBar(daySections, todayKey);
  const valueNow = Math.min(Math.max(score, 0), layout.scaleMax);
  const todaySegment = layout.segments.find((segment) => segment.kind === "today");
  const valueText = heroValueText(caption, todayKey, daySections, layout.todayCount);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const previous = useRef({ score, weekKey, stage });

  useEffect(() => {
    const before = previous.current;
    previous.current = { score, weekKey, stage };
    if (before.weekKey !== weekKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const crossedGoal = stretchTier(score) > stretchTier(before.score);
    if (crossedGoal) cheer(scoreRef.current, "score-arrive");
    if (BAR_STAGE_RANK[stage] > BAR_STAGE_RANK[before.stage] || crossedGoal)
      cheer(barRef.current, "bar-cheer");
  }, [score, weekKey, stage]);

  const todayCenter = todaySegment ? todaySegment.leftPercent + todaySegment.widthPercent / 2 : 0;
  const todayAlign = todayCenter > 90 ? "end" : todayCenter < 10 ? "start" : "center";

  return (
    <section className="hero" data-stage={stage} aria-live="polite" aria-atomic="true">
      <p className="score-line">
        <span ref={scoreRef} className="display score-num">
          {formatPoints(score)}
        </span>
        <span className="score-goal">/ {layout.scaleMax}</span>
      </p>
      <div className="bar-wrap">
        {todaySegment && layout.todayCount !== null ? (
          <div className="bar-counts" aria-hidden="true">
            <span className="bar-count" data-align={todayAlign} style={{ left: `${todayCenter}%` }}>
              +{layout.todayCount}
            </span>
          </div>
        ) : null}
        <div
          className="track"
          role="progressbar"
          aria-label={copy.weeklyScore}
          aria-valuemin={0}
          aria-valuemax={layout.scaleMax}
          aria-valuenow={valueNow}
          aria-valuetext={valueText}
        >
          <div ref={barRef} className="bar-segments">
            {layout.segments.map((segment, index) => (
              <span
                key={`${segment.kind}-${index}`}
                className={
                  segment.kind === "today"
                    ? `bar-segment bar-today${segment.leftPercent > 0 ? " bar-today-join" : ""}`
                    : "bar-segment bar-base"
                }
                style={{
                  left: `${segment.leftPercent}%`,
                  width: `${segment.widthPercent}%`,
                }}
              />
            ))}
          </div>
          {layout.ticks.map((tick) => (
            <span key={tick} className="tick" style={{ left: `${tick}%` }} aria-hidden="true" />
          ))}
        </div>
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

function DayLedgerGroup({
  section,
  onOpen,
}: {
  section: DayLedgerSection;
  onOpen: (entryId: string) => void;
}) {
  const { rows, label, count, dayKey, weekdayIndex } = section;
  const id = `ledger-day-${dayKey}`;
  return (
    <section className="ledger-section" aria-labelledby={id}>
      <h2 id={id} className="section-label section-title">
        <span className="section-title-start">
          <span className="day-swatch" data-weekday={weekdayIndex} aria-hidden="true" />
          <span>{label}</span>
        </span>
        <span className="section-count">{count}</span>
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

type BarStage = "early" | "ten" | "twenty" | "goal";

const BAR_STAGE_RANK: Record<BarStage, number> = {
  early: 0,
  ten: 1,
  twenty: 2,
  goal: 3,
};

function barStage(score: number): BarStage {
  if (score >= WEEKLY_GOAL) return "goal";
  if (score >= 20) return "twenty";
  if (score >= 10) return "ten";
  return "early";
}

function cheer(element: HTMLElement | null, className: string) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  const onEnd = () => element.classList.remove(className);
  element.addEventListener("animationend", onEnd, { once: true });
}

function scoreCaption(score: number, copy: Tracker["copy"]): string {
  if (score <= 0) return copy.freshWeek;
  if (score < WEEKLY_GOAL) return copy.toThirty(formatPoints(WEEKLY_GOAL - score));
  const next = activeGoal(score);
  return copy.toNext(formatPoints(next - score), next);
}

function heroValueText(
  caption: string,
  todayKey: string | null,
  daySections: readonly DayLedgerSection[],
  todayCount: number | null,
): string {
  if (todayKey === null || todayCount === null) return caption;
  const today = daySections.find((section) => section.dayKey === todayKey);
  if (!today) return caption;
  return `${caption}. ${today.label}, ${todayCount}`;
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
