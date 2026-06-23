export default function SmartFilterAutocomplete({
  open = false,
  groups = [],
  activeIndex = -1,
  onSelect,
}) {
  const flatSuggestions = groups.flatMap((group) => group.items);

  if (!open || flatSuggestions.length === 0) return null;

  let currentIndex = -1;

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.14)] ring-1 ring-slate-100">
      <div className="max-h-80 overflow-y-auto p-2">
        {groups.map((group) => {
          if (group.items.length === 0) return null;

          return (
            <div key={group.label} className="py-1">
              <p className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  currentIndex += 1;
                  const selected = currentIndex === activeIndex;

                  return (
                    <button
                      key={`${group.label}-${item.value}`}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onSelect?.(item);
                      }}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                        selected
                          ? "bg-blue-50 text-blue-800"
                          : "text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                            {item.description}
                          </span>
                        )}
                      </span>

                      {item.badge && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
