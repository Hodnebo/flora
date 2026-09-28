import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { CATEGORY_LABEL, pointsForCategory, type Category } from "../domain/category";
import { formatPoints } from "../domain/format";
import { cleanName } from "../domain/log";
import { findFoodByExactName, matchFoods, normalizeQuery } from "../domain/search";
import type { Food } from "../domain/types";
import { actionMessage, type LogStatus } from "./useTracker";

const PLANT_CATEGORIES = [
  "vegetable",
  "fruit",
  "berry",
  "legume",
  "grain",
  "other",
] as const satisfies readonly Category[];

const QUARTER_CATEGORIES = ["nut", "seed", "herb", "spice"] as const satisfies readonly Category[];

type AddPlantDialogProps = {
  presentRef: RefObject<(() => void) | null>;
  open: boolean;
  weekLabel: string;
  loggedFoodIds: ReadonlySet<string>;
  foods: readonly Food[];
  mode: "add" | "replace";
  undoMessage: string | null;
  onUndo: () => void;
  onClose: () => void;
  onPick: (food: Food) => LogStatus;
  onCreate: (name: string, category: Category) => LogStatus;
  onAdded: () => void;
};

export function AddPlantDialog({
  presentRef,
  open,
  weekLabel,
  loggedFoodIds,
  foods,
  mode,
  undoMessage,
  onUndo,
  onClose,
  onPick,
  onCreate,
  onAdded,
}: AddPlantDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    presentRef.current = () => {
      setQuery("");
      setNotice(null);
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (!dialog.open) dialog.showModal();
      inputRef.current?.focus();
    };
    return () => {
      presentRef.current = null;
    };
  }, [presentRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const title = mode === "replace" ? "Replace plant" : "Log a plant";
  const subtitle = mode === "replace" ? `Replacing in ${weekLabel}` : `Adding to ${weekLabel}`;

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="add-plant-title"
      onClick={onBackdropClick}
      onClose={onClose}
    >
      <AddPlantForm
        title={title}
        subtitle={subtitle}
        foods={foods}
        loggedFoodIds={loggedFoodIds}
        query={query}
        notice={notice}
        onQueryChange={(value) => {
          setQuery(value);
          setNotice(null);
        }}
        onNotice={setNotice}
        inputRef={inputRef}
        undoMessage={undoMessage}
        onUndo={onUndo}
        onPick={onPick}
        onCreate={onCreate}
        onAdded={onAdded}
        onDismiss={() => dialogRef.current?.close()}
        closeOnSuccess={mode === "replace"}
      />
    </dialog>
  );
}

function AddPlantForm({
  title,
  subtitle,
  foods,
  loggedFoodIds,
  query,
  notice,
  onQueryChange,
  onNotice,
  inputRef,
  undoMessage,
  onUndo,
  onPick,
  onCreate,
  onAdded,
  onDismiss,
  closeOnSuccess,
}: {
  title: string;
  subtitle: string;
  foods: readonly Food[];
  loggedFoodIds: ReadonlySet<string>;
  query: string;
  notice: string | null;
  onQueryChange: (value: string) => void;
  onNotice: (message: string | null) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  undoMessage: string | null;
  onUndo: () => void;
  onPick: (food: Food) => LogStatus;
  onCreate: (name: string, category: Category) => LogStatus;
  onAdded: () => void;
  onDismiss: () => void;
  closeOnSuccess: boolean;
}) {
  const normalized = normalizeQuery(query);
  const cleaned = cleanName(query);
  const oilOnly = normalized === "olive oil" || normalized.endsWith(" olive oil");
  const matches = oilOnly ? [] : matchFoods(foods, query);
  const exact = !oilOnly && normalized.length >= 2 ? findFoodByExactName(foods, query) : null;
  const showCustom = !oilOnly && normalized.length >= 2 && exact === null && cleaned.length > 0;

  function finish(status: LogStatus) {
    if (!status.ok) {
      onNotice(actionMessage(status.error));
      return;
    }
    onAdded();
    if (closeOnSuccess) {
      onDismiss();
      return;
    }
    onQueryChange("");
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!exact) return;
    if (loggedFoodIds.has(exact.id)) {
      onNotice("Already counted this week.");
      return;
    }
    finish(onPick(exact));
  }

  return (
    <>
      <div className="sheet-top">
        <div className="sheet-head">
          <div>
            <h2 id="add-plant-title" className="display sheet-title">
              {title}
            </h2>
            <p className="sheet-sub">{subtitle}</p>
          </div>
          <button type="button" className="text-btn" onClick={onDismiss}>
            Close
          </button>
        </div>
        <div className="search-wrap">
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            value={query}
            placeholder="Broccoli, oats, cinnamon…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label="Search plants"
            aria-describedby={notice ? "add-plant-notice" : undefined}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {notice ? (
            <p id="add-plant-notice" className="notice" role="alert">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
      <div className="sheet-scroll">
        {oilOnly ? (
          <p className="search-hint">
            Olive oil isn’t counted on its own. Log olives if you ate the fruit.
          </p>
        ) : null}
        {normalized.length === 0 ? (
          <p className="search-hint">Search for a plant, or type a new one.</p>
        ) : null}
        {normalized.length === 1 && matches.length === 0 ? (
          <p className="search-hint">Keep typing to search or add a plant.</p>
        ) : null}
        {matches.length > 0 ? (
          <ul className="results">
            {matches.map((match) => {
              const logged = loggedFoodIds.has(match.food.id);
              const showAlias =
                normalizeQuery(match.matchedLabel) !== normalizeQuery(match.food.canonicalName);
              return (
                <li key={match.food.id}>
                  <button
                    type="button"
                    className="result-row"
                    disabled={logged}
                    aria-label={
                      logged ? `${match.food.canonicalName}, already counted this week` : undefined
                    }
                    onClick={() => finish(onPick(match.food))}
                  >
                    <span className="result-copy">
                      <span className="result-name">{match.food.canonicalName}</span>
                      {showAlias ? (
                        <span className="result-alias">{match.matchedLabel}</span>
                      ) : null}
                      <span className="result-category">{CATEGORY_LABEL[match.food.category]}</span>
                    </span>
                    {logged ? (
                      <span className="logged-flag">Logged</span>
                    ) : (
                      <span className="result-points">
                        {formatPoints(pointsForCategory(match.food.category))}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {showCustom ? (
          <div className="custom-block">
            <p className="display custom-title">Add “{cleaned}”</p>
            <CategoryChips onChoose={(category) => finish(onCreate(cleaned, category))} />
          </div>
        ) : null}
      </div>
      {undoMessage ? (
        <div className="snackbar" role="status">
          <p>{undoMessage}</p>
          <button type="button" onClick={onUndo}>
            Undo
          </button>
        </div>
      ) : null}
    </>
  );
}

export function CategoryChips({
  onChoose,
  pressed,
}: {
  onChoose: (category: Category) => void;
  pressed?: Category;
}) {
  return (
    <div className="chip-groups">
      <ChipGroup
        title="Plants, 1 point"
        categories={PLANT_CATEGORIES}
        onChoose={onChoose}
        pressed={pressed}
      />
      <ChipGroup
        title="Quarter point"
        categories={QUARTER_CATEGORIES}
        onChoose={onChoose}
        pressed={pressed}
      />
    </div>
  );
}

function ChipGroup({
  title,
  categories,
  onChoose,
  pressed,
}: {
  title: string;
  categories: readonly Category[];
  onChoose: (category: Category) => void;
  pressed?: Category;
}) {
  return (
    <fieldset className="chip-group">
      <legend>{title}</legend>
      <div className="chips">
        {categories.map((category) => {
          const points = formatPoints(pointsForCategory(category));
          const unit = points === "1" ? "point" : "points";
          return (
            <button
              key={category}
              type="button"
              className="chip"
              aria-label={`${CATEGORY_LABEL[category]}, ${points} ${unit}`}
              aria-pressed={pressed === undefined ? undefined : pressed === category}
              onClick={() => onChoose(category)}
            >
              {CATEGORY_LABEL[category]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function onBackdropClick(event: MouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const inside =
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;
  if (!inside) event.currentTarget.close();
}
