import { CheckCircle2, AlertCircle } from "lucide-react";

export default function BudgetReviewStatusCard({ hasItems }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        {hasItems ? (
          <CheckCircle2 className="text-emerald-600" size={34} />
        ) : (
          <AlertCircle className="text-red-500" size={34} />
        )}

        <div>
          <h3 className="font-bold text-slate-900">Review Status</h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {hasItems
              ? "Budget contains items and is ready for review."
              : "Budget has no items."}
          </p>
        </div>
      </div>
    </div>
  );
}
