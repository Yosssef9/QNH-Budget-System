import { useMemo, useState } from "react";

import Breadcrumbs from "../../components/Breadcrumbs";
import EnterpriseSearch from "../../components/EnterpriseSearch";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import LoadingSpinner from "../../components/LoadingSpinner";
import BudgetCompactSummaryPanel from "../../components/budgets/shared/BudgetCompactSummaryPanel";
import BudgetHeaderCard from "../../components/budgets/shared/BudgetHeaderCard";
import BudgetItemsTable from "../../components/budgets/shared/BudgetItemsTable";
import BudgetBalanceSummaryTable from "../../components/budgets/shared/BudgetBalanceSummaryTable";
import BudgetItemPOLinksDrawer from "../../components/budgets/shared/drawers/BudgetItemPOLinksDrawer";

import CollapsibleSection from "../../components/CollapsibleSection";

import { useAuth } from "../../context/AuthContext";
import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import useBudgetBalanceSummary from "../../hooks/budgets/useBudgetBalanceSummary";
import { useBudgetView } from "../../hooks/budgets/useBudgetView";
import useBudgetTotals from "../../hooks/budgets/useBudgetTotals";

export default function BudgetViewPage() {
  const { budgetAccess } = useAuth();
  const { data, isLoading } = useBudgetView();

  const budget = data;
  const isBudgetApprover = can(
    budgetAccess,
    PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
  );
  const budgetListBreadcrumb = isBudgetApprover
    ? {
        label: "All Budgets",
        path: "/budgets/all",
      }
    : {
        label: "My Budgets",
        path: "/budgets/my",
      };

  const { data: balanceSummary = [] } = useBudgetBalanceSummary(budget?.id);

  const { totalQuantity, totalAmount } = useBudgetTotals(budget?.items || []);

  const [search, setSearch] = useState("");

  const [selectedCategories, setSelectedCategories] = useState([]);

  const [selectedExpenseTypes, setSelectedExpenseTypes] = useState([]);

  const [selectedMethods, setSelectedMethods] = useState([]);
  const [balanceSearch, setBalanceSearch] = useState("");

  const [selectedPOBudgetItem, setSelectedPOBudgetItem] = useState(null);
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
  const filteredBalanceSummary = useMemo(() => {
    return balanceSummary.filter((item) => {
      if (!balanceSearch) return true;

      return item.typeName?.toLowerCase().includes(balanceSearch.toLowerCase());
    });
  }, [balanceSummary, balanceSearch]);
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
        <h1 className="text-3xl font-bold">Budget Details</h1>

        <p className="mt-2 text-slate-500">
          View budget information and items.
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
        totalAmount={totalAmount}
      />

      <CollapsibleSection
        title="Budget Balance & Transfers"
        description={`${balanceSummary.length} budget item(s)`}
        defaultOpen
        className="bg-white"
        headerClassName="bg-white"
        bodyClassName="bg-white"
      >
        <>
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <h3 className="font-bold text-slate-900">Search & Filters</h3>

              <p className="text-sm text-slate-500">
                Quickly find balance and transfer items.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <EnterpriseSearch
                value={balanceSearch}
                onChange={setBalanceSearch}
                placeholder="Search item or category..."
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">
                Showing {filteredBalanceSummary.length} of{" "}
                {balanceSummary.length} items
              </p>

              <button
                type="button"
                onClick={() => {
                  setBalanceSearch("");
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <BudgetBalanceSummaryTable
            items={filteredBalanceSummary}
            onViewLinkedPOs={setSelectedPOBudgetItem}
          />
        </>
      </CollapsibleSection>

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
        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900">Search</h3>

            <p className="text-sm text-slate-500">
              Search budget balance records.
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

        <BudgetItemsTable items={filteredItems} readOnly showFinancialColumns={false} />
      </CollapsibleSection>

      <BudgetItemPOLinksDrawer
        open={Boolean(selectedPOBudgetItem)}
        budgetItemId={selectedPOBudgetItem?.itemId}
        onClose={() => setSelectedPOBudgetItem(null)}
      />
    </div>
  );
}
