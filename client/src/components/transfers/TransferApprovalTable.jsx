import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  PackageCheck,
  XCircle,
} from "lucide-react";

import CurrencyText from "../CurrencyText";
import { formatDateTime } from "../../utils/dateFormatters";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function amount(quantity, unitPrice) {
  return Number(quantity || 0) * Number(unitPrice || 0);
}

function getStatusClasses(status) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getStatusText(status) {
  switch (status) {
    case "APPROVED":
      return "Approved";

    case "REJECTED":
      return "Rejected";

    default:
      return "Pending Approval";
  }
}

function PackageModelPanel({
  tone,
  eyebrow,
  itemName,
  modelName,
  expenseType,
  unitPrice,
  quantity,
  remainingBefore,
  remainingAfter,
}) {
  const isSource = tone === "source";

  const border = isSource
    ? "border-red-100 bg-red-50"
    : "border-emerald-100 bg-emerald-50";

  const label = isSource
    ? "text-red-600"
    : "text-emerald-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${border}`}>
      <div className={`text-xs font-black uppercase ${label}`}>
        {eyebrow}
      </div>

      <div className="mt-1 text-sm font-black text-slate-950">
        {itemName || "-"}
      </div>

      <div className={`mt-1 text-xs font-bold ${label}`}>
        {modelName || "Package model"}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-white px-2 py-1 text-slate-700">
          {expenseType || "Item"}
        </span>

        <span className="rounded-full bg-white px-2 py-1 text-slate-700">
          Unit <CurrencyText value={unitPrice || 0} />
        </span>

        <span className="rounded-full bg-white px-2 py-1 text-slate-700">
          Qty {formatQuantity(quantity)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-[10px] font-black uppercase text-slate-400">
            Before
          </div>

          <div className="text-xs font-black text-slate-900">
            {formatQuantity(remainingBefore)} units
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            <CurrencyText
              value={amount(remainingBefore, unitPrice)}
            />
          </div>
        </div>

        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-[10px] font-black uppercase text-slate-400">
            After
          </div>

          <div className="text-xs font-black text-slate-900">
            {formatQuantity(remainingAfter)} units
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            <CurrencyText
              value={amount(remainingAfter, unitPrice)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransferApprovalTable({
  transfers,
  onView,
  onApprove,
  onReject,
}) {
  const [expandedRows, setExpandedRows] = useState({});

  const groupedTransfers = useMemo(
    () => transfers || [],
    [transfers],
  );

  function toggleRow(id) {
    setExpandedRows((previousRows) => ({
      ...previousRows,
      [id]: !previousRows[id],
    }));
  }

  if (!groupedTransfers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        No transfer requests found.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {groupedTransfers.map((row) => {
        const isOpen = Boolean(expandedRows[row.id]);
        const isPending =
          row.status === "PENDING_APPROVAL";

        const sourceUnitPrice =
          row.source_unit_price_snapshot ||
          row.from_unit_price ||
          0;

        const destinationUnitPrice =
          row.destination_unit_price_snapshot ||
          row.to_unit_price ||
          0;

        const detailsId =
          `transfer-request-details-${row.id}`;

        return (
          <article
            key={row.id}
            className={[
              "overflow-hidden rounded-3xl border bg-white shadow-sm",
              "transition-[border-color,box-shadow] duration-200",
              isOpen
                ? "border-blue-200 shadow-md"
                : "border-slate-200 hover:border-blue-200 hover:shadow-md",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => toggleRow(row.id)}
              aria-expanded={isOpen}
              aria-controls={detailsId}
              className={[
                "flex w-full flex-col gap-4 p-5 text-left",
                "xl:flex-row xl:items-start xl:justify-between",
                "transition-colors duration-200",
                isOpen
                  ? "bg-blue-50/20"
                  : "bg-white hover:bg-slate-50/60",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-bold",
                      getStatusClasses(row.status),
                    ].join(" ")}
                  >
                    {getStatusText(row.status)}
                  </span>

                  <span className="text-xs font-bold text-slate-400">
                    Request #{row.id}
                  </span>

                  {row.category_name ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      <PackageCheck size={14} />
                      {row.category_name}
                    </span>
                  ) : null}

                  {row.financial_year ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      FY {row.financial_year}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
                  <PackageModelPanel
                    tone="source"
                    eyebrow="Source package model"
                    itemName={row.from_item_name}
                    modelName={row.from_sub_item_name}
                    expenseType={row.from_expense_type}
                    unitPrice={sourceUnitPrice}
                    quantity={row.source_quantity}
                    remainingBefore={
                      row.from_remaining_before_transfer ??
                      row.from_base_quantity
                    }
                    remainingAfter={
                      row.from_remaining_after_transfer ??
                      Number(row.from_base_quantity || 0) -
                        Number(row.source_quantity || 0)
                    }
                  />

                  <div className="flex justify-center">
                    <span className="rounded-full bg-blue-600 p-2 text-white">
                      <ArrowRight size={18} />
                    </span>
                  </div>

                  <PackageModelPanel
                    tone="destination"
                    eyebrow="Destination package model"
                    itemName={row.to_item_name}
                    modelName={row.to_sub_item_name}
                    expenseType={row.to_expense_type}
                    unitPrice={destinationUnitPrice}
                    quantity={row.destination_quantity}
                    remainingBefore={
                      row.to_remaining_before_transfer ??
                      row.to_base_quantity
                    }
                    remainingAfter={
                      row.to_remaining_after_transfer ??
                      Number(row.to_base_quantity || 0) +
                        Number(row.destination_quantity || 0)
                    }
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 xl:min-w-[270px]">
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Transfer Amount
                  </div>

                  <div className="mt-1 text-xl font-black text-slate-950">
                    <CurrencyText value={row.amount || 0} />
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Requested{" "}
                    {row.requested_at
                      ? formatDateTime(row.requested_at)
                      : "-"}
                  </div>
                </div>

                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={[
                    "shrink-0 text-slate-500",
                    "transition-transform duration-300",
                    "ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key={`transfer-details-${row.id}`}
                  id={detailsId}
                  initial={{
                    height: 0,
                    opacity: 0,
                  }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                  }}
                  transition={{
                    height: {
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    opacity: {
                      duration: 0.2,
                      ease: "easeOut",
                    },
                  }}
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={{
                      y: -8,
                    }}
                    animate={{
                      y: 0,
                    }}
                    exit={{
                      y: -8,
                    }}
                    transition={{
                      duration: 0.25,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="border-t border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                      <div className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 text-sm font-black text-slate-950">
                          Transfer Detail
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <div className="text-xs font-bold uppercase text-slate-500">
                              Requested By
                            </div>

                            <div className="mt-1 text-sm font-semibold text-slate-800">
                              {row.requested_by_name || "-"}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-bold uppercase text-slate-500">
                              Source Quantity
                            </div>

                            <div className="mt-1 text-sm font-semibold text-slate-800">
                              {formatQuantity(
                                row.source_quantity,
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-bold uppercase text-slate-500">
                              Destination Quantity
                            </div>

                            <div className="mt-1 text-sm font-semibold text-slate-800">
                              {formatQuantity(
                                row.destination_quantity,
                              )}
                            </div>
                          </div>
                        </div>

                        {row.reason ? (
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                              <FileText size={14} />
                              Business Reason
                            </div>

                            <p className="text-sm leading-6 text-slate-700">
                              {row.reason}
                            </p>
                          </div>
                        ) : null}

                        {row.rejection_note ? (
                          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                            <div className="text-xs font-bold uppercase text-red-600">
                              Rejection Reason
                            </div>

                            <p className="mt-2 text-sm leading-6 text-red-800">
                              {row.rejection_note}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 text-sm font-black text-slate-950">
                          Actions
                        </div>

                        <div className="grid gap-2">
                          <button
                            type="button"
                            onClick={() => onView(row)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            <Eye size={17} />
                            View Details
                          </button>

                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onApprove(row)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                              >
                                <CheckCircle2 size={17} />
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() => onReject(row)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                              >
                                <XCircle size={17} />
                                Reject
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}