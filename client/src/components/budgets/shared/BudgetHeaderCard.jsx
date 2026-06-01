import { formatDateTime } from "../../../utils/dateFormatters";
import BudgetStatusBadge from "./BudgetStatusBadge";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>

      <div className="mt-2 text-sm font-medium text-slate-600 truncate">
        {value}
      </div>
    </div>
  );
}

export default function BudgetHeaderCard({
  currentBudget,
  openYear,
  budgetStatus,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-blue-600">Budget Information</h2>

      <div className="mt-4 grid gap-5 border-t border-slate-200 pt-4 md:grid-cols-5">
        <Info
          label="Department:"
          value={currentBudget?.department_name || "Loading..."}
        />

        <Info
          label="Budget Year:"
          value={
            currentBudget?.financial_year ||
            openYear?.year ||
            "No Financial Year"
          }
        />

        <Info
          label="Status:"
          value={<BudgetStatusBadge status={budgetStatus} />}
        />

        <Info
          label="Created By:"
          value={currentBudget?.created_by_name || "Not available"}
        />

        <Info
          label="Created Date:"
          value={
            currentBudget?.created_at
              ? formatDateTime(currentBudget.created_at)
              : "Not available"
          }
        />
      </div>
    </section>
  );
}
