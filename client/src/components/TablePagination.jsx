export default function TablePagination({
  page,
  totalPages,
  pageSize,
  startRow,
  endRow,
  totalRows,
  onPageChange,
  onPageSizeChange,
  pageSizes = [25, 50, 100],
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="text-sm font-semibold text-slate-500">
        Showing <span className="text-slate-900">{startRow}</span>
        {" - "}
        <span className="text-slate-900">{endRow}</span>
        {" of "}
        <span className="text-slate-900">{totalRows}</span>
        {" rows"}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pageSizes.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onPageSizeChange(size)}
            className={[
              "rounded-xl border px-3 py-2 text-xs font-bold transition",
              pageSize === size
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {size}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
          Page {page} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
