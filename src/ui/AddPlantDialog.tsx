import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { pointsForCategory, type Category } from "../domain/category";
import { formatPoints } from "../domain/format";
import { cleanName } from "../domain/log";
import { findFoodByExactName, matchFoods, normalizeQuery } from "../domain/search";
import type { Food, LanguageSetting } from "../domain/types";
import type { Copy } from "./copy";
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
  copy: Copy;
  language: LanguageSetting;
  nameOf: (food: Food) => string;
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
  copy,
  language,
  nameOf,
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

  const title = mode === "replace" ? copy.replacePlant : copy.logPlant;
  const subtitle = mode === "replace" ? copy.replacingIn(weekLabel) : copy.addingTo(weekLabel);

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
        copy={copy}
        language={language}
        nameOf={nameOf}
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
  copy,
  language,
  nameOf,
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
  copy: Copy;
  language: LanguageSetting;
  nameOf: (food: Food) => string;
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
  const oilOnly = isOliveOil(normalized);
  const matches = oilOnly ? [] : matchFoods(foods, query, 12, language);
  const exact =
    !oilOnly && normalized.length >= 2 ? findFoodByExactName(foods, query, language) : null;
  const showCustom = !oilOnly && normalized.length >= 2 && exact === null && cleaned.length > 0;

  function finish(status: LogStatus) {
    if (!status.ok) {
      onNotice(actionMessage(status.error, copy));
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
      onNotice(copy.duplicateFood);
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
            {copy.close}
          </button>
        </div>
        <div className="search-wrap">
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            value={query}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label={copy.searchPlants}
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
        {oilOnly ? <p className="search-hint">{copy.oliveOilHint}</p> : null}
        {normalized.length === 0 ? <p className="search-hint">{copy.searchHint}</p> : null}
        {normalized.length === 1 && matches.length === 0 ? (
          <p className="search-hint">{copy.keepTyping}</p>
        ) : null}
        {matches.length > 0 ? (
          <ul className="results">
            {matches.map((match) => {
              const logged = loggedFoodIds.has(match.food.id);
              const shown = nameOf(match.food);
              const showAlias = normalizeQuery(match.matchedLabel) !== normalizeQuery(shown);
              return (
                <li key={match.food.id}>
                  <button
                    type="button"
                    className="result-row"
                    disabled={logged}
                    aria-label={logged ? copy.alreadyCounted(shown) : undefined}
                    onClick={() => finish(onPick(match.food))}
                  >
                    <span className="result-copy">
                      <span className="result-name">{shown}</span>
                      {showAlias ? (
                        <span className="result-alias">{match.matchedLabel}</span>
                      ) : null}
                      <span className="result-category">{copy.category[match.food.category]}</span>
                    </span>
                    {logged ? (
                      <span className="logged-flag">{copy.logged}</span>
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
            <p className="display custom-title">{copy.addCustom(cleaned)}</p>
            <CategoryChips
              copy={copy}
              onChoose={(category) => finish(onCreate(cleaned, category))}
            />
          </div>
        ) : null}
      </div>
      {undoMessage ? (
        <div className="snackbar" role="status">
          <p>{undoMessage}</p>
          <button type="button" onClick={onUndo}>
            {copy.undo}
          </button>
        </div>
      ) : null}
    </>
  );
}

export function CategoryChips({
  copy,
  onChoose,
  pressed,
}: {
  copy: Copy;
  onChoose: (category: Category) => void;
  pressed?: Category;
}) {
  return (
    <div className="chip-groups">
      <ChipGroup
        title={copy.plantsOnePoint}
        categories={PLANT_CATEGORIES}
        copy={copy}
        onChoose={onChoose}
        pressed={pressed}
      />
      <ChipGroup
        title={copy.quarterPoint}
        categories={QUARTER_CATEGORIES}
        copy={copy}
        onChoose={onChoose}
        pressed={pressed}
      />
    </div>
  );
}

function ChipGroup({
  title,
  categories,
  copy,
  onChoose,
  pressed,
}: {
  title: string;
  categories: readonly Category[];
  copy: Copy;
  onChoose: (category: Category) => void;
  pressed?: Category;
}) {
  return (
    <fieldset className="chip-group">
      <legend>{title}</legend>
      <div className="chips">
        {categories.map((category) => {
          const points = formatPoints(pointsForCategory(category));
          const unit = points === "1" ? copy.point : copy.points;
          return (
            <button
              key={category}
              type="button"
              className="chip"
              aria-label={`${copy.category[category]}, ${points} ${unit}`}
              aria-pressed={pressed === undefined ? undefined : pressed === category}
              onClick={() => onChoose(category)}
            >
              {copy.category[category]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function isOliveOil(normalized: string): boolean {
  return (
    normalized === "olive oil" ||
    normalized.endsWith(" olive oil") ||
    normalized === "olivenolje" ||
    normalized.endsWith(" olivenolje")
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
