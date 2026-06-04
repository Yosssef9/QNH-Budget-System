import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

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
      onClick={() => onSort(column)}
      className={`
        cursor-pointer
        select-none
        border
        border-slate-200
        px-4
        py-3
        transition
        hover:bg-slate-100
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>

        {!active && <ArrowUpDown size={14} />}

        {active && sortDirection === "asc" && <ArrowUp size={14} />}

        {active && sortDirection === "desc" && <ArrowDown size={14} />}
      </div>
    </th>
  );
}
