import { X } from "lucide-react";

export default function AppliedFilterChips({
  chips = [],
  warnings = [],
  onRemove,
  onClear,
}) {
  if (chips.length === 0 && warnings.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {chips.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Applied Smart Filters
            </p>

            <button
              type="button"
              onClick={onClear}
              className="text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              Clear smart filters
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => onRemove?.(chip)}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
                title="Remove this smart filter"
              >
                <span>{chip.label}</span>
                <X size={13} />
              </button>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  );
}
