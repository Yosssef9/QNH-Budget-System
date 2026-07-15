import { useMemo, useState } from "react";

import Breadcrumbs from "../../components/Breadcrumbs";
import EnterpriseSearch from "../../components/EnterpriseSearch";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import LoadingSpinner from "../../components/LoadingSpinner";
import BudgetCompactSummaryPanel from "../../components/budgets/shared/BudgetCompactSummaryPanel";
import BudgetHeaderCard from "../../components/budgets/shared/BudgetHeaderCard";
import BudgetItemsTable from "../../components/budgets/shared/BudgetItemsTable";
import BudgetDistributionDetailsDrawer from "../../components/budgets/shared/drawers/BudgetDistributionDetailsDrawer";
import AdjustmentRequestDrawer from "../../components/adjustment-requests/AdjustmentRequestDrawer";

import CollapsibleSection from "../../components/CollapsibleSection";

import { useAuth } from "../../context/AuthContext";
import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import { useBudgetView } from "../../hooks/budgets/useBudgetView";
import useBudgetTotals from "../../hooks/budgets/useBudgetTotals";
import { getMyAdjustmentRequests } from "../../api/adjustmentRequests.api";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { formatDateTime } from "../../utils/dateFormatters";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function RequestStatusBadge({ status }) {
  const styles = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED_FOR_ACTION: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
    PARTIALLY_FULFILLED: "bg-blue-50 text-blue-700 border-blue-200",
    FULFILLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        styles[status] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {String(status || "NONE").replaceAll("_", " ")}
    </span>
  );
}

export default function BudgetViewPage() {
  const { budgetAccess } = useAuth();
  const { data, isLoading } = useBudgetView();

  const budget = data;
  const canViewAllBudgets = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_BUDGET_REPORTS,
  );
  const canSubmitAdjustment = can(
    budgetAccess,
    PERMISSION_CODES.SUBMIT_DEPARTMENT_BUDGET_CHANGE_REQUESTS,
  );
  const isDepartmentWorkspace =
    budgetAccess?.workspaceType === "DEPARTMENT" ||
    budgetAccess?.type === "DEPARTMENT";
  const showHodAdjustmentActions =
    isDepartmentWorkspace && canSubmitAdjustment && !canViewAllBudgets;
  const budgetListBreadcrumb = canViewAllBudgets
    ? {
        label: "All Budgets",
        path: "/budgets/all",
      }
    : {
        label: "My Budgets",
        path: "/budgets/my",
      };
  const pageDescription = canViewAllBudgets
    ? "Read-only department budget details for the selected financial year."
    : "View your department budget information and items.";
  const canRequestAdjustment =
    showHodAdjustmentActions && budget?.financial_year_status === "PRE_CLOSING";

  const { totalQuantity, totalApprovedQuantity, totalApprovedAmount } =
    useBudgetTotals(budget?.items || []);

  const [search, setSearch] = useState("");

  const [selectedCategories, setSelectedCategories] = useState([]);

  const [selectedExpenseTypes, setSelectedExpenseTypes] = useState([]);

  const [selectedMethods, setSelectedMethods] = useState([]);
  const [adjustmentDrawerOpen, setAdjustmentDrawerOpen] = useState(false);
  const [selectedDistributionItem, setSelectedDistributionItem] = useState(null);
  const { data: adjustmentRequests = [] } = useQuery({
    queryKey: ["adjustment-requests", "my", "ALL"],
    queryFn: () => getMyAdjustmentRequests("ALL"),
    enabled: showHodAdjustmentActions,
  });
  const categoryOptions = useMemo(() => {
    const map = new Map();

    (budget?.items || []).forEach((item) => {
      if (!map.has(item.category_id)) {
        map.set(item.category_id, {
          value: item.category_id,
          label: item.category_name,
        });
      }
    });

    return [...map.values()];
  }, [budget]);

  const expenseTypeOptions = useMemo(() => {
    const unique = [
      ...new Set(
        (budget?.items || []).map((x) => x.expense_type).filter(Boolean),
      ),
    ];

    return unique.map((x) => ({
      value: x,
      label: x,
    }));
  }, [budget]);

  const methodOptions = useMemo(() => {
    const unique = [
      ...new Set(
        (budget?.items || []).map((x) => x.distribution_method).filter(Boolean),
      ),
    ];

    return unique.map((x) => ({
      value: x,
      label: x.replaceAll("_", " "),
    }));
  }, [budget]);

  const filteredItems = useMemo(() => {
    return (budget?.items || []).filter((item) => {
      const searchMatch =
        !search ||
        item.type_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(search.toLowerCase());

      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(item.category_id);

      const expenseMatch =
        selectedExpenseTypes.length === 0 ||
        selectedExpenseTypes.includes(item.expense_type);

      const methodMatch =
        selectedMethods.length === 0 ||
        selectedMethods.includes(item.distribution_method);

      return searchMatch && categoryMatch && expenseMatch && methodMatch;
    });
  }, [
    budget,
    search,
    selectedCategories,
    selectedExpenseTypes,
    selectedMethods,
  ]);
  const currentBudgetAdjustmentRequests = useMemo(
    () =>
      adjustmentRequests.filter((request) =>
        budget?.financial_year_id
          ? Number(request.financial_year?.id) === Number(budget.financial_year_id)
          : true,
      ),
    [adjustmentRequests, budget],
  );
  if (isLoading) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading Budget"
        subtitle="Fetching budget information and items..."
      />
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Budget Not Found</h2>

          <p className="mt-2 text-slate-500">
            The requested budget could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          {
            label: "Dashboard",
            path: "/",
          },
          budgetListBreadcrumb,
          {
            label: `Budget ${budget.financial_year}`,
          },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Department Budget Details</h1>

        <p className="mt-2 text-slate-500">
          {pageDescription}
        </p>
      </div>

      <BudgetHeaderCard
        currentBudget={budget}
        openYear={{
          year: budget.financial_year,
        }}
        budgetStatus={budget.status}
      />

      <BudgetCompactSummaryPanel
        totalQuantity={totalQuantity}
        totalApprovedQuantity={totalApprovedQuantity}
        totalApprovedAmount={totalApprovedAmount}
      />

      <CollapsibleSection
        title="Budget Items"
        description={`${filteredItems.length} of ${
          budget?.items?.length || 0
        } item(s)`}
        defaultOpen
        className="bg-white"
        headerClassName="bg-white"
        bodyClassName="bg-white"
      >
        {showHodAdjustmentActions ? (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-black text-slate-950">
                Post-pre-closing adjustment
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Request an item adjustment only when the selected financial year
                is in PRE_CLOSING.
              </p>
            </div>
            <button
              type="button"
              disabled={!canRequestAdjustment}
              title={
                canRequestAdjustment
                  ? "Request an adjustment for this budget"
                  : "Adjustment requests are available only when this financial year is PRE_CLOSING."
              }
              onClick={() => setAdjustmentDrawerOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AlertCircle size={16} />
              Request Adjustment
            </button>
          </div>
        ) : null}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900">Search</h3>

            <p className="text-sm text-slate-500">
              Search budget items.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <EnterpriseSearch
              value={search}
              onChange={setSearch}
              placeholder="Search..."
            />

            <SearchableMultiSelect
              multiple
              values={selectedCategories}
              options={categoryOptions}
              placeholder="Categories"
              onChange={(e) => setSelectedCategories(e.target.value)}
            />

            <SearchableMultiSelect
              multiple
              values={selectedExpenseTypes}
              options={expenseTypeOptions}
              placeholder="Expense Type"
              onChange={(e) => setSelectedExpenseTypes(e.target.value)}
            />

            <SearchableMultiSelect
              multiple
              values={selectedMethods}
              options={methodOptions}
              placeholder="Distribution Method"
              onChange={(e) => setSelectedMethods(e.target.value)}
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              Showing {filteredItems.length} of {budget?.items?.length || 0}{" "}
              items
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategories([]);
                setSelectedExpenseTypes([]);
                setSelectedMethods([]);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <BudgetItemsTable
          items={filteredItems}
          readOnly
          showFinancialColumns={false}
          showApprovedAmountColumn
          onViewDistribution={setSelectedDistributionItem}
        />

        {showHodAdjustmentActions ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="font-black text-slate-950">
                My Adjustment Requests
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Requests for FY {budget.financial_year}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-left text-xs font-black uppercase text-slate-500">
                  <tr>
                    <th className="p-4">Category</th>
                    <th className="p-4">Item</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Submitted</th>
                    <th className="p-4">Manager Note</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBudgetAdjustmentRequests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-200">
                      <td className="p-4 font-bold">
                        {request.category?.name || "-"}
                      </td>
                      <td className="p-4">
                        {request.item?.catalog_item_name || "-"}
                      </td>
                      <td className="p-4">
                        {request.item?.change_type === "ADD_ITEM"
                          ? "Add Item"
                          : "Increase"}
                      </td>
                      <td className="p-4 font-bold text-blue-700">
                        {formatQuantity(request.item?.requested_quantity)}
                      </td>
                      <td className="p-4">
                        <RequestStatusBadge status={request.status} />
                      </td>
                      <td className="p-4">
                        {request.submitted_at
                          ? formatDateTime(request.submitted_at)
                          : "-"}
                      </td>
                      <td className="p-4 text-slate-600">
                        {request.category_note || "-"}
                      </td>
                    </tr>
                  ))}
                  {currentBudgetAdjustmentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No adjustment requests for this financial year yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CollapsibleSection>

      {showHodAdjustmentActions ? (
        <AdjustmentRequestDrawer
          open={adjustmentDrawerOpen}
          onClose={() => setAdjustmentDrawerOpen(false)}
          departmentBudget={budget}
        />
      ) : null}

      <BudgetDistributionDetailsDrawer
        open={Boolean(selectedDistributionItem)}
        item={selectedDistributionItem}
        title="Budget Item Distribution"
        onClose={() => setSelectedDistributionItem(null)}
      />
    </div>
  );
}
