import { useEffect, useMemo, useState } from "react";

export default function usePagination(totalRows, initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalRows / pageSize)),
    [totalRows, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function resetPage() {
    setPage(1);
  }

  return {
    page,
    setPage,
    resetPage,
    pageSize,
    setPageSize,
    totalPages,
    startRow: totalRows === 0 ? 0 : (page - 1) * pageSize + 1,
    endRow: Math.min(page * pageSize, totalRows),
  };
}
