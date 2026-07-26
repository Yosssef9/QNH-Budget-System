import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  PackageSearch,
  ReceiptText,
  X,
} from "lucide-react";

import AnimatedDrawer from "./AnimatedDrawer";
import CurrencyText from "../../../CurrencyText";
import LoadingSpinner from "../../../LoadingSpinner";
import POLinkStatusBadge from "../../../po/POLinkStatusBadge";
import usePackageSubItemPOLinks from "../../../../hooks/po/usePackageSubItemPOLinks";
import { formatDateTime, formatDate } from "../../../../utils/dateFormatters";
import { formatQty } from "../../../../utils/numberFormatter";
import SortableHeader from "../../../SortableHeader";
import useTableSort from "../../../../hooks/useTableSort";
import usePagination from "../../../../hooks/usePagination";
import TablePagination from "../../../TablePagination";

function SummaryMetric({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={20} />
        </div>
      </div>
      {description && (
        <p className="mt-3 text-sm font-medium text-slate-500">{description}</p>
      )}
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-bold text-slate-900">
        {value ?? "-"}
      </span>
    </div>
  );
}

function POLinkCard({ link }) {
  if (!link) return null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <POLinkStatusBadge status={link.status} />
          <h3 className="mt-3 text-lg font-bold text-slate-900">
            {link.supplier_name || "-"}
          </h3>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase text-slate-400">
            Linked Amount
          </p>
          <div className="mt-1 text-lg font-bold text-blue-700">
            <CurrencyText value={link.linked_amount || 0} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase text-slate-700">
            <PackageSearch size={16} className="text-blue-600" />
            PO Information
          </h4>

          <DetailLine label="Item Description" value={link.item_description} />
          <DetailLine label="Invoice Number" value={link.invoice_no} />
          <DetailLine
            label="Invoice Due Date"
            value={formatDate(link.invoice_due_date)}
          />
          <DetailLine label="Order ID" value={link.order_id} />
          <DetailLine label="Item Code" value={link.item_code} />
          <DetailLine label="PO Quantity" value={formatQty(link.po_qty)} />
          <DetailLine
            label="PO Unit Cost"
            value={<CurrencyText value={link.po_unit_cost || 0} />}
          />
          <DetailLine
            label="PO Net Amount"
            value={<CurrencyText value={link.po_net_amount || 0} />}
          />
        </section>

        <section className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase text-slate-700">
            <ReceiptText size={16} className="text-blue-600" />
            Link Information
          </h4>

          <DetailLine
            label="Requested Quantity"
            value={formatQty(link.requested_qty)}
          />
          <DetailLine
            label="Unit Cost"
            value={<CurrencyText value={link.unit_cost || 0} />}
          />
          <DetailLine
            label="Linked Amount"
            value={<CurrencyText value={link.linked_amount || 0} />}
          />
          <DetailLine label="Requested By" value={link.requested_by_name} />
          <DetailLine
            label="Requested At"
            value={formatDateTime(link.requested_at)}
          />
          <DetailLine label="Approved By" value={link.approved_by_name} />
          <DetailLine
            label="Approved At"
            value={formatDateTime(link.approved_at)}
          />
          <DetailLine label="Rejected By" value={link.rejected_by_name} />
          <DetailLine
            label="Rejected At"
            value={formatDateTime(link.rejected_at)}
          />
          <DetailLine label="Rejection Reason" value={link.rejection_reason} />
        </section>
      </div>
    </article>
  );
}

function POLinksTable({ links, selectedLinkId, onSelectLink }) {
  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    links,
    "approved_at",
    "desc",
  );
  const pagination = usePagination(sortedRows.length, 25);
  const paginatedRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [pagination.page, pagination.pageSize, sortedRows]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="enterprise-scrollbar max-h-[420px] overflow-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-sm">
            <tr>
              <SortableHeader label="Supplier" column="supplier_name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Invoice No" column="invoice_no" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Requested Qty" column="requested_qty" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right" />
              <SortableHeader label="Linked Amount" column="linked_amount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right" />
              <SortableHeader label="Requested By" column="requested_by_name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Decision Date" column="approved_at" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Status" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            </tr>
          </thead>

          <tbody>
            {paginatedRows.map((link) => {
              const selected = String(link.id) === String(selectedLinkId);
              return (
                <tr
                  key={link.id}
                  onClick={() => onSelectLink(String(link.id))}
                  className={`cursor-pointer transition ${selected ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                >
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {link.supplier_name || "-"}
                    </div>
                    <div className="mt-1 max-w-[260px] truncate text-xs font-medium text-slate-500">
                      {link.item_description || "-"}
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                    {link.invoice_no || "-"}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right font-bold text-slate-900">
                    {formatQty(link.requested_qty)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right font-bold text-blue-700">
                    <CurrencyText value={link.linked_amount || 0} />
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                    {link.requested_by_name || "-"}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">
                    {formatDateTime(link.approved_at || link.rejected_at || link.requested_at)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <POLinkStatusBadge status={link.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          totalRows={sortedRows.length}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>
    </div>
  );
}

export default function PackageSubItemPOLinksDrawer({
  open,
  packageSubItemId,
  onClose,
}) {
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const { data, isLoading, isError } = usePackageSubItemPOLinks(
    open ? packageSubItemId : null,
  );

  const packageSubItem = data?.packageSubItem;
  const summary = data?.summary || {};
  const links = useMemo(() => data?.links || [], [data?.links]);
  const selectedLink =
    links.find((link) => String(link.id) === String(selectedLinkId)) ||
    links[0] ||
    null;

  return (
    <AnimatedDrawer open={open} onClose={onClose} fullScreen>
      <div className="flex h-full flex-col bg-slate-50">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Linked POs for Package Sub-Item
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Approved and pending PO link records that affect this package model balance.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <LoadingSpinner fill />
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              Failed to load linked PO records.
            </div>
          )}

          {!isLoading && !isError && (
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailLine label="Package Sub-Item" value={packageSubItem?.name} />
                  <DetailLine label="Category" value={packageSubItem?.category_name} />
                  <DetailLine label="Financial Year" value={packageSubItem?.financial_year} />
                  <DetailLine label="Base Quantity" value={formatQty(packageSubItem?.base_quantity)} />
                  <DetailLine label="Unit Price" value={<CurrencyText value={packageSubItem?.unit_price || 0} />} />
                  <DetailLine label="Base Amount" value={<CurrencyText value={packageSubItem?.base_amount || 0} />} />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-4">
                <SummaryMetric title="Approved PO Links" value={summary.approvedLinkCount || 0} description="Approved records included in PO Used" icon={CheckCircle2} />
                <SummaryMetric title="Pending PO Links" value={summary.pendingLinkCount || 0} description="Pending requests reserve quantity" icon={Clock3} />
                <SummaryMetric title="Total PO Used" value={<CurrencyText value={summary.totalPOUsed || 0} />} description="Approved linked amount" icon={ReceiptText} />
                <SummaryMetric title="Pending Reserved Qty" value={formatQty(summary.totalPendingQuantity || 0)} description="Quantity held by pending requests" icon={FileText} />
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    PO Link Records
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Approved links count as PO Used. Pending links reserve capacity until approved or rejected.
                  </p>
                </div>

                {links.length > 0 ? (
                  <div className="space-y-4">
                    <POLinksTable
                      links={links}
                      selectedLinkId={selectedLink?.id}
                      onSelectLink={setSelectedLinkId}
                    />

                    <div>
                      <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                        Selected PO Details
                      </h4>
                      <POLinkCard link={selectedLink} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
                    No PO links found for this package sub-item.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </AnimatedDrawer>
  );
}
