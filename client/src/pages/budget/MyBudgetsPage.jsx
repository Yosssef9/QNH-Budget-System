import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import { getMyBudgets } from "../../api/budget.api";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import { formatDateTime } from "../../utils/dateFormatters";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../../theme/statusStyles";
import { Eye } from "lucide-react";
export default function MyBudgetsPage() {
  const { budgetAccess } = useAuth();
  const navigate = useNavigate();
  const isBudgetApprover = can(
    budgetAccess,
    PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
  );

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-budgets"],
    queryFn: getMyBudgets,
    enabled: !isBudgetApprover,
  });

  useEffect(() => {
    if (isBudgetApprover) {
      navigate("/budgets/all", { replace: true });
    }
  }, [isBudgetApprover, navigate]);

  if (isBudgetApprover) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs />

      <div>
        <h1 className="text-3xl font-bold">My Budgets</h1>
        <p className="text-slate-500 mt-2">
          View your department budgets across all financial years.
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
              <th className="p-4 text-left">Requested Quantity</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4 text-left">Actions</th>
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
                <tr
                  key={budget.id}
                  onClick={() => navigate(`/budgets/view/${budget.id}`)}
                  className="
    cursor-pointer
    border-t border-slate-200
    transition
    hover:bg-slate-50
  "
                >
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
                    {budget.total_requested_quantity || 0}
                  </td>

                  <td className="p-4">{formatDateTime(budget.created_at)}</td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/budgets/view/${budget.id}`}
                        className="
        inline-flex items-center gap-2
        rounded-lg
        border border-primary-200
        bg-primary-50
        px-3 py-2
        text-sm font-semibold
        text-primary-700
        transition-all
        hover:bg-primary-100
      "
                      >
                        <Eye size={16} />
                        View Budget
                      </Link>
                    </div>
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
