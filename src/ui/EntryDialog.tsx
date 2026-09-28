import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { pointsForCategory, type Category } from "../domain/category";
import { formatPoints } from "../domain/format";
import { cleanName } from "../domain/log";
import type { Entry, Food, LanguageSetting } from "../domain/types";
import { CategoryChips } from "./AddPlantDialog";
import type { Copy } from "./copy";
import { actionMessage, type LogStatus } from "./useTracker";

type EntryDialogProps = {
  open: boolean;
  entry: Entry | null;
  food: Food | null;
  copy: Copy;
  language: LanguageSetting;
  nameOf: (food: Food) => string;
  onClose: () => void;
  onRemove: () => void;
  onReplace: () => void;
  onSaveCustom: (patch: { name?: string; category?: Category }) => LogStatus;
};

export function EntryDialog({
  open,
  entry,
  food,
  copy,
  language,
  nameOf,
  onClose,
  onRemove,
  onReplace,
  onSaveCustom,
}: EntryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input[name='plant-name']")?.focus();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const name = food ? nameOf(food) : copy.unknownPlant;
  const loggedLabel = entry ? formatLoggedDate(entry.loggedAt, copy, language) : null;

  return (
    <dialog
      id="entry-sheet"
      ref={dialogRef}
      className="sheet"
      aria-labelledby="entry-title"
      onClick={onBackdropClick}
      onClose={onClose}
    >
      {open && entry ? (
        <>
          <div className="sheet-top">
            <div className="sheet-head">
              <div>
                <h2 id="entry-title" className="display sheet-title">
                  {name}
                </h2>
                {loggedLabel ? <p className="sheet-sub">{loggedLabel}</p> : null}
              </div>
              <button type="button" className="text-btn" onClick={() => dialogRef.current?.close()}>
                {copy.close}
              </button>
            </div>
          </div>
          <div className="sheet-scroll">
            {food?.source === "custom" ? (
              <CustomEditor
                key={food.id}
                food={food}
                copy={copy}
                onSave={onSaveCustom}
                onClose={onClose}
              />
            ) : food ? (
              <CatalogDetails food={food} copy={copy} />
            ) : null}
            <div className="entry-actions">
              <button type="button" className="secondary-btn" onClick={onReplace}>
                {copy.replaceWithAnother}
              </button>
              <button type="button" className="danger-btn" onClick={onRemove}>
                {copy.removeFromWeek}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

function CatalogDetails({ food, copy }: { food: Food; copy: Copy }) {
  const points = formatPoints(pointsForCategory(food.category));
  const unit = points === "1" ? copy.point : copy.points;
  return (
    <div className="entry-details">
      <p className="entry-meta">
        {copy.category[food.category]} · {points} {unit}
      </p>
      <p className="note">{copy.catalogNote}</p>
    </div>
  );
}

function CustomEditor({
  food,
  copy,
  onSave,
  onClose,
}: {
  food: Food;
  copy: Copy;
  onSave: (patch: { name?: string; category?: Category }) => LogStatus;
  onClose: () => void;
}) {
  const [name, setName] = useState(food.canonicalName);
  const [category, setCategory] = useState<Category>(food.category);
  const [error, setError] = useState<string | null>(null);
  const points = formatPoints(pointsForCategory(category));
  const unit = points === "1" ? copy.point : copy.points;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = cleanName(name);
    if (cleaned.length > 0 && cleaned === food.canonicalName && category === food.category) {
      onClose();
      return;
    }
    const patch: { name?: string; category?: Category } = {};
    if (cleaned !== food.canonicalName) patch.name = name;
    if (category !== food.category) patch.category = category;
    const status = onSave(patch);
    if (status.ok) {
      onClose();
      return;
    }
    setError(actionMessage(status.error, copy));
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="field" htmlFor="plant-name">
        <span className="field-label">{copy.nameLabel}</span>
      </label>
      <input
        id="plant-name"
        name="plant-name"
        className="text-input"
        value={name}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={error !== null}
        aria-describedby={error ? "plant-name-error plant-name-help" : "plant-name-help"}
        onChange={(event) => {
          setName(event.target.value);
          setError(null);
        }}
      />
      {error ? (
        <p id="plant-name-error" className="notice" role="alert">
          {error}
        </p>
      ) : null}
      <p className="entry-meta points-line">
        {points} {unit}
      </p>
      <CategoryChips copy={copy} pressed={category} onChoose={setCategory} />
      <p id="plant-name-help" className="note">
        {copy.categoryUpdatesWeeks}
      </p>
      <button type="submit" className="primary-btn save-btn">
        {copy.saveChanges}
      </button>
    </form>
  );
}

function formatLoggedDate(iso: string, copy: Copy, locale: LanguageSetting): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  return copy.loggedOn(formatted);
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
