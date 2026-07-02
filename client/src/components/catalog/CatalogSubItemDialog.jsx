import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";

import CatalogSubItemFields from "./CatalogSubItemFields";

const emptyForm = {
  sub_item_code: "",
  name: "",
  default_specification: "",
  default_unit_of_measure_id: "",
};

function toFormValue(subItem) {
  if (!subItem) return emptyForm;

  return {
    sub_item_code: subItem.sub_item_code || "",
    name: subItem.name || "",
    default_specification: subItem.default_specification || "",
    default_unit_of_measure_id: subItem.default_unit_of_measure_id
      ? String(subItem.default_unit_of_measure_id)
      : "",
  };
}

export default function CatalogSubItemDialog({
  open,
  mode,
  catalogItem,
  subItem,
  unitsOfMeasure,
  loadingUnitsOfMeasure,
  loading,
  onCancel,
  onSubmit,
}) {
  const titleId = "catalog-sub-item-dialog-title";
  const closeButtonRef = useRef(null);
  const [formValue, setFormValue] = useState(() => toFormValue(subItem));
  const isEditing = mode === "edit";
  const isGeneral = Boolean(subItem?.is_default_general);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || loading) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onCancel, open]);

  const subtitle = useMemo(() => {
    if (!catalogItem?.name) return "";
    return `Reusable model under ${catalogItem.name}`;
  }, [catalogItem]);

  if (!open) return null;

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      sub_item_code: formValue.sub_item_code.trim(),
      name: formValue.name.trim(),
      default_specification: formValue.default_specification.trim() || null,
      default_unit_of_measure_id: Number(
        formValue.default_unit_of_measure_id,
      ),
      is_default_general: isGeneral,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-slate-900">
              {isEditing ? "Edit reusable sub-item" : "Create reusable sub-item"}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
            aria-label="Close reusable sub-item dialog"
          >
            <X size={18} />
          </button>
        </div>

        {isGeneral && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            General is the protected default reusable model. Its code and name
            stay locked, but the default specification and unit can be updated.
          </div>
        )}

        <div className="mt-5">
          <CatalogSubItemFields
            value={formValue}
            onChange={setFormValue}
            unitsOfMeasure={unitsOfMeasure}
            loadingUnitsOfMeasure={loadingUnitsOfMeasure}
            lockIdentity={isGeneral}
            disabled={loading}
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              loadingUnitsOfMeasure ||
              !formValue.sub_item_code.trim() ||
              !formValue.name.trim() ||
              !formValue.default_unit_of_measure_id
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            {isEditing ? "Save reusable model" : "Create reusable model"}
          </button>
        </div>
      </form>
    </div>
  );
}
