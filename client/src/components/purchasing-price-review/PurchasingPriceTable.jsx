import {
  BarChart3,
  Check,
  History,
  Lock,
  Paperclip,
  Pencil,
} from "lucide-react";

import CurrencyText from "../CurrencyText";
import Input from "../Input";
import SortableHeader from "../SortableHeader";
import TablePagination from "../TablePagination";
import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";
import PurchasingPriceStatusBadge from "./PurchasingPriceStatusBadge";

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "slate",
  badgeCount = 0,
  highlighted = false,
}) {
  const tones = {
    slate:
      "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",

    violet:
      "border-violet-200 bg-white text-violet-700 hover:bg-violet-50",

    emerald:
      "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",

    blue:
      highlighted
        ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 hover:border-blue-400 hover:bg-blue-100"
        : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",

    amber:
      "border-amber-200 bg-white text-amber-700 hover:bg-amber-50",

    indigo:
      "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50",
  };

  const numericBadgeCount = Number(badgeCount || 0);

  const badgeText =
    numericBadgeCount > 99 ? "99+" : String(numericBadgeCount);

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      <Icon size={16} />

      {numericBadgeCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-2 -top-2 inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black leading-none text-white shadow-sm ring-2 ring-white"
        >
          {badgeText}
        </span>
      ) : null}
    </button>
  );
}

export default function PurchasingPriceTable({
  rows,
  editable,
  busy,
  onPriceChange,
  onPriceBlur,
  priceSaveStates,
  onAccept,
  onReopen,
  onOpenAttachments,
  onOpenHistory,
  onOpenPriceIntelligence,
}) {
  const sortableRows = rows.map((row) => {
    const managerPrice = Number(
      row.category_manager_unit_price || 0,
    );

    const purchasingPrice = Number(
      row.draft_purchasing_unit_price || 0,
    );

    return {
      ...row,
      manager_price_sort: managerPrice,
      purchasing_price_sort: purchasingPrice,
      difference_sort: purchasingPrice - managerPrice,
      total_sort:
        purchasingPrice * Number(row.quantity || 0),
    };
  });

  const {
    sortedRows,
    sortColumn,
    sortDirection,
    handleSort,
  } = useTableSort(
    sortableRows,
    "generic_item_name",
    "asc",
  );

  const pagination = usePagination(
    sortedRows.length,
    25,
  );

  const pageRows = sortedRows.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize,
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-black text-slate-800">
          No package models match the current filters.
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Adjust the search or price-status filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-600">
            <tr>
              <SortableHeader
                label="Generic Item"
                column="generic_item_name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="min-w-52"
              />

              <SortableHeader
                label="Model / Sub-Item"
                column="name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="min-w-56"
              />

              <SortableHeader
                label="Quantity"
                column="quantity"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-right"
              />

              <SortableHeader
                label="Manager Price"
                column="manager_price_sort"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-right"
              />

              <SortableHeader
                label="Purchasing Price"
                column="purchasing_price_sort"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="min-w-48"
              />

              <SortableHeader
                label="Difference"
                column="difference_sort"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-right"
              />

              <SortableHeader
                label="Line Total"
                column="total_sort"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="text-right"
              />

              <SortableHeader
                label="Status"
                column="price_review_status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              <th className="sticky right-0 z-20 w-[196px] min-w-[196px] border border-slate-200 bg-slate-50 px-4 py-3 text-center shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row) => {
              const managerPrice = Number(
                row.category_manager_unit_price || 0,
              );

              const purchasingPrice = Number(
                row.draft_purchasing_unit_price || 0,
              );

              const difference =
                purchasingPrice - managerPrice;

              const accepted =
                row.price_review_status === "ACCEPTED";

              const hasCurrentReview = Boolean(
                row.price_review_id &&
                  row.row_version,
              );

              const saveState =
                priceSaveStates[row.id] || null;

              const rowSaving =
                saveState?.status === "saving";

              const canAccept =
                editable &&
                hasCurrentReview &&
                !accepted &&
                !row.is_dirty &&
                !rowSaving &&
                purchasingPrice >= 1;

              /*
               * Attachment information is already returned
               * by the Purchasing package API.
               *
               * Keep Category Manager and Purchasing counts
               * separate so the tooltip can explain exactly
               * where the attachments came from.
               */
              const categoryManagerAttachmentCount =
                Number(
                  row.category_manager_attachment_count ||
                    0,
                );

              const purchasingAttachmentCount =
                Number(
                  row.purchasing_attachment_count ||
                    0,
                );

              const totalAttachmentCount =
                categoryManagerAttachmentCount +
                purchasingAttachmentCount;

              const hasAttachments =
                totalAttachmentCount > 0;

              /*
               * The tooltip / accessible label gives the user
               * useful information without opening the drawer.
               */
              const attachmentLabel = hasAttachments
                ? `${totalAttachmentCount} attachment${
                    totalAttachmentCount === 1 ? "" : "s"
                  } — ${categoryManagerAttachmentCount} Category Manager, ${purchasingAttachmentCount} Purchasing`
                : "No attachments — click to add";

              return (
                <tr
                  key={row.id}
                  className={`${
                    row.is_dirty
                      ? "bg-amber-50/70"
                      : "bg-white"
                  } align-top hover:bg-slate-50/80`}
                >
                  <td className="border-x border-slate-100 px-4 py-4">
                    <p className="font-black text-slate-900">
                      {row.generic_item_name}
                    </p>

                    {row.cfo_review_status ? (
                      <div className="mt-2">
                        <PurchasingPriceStatusBadge
                          status={
                            row.cfo_review_status
                          }
                        />
                      </div>
                    ) : null}
                  </td>

                  <td className="border-r border-slate-100 px-4 py-4">
                    <p className="font-black text-slate-900">
                      {row.name}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {row.unit_of_measure_name}
                    </p>
                  </td>

                  <td className="border-r border-slate-100 px-4 py-4 text-right font-black text-slate-900">
                    {Number(
                      row.quantity || 0,
                    ).toLocaleString()}
                  </td>

                  <td className="border-r border-slate-100 px-4 py-4 text-right font-black text-slate-700">
                    <CurrencyText
                      value={managerPrice}
                    />
                  </td>

                  <td className="border-r border-slate-100 px-4 py-3">
                    {editable &&
                    hasCurrentReview &&
                    !accepted ? (
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={
                          row.draft_purchasing_unit_price
                        }
                        onChange={(event) =>
                          onPriceChange(
                            row,
                            event.target.value,
                          )
                        }
                        onBlur={() =>
                          onPriceBlur(row)
                        }
                        className="h-10 rounded-lg py-2 text-right font-black"
                        aria-label={`Purchasing price for ${row.name}`}
                        error={
                          purchasingPrice < 1
                            ? "Minimum SAR 1"
                            : undefined
                        }
                      />
                    ) : (
                      <div className="flex items-center justify-end gap-2 font-black text-slate-900">
                        <Lock
                          size={14}
                          className="text-slate-400"
                        />

                        <CurrencyText
                          value={purchasingPrice}
                        />
                      </div>
                    )}

                    {rowSaving ? (
                      <p className="mt-1 text-right text-xs font-black text-blue-700">
                        Saving...
                      </p>
                    ) : saveState?.status ===
                      "error" ? (
                      <p className="mt-1 text-right text-xs font-black text-rose-700">
                        Save failed. Leave the field
                        to retry.
                      </p>
                    ) : saveState?.status ===
                      "saved" ? (
                      <p className="mt-1 text-right text-xs font-black text-emerald-700">
                        Saved
                      </p>
                    ) : row.is_dirty ? (
                      <p className="mt-1 text-right text-xs font-black text-amber-700">
                        Unsaved change
                      </p>
                    ) : null}
                  </td>

                  <td
                    className={`border-r border-slate-100 px-4 py-4 text-right font-black ${
                      difference < 0
                        ? "text-emerald-700"
                        : difference > 0
                          ? "text-rose-700"
                          : "text-slate-500"
                    }`}
                  >
                    {difference > 0 ? "+" : ""}

                    <CurrencyText
                      value={difference}
                    />
                  </td>

                  <td className="border-r border-slate-100 px-4 py-4 text-right font-black text-slate-900">
                    <CurrencyText
                      value={
                        purchasingPrice *
                        Number(row.quantity || 0)
                      }
                    />
                  </td>

                  <td className="border-r border-slate-100 px-4 py-4">
                    <PurchasingPriceStatusBadge
                      status={
                        row.price_review_status
                      }
                    />

                    {row.decision_source ===
                    "CARRIED_FORWARD" ? (
                      <div className="mt-2">
                        <PurchasingPriceStatusBadge status="CARRIED_FORWARD" />
                      </div>
                    ) : null}
                  </td>

                  <td
                    className={`sticky right-0 z-10 w-[196px] min-w-[196px] border-l border-slate-100 px-4 py-3 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)] ${
                      row.is_dirty
                        ? "bg-amber-50"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex flex-nowrap items-center justify-center gap-1.5">
                      {accepted &&
                      editable &&
                      hasCurrentReview ? (
                        <ActionButton
                          icon={Pencil}
                          label="Edit accepted price"
                          onClick={() =>
                            onReopen(row)
                          }
                          disabled={
                            busy || rowSaving
                          }
                          tone="violet"
                        />
                      ) : (
                        <ActionButton
                          icon={Check}
                          label={
                            hasCurrentReview
                              ? "Accept price"
                              : "CFO-accepted price is locked"
                          }
                          onClick={() =>
                            onAccept(row)
                          }
                          disabled={
                            busy || !canAccept
                          }
                          tone="emerald"
                        />
                      )}

                      {/*
                       * Attachment button
                       *
                       * 0 attachments:
                       *   neutral gray/slate appearance
                       *
                       * 1+ attachments:
                       *   blue highlighted appearance
                       *   with numeric badge
                       */}
                      <ActionButton
                        icon={Paperclip}
                        label={attachmentLabel}
                        onClick={() =>
                          onOpenAttachments(row)
                        }
                        disabled={busy}
                        tone="blue"
                        highlighted={hasAttachments}
                        badgeCount={
                          totalAttachmentCount
                        }
                      />

                      <ActionButton
                        icon={BarChart3}
                        label="Price intelligence"
                        onClick={() =>
                          onOpenPriceIntelligence(row)
                        }
                        disabled={busy}
                        tone="amber"
                      />

                      <ActionButton
                        icon={History}
                        label="Price history"
                        onClick={() =>
                          onOpenHistory(row)
                        }
                        disabled={busy}
                        tone="indigo"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        startRow={pagination.startRow}
        endRow={pagination.endRow}
        totalRows={sortedRows.length}
        onPageChange={pagination.setPage}
        onPageSizeChange={
          pagination.setPageSize
        }
      />
    </div>
  );
}