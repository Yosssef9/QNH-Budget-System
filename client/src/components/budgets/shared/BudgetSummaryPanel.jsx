import BudgetSummaryCard from "./BudgetSummaryCard";
import { formatNumber } from "../../../utils/formatters";
import { MONTHS as months } from "../../../constants/months.constants";
import { AnimatePresence, motion } from "framer-motion";

export default function BudgetSummaryPanel({ summary, summaryView }) {
  return (
    <AnimatePresence mode="wait">
      {summaryView === "QUARTER" ? (
        <motion.div
          key="quarter"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="grid md:grid-cols-5"
        >
          <BudgetSummaryCard
            label="Total Quantity"
            value={formatNumber(summary.totalQuantity)}
          />

          <BudgetSummaryCard
            label="Q1"
            value={formatNumber(summary.quarterTotals[0])}
          />

          <BudgetSummaryCard
            label="Q2"
            value={formatNumber(summary.quarterTotals[1])}
          />

          <BudgetSummaryCard
            label="Q3"
            value={formatNumber(summary.quarterTotals[2])}
          />

          <BudgetSummaryCard
            label="Q4"
            value={formatNumber(summary.quarterTotals[3])}
          />
        </motion.div>
      ) : (
        <motion.div
          key="month"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="p-4"
        >
          <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Monthly Allocation
              </p>

              <p className="mt-1 text-sm font-medium text-slate-600">
                Quarterly and annual quantities are placed in the first month of
                their period.
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500">
                Total Quantity
              </p>

              <p className="text-xl font-bold text-blue-600">
                {formatNumber(summary.totalQuantity)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {months.map((month, index) => {
              const quantity = summary.monthTotals[index];
              const hasQuantity = quantity > 0;

              return (
                <motion.div
                  key={month}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-xl border p-4 ${
                    hasQuantity
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
                        {hasQuantity ? "Allocated quantity" : "No allocation"}
                      </p>
                    </div>

                    <p
                      className={`text-base font-bold ${
                        hasQuantity ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {formatNumber(quantity)}
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full rounded-full bg-blue-500"
                      animate={{
                        width: `${
                          summary.totalQuantity > 0
                            ? Math.min(
                                (quantity / summary.totalQuantity) * 100,
                                100
                              )
                            : 0
                        }%`,
                      }}
                      transition={{
                        duration: 0.4,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
