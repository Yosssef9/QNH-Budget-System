import { useMemo, useState } from "react";

import CurrencyText from "../CurrencyText";
import EnterpriseSearch from "../EnterpriseSearch";
import LoadingSpinner from "../LoadingSpinner";
import SortableHeader from "../SortableHeader";

import useTableSort from "../../hooks/useTableSort";

const PAGE_SIZE = 10;

function normalize(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).toLowerCase();
}

function getOrderId(row) {
  return row.order_id || row.id;
}

function getItemCode(row) {
  return row.item_code || "-";
}

function getItemDescription(row) {
  return row.item_description || "-";
}

function getSupplier(row) {
  return row.supplier_name || "-";
}

function getPOQty(row) {
  return Number(row.po_qty || 0);
}

function getApprovedQty(row) {
  return Number(row.approved_qty || 0);
}

function getPendingQty(row) {
  return Number(row.pending_qty || 0);
}

function getAvailableQty(row) {
  return Number(row.available_qty || 0);
}

function getUnitCost(row) {
  return Number(row.unit_cost || 0);
}

export default function POLinkTable({
  records = [],
  loading = false,
  onSelect,
  selectedId,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((row) => {
      return [
        getOrderId(row),
        getItemCode(row),
        getItemDescription(row),
        getSupplier(row),
      ]
        .map(normalize)
        .some((value) => value.includes(query));
    });
  }, [records, search]);

  const { sortedRows, sortColumn, sortDirection, handleSort } =
    useTableSort(filteredRecords);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, currentPage]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EnterpriseSearch
        value={search}
        onChange={setSearch}
        placeholder="Search PO records..."
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table>
          <thead>
            <tr>
              <SortableHeader
                label="Order ID"
                field="order_id"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <SortableHeader
                label="Item Code"
                field="item_code"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <SortableHeader
                label="Item Description"
                field="item_description"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <SortableHeader
                label="Supplier"
                field="supplier"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <SortableHeader
                label="PO Qty"
                field="po_qty"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <SortableHeader
                label="Approved Qty"
                field="approved_qty"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <SortableHeader
                label="Pending Qty"
                field="pending_qty"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <SortableHeader
                label="Available Qty"
                field="available_qty"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <SortableHeader
                label="Unit Cost"
                field="unit_cost"
                sortField={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            </tr>
          </thead>

          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No PO records found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const rowId = row.id;

                const selected = String(rowId) === String(selectedId);

                return (
                  <tr
                    key={rowId}
                    onClick={() => onSelect?.(row)}
                    className={`cursor-pointer transition ${
                      selected ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td>{getOrderId(row)}</td>

                    <td>{getItemCode(row)}</td>

                    <td>{getItemDescription(row)}</td>

                    <td>{getSupplier(row)}</td>

                    <td>{getPOQty(row)}</td>

                    <td>{getApprovedQty(row)}</td>

                    <td>{getPendingQty(row)}</td>

                    <td>
                      <span className="font-semibold text-green-700">
                        {getAvailableQty(row)}
                      </span>
                    </td>

                    <td>
                      <CurrencyText value={getUnitCost(row)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
