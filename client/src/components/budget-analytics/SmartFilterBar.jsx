import { useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import SmartFilterAutocomplete from "./SmartFilterAutocomplete";

const EXAMPLES = [
  "show approved budgets",
  "show radiology budgets",
  "show budgets above 500k",
  "status:approved amount>500k",
  "department:radiology variance>20",
  "overspend>10000 benchmark:missing",
];

const STATUS_SUGGESTIONS = [
  {
    label: "status:approved",
    value: "show approved budgets",
    description: "Show approved budgets",
    badge: "Status",
  },
  {
    label: "status:pending",
    value: "show pending budgets",
    description: "Show budgets waiting for approval",
    badge: "Status",
  },
  {
    label: "status:returned",
    value: "show returned budgets",
    description: "Show returned budgets",
    badge: "Status",
  },
  {
    label: "status:draft",
    value: "show draft budgets",
    description: "Show draft budgets",
    badge: "Status",
  },
];

const PRICE_INTELLIGENCE_PREVIEW = [
  {
    label: "variance > 10",
    value: "show budgets with variance > 10",
    description: "Filter by benchmark variance",
    badge: "Risk",
  },
  {
    label: "variance > 20",
    value: "show budgets with variance > 20",
    description: "Filter by benchmark variance",
    badge: "Risk",
  },
  {
    label: "variance > 30",
    value: "show budgets with variance > 30",
    description: "Filter by benchmark variance",
    badge: "Risk",
  },
  {
    label: "overspend > 10000",
    value: "show budgets with overspend > 10000",
    description: "Filter by potential overspend",
    badge: "Risk",
  },
  {
    label: "benchmark:missing",
    value: "show budgets with benchmark:missing",
    description: "Show rows with no historical benchmark",
    badge: "Risk",
  },
];

function matches(value = "", query = "") {
  return String(value).toLowerCase().includes(query.toLowerCase());
}

function toSuggestion(option, prefix, badge) {
  return {
    label: option.label,
    value: `${prefix} ${option.label} budgets`,
    description: `${prefix} ${option.label} budgets`,
    badge,
  };
}

function buildSuggestionGroups(query, options = {}) {
  const q = query.trim();
  if (q.length < 2) return [];

  const departments = (options.departments || [])
    .filter((option) => matches(option.label, q))
    .slice(0, 5)
    .map((option) => toSuggestion(option, "show", "Department"));

  const years = (options.years || [])
    .filter((option) => matches(option.label, q))
    .slice(0, 4)
    .map((option) => ({
      label: option.label,
      value: `show ${option.label} budgets`,
      description: `Filter by financial year ${option.label}`,
      badge: "Year",
    }));

  const itemTypes = (options.types || [])
    .filter((option) => matches(option.label, q))
    .slice(0, 5)
    .map((option) => ({
      label: option.label,
      value: `show budgets with ${option.label}`,
      description: `Search for ${option.label}`,
      badge: "Item",
    }));

  const statuses = STATUS_SUGGESTIONS.filter(
    (item) => matches(item.label, q) || matches(item.value, q),
  ).slice(0, 4);

  const priceIntelligence = PRICE_INTELLIGENCE_PREVIEW.filter(
    (item) => matches(item.label, q) || matches(item.value, q),
  ).slice(0, 3);

  return [
    { label: "Departments", items: departments },
    { label: "Status Filters", items: statuses },
    { label: "Financial Years", items: years },
    { label: "Items", items: itemTypes },
    { label: "Price Intelligence", items: priceIntelligence },
  ].filter((group) => group.items.length > 0);
}

export default function SmartFilterBar({
  options = {},
  onApply,
  onClear,
  onSave,
  currentQuery = "",
}) {
  const [query, setQuery] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestionGroups = useMemo(
    () => buildSuggestionGroups(query, options),
    [query, options],
  );

  const flatSuggestions = useMemo(
    () => suggestionGroups.flatMap((group) => group.items),
    [suggestionGroups],
  );

  function applyQuery(nextQuery = query) {
    setAutocompleteOpen(false);
    setActiveIndex(-1);
    setQuery(nextQuery);
    onApply?.(nextQuery);
  }

  function clearQuery() {
    setQuery("");
    setAutocompleteOpen(false);
    setActiveIndex(-1);
    onClear?.();
  }

  function selectSuggestion(item) {
    setQuery(item.value);
    applyQuery(item.value);
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Sparkles size={16} className="text-blue-700" />
            Smart Filter
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Type a business filter and apply it to the existing analytics view.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setAutocompleteOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setAutocompleteOpen(true)}
            onKeyDown={(event) => {
              if (
                event.key === "ArrowDown" &&
                flatSuggestions.length > 0
              ) {
                event.preventDefault();
                setAutocompleteOpen(true);
                setActiveIndex((prev) =>
                  prev + 1 >= flatSuggestions.length ? 0 : prev + 1,
                );
                return;
              }

              if (event.key === "ArrowUp" && flatSuggestions.length > 0) {
                event.preventDefault();
                setAutocompleteOpen(true);
                setActiveIndex((prev) =>
                  prev <= 0 ? flatSuggestions.length - 1 : prev - 1,
                );
                return;
              }

              if (event.key === "Enter") {
                if (
                  autocompleteOpen &&
                  activeIndex >= 0 &&
                  flatSuggestions[activeIndex]
                ) {
                  event.preventDefault();
                  selectSuggestion(flatSuggestions[activeIndex]);
                  return;
                }

                applyQuery();
              }

              if (event.key === "Escape") {
                setAutocompleteOpen(false);
                setActiveIndex(-1);
              }
            }}
            placeholder="Try: show approved radiology budgets above 500k"
            className="h-12 w-full rounded-xl border border-blue-200 bg-white pl-10 pr-10 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              title="Clear input"
            >
              <X size={16} />
            </button>
          )}

          <SmartFilterAutocomplete
            open={autocompleteOpen}
            groups={suggestionGroups}
            activeIndex={activeIndex}
            onSelect={selectSuggestion}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => applyQuery()}
            className="h-12 rounded-xl bg-blue-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => onSave?.(query || currentQuery)}
            disabled={!(query || currentQuery).trim()}
            className="h-12 rounded-xl border border-blue-200 bg-white px-4 text-sm font-extrabold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={clearQuery}
            className="h-12 rounded-xl border border-blue-200 bg-white px-4 text-sm font-extrabold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuery(example);
              applyQuery(example);
            }}
            className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
