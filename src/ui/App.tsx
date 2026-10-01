import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type ReactNode,
} from "react";
import { WEEKLY_GOAL } from "../domain/category";
import type { LedgerGrouping } from "../domain/types";
import { formatPoints } from "../domain/format";
import { parseWeekKey, weekRange } from "../domain/isoWeek";
import { AddPlantDialog } from "./AddPlantDialog";
import { EntryDialog } from "./EntryDialog";
import { groupLedgerByCategory, type LedgerSection } from "./groupLedger";
import { CategoryIcon, ChevronLeft, ChevronRight } from "./icons";
import {
  groupLedgerByDay,
  activeGoal,
  layoutScoreBar,
  localDayKey,
  stretchTier,
  type DayLedgerSection,
  type ScoreBarLayout,
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
  const categorySections = groupLedgerByCategory({
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
        <Hero
          score={tracker.score}
          weekKey={tracker.weekKey}
          copy={tracker.copy}
          daySections={daySections}
          todayKey={tracker.isCurrentWeek ? localDayKey(new Date().toISOString()) : null}
          deferMotion={addOpen}
        />
        {tracker.entries.length === 0 ? (
          <EmptyLedger current={tracker.isCurrentWeek} copy={tracker.copy} />
        ) : (
          <>
            <GroupingSwitch
              grouping={tracker.grouping}
              copy={tracker.copy}
              onChange={tracker.chooseGrouping}
            />
            <div className="ledger">
              {tracker.grouping === "category"
                ? categorySections.map((section) => (
                    <CategoryLedgerGroup
                      key={section.kind === "category" ? section.category : "unknown"}
                      section={section}
                      onOpen={openEntry}
                    />
                  ))
                : daySections.map((section) => (
                    <DayLedgerGroup key={section.dayKey} section={section} onOpen={openEntry} />
                  ))}
            </div>
          </>
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
  deferMotion,
}: {
  score: number;
  weekKey: string;
  copy: Tracker["copy"];
  daySections: readonly DayLedgerSection[];
  todayKey: string | null;
  deferMotion: boolean;
}) {
  const caption = scoreCaption(score, copy);
  const stage = barStage(score);
  const layout = layoutScoreBar(daySections, todayKey);
  const valueNow = Math.min(Math.max(score, 0), layout.scaleMax);
  const todaySegmentLive = layout.segments.find((segment) => segment.kind === "today");
  const valueText = heroValueText(caption, todayKey, daySections, layout.todayCount);
  const todayCount = layout.todayCount ?? 0;
  const todayWidth = todaySegmentLive?.widthPercent ?? 0;
  const [motion, setMotion] = useState<HeroMotion>(() => ({
    weekKey,
    score,
    stage,
    todayCount,
    todayWidth,
    burst: 0,
    grow: false,
    wash: false,
  }));
  const [held, setHeld] = useState<HeldHero | null>(null);
  if (deferMotion) {
    if (held === null) {
      setHeld({ score, caption, stage, layout, valueText, valueNow });
    }
  } else if (held !== null) {
    setHeld(null);
    setMotion(
      advanceHeroMotion(motion, {
        weekKey,
        score,
        stage,
        todayCount,
        todayWidth,
        todayKey,
      }),
    );
  } else if (
    motion.weekKey !== weekKey ||
    motion.score !== score ||
    motion.stage !== stage ||
    motion.todayCount !== todayCount ||
    motion.todayWidth !== todayWidth
  ) {
    setMotion(
      advanceHeroMotion(motion, {
        weekKey,
        score,
        stage,
        todayCount,
        todayWidth,
        todayKey,
      }),
    );
  }

  const viewScore = held?.score ?? score;
  const viewCaption = held?.caption ?? caption;
  const viewStage = held?.stage ?? stage;
  const viewLayout = held?.layout ?? layout;
  const viewValueText = held?.valueText ?? valueText;
  const viewValueNow = held?.valueNow ?? valueNow;
  const todaySegment = viewLayout.segments.find((segment) => segment.kind === "today");

  const scoreRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (motion.burst === 0) return;
    if (motion.grow) {
      replay(trackRef.current);
      replay(todayRef.current);
      replay(countRef.current);
    }
    if (motion.wash) replay(scoreRef.current);
  }, [motion.burst, motion.grow, motion.wash]);

  function clearGrow(event: AnimationEvent<HTMLDivElement>) {
    if (event.animationName !== "track-bloom") return;
    const burst = Number(event.currentTarget.dataset.burst);
    setMotion((current) => (current.burst === burst ? { ...current, grow: false } : current));
  }

  function clearWash(event: AnimationEvent<HTMLSpanElement>) {
    if (event.animationName !== "bar-wash") return;
    const burst = Number(event.currentTarget.dataset.burst);
    setMotion((current) => (current.burst === burst ? { ...current, wash: false } : current));
  }

  const todayCenter = todaySegment ? todaySegment.leftPercent + todaySegment.widthPercent / 2 : 0;
  const todayAlign = todayCenter > 90 ? "end" : todayCenter < 10 ? "start" : "center";

  return (
    <section className="hero" data-stage={viewStage} aria-live="polite" aria-atomic="true">
      <p className="score-line">
        <span
          ref={scoreRef}
          className={motion.wash ? "display score-num score-arrive" : "display score-num"}
        >
          {formatPoints(viewScore)}
        </span>
        <span className="score-goal">/ {viewLayout.scaleMax}</span>
      </p>
      <div className="bar-wrap">
        {todaySegment && viewLayout.todayCount !== null ? (
          <div className="bar-counts" aria-hidden="true">
            <span className="bar-count" data-align={todayAlign} style={{ left: `${todayCenter}%` }}>
              <span
                ref={countRef}
                className={motion.grow ? "bar-count-value bar-count-pop" : "bar-count-value"}
              >
                +{viewLayout.todayCount}
              </span>
            </span>
          </div>
        ) : null}
        <div
          ref={trackRef}
          className={motion.grow ? "track bar-bloom" : "track"}
          data-motion={motion.grow ? "grow" : undefined}
          data-burst={motion.burst}
          role="progressbar"
          aria-label={copy.weeklyScore}
          aria-valuemin={0}
          aria-valuemax={viewLayout.scaleMax}
          aria-valuenow={viewValueNow}
          aria-valuetext={viewValueText}
          onAnimationEnd={clearGrow}
        >
          <div className="bar-segments">
            {viewLayout.segments.map((segment, index) => (
              <span
                key={`${segment.kind}-${index}`}
                ref={segment.kind === "today" ? todayRef : undefined}
                className={
                  segment.kind === "today"
                    ? `bar-segment bar-today${segment.leftPercent > 0 ? " bar-today-join" : ""}${motion.grow ? " bar-pulse" : ""}`
                    : "bar-segment bar-base"
                }
                style={{
                  left: `${segment.leftPercent}%`,
                  width: `${segment.widthPercent}%`,
                }}
              >
                {segment.kind === "today" && motion.grow ? (
                  <span key={motion.burst} className="bar-comet" />
                ) : null}
              </span>
            ))}
          </div>
          <div className="bar-fx" aria-hidden="true">
            {motion.wash ? (
              <span
                key={motion.burst}
                className="bar-wash"
                data-burst={motion.burst}
                onAnimationEnd={clearWash}
              />
            ) : null}
          </div>
          {viewLayout.ticks.map((tick) => (
            <span key={tick} className="tick" style={{ left: `${tick}%` }} aria-hidden="true" />
          ))}
        </div>
      </div>
      <p className="caption">{viewCaption}</p>
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

function GroupingSwitch({
  grouping,
  copy,
  onChange,
}: {
  grouping: LedgerGrouping;
  copy: Tracker["copy"];
  onChange: (grouping: LedgerGrouping) => void;
}) {
  return (
    <div className="group-switch" role="radiogroup" aria-label={copy.groupPlants}>
      <GroupOption
        selected={grouping === "day"}
        label={copy.byDay}
        onSelect={() => onChange("day")}
      />
      <GroupOption
        selected={grouping === "category"}
        label={copy.byCategory}
        onSelect={() => onChange("category")}
      />
    </div>
  );
}

function GroupOption({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      className="group-option"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const group = event.currentTarget.parentElement;
        if (!(group instanceof HTMLElement)) return;
        const options = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
        const index = options.indexOf(event.currentTarget);
        if (index < 0) return;
        const next = event.key === "ArrowRight" ? index + 1 : index - 1;
        const target = options[(next + options.length) % options.length];
        target?.focus();
        target?.click();
      }}
    >
      {label}
    </button>
  );
}

function DayLedgerGroup({
  section,
  onOpen,
}: {
  section: DayLedgerSection;
  onOpen: (entryId: string) => void;
}) {
  return (
    <LedgerGroup
      id={`ledger-day-${section.dayKey}`}
      label={section.label}
      count={section.count}
      mark={<span className="day-swatch" data-weekday={section.weekdayIndex} aria-hidden="true" />}
      rows={section.rows}
      onOpen={onOpen}
    />
  );
}

function CategoryLedgerGroup({
  section,
  onOpen,
}: {
  section: LedgerSection;
  onOpen: (entryId: string) => void;
}) {
  const id = section.kind === "category" ? `ledger-cat-${section.category}` : "ledger-cat-unknown";
  return (
    <LedgerGroup
      id={id}
      label={section.label}
      count={section.rows.length}
      mark={
        section.kind === "category" ? (
          <span className="section-icon">
            <CategoryIcon category={section.category} />
          </span>
        ) : (
          <span className="day-swatch section-unknown" aria-hidden="true" />
        )
      }
      rows={section.rows}
      onOpen={onOpen}
    />
  );
}

function LedgerGroup({
  id,
  label,
  count,
  mark,
  rows,
  onOpen,
}: {
  id: string;
  label: string;
  count: number;
  mark: ReactNode;
  rows: readonly { id: string; name: string; pointsLabel: string | null }[];
  onOpen: (entryId: string) => void;
}) {
  return (
    <section className="ledger-section" aria-labelledby={id}>
      <h2 id={id} className="section-label section-title">
        <span className="section-title-start">
          {mark}
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

type HeldHero = {
  score: number;
  caption: string;
  stage: BarStage;
  layout: ScoreBarLayout;
  valueText: string;
  valueNow: number;
};

type HeroMotion = {
  weekKey: string;
  score: number;
  stage: BarStage;
  todayCount: number;
  todayWidth: number;
  burst: number;
  grow: boolean;
  wash: boolean;
};

function advanceHeroMotion(
  current: HeroMotion,
  next: {
    weekKey: string;
    score: number;
    stage: BarStage;
    todayCount: number;
    todayWidth: number;
    todayKey: string | null;
  },
): HeroMotion {
  if (current.weekKey !== next.weekKey) {
    return {
      weekKey: next.weekKey,
      score: next.score,
      stage: next.stage,
      todayCount: next.todayCount,
      todayWidth: next.todayWidth,
      burst: current.burst,
      grow: false,
      wash: false,
    };
  }
  const grew = next.score > current.score + 0.001;
  const grewToday = next.todayWidth > current.todayWidth + 0.01;
  const allow = grew && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const grow = allow && (next.todayKey === null || grewToday);
  const wash =
    allow &&
    (BAR_STAGE_RANK[next.stage] > BAR_STAGE_RANK[current.stage] ||
      stretchTier(next.score) > stretchTier(current.score));
  return {
    weekKey: next.weekKey,
    score: next.score,
    stage: next.stage,
    todayCount: next.todayCount,
    todayWidth: next.todayWidth,
    burst: grow || wash ? current.burst + 1 : current.burst,
    grow,
    wash,
  };
}

function replay(element: HTMLElement | null) {
  if (!element) return;
  element.style.animation = "none";
  void element.offsetWidth;
  element.style.animation = "";
}

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
