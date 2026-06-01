import BudgetSummaryCard from "./BudgetSummaryCard";
import CurrencyText from "../../../components/CurrencyText";
import { formatNumber } from "../../../utils/formatters";
import { MONTHS as months } from "../../../constants/months.constants";

export default function BudgetSummaryPanel({ summary, summaryView }) {
  return (
    <div className="transition-all duration-200 ease-in-out">
      {summaryView === "QUARTER" ? (
        <div className="grid animate-[fadeIn_0.18s_ease-in-out] md:grid-cols-6">
          <BudgetSummaryCard
            label="Total Quantity"
            value={formatNumber(summary.totalQuantity)}
          />

          <BudgetSummaryCard
            label="Total Amount"
            value={<CurrencyText value={summary.totalAmount} />}
            blue
          />

          <BudgetSummaryCard
            label="Q1"
            value={<CurrencyText value={summary.quarterTotals[0]} />}
          />

          <BudgetSummaryCard
            label="Q2"
            value={<CurrencyText value={summary.quarterTotals[1]} />}
          />

          <BudgetSummaryCard
            label="Q3"
            value={<CurrencyText value={summary.quarterTotals[2]} />}
          />

          <BudgetSummaryCard
            label="Q4"
            value={<CurrencyText value={summary.quarterTotals[3]} />}
          />
        </div>
      ) : (
        <div className="animate-[fadeIn_0.18s_ease-in-out] p-4">
          <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Monthly Allocation
              </p>

              <p className="mt-1 text-sm font-medium text-slate-600">
                Quarterly and annual amounts are placed in the first month of
                their period.
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500">
                Total Amount
              </p>

              <p className="text-xl font-bold text-blue-600">
                <CurrencyText value={summary.totalAmount} />
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {months.map((month, index) => {
              const amount = summary.monthTotals[index];
              const hasAmount = amount > 0;

              return (
                <div
                  key={month}
                  className={`rounded-xl border p-4 transition-all duration-200 ease-in-out ${
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
                      <CurrencyText value={amount} />
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-in-out"
                      style={{
                        width: `${
                          summary.totalAmount > 0
                            ? Math.min(
                                (amount / summary.totalAmount) * 100,
                                100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
