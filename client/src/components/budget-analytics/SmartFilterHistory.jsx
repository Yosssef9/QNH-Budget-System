import { Bookmark, Clock3, Trash2 } from "lucide-react";

export default function SmartFilterHistory({
  recentSearches = [],
  savedSearches = [],
  onApply,
  onDeleteSaved,
  onClearRecent,
}) {
  if (recentSearches.length === 0 && savedSearches.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {recentSearches.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              <Clock3 size={14} />
              Recent Searches
            </h4>

            <button
              type="button"
              onClick={onClearRecent}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <button
                key={item.query}
                type="button"
                onClick={() => onApply?.(item.query)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.query}
              </button>
            ))}
          </div>
        </section>
      )}

      {savedSearches.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <h4 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            <Bookmark size={14} />
            Saved Searches
          </h4>

          <div className="space-y-2">
            {savedSearches.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onApply?.(item.query)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-extrabold text-slate-800">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                    {item.query}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteSaved?.(item.id)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-red-600"
                  title="Delete saved search"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
