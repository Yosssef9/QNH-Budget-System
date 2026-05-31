import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import CurrencyText from "../../components/CurrencyText";
import { getMyBudgets } from "../../api/budget.api";
import { formatDateTime } from "../../utils/dateFormatters";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../../theme/statusStyles";

export default function MyBudgetsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-budgets"],
    queryFn: getMyBudgets,
  });

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs />

      <div>
        <h1 className="text-3xl font-bold">My Budgets</h1>
        <p className="text-slate-500 mt-2">
          View all budgets across all financial years.
        </p>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left">Year</th>
              <th className="p-4 text-left">Department</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Items</th>
              <th className="p-4 text-left">Total Amount</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="p-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center">
                  No budgets found
                </td>
              </tr>
            ) : (
              data.map((budget) => (
                <tr key={budget.id} className="border-t border-slate-200">
                  <td className="p-4 font-semibold">{budget.financial_year}</td>

                  <td className="p-4">{budget.department_name}</td>

                  <td className="p-4">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-bold ${
                        getBudgetStatusStyle(budget.status).badge
                      }`}
                    >
                      {getBudgetStatusLabel(budget.status)}
                    </span>
                  </td>

                  <td className="p-4">{budget.items_count}</td>

                  <td className="p-4 font-semibold text-blue-600">
                    <CurrencyText value={budget.total_amount} />
                  </td>

                  <td className="p-4">{formatDateTime(budget.created_at)}</td>

                  <td className="p-4">
                    <Link
                      to={`/budgets/view/${budget.id}`}
                      className="text-primary-600 font-semibold"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
