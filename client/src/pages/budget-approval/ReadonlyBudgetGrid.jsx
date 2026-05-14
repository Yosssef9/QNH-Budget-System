import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { MONTHS as months } from "../../constants/months.constants";
import { formatNumber, formatSAR } from "../../utils/formatters";
import { toNumber } from "../../utils/number";

function getMethodBase(method) {
  if (method === "CUSTOM_MONTHLY" || method === "CUSTOM_QUARTERLY") {
    return "CUSTOM";
  }

  return method;
}

function MethodBadge({ method, level }) {
  const base = getMethodBase(method);

  const styles = {
    MONTHLY: "bg-blue-50 text-blue-700 border-blue-100",
    QUARTERLY: "bg-emerald-50 text-emerald-700 border-emerald-100",
    CUSTOM: "bg-orange-50 text-orange-700 border-orange-100",
    ANNUAL: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <div className="text-center">
      <span
        className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${
          styles[base] || "bg-slate-50 text-slate-700 border-slate-100"
        }`}
      >
        {base || "N/A"}
      </span>

      {level && (
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          ({level})
        </p>
      )}
    </div>
  );
}

function Summary({ label, value, blue }) {
  return (
    <div className="border-r border-slate-200 p-5 text-center last:border-r-0">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p
        className={`mt-3 text-2xl font-bold ${
          blue ? "text-blue-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function ReadonlyBudgetGrid({
  budget,
  items = [],
  itemNotes = {},
  onItemNoteChange,
  showNotes = false,
}) {
  const [summaryView, setSummaryView] = useState("QUARTER");

  const summary = useMemo(() => {
    const totalQuantity = items.reduce(
      (sum, item) => sum + toNumber(item.quantity),
      0,
    );

    const totalAmount = items.reduce(
      (sum, item) => sum + toNumber(item.total_amount),
      0,
    );

    return {
      totalQuantity,
      totalAmount,
    };
  }, [items]);

  return (
    <div className="space-y-5 text-slate-800">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-blue-600">Budget Information</h2>

        <div className="mt-4 grid gap-5 border-t border-slate-200 pt-4 md:grid-cols-5">
          <Info label="Department:" value={budget?.department_name || "-"} />
          <Info label="Budget Year:" value={budget?.financial_year || "-"} />
          <Info
            label="Status:"
            value={
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                {budget?.status || "-"}
              </span>
            }
          />
          <Info
            label="Submitted At:"
            value={
              budget?.submitted_at
                ? new Date(budget.submitted_at).toLocaleString()
                : "-"
            }
          />
          <Info
            label="Created Date:"
            value={
              budget?.created_at
                ? new Date(budget.created_at).toLocaleDateString()
                : "-"
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Budget Items Review
          </h2>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm">
            {formatSAR(summary.totalAmount)}
          </div>
        </div>

        <div className="max-w-full max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-max min-w-full table-fixed border-collapse text-sm">
            {" "}
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="text-slate-700">
                <th className="w-[70px] border border-slate-200 px-3 py-4">
                  #
                </th>
                <th className="w-[220px] border border-slate-200 px-4 py-4">
                  Category
                </th>
                <th className="w-[260px] border border-slate-200 px-4 py-4">
                  Item / Type
                </th>
                <th className="w-[140px] border border-slate-200 px-4 py-4">
                  Expense
                </th>
                <th className="w-[160px] border border-slate-200 px-4 py-4">
                  Method
                </th>
                <th className="w-[140px] border border-slate-200 px-4 py-4">
                  Quantity
                </th>
                <th className="w-[140px] border border-slate-200 px-4 py-4">
                  Unit Price
                </th>
                <th className="w-[160px] border border-slate-200 px-4 py-4">
                  Total Amount
                </th>
                {showNotes && (
                  <th className="w-[300px] border border-slate-200 px-4 py-4">
                    Approver Note
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {items.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    id={`budget-item-row-${item.id}`}
                    layout
                    className="relative"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                  >
                    <td className="border border-slate-200 px-3 py-4 text-center font-semibold text-slate-600">
                      {index + 1}
                    </td>

                    <td className="border border-slate-200 px-3 py-4 font-semibold text-slate-800">
                      {item.category_name}
                    </td>

                    <td className="border border-slate-200 px-3 py-4">
                      <div className="font-semibold text-slate-800">
                        {item.type_name}
                      </div>
                    </td>

                    <td className="border border-slate-200 px-3 py-4 text-center">
                      {item.expense_type && (
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${
                            item.expense_type === "CAPEX"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {item.expense_type}
                        </span>
                      )}
                    </td>

                    <td className="border border-slate-200 px-3 py-4">
                      <MethodBadge
                        method={item.distribution_method}
                        level={item.distribution_level}
                      />
                    </td>

                    <td className="border border-slate-200 px-3 py-4 text-center font-bold">
                      {formatNumber(item.quantity)}
                    </td>

                    <td className="border border-slate-200 px-3 py-4 text-center">
                      {formatSAR(item.unit_price)}
                    </td>

                    <td className="border border-slate-200 px-3 py-4 text-center font-bold text-blue-600">
                      {formatSAR(item.total_amount)}
                    </td>

                    {showNotes && (
                      <td className="border border-slate-200 px-3 py-4">
                        <input
                          value={itemNotes[item.id] || ""}
                          onChange={(e) =>
                            onItemNoteChange?.(item.id, e.target.value)
                          }
                          placeholder="Optional item note"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </td>
                    )}
                  </motion.tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={showNotes ? 9 : 8}
                      className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      No budget items found.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            {items.length > 0 ? (
              <CheckCircle2 className="text-emerald-600" size={34} />
            ) : (
              <AlertCircle className="text-red-500" size={34} />
            )}

            <div>
              <h3 className="font-bold text-slate-900">Review Status</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {items.length > 0
                  ? "Budget contains items and is ready for review."
                  : "Budget has no items."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Budget Summary
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Read-only approval summary.
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setSummaryView("TOTAL")}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  summaryView === "TOTAL"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Total
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2">
            <Summary
              label="Total Quantity"
              value={formatNumber(summary.totalQuantity)}
            />
            <Summary
              label="Total Amount"
              value={formatSAR(summary.totalAmount)}
              blue
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <div className="mt-2 truncate text-sm font-medium text-slate-600">
        {value}
      </div>
    </div>
  );
}
