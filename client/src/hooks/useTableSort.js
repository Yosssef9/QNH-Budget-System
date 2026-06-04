import { useMemo, useState } from "react";

export default function useTableSort(
  rows = [],
  defaultColumn = null,
  defaultDirection = "asc",
) {
  const [sortColumn, setSortColumn] =
    useState(defaultColumn);

  const [sortDirection, setSortDirection] =
    useState(defaultDirection);

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  }

  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows;

    return [...rows].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (
        typeof aValue === "number" &&
        typeof bValue === "number"
      ) {
        return sortDirection === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      return sortDirection === "asc"
        ? String(aValue).localeCompare(
            String(bValue),
          )
        : String(bValue).localeCompare(
            String(aValue),
          );
    });
  }, [rows, sortColumn, sortDirection]);

  return {
    sortedRows,
    sortColumn,
    sortDirection,
    handleSort,
  };
}