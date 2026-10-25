import { ClipboardList, ShieldX } from "lucide-react";

/** Secondary workspace tabs; the three workflow stages are independent. */
export default function CategoryExclusionTabs({ stage, value, onChange, count, loading }) {
  const options = [
    { key: "main", label: stage === "departments" ? "Department Reviews" : "Package Items", icon: ClipboardList },
    { key: "excluded", label: "Excluded Items", icon: ShieldX },
  ];

  function handleKeyDown(event, index) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onChange(options[nextIndex].key);
    document.getElementById(`category-exclusion-tab-${stage}-${options[nextIndex].key}`)?.focus();
  }

  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-4">
    <div role="tablist" aria-label={stage === "departments" ? "Department reviews sections" : "Package preparation sections"} className="flex flex-wrap items-center gap-2">
      {options.map((tab, index) => {
        const active = value === tab.key;
        const Icon = tab.icon;
        return <button
          key={tab.key}
          id={`category-exclusion-tab-${stage}-${tab.key}`}
          type="button"
          role="tab"
          aria-selected={active}
          aria-controls={`category-exclusion-panel-${stage}-${tab.key}`}
          tabIndex={active ? 0 : -1}
          onClick={() => onChange(tab.key)}
          onKeyDown={event => handleKeyDown(event, index)}
          className={`relative inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${active
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
        >
          <Icon size={16} aria-hidden="true" />
          {tab.label}
          {tab.key === "excluded" && !loading ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}`}>{count}</span> : null}
        </button>;
      })}
      <p className="ml-auto hidden text-xs text-slate-500 sm:block">{value === "excluded" ? "Read-only exclusions" : "Category Manager workspace"}</p>
    </div>
  </div>;
}
