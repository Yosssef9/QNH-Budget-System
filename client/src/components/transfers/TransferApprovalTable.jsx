import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  CheckCircle2,
  ChevronUp,
  Eye,
  FileText,
  XCircle,
  Building2,
  CalendarDays,
} from "lucide-react";

import CurrencyText from "../CurrencyText";
import { formatDateTime } from "../../utils/dateFormatters";

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

export default function TransferApprovalTable({
  transfers,
  onView,
  onApprove,
  onReject,
}) {
  const [expandedRows, setExpandedRows] = useState({});

  function toggleRow(id) {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className="grid gap-4">
      {transfers.map((row) => {
        const isOpen = !!expandedRows[row.id];
        const isPending = row.status === "PENDING_APPROVAL";

        return (
          <div
            key={row.id}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => toggleRow(row.id)}
              className="flex w-full flex-col gap-4 p-5 text-left lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                      row.status,
                    )}`}
                  >
                    {getStatusText(row.status)}
                  </span>

                  <span className="text-xs font-bold text-slate-400">
                    Request #{row.id}
                  </span>
                  {row.is_new_item ? (
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                      🆕 NEW ITEM
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      🔄 TRANSFER
                    </span>
                  )}
                  {row.department_name && (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-800">
                      <Building2 size={15} />
                      {row.department_name}
                    </span>
                  )}

                  {row.financial_year && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      <CalendarDays size={13} />
                      FY {row.financial_year}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase text-red-500">
                      From
                    </div>
                    <div className="mt-1">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {row.from_item_name || "-"}
                      </div>

                      <div className="mt-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            row.from_expense_type === "CAPEX"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {row.from_expense_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="rounded-full bg-blue-600 px-3 py-2 text-white shadow-sm">
                      <ArrowDown size={17} className="lg:hidden" />
                      <span className="hidden text-sm font-bold lg:block">
                        →
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase text-emerald-600">
                      To
                    </div>
                    <div className="mt-1">
                      <div className="text-sm font-bold text-slate-900">
                        {row.is_new_item
                          ? row.new_item_type_name
                          : row.to_item_name}
                      </div>

                      <div className="mt-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            (row.is_new_item
                              ? row.new_item_expense_type
                              : row.to_expense_type) === "CAPEX"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {row.is_new_item
                            ? row.new_item_expense_type
                            : row.to_expense_type}
                        </span>
                      </div>

                      {row.is_new_item && (
                        <div className="mt-1 text-xs font-medium text-purple-600">
                          🆕 New Budget Item
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:min-w-[260px]">
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Amount
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    <CurrencyText value={row.amount || 0} />
                  </div>
                </div>

                <motion.div
                  animate={{ rotate: isOpen ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl bg-white p-2 text-slate-500"
                >
                  <ChevronUp size={18} />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <div className="grid items-start gap-4 xl:grid-cols-[280px_1fr_220px]">
                      <div className="self-start rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 text-sm font-bold text-slate-900">
                          Transfer Information
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase text-slate-400">
                            Department
                          </div>

                          <div className="mt-1 text-sm font-semibold text-slate-800">
                            {row.department_name || "-"}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-bold uppercase text-slate-400">
                              From Item
                            </div>

                            <div className="mt-1">
                              <div className="text-sm font-semibold text-slate-800">
                                {row.from_item_name || "-"}
                              </div>

                              <span
                                className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  row.from_expense_type === "CAPEX"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {row.from_expense_type}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-bold uppercase text-slate-400">
                              To Item
                            </div>

                            {row.is_new_item ? (
                              <div className="mt-1">
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">
                                    {row.new_item_type_name}
                                  </div>

                                  <span
                                    className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                      row.new_item_expense_type === "CAPEX"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-emerald-100 text-emerald-700"
                                    }`}
                                  >
                                    {row.new_item_expense_type}
                                  </span>
                                </div>

                                <div className="mt-1 inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                                  🆕 New Budget Item
                                </div>

                                <div className="mt-3 grid gap-2">
                                  <div className="text-xs text-slate-500">
                                    Category
                                  </div>
                                  <div className="font-semibold">
                                    {row.category_name || "-"}
                                  </div>

                                  <div className="text-xs text-slate-500">
                                    Quantity
                                  </div>
                                  <div className="font-semibold">
                                    {row.new_item_quantity || "-"}
                                  </div>

                                  <div className="text-xs text-slate-500">
                                    Unit Price
                                  </div>
                                  <div className="font-semibold">
                                    <CurrencyText
                                      value={row.new_item_unit_price || 0}
                                    />
                                  </div>

                                  <div className="text-xs text-slate-500">
                                    Total Amount
                                  </div>
                                  <div className="font-bold text-purple-700">
                                    <CurrencyText
                                      value={row.new_item_total_amount || 0}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-semibold text-slate-800">
                                  {row.to_item_name || "-"}
                                </div>

                                <span
                                  className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                    row.to_expense_type === "CAPEX"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {row.to_expense_type}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-xs font-bold uppercase text-slate-400">
                              Requested At
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-800">
                              {formatDateTime(row.requested_at)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 text-sm font-bold text-slate-900">
                          Financial Information
                        </div>

                        <div className="grid gap-3">
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <div className="text-xs font-bold uppercase text-blue-600">
                              Transfer Amount
                            </div>

                            <div className="mt-2 text-xl font-bold text-blue-700">
                              <CurrencyText value={row.amount || 0} />
                            </div>
                          </div>
                          <div className="mb-4 text-sm font-bold text-slate-900">
                            Transfer Impact
                          </div>

                          <div className="grid gap-3">
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                              <div className="text-xs font-bold uppercase text-red-600">
                                Source Item
                              </div>

                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {row.from_item_name}
                              </div>

                              <div className="mt-3 text-xs text-slate-500">
                                Current Allocation
                              </div>

                              <div className="font-bold text-slate-900">
                                <CurrencyText
                                  value={row.from_item_amount || 0}
                                />
                              </div>

                              <div className="mt-2 text-xs text-slate-500">
                                After Transfer
                              </div>

                              <div className="font-bold text-red-700">
                                <CurrencyText
                                  value={
                                    (row.from_item_amount || 0) -
                                    (row.amount || 0)
                                  }
                                />
                              </div>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                              {row.is_new_item && (
                                <div className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 p-4">
                                  <div className="mb-3 text-sm font-bold text-purple-700">
                                    🆕 New Budget Item Details
                                  </div>

                                  <div className="grid gap-2 text-sm">
                                    <div>
                                      <strong>Item:</strong>{" "}
                                      {row.new_item_type_name}
                                    </div>
                                    <div>
                                      <strong>Expense Type:</strong>{" "}
                                      <span
                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                          row.new_item_expense_type === "CAPEX"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-emerald-100 text-emerald-700"
                                        }`}
                                      >
                                        {row.new_item_expense_type}
                                      </span>
                                    </div>
                                    <div>
                                      <strong>Category:</strong>{" "}
                                      {row.category_name}
                                    </div>

                                    <div>
                                      <strong>Quantity:</strong>{" "}
                                      {row.new_item_quantity}
                                    </div>

                                    <div>
                                      <strong>Unit Price:</strong>{" "}
                                      <CurrencyText
                                        value={row.new_item_unit_price || 0}
                                      />
                                    </div>

                                    <div>
                                      <strong>Total Amount:</strong>{" "}
                                      <CurrencyText
                                        value={row.new_item_total_amount || 0}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="text-xs font-bold uppercase text-emerald-600">
                                Destination Item
                              </div>

                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {row.is_new_item
                                  ? row.new_item_type_name
                                  : row.to_item_name}
                              </div>

                              <div className="mt-3 text-xs text-slate-500">
                                Current Allocation
                              </div>

                              <div className="font-bold text-slate-900">
                                <CurrencyText value={row.to_item_amount || 0} />
                              </div>

                              <div className="mt-2 text-xs text-slate-500">
                                After Transfer
                              </div>

                              <div className="font-bold text-emerald-700">
                                <CurrencyText
                                  value={
                                    (row.to_item_amount || 0) +
                                    (row.amount || 0)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 text-sm font-bold text-slate-900">
                          Actions
                        </div>

                        <div className="grid gap-2">
                          <button
                            type="button"
                            onClick={() => onView(row)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            <Eye size={17} />
                            View Impact
                          </button>

                          {isPending && (
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
                          )}
                        </div>
                      </div>
                    </div>

                    {row.reason && (
                      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                          <FileText size={14} />
                          Reason
                        </div>

                        <p className="text-sm font-medium leading-6 text-slate-700">
                          {row.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {transfers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <CheckCircle2 size={26} className="text-slate-500" />
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900">
            No transfer requests found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Change the status or department filter to view other requests.
          </p>
        </div>
      )}
    </div>
  );
}
