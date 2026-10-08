import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Filter, Search, X } from "lucide-react";

import EnterpriseSearch from "../../EnterpriseSearch";
import SearchableMultiSelect from "../../SearchableMultiSelect";
import useEscapeKey from "../../../hooks/useEscapeKey";

function SegmentedFilter({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={[
                "rounded-xl border px-3 py-2 text-xs font-bold transition",
                active
                  ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              aria-pressed={active}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DepartmentRequestsToolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  filters,
  onFilterChange,
  onClearFilters,
  onRemoveFilter,
  filterOptions,
  activeFilterChips,
  counts,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterPanelPlacement, setFilterPanelPlacement] = useState({
    top: 16,
    left: 16,
    width: 460,
    maxHeight: 620,
  });

  const filtersAnchorRef = useRef(null);
  const filterButtonRef = useRef(null);
  const filterPanelRef = useRef(null);

  useEscapeKey(() => setFiltersOpen(false), filtersOpen);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    function handleOutsidePointer(event) {
      const target = event.target;

      if (filtersAnchorRef.current?.contains(target)) return;
      if (filterPanelRef.current?.contains(target)) return;

      setFiltersOpen(false);
    }

    document.addEventListener("mousedown", handleOutsidePointer);
    document.addEventListener("touchstart", handleOutsidePointer);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePointer);
      document.removeEventListener("touchstart", handleOutsidePointer);
    };
  }, [filtersOpen]);

  useLayoutEffect(() => {
    if (!filtersOpen) return undefined;

    function updateFilterPanelPlacement() {
      const button = filterButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const viewportPadding = 16;
      const gap = 8;

      if (rect.bottom < 0 || rect.top > viewportHeight) {
        setFiltersOpen(false);
        return;
      }

      const width = Math.min(
        460,
        Math.max(300, viewportWidth - viewportPadding * 2),
      );
      const maxHeight = Math.max(
        320,
        Math.min(620, viewportHeight - viewportPadding * 2),
      );

      const minLeft = viewportPadding;
      const maxLeft = Math.max(
        viewportPadding,
        viewportWidth - width - viewportPadding,
      );
      const left = Math.min(
        Math.max(rect.right - width, minLeft),
        maxLeft,
      );

      const naturalPanelHeight = Math.min(
        filterPanelRef.current?.scrollHeight || maxHeight,
        maxHeight,
      );

      const preferredBelowTop = rect.bottom + gap;
      const preferredAboveTop = rect.top - gap - naturalPanelHeight;
      const fitsBelow =
        preferredBelowTop + naturalPanelHeight <=
        viewportHeight - viewportPadding;
      const fitsAbove = preferredAboveTop >= viewportPadding;

      let top;

      if (fitsBelow) {
        top = preferredBelowTop;
      } else if (fitsAbove) {
        top = preferredAboveTop;
      } else {
        top = Math.min(
          Math.max(preferredBelowTop, viewportPadding),
          Math.max(
            viewportPadding,
            viewportHeight - naturalPanelHeight - viewportPadding,
          ),
        );
      }

      setFilterPanelPlacement({
        top,
        left,
        width,
        maxHeight,
      });
    }

    updateFilterPanelPlacement();
    const frame = window.requestAnimationFrame(updateFilterPanelPlacement);

    window.addEventListener("resize", updateFilterPanelPlacement);
    window.addEventListener("scroll", updateFilterPanelPlacement, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateFilterPanelPlacement);
      window.removeEventListener("scroll", updateFilterPanelPlacement, true);
    };
  }, [filtersOpen]);

  const visibleDescription =
    viewMode === "SUMMARY"
      ? `${counts.visibleRows} item summary row(s) from ${counts.filteredRequests} filtered department request(s)`
      : `${counts.visibleRows} of ${counts.totalRequests} department request(s)`;

  const filterPanel = filtersOpen
    ? createPortal(
        <div
          ref={filterPanelRef}
          role="dialog"
          aria-label="Filter Department Requests"
          style={{
            position: "fixed",
            top: `${filterPanelPlacement.top}px`,
            left: `${filterPanelPlacement.left}px`,
            width: `${filterPanelPlacement.width}px`,
            maxHeight: `${filterPanelPlacement.maxHeight}px`,
          }}
          className="z-[999999990] flex min-h-[500px] flex-col overflow-visible rounded-2xl border border-blue-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] ring-1 ring-blue-100 max-h-[calc(100vh-32px)]"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white px-4 py-4">
            <div>
              <p className="text-sm font-black text-slate-950">
                Filter Department Requests
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Filters apply before Item Summary aggregation.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close filters"
            >
              <X size={17} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Department
                </label>
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  usePortal
                  portalContainerRef={filterPanelRef}
                  value={filters.department}
                  options={filterOptions.departments}
                  onChange={(event) =>
                    onFilterChange(
                      "department",
                      event.target.value || "ALL",
                    )
                  }
                  placeholder="Department"
                />
              </div>

              <SegmentedFilter
                label="Expense Type"
                value={filters.expenseType}
                options={filterOptions.expenseTypes}
                onChange={(value) =>
                  onFilterChange("expenseType", value)
                }
              />

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Distribution Method
                </label>
                <SearchableMultiSelect
                  multiple={false}
                  disableClear
                  usePortal
                  portalContainerRef={filterPanelRef}
                  value={filters.distributionMethod}
                  options={filterOptions.distributionMethods}
                  onChange={(event) =>
                    onFilterChange(
                      "distributionMethod",
                      event.target.value || "ALL",
                    )
                  }
                  placeholder="Distribution"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Review Status
                  </label>
                  <SearchableMultiSelect
                    multiple={false}
                    disableClear
                    usePortal
                    portalContainerRef={filterPanelRef}
                    value={filters.reviewStatus}
                    options={filterOptions.reviewStatuses}
                    onChange={(event) =>
                      onFilterChange(
                        "reviewStatus",
                        event.target.value || "ALL",
                      )
                    }
                    placeholder="Review status"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Adjustment Status
                  </label>
                  <SearchableMultiSelect
                    multiple={false}
                    disableClear
                    usePortal
                    portalContainerRef={filterPanelRef}
                    value={filters.adjustmentStatus}
                    options={filterOptions.adjustmentStatuses}
                    onChange={(event) =>
                      onFilterChange(
                        "adjustmentStatus",
                        event.target.value || "ALL",
                      )
                    }
                    placeholder="Adjustment status"
                  />
                </div>
              </div>

              <SegmentedFilter
                label="Item Type"
                value={filters.projectType}
                options={[
                  { value: "ALL", label: "All" },
                  { value: "PROJECT", label: "Project" },
                  { value: "NON_PROJECT", label: "Non-Project" },
                ]}
                onChange={(value) =>
                  onFilterChange("projectType", value)
                }
              />

              <div className="flex items-center justify-end border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={onClearFilters}
                  disabled={activeFilterChips.length === 0}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-slate-800">
              <Search size={16} className="text-blue-700" />
              Explore department requests
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {visibleDescription}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="w-full lg:w-72">
              <EnterpriseSearch
                value={search}
                onChange={onSearchChange}
                placeholder="Search requests..."
                showClear
              />
            </div>

            <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 lg:w-auto">
              <button
                type="button"
                onClick={() => onViewModeChange("DEPARTMENT")}
                aria-pressed={viewMode === "DEPARTMENT"}
                className={[
                  "flex-1 rounded-lg px-3 py-2 text-xs font-black transition lg:flex-none",
                  viewMode === "DEPARTMENT"
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                Department View
              </button>

              <button
                type="button"
                onClick={() => onViewModeChange("SUMMARY")}
                aria-pressed={viewMode === "SUMMARY"}
                className={[
                  "flex-1 rounded-lg px-3 py-2 text-xs font-black transition lg:flex-none",
                  viewMode === "SUMMARY"
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                Item Summary
              </button>
            </div>

            <div ref={filtersAnchorRef}>
              <button
                ref={filterButtonRef}
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
                aria-haspopup="dialog"
                className={[
                  "inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-black transition lg:w-auto",
                  filtersOpen || activeFilterChips.length > 0
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <Filter size={16} />
                Filters
                {activeFilterChips.length > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] text-white">
                    {activeFilterChips.length}
                  </span>
                ) : null}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    filtersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Active Filters
              </p>

              <button
                type="button"
                onClick={onClearFilters}
                className="text-xs font-black text-blue-700 transition hover:text-blue-900"
              >
                Clear all
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => onRemoveFilter(chip.key)}
                  title="Remove this filter"
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
                >
                  {chip.label}
                  <X size={13} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {filterPanel}
    </>
  );
}
