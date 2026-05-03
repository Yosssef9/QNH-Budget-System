import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Plus,
  Upload,
  Trash2,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const categories = ["IT Equipment", "IT Software", "IT Services"];
const itemsByCategory = {
  "IT Equipment": ["PC (Desktop)", "Printer", "Scanner"],
  "IT Software": ["Software License", "Antivirus", "Cloud Subscription"],
  "IT Services": ["Service Hours", "Maintenance", "Support Contract"],
};

const methodOptions = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "CUSTOM_MONTHLY", label: "Custom Monthly" },
  { value: "CUSTOM_QUARTERLY", label: "Custom Quarterly" },
  { value: "ANNUAL", label: "Annual" },
];

const initialRows = [
  createRow(1, "IT Equipment", "PC (Desktop)", "MONTHLY", 50, 5000),
  createRow(2, "IT Equipment", "Printer", "QUARTERLY", 20, 1000),
  createRow(
    3,
    "IT Equipment",
    "Scanner",
    "CUSTOM_QUARTERLY",
    10,
    3000,
    [],
    [2, 2, 3, 3],
  ),
  createRow(4, "IT Software", "Software License", "ANNUAL", 1, 100000),
  createRow(
    5,
    "IT Services",
    "Service Hours",
    "CUSTOM_MONTHLY",
    100,
    200,
    [8, 9, 8, 8, 9, 8, 8, 8, 8, 8, 8, 8],
  ),
];

function createRow(
  id,
  category = "IT Equipment",
  item = "PC (Desktop)",
  method = "MONTHLY",
  quantity = 0,
  unitPrice = 0,
  monthly = [],
  quarterly = [],
) {
  return {
    id,
    category,
    item,
    method,
    quantity,
    unitPrice,
    monthly,
    quarterly,
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatSAR(value) {
  return `${formatNumber(value)} ر.س`;
}
function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function distributeWholeNumber(total, periods) {
  const qty = Math.max(0, Math.floor(toNumber(total)));
  const base = Math.floor(qty / periods);
  const remainder = qty % periods;

  return Array.from({ length: periods }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

function getMonthlyDistribution(row) {
  if (row.method === "MONTHLY") return distributeWholeNumber(row.quantity, 12);
  if (row.method === "CUSTOM_MONTHLY") return normalizeArray(row.monthly, 12);
  return [];
}

function getQuarterlyDistribution(row) {
  if (row.method === "QUARTERLY") return distributeWholeNumber(row.quantity, 4);
  if (row.method === "CUSTOM_QUARTERLY")
    return normalizeArray(row.quarterly, 4);
  return [];
}

function normalizeArray(arr, length) {
  return Array.from({ length }, (_, index) => toNumber(arr?.[index]));
}

function getDistributedQuantity(row) {
  if (row.method === "ANNUAL") return toNumber(row.quantity);

  if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
    return getMonthlyDistribution(row).reduce(
      (sum, value) => sum + toNumber(value),
      0,
    );
  }

  return getQuarterlyDistribution(row).reduce(
    (sum, value) => sum + toNumber(value),
    0,
  );
}

function getMethodBase(method) {
  if (method === "CUSTOM_MONTHLY" || method === "CUSTOM_QUARTERLY")
    return "CUSTOM";
  return method;
}

function getMethodNote(method) {
  if (method === "MONTHLY") return "Auto Distribute";
  if (method === "QUARTERLY") return "Auto Distribute";
  if (method === "CUSTOM_MONTHLY") return "Monthly";
  if (method === "CUSTOM_QUARTERLY") return "Quarter";
  return "";
}

function getQuarterAmount(row, quarterIndex) {
  const unitPrice = toNumber(row.unitPrice);

  if (row.method === "ANNUAL") {
    return quarterIndex === 0 ? toNumber(row.quantity) * unitPrice : 0;
  }

  if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
    const monthly = getMonthlyDistribution(row);
    const start = quarterIndex * 3;
    return monthly
      .slice(start, start + 3)
      .reduce((sum, qty) => sum + qty * unitPrice, 0);
  }

  const quarterly = getQuarterlyDistribution(row);
  return toNumber(quarterly[quarterIndex]) * unitPrice;
}

function MethodBadge({ method }) {
  const base = getMethodBase(method);
  const note = getMethodNote(method);

  const styles = {
    MONTHLY: "bg-blue-50 text-blue-700 border-blue-100",
    QUARTERLY: "bg-emerald-50 text-emerald-700 border-emerald-100",
    CUSTOM: "bg-orange-50 text-orange-700 border-orange-100",
    ANNUAL: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <div className="text-center">
      <span
        className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${styles[base]}`}
      >
        {base}
      </span>
      {note && (
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          ({note})
        </p>
      )}
    </div>
  );
}

export default function CreateBudgetManualPage() {
  const [rows, setRows] = useState(initialRows);
  const [summaryView, setSummaryView] = useState("QUARTER");
  function getMonthlyAmountForSummary(row, monthIndex) {
    const unitPrice = toNumber(row.unitPrice);

    if (row.method === "ANNUAL") {
      return monthIndex === 0 ? toNumber(row.quantity) * unitPrice : 0;
    }

    if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
      const monthly = getMonthlyDistribution(row);
      return toNumber(monthly[monthIndex]) * unitPrice;
    }

    if (row.method === "QUARTERLY" || row.method === "CUSTOM_QUARTERLY") {
      const quarterly = getQuarterlyDistribution(row);

      if (monthIndex === 0) return toNumber(quarterly[0]) * unitPrice;
      if (monthIndex === 3) return toNumber(quarterly[1]) * unitPrice;
      if (monthIndex === 6) return toNumber(quarterly[2]) * unitPrice;
      if (monthIndex === 9) return toNumber(quarterly[3]) * unitPrice;

      return 0;
    }

    return 0;
  }
  const summary = useMemo(() => {
    const totalQuantity = rows.reduce(
      (sum, row) => sum + toNumber(row.quantity),
      0,
    );
    const totalAmount = rows.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitPrice),
      0,
    );

    const quarterTotals = [0, 1, 2, 3].map((quarterIndex) =>
      rows.reduce((sum, row) => sum + getQuarterAmount(row, quarterIndex), 0),
    );

    const monthTotals = months.map((_, monthIndex) =>
      rows.reduce(
        (sum, row) => sum + getMonthlyAmountForSummary(row, monthIndex),
        0,
      ),
    );

    const isValid = rows.every((row) => {
      const hasValidNumbers =
        toNumber(row.quantity) > 0 && toNumber(row.unitPrice) > 0;

      if (!hasValidNumbers) return false;

      if (row.method === "ANNUAL") return true;

      return getDistributedQuantity(row) === toNumber(row.quantity);
    });

    return { totalQuantity, totalAmount, quarterTotals, monthTotals, isValid };
  }, [rows]);

  function updateRow(id, field, value) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, [field]: value };

        if (field === "category") {
          next.item = itemsByCategory[value]?.[0] || "";
        }

        return next;
      }),
    );
  }

  function updateMonthly(id, index, value) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const monthly = normalizeArray(row.monthly, 12);
        const totalQuantity = toNumber(row.quantity);

        const otherMonthsTotal = monthly.reduce((sum, qty, i) => {
          if (i === index) return sum;
          return sum + toNumber(qty);
        }, 0);

        const maxAllowed = Math.max(0, totalQuantity - otherMonthsTotal);
        monthly[index] = Math.min(toNumber(value), maxAllowed);

        return { ...row, monthly };
      }),
    );
  }

  function updateQuarterly(id, index, value) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const quarterly = normalizeArray(row.quarterly, 4);
        const totalQuantity = toNumber(row.quantity);

        const otherQuartersTotal = quarterly.reduce((sum, qty, i) => {
          if (i === index) return sum;
          return sum + toNumber(qty);
        }, 0);

        const maxAllowed = Math.max(0, totalQuantity - otherQuartersTotal);
        quarterly[index] = Math.min(toNumber(value), maxAllowed);

        return { ...row, quarterly };
      }),
    );
  }

  function addItem() {
    setRows((prev) => [
      createRow(Date.now(), "IT Equipment", "PC (Desktop)", "MONTHLY", 0, 0),
      ...prev,
    ]);
  }

  function deleteItem(id) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <div className="space-y-5 p-6 text-slate-800">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-700">
            <span>Budgetssadsda</span>
            <ChevronRight size={16} />
            <span className="text-slate-700">Create Budget (Manual Entry)</span>
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Create Budget - Manual Entry
          </h1>
        </div>

        <div className="flex gap-3">
          <button className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:scale-[1.02]">
            Cancel
          </button>

          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:scale-[1.02]">
            <Save size={17} />
            Save Draft
          </button>

          <button
            disabled={!summary.isValid}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:scale-[1.02]"
          >
            <Send size={17} />
            Submit for Approval
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-blue-600">Budget Information</h2>

        <div className="mt-4 grid gap-5 border-t border-slate-200 pt-4 md:grid-cols-5">
          <Info label="Department:" value="Information Technology (IT)" />
          <Info label="Budget Year:" value="2026" />
          <Info
            label="Status:"
            value={
              <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                DRAFT
              </span>
            }
          />
          <Info label="Created By:" value="John Doe" />
          <Info label="Created Date:" value="May 15, 2025" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Budget Items</h2>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
            >
              <Plus size={17} />
              Add Item
            </button>

            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              <Upload size={17} />
              Import from Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1800px] border-collapse text-sm">
            <thead>
              <tr className="text-slate-700">
                <th rowSpan="2" className="border border-slate-200 px-3 py-4">
                  #
                </th>
                <th rowSpan="2" className="border border-slate-200 px-4 py-4">
                  Category
                </th>
                <th rowSpan="2" className="border border-slate-200 px-4 py-4">
                  Item / Type
                </th>
                <th rowSpan="2" className="border border-slate-200 px-4 py-4">
                  Method
                </th>
                <th rowSpan="2" className="border border-slate-200 px-4 py-4">
                  Total Quantity
                </th>
                <th rowSpan="2" className="border border-slate-200 px-4 py-4">
                  Unit Price
                </th>
                <th rowSpan="2" className="border border-slate-200 px-4 py-4">
                  Total Amount
                </th>
                <th
                  colSpan="3"
                  className="border border-slate-200 bg-blue-50 px-4 py-3"
                >
                  QUARTER 1<br />
                  <span className="text-xs font-medium">Jan - Mar</span>
                </th>
                <th
                  colSpan="3"
                  className="border border-slate-200 bg-emerald-50 px-4 py-3"
                >
                  QUARTER 2<br />
                  <span className="text-xs font-medium">Apr - Jun</span>
                </th>
                <th
                  colSpan="3"
                  className="border border-slate-200 bg-orange-50 px-4 py-3"
                >
                  QUARTER 3<br />
                  <span className="text-xs font-medium">Jul - Sep</span>
                </th>
                <th
                  colSpan="3"
                  className="border border-slate-200 bg-violet-50 px-4 py-3"
                >
                  QUARTER 4<br />
                  <span className="text-xs font-medium">Oct - Dec</span>
                </th>
                <th rowSpan="2" className="border border-slate-200 px-4 py-4">
                  Actions
                </th>
              </tr>

              <tr>
                {months.map((month) => (
                  <th
                    key={month}
                    className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((row, rowIndex) => {
                  const totalAmount =
                    toNumber(row.quantity) * toNumber(row.unitPrice);
                  const monthly = getMonthlyDistribution(row);
                  const quarterly = getQuarterlyDistribution(row);
                  const distributedQuantity = getDistributedQuantity(row);
                  const isRowValid =
                    toNumber(row.quantity) > 0 &&
                    toNumber(row.unitPrice) > 0 &&
                    (row.method === "ANNUAL" ||
                      distributedQuantity === toNumber(row.quantity));

                  return (
                    <motion.tr
                      key={row.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className={
                        !isRowValid
                          ? "bg-red-50 border-l-4 border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.3)]"
                          : ""
                      }
                    >
                      <td className="border border-slate-200 px-3 py-4 text-center font-semibold text-slate-600">
                        {rowIndex + 1}
                      </td>

                      <td className="border border-slate-200 px-3 py-4">
                        <SearchableMultiSelect
                          name="category"
                          multiple={false}
                          disableClear
                          value={row.category}
                          options={categories.map((category) => ({
                            id: category,
                            name: category,
                          }))}
                          placeholder="Category"
                          searchPlaceholder="Search category..."
                          maxVisibleBadges={1}
                          getOptionValue={(option) => option.id}
                          getOptionLabel={(option) => option.name}
                          onChange={(e) =>
                            updateRow(row.id, "category", e.target.value)
                          }
                        />
                      </td>

                      <td className="border border-slate-200 px-3 py-4">
                        <SearchableMultiSelect
                          name="item"
                          multiple={false}
                          disableClear
                          value={row.item}
                          options={(itemsByCategory[row.category] || []).map(
                            (item) => ({
                              id: item,
                              name: item,
                            }),
                          )}
                          placeholder="Item / Type"
                          searchPlaceholder="Search item..."
                          maxVisibleBadges={1}
                          getOptionValue={(option) => option.id}
                          getOptionLabel={(option) => option.name}
                          onChange={(e) =>
                            updateRow(row.id, "item", e.target.value)
                          }
                        />
                      </td>
                      <td className="border border-slate-200 px-3 py-4 align-middle">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-full">
                            <SearchableMultiSelect
                              name="method"
                              multiple={false}
                              disableClear
                              value={row.method}
                              options={methodOptions}
                              placeholder="Method"
                              searchPlaceholder="Search method..."
                              maxVisibleBadges={1}
                              getOptionValue={(option) => option.value}
                              getOptionLabel={(option) => option.label}
                              onChange={(e) =>
                                updateRow(row.id, "method", e.target.value)
                              }
                            />
                          </div>

                          <MethodBadge method={row.method} />
                        </div>
                      </td>
                      <td className="border border-slate-200 px-3 py-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "quantity",
                              toNumber(e.target.value),
                            )
                          }
                          onBlur={(e) =>
                            updateRow(
                              row.id,
                              "quantity",
                              toNumber(e.target.value),
                            )
                          }
                          className={`h-9 w-20 rounded-md border text-center text-xs font-semibold transition-all duration-200
  ${
    row.quantity <= 0
      ? "border-red-400 bg-red-50 text-red-600"
      : "border-slate-200 bg-white text-slate-700"
  }
`}
                        />
                      </td>

                      <td className="border border-slate-200 px-3 py-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.unitPrice}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "unitPrice",
                              toNumber(e.target.value),
                            )
                          }
                          onBlur={(e) =>
                            updateRow(
                              row.id,
                              "unitPrice",
                              toNumber(e.target.value),
                            )
                          }
                          className={`h-9 w-20 rounded-md border text-center text-xs font-semibold transition-all duration-200
  ${
    row.unitPrice <= 0
      ? "border-red-400 bg-red-50 text-red-600"
      : "border-slate-200 bg-white text-slate-700"
  }
`}
                        />
                      </td>

                      <td className="border border-slate-200 px-3 py-4 text-center font-bold text-blue-600">
                        {formatSAR(totalAmount)}
                      </td>

                      {(row.method === "MONTHLY" ||
                        row.method === "CUSTOM_MONTHLY") &&
                        monthly.map((qty, index) => (
                          <td
                            key={index}
                            className="border border-slate-200 px-2 py-2 text-center"
                          >
                            <input
                              type="number"
                              min="0"
                              value={qty}
                              disabled={row.method === "MONTHLY"}
                              onChange={(e) =>
                                updateMonthly(row.id, index, e.target.value)
                              }
                              className="mx-auto h-8 w-16 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 disabled:bg-slate-100 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              {formatSAR(qty * toNumber(row.unitPrice))}
                            </p>
                          </td>
                        ))}

                      {(row.method === "QUARTERLY" ||
                        row.method === "CUSTOM_QUARTERLY") &&
                        quarterly.map((qty, index) => (
                          <td
                            key={index}
                            colSpan="3"
                            className="border border-slate-200 px-2 py-2 text-center"
                          >
                            <input
                              type="number"
                              min="0"
                              value={qty}
                              disabled={row.method === "QUARTERLY"}
                              onChange={(e) =>
                                updateQuarterly(row.id, index, e.target.value)
                              }
                              className="mx-auto h-8 w-28 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 disabled:bg-slate-100 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              {formatSAR(qty * toNumber(row.unitPrice))}
                            </p>
                          </td>
                        ))}

                      {row.method === "ANNUAL" && (
                        <td
                          colSpan="12"
                          className="border border-slate-200 px-3 py-4 text-center"
                        >
                          <div className="flex flex-col items-center gap-1">
                            {/* Main info */}
                            <span className="text-sm font-semibold text-slate-800">
                              {row.quantity} units / year
                            </span>

                            {/* Total */}
                            <span className="text-sm font-bold text-blue-600">
                              Total:{" "}
                              {formatSAR(
                                row.quantity * toNumber(row.unitPrice),
                              )}
                            </span>
                          </div>
                        </td>
                      )}

                      <td className="border border-slate-200 px-3 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => deleteItem(row.id)}
                          className="rounded-lg bg-red-50 p-2 text-red-500 transition-all duration-200 hover:scale-[1.02]"
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan="20"
                      className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      No budget items yet. Click Add Item to start.
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
            {summary.isValid ? (
              <CheckCircle2 className="text-emerald-600" size={34} />
            ) : (
              <AlertCircle className="text-red-500" size={34} />
            )}

            <div>
              <h3 className="font-bold text-slate-900">Validation</h3>
              <p
                className={`mt-1 text-sm font-semibold ${summary.isValid ? "text-emerald-600" : "text-red-500"}`}
              >
                {summary.isValid
                  ? "All quantities match total quantities."
                  : "Some distributed quantities do not match total quantity."}
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
                Switch between quarterly and monthly allocation view.
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setSummaryView("QUARTER")}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  summaryView === "QUARTER"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Per Quarter
              </button>

              <button
                type="button"
                onClick={() => setSummaryView("MONTH")}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  summaryView === "MONTH"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Per Month
              </button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {summaryView === "QUARTER" ? (
              <motion.div
                key="quarter-summary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid md:grid-cols-6"
              >
                <Summary
                  label="Total Quantity"
                  value={formatNumber(summary.totalQuantity)}
                />
                <Summary
                  label="Total Amount"
                  value={formatSAR(summary.totalAmount)}
                  blue
                />
                <Summary
                  label="Q1"
                  value={formatSAR(summary.quarterTotals[0])}
                />
                <Summary
                  label="Q2"
                  value={formatSAR(summary.quarterTotals[1])}
                />
                <Summary
                  label="Q3"
                  value={formatSAR(summary.quarterTotals[2])}
                />
                <Summary
                  label="Q4"
                  value={formatSAR(summary.quarterTotals[3])}
                />
              </motion.div>
            ) : (
              <motion.div
                key="month-summary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-4"
              >
                <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Monthly Allocation
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Quarterly and annual amounts are placed in the first month
                      of their period.
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500">
                      Total Amount
                    </p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatSAR(summary.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {months.map((month, index) => {
                    const amount = summary.monthTotals[index];
                    const hasAmount = amount > 0;

                    return (
                      <motion.div
                        key={month}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`rounded-xl border p-4 transition ${
                          hasAmount
                            ? "border-blue-100 bg-white shadow-sm"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {month}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              {hasAmount ? "Allocated amount" : "No allocation"}
                            </p>
                          </div>

                          <p
                            className={`text-base font-bold ${
                              hasAmount ? "text-blue-600" : "text-slate-400"
                            }`}
                          >
                            {formatSAR(amount)}
                          </p>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <motion.div
                            className="h-full rounded-full bg-blue-500"
                            initial={false}
                            animate={{
                              width: `${summary.totalAmount > 0 ? Math.min((amount / summary.totalAmount) * 100, 100) : 0}%`,
                            }}
                            transition={{ duration: 0.25 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm md:grid-cols-5">
        <Legend
          title="MONTHLY"
          desc="System automatically distributes quantity equally by month."
          color="text-blue-600 bg-blue-50"
        />
        <Legend
          title="QUARTERLY"
          desc="System automatically distributes quantity equally by quarter."
          color="text-emerald-600 bg-emerald-50"
        />
        <Legend
          title="CUSTOM (MONTHLY)"
          desc="You enter quantity manually for each month."
          color="text-orange-600 bg-orange-50"
        />
        <Legend
          title="CUSTOM (QUARTER)"
          desc="You enter quantity manually for each quarter."
          color="text-orange-600 bg-orange-50"
        />
        <Legend
          title="ANNUAL"
          desc="No monthly distribution. One annual total only."
          color="text-violet-600 bg-violet-50"
        />
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <div className="mt-2 text-sm font-medium text-slate-600">{value}</div>
    </div>
  );
}

function Summary({ label, value, blue }) {
  return (
    <div className="border-r border-slate-200 p-5 text-center last:border-r-0">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p
        className={`mt-3 text-2xl font-bold ${blue ? "text-blue-600" : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Legend({ title, desc, color }) {
  return (
    <div>
      <span className={`rounded px-2 py-1 font-bold ${color}`}>{title}</span>
      <p className="mt-2 font-medium text-slate-500">{desc}</p>
    </div>
  );
}
