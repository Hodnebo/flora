import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { CATEGORY_LABEL, pointsForCategory, type Category } from "../domain/category";
import { formatPoints } from "../domain/format";
import { cleanName } from "../domain/log";
import type { Entry, Food } from "../domain/types";
import { CategoryChips } from "./AddPlantDialog";
import { actionMessage, type LogStatus } from "./useTracker";

type EntryDialogProps = {
  open: boolean;
  entry: Entry | null;
  food: Food | null;
  onClose: () => void;
  onRemove: () => void;
  onReplace: () => void;
  onSaveCustom: (patch: { name?: string; category?: Category }) => LogStatus;
};

export function EntryDialog({
  open,
  entry,
  food,
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

  const name = food?.canonicalName ?? "Unknown plant";
  const loggedLabel = entry ? formatLoggedDate(entry.loggedAt) : null;

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
                Close
              </button>
            </div>
          </div>
          <div className="sheet-scroll">
            {food?.source === "custom" ? (
              <CustomEditor key={food.id} food={food} onSave={onSaveCustom} onClose={onClose} />
            ) : food ? (
              <CatalogDetails food={food} />
            ) : null}
            <div className="entry-actions">
              <button type="button" className="secondary-btn" onClick={onReplace}>
                Replace with another plant
              </button>
              <button type="button" className="danger-btn" onClick={onRemove}>
                Remove from this week
              </button>
            </div>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

function CatalogDetails({ food }: { food: Food }) {
  const points = formatPoints(pointsForCategory(food.category));
  const unit = points === "1" ? "point" : "points";
  return (
    <div className="entry-details">
      <p className="entry-meta">
        {CATEGORY_LABEL[food.category]} · {points} {unit}
      </p>
      <p className="note">This plant keeps its category. Replace it if this is the wrong food.</p>
    </div>
  );
}

function CustomEditor({
  food,
  onSave,
  onClose,
}: {
  food: Food;
  onSave: (patch: { name?: string; category?: Category }) => LogStatus;
  onClose: () => void;
}) {
  const [name, setName] = useState(food.canonicalName);
  const [category, setCategory] = useState<Category>(food.category);
  const [error, setError] = useState<string | null>(null);
  const points = formatPoints(pointsForCategory(category));
  const unit = points === "1" ? "point" : "points";

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
    setError(actionMessage(status.error));
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="field" htmlFor="plant-name">
        <span className="field-label">Name</span>
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
      <CategoryChips pressed={category} onChoose={setCategory} />
      <p id="plant-name-help" className="note">
        Changing the category updates every week that includes this plant.
      </p>
      <button type="submit" className="primary-btn save-btn">
        Save changes
      </button>
    </form>
  );
}

function formatLoggedDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  return `Logged ${formatted}`;
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
