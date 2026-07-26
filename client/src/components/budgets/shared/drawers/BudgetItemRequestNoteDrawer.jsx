import { FileText, X } from "lucide-react";

import Input from "../../../Input";
import { toNumber } from "../../../../utils/number";

import AnimatedDrawer from "./AnimatedDrawer";

const MAX_NOTE_LENGTH = 3000;

function formatNumber(value) {
  return Number(toNumber(value)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function formatMethod(method) {
  return String(method || "-").replaceAll("_", " ");
}

export default function BudgetItemRequestNoteDrawer({
  open,
  onClose,
  itemName,
  categoryName,
  departmentName,
  requestedQuantity,
  distributionMethod,
  note,
  onNoteChange,
  editable = false,
}) {
  const value = note || "";
  const remaining = MAX_NOTE_LENGTH - value.length;

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                <FileText size={14} />
                HOD Request Note
              </div>

              <h2 className="mt-3 truncate text-2xl font-black text-slate-950">
                {itemName || "Budget item"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {editable
                  ? "Explain the model, specification, location, or business context needed by the Category Manager."
                  : "Read-only context submitted by the department for Category Manager review."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close HOD note"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                Category
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {categoryName || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                Department
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {departmentName || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                Requested Quantity
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatNumber(requestedQuantity)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                Distribution
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatMethod(distributionMethod)}
              </p>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {editable ? (
              <>
                <Input
                  label="Request note"
                  multiline
                  rows={10}
                  maxLength={MAX_NOTE_LENGTH}
                  value={value}
                  onChange={(event) => onNoteChange?.(event.target.value)}
                  placeholder="Example: Need lightweight laptops for ward rounds; preferred screen size around 14 inches; must support Arabic/English keyboard."
                  className="text-sm leading-6"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <p className="font-medium text-slate-500">
                    This note is visible to the Category Manager and remains
                    separate from review notes.
                  </p>
                  <span
                    className={`font-black ${
                      remaining < 100 ? "text-amber-700" : "text-slate-500"
                    }`}
                  >
                    {remaining.toLocaleString()} characters remaining
                  </span>
                </div>
              </>
            ) : value ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                  {value}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  No HOD note was added for this item.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </AnimatedDrawer>
  );
}

