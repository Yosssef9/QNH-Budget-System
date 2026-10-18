import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

// Shared sortable <th>: the interactive control is a keyboard-focusable button.
export default function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  className = "",
}) {
  const active = sortColumn === column;
  return (
    <th
      aria-sort={active ? (sortDirection === "desc" ? "descending" : "ascending") : undefined}
      className={`select-none border border-slate-200 px-4 py-3 transition hover:bg-slate-100 ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex w-full items-center justify-between gap-2 text-left font-black outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Sort by ${typeof label === "string" ? label : "column"}${active ? `, currently ${sortDirection === "desc" ? "descending" : "ascending"}` : ""}`}
      >
        <span>{label}</span>
        {!active && <ArrowUpDown size={14} aria-hidden="true" />}
        {active && sortDirection === "asc" && <ArrowUp size={14} aria-hidden="true" />}
        {active && sortDirection === "desc" && <ArrowDown size={14} aria-hidden="true" />}
      </button>
    </th>
  );
}
