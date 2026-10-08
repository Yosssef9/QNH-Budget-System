import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  Wallet,
} from "lucide-react";

import CollapsibleSection from "../../components/CollapsibleSection";
import CurrencyText from "../../components/CurrencyText";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import SortableHeader from "../../components/SortableHeader";
import TablePagination from "../../components/TablePagination";
import CategoryDepartmentRequestsTable from "../../components/budgets/category-manager/CategoryDepartmentRequestsTable";
import PackageSubItemPOLinksDrawer from "../../components/budgets/shared/drawers/PackageSubItemPOLinksDrawer";
import {
  getCategoryBudgetOverview,
  getCategoryBudgetYears,
} from "../../api/budget.api";
import { getTransferItems } from "../../api/transfer.api";
import { useAuth } from "../../context/AuthContext";
import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";
import { formatQty } from "../../utils/numberFormatter";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function CompactMetric({ label, value, children, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 bg-white px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon size={17} />
      </span>

      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 min-w-0 break-words text-lg font-black leading-6 text-slate-950">
          {children || value}
        </div>
      </div>
    </div>
  );
}

function CategoryBalanceTable({ items, onViewPoLinks }) {
  const rows = useMemo(
    () =>
      items.map((item) => {
        const unitPrice = Number(item.unit_price || 0);
        const approvedQuantity = Number(item.quantity || 0);
        const transferInQuantity = Number(
          item.approved_transfer_in_quantity || 0,
        );
        const transferOutQuantity = Number(
          item.approved_transfer_out_quantity || 0,
        );
        const pendingOutQuantity = Number(
          item.pending_transfer_out_quantity || 0,
        );
        const poUsedQuantity = Number(item.approved_po_linked_quantity || 0);
        const pendingPoQuantity = Number(item.pending_po_linked_quantity || 0);
        const netTransferQuantity = transferInQuantity - transferOutQuantity;

        return {
          ...item,
          typeName: item.generic_item_name || item.catalog_item_name || "-",
          modelName: item.model_name || item.sub_item_name || "Package model",
          unitPrice,
          approvedQuantity,
          approvedAmount: approvedQuantity * unitPrice,
          transferInQuantity,
          transferIn: transferInQuantity * unitPrice,
          transferOutQuantity,
          transferOut: transferOutQuantity * unitPrice,
          pendingOutQuantity,
          pendingOut: pendingOutQuantity * unitPrice,
          netTransferQuantity,
          netTransfer: netTransferQuantity * unitPrice,
          poUsedQuantity,
          poUsed: poUsedQuantity * unitPrice,
          pendingPoQuantity,
          pendingPo: pendingPoQuantity * unitPrice,
          remainingQuantity: Number(item.available_quantity || 0),
          remainingAmount: Number(item.available_amount || 0),
        };
      }),
    [items],
  );

  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    rows,
    "remainingAmount",
    "desc",
  );
  const pagination = usePagination(sortedRows.length, 25);

  const paginatedRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [pagination.page, pagination.pageSize, sortedRows]);

  function handleBalanceSort(column) {
    pagination.resetPage();
    handleSort(column);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="enterprise-scrollbar max-h-[65vh] overflow-auto">
        <table className="w-max min-w-full table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="text-slate-700">
              <SortableHeader
                label="Item / Model"
                column="typeName"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[300px]"
              />
              <SortableHeader
                label="Unit Price"
                column="unitPrice"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[150px]"
              />
              <SortableHeader
                label="Approved / Base"
                column="approvedAmount"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[170px]"
              />
              <SortableHeader
                label="Transfer In"
                column="transferIn"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[160px]"
              />
              <SortableHeader
                label="Transfer Out"
                column="transferOut"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[160px]"
              />
              <SortableHeader
                label="Pending Out"
                column="pendingOut"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[160px]"
              />
              <SortableHeader
                label="Net Transfer"
                column="netTransfer"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[160px]"
              />
              <SortableHeader
                label="PO Used"
                column="poUsed"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[160px]"
              />
              <SortableHeader
                label="Pending PO"
                column="pendingPo"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[160px]"
              />
              <SortableHeader
                label="Remaining"
                column="remainingAmount"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleBalanceSort}
                className="w-[180px]"
              />
            </tr>
          </thead>

          <tbody>
            {paginatedRows.map((item) => (
              <tr key={item.id}>
                <td className="border border-slate-200 px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-800">
                      {item.typeName}
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {item.modelName}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {item.expense_type || "Package sub-item"}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold">
                  <CurrencyText value={item.unitPrice} />
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center">
                  <div className="flex flex-col">
                    <CurrencyText value={item.approvedAmount} />
                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.approvedQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold text-emerald-600">
                  <div className="flex flex-col">
                    <CurrencyText value={item.transferIn} />
                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.transferInQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold text-red-600">
                  <div className="flex flex-col">
                    <CurrencyText value={item.transferOut} />
                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.transferOutQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold text-amber-600">
                  <div className="flex flex-col">
                    <CurrencyText value={item.pendingOut} />
                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.pendingOutQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold">
                  <div className="flex flex-col">
                    <CurrencyText value={item.netTransfer} />
                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.netTransferQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <CurrencyText value={item.poUsed} />
                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.poUsedQuantity)}
                    </span>
                    {(Number(item.poUsedQuantity || 0) > 0 ||
                      Number(item.pendingPoQuantity || 0) > 0) && (
                      <button
                        type="button"
                        onClick={() => onViewPoLinks?.(item)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        View PO Links
                      </button>
                    )}
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-semibold text-amber-600">
                  <div className="flex flex-col">
                    <CurrencyText value={item.pendingPo} />
                    <span className="text-xs text-slate-500">
                      Qty: {formatQty(item.pendingPoQuantity)}
                    </span>
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center font-bold text-blue-600">
                  <div className="flex flex-col">
                    <CurrencyText value={item.remainingAmount} />
                    <span className="text-xs font-medium text-slate-500">
                      Qty: {formatQty(item.remainingQuantity)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
                >
                  No category balance records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        startRow={pagination.startRow}
        endRow={pagination.endRow}
        totalRows={rows.length}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  );
}

function CategoryBudgetView({ financialYearId }) {
  const { budgetAccess } = useAuth();
  const navigate = useNavigate();
  const [selectedPoSubItem, setSelectedPoSubItem] = useState(null);
  const categoryName =
    budgetAccess?.budgetCategory?.name ||
    budgetAccess?.category?.name ||
    budgetAccess?.selectedWorkspace?.budgetCategory?.name ||
    "Assigned Category";

  const { data: categoryYears = [] } = useQuery({
    queryKey: ["category-budget-years"],
    queryFn: getCategoryBudgetYears,
  });

  const {
    data: overview,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErrorDetails,
  } = useQuery({
    queryKey: ["category-budget-overview", financialYearId],
    queryFn: () => getCategoryBudgetOverview(financialYearId),
    enabled: Boolean(financialYearId),
  });

  const {
    data: balanceItems = [],
    isLoading: balancesLoading,
    isError: balancesError,
    error: balancesErrorDetails,
  } = useQuery({
    queryKey: ["transfer-items", financialYearId],
    queryFn: () => getTransferItems(financialYearId),
    enabled: Boolean(financialYearId),
  });

  const departmentItems = overview?.items || [];
  const selectedYear =
    categoryYears.find(
      (year) => Number(year.financial_year_id) === Number(financialYearId),
    ) || null;
  const financialYear = overview?.financialYear || {
    id: selectedYear?.financial_year_id,
    year: selectedYear?.financial_year,
    status: selectedYear?.financial_year_status,
  };
  const packageStatus =
    overview?.package?.status || selectedYear?.package_status || "DRAFT";

  const totalRemaining = balanceItems.reduce(
    (sum, item) => sum + Number(item.available_amount || 0),
    0,
  );
  const totalBaseQuantity = balanceItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const totalApprovedDemand = departmentItems.reduce(
    (sum, item) => sum + Number(item.category_approved_quantity || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate("/budgets/my")}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-black text-blue-700 transition hover:text-blue-900"
            >
              <ArrowLeft size={15} />
              Back to category budget years
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="mr-1 text-2xl font-black tracking-tight text-slate-950">
                {categoryName} Budget
              </h1>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                {String(financialYear?.status || "UNKNOWN").replaceAll("_", " ")}
              </span>

              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                {String(packageStatus).replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="w-full lg:w-64">
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
              Financial Year
            </label>
            <SearchableMultiSelect
              name="financialYearId"
              multiple={false}
              disableClear
              value={Number(financialYearId)}
              options={categoryYears.map((year) => ({
                value: Number(year.financial_year_id),
                label: `FY ${year.financial_year} · ${String(
                  year.financial_year_status,
                ).replaceAll("_", " ")}`,
              }))}
              onChange={(event) => {
                const value = event?.target?.value;
                if (value) {
                  navigate(`/budgets/my/category/${value}`);
                }
              }}
              placeholder="Select financial year"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 p-3">
          <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMetric
              label="Package Models"
              value={balanceItems.length}
              icon={Boxes}
            />

            <CompactMetric
              label="Base Quantity"
              value={formatQuantity(totalBaseQuantity)}
              icon={Database}
            />

            <CompactMetric
              label="Approved Demand"
              value={formatQuantity(totalApprovedDemand)}
              icon={ClipboardCheck}
            />

            <CompactMetric label="Remaining Amount" icon={CircleDollarSign}>
              <CurrencyText compact value={totalRemaining} />
            </CompactMetric>
          </div>
        </div>
      </section>

      {requestsError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {requestsErrorDetails?.response?.data?.message ||
            requestsErrorDetails?.message ||
            "Failed to load the selected category budget."}
        </div>
      ) : null}

      {requestsLoading ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
          Loading department requests...
        </div>
      ) : (
        <CategoryDepartmentRequestsTable items={departmentItems} />
      )}

      <CollapsibleSection
        title="Category Balances"
        description="Package sub-item execution balances for your assigned category"
        icon={<Wallet size={22} />}
        defaultOpen
        className="bg-white"
        bodyClassName="bg-slate-50"
      >
        {balancesError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {balancesErrorDetails?.response?.data?.message ||
              balancesErrorDetails?.message ||
              "Failed to load category balances."}
          </div>
        ) : balancesLoading ? (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
            Loading category balances...
          </div>
        ) : (
          <CategoryBalanceTable
            items={balanceItems}
            onViewPoLinks={setSelectedPoSubItem}
          />
        )}
      </CollapsibleSection>

      <PackageSubItemPOLinksDrawer
        open={Boolean(selectedPoSubItem)}
        packageSubItemId={selectedPoSubItem?.id}
        onClose={() => setSelectedPoSubItem(null)}
      />
    </div>
  );
}

export default function CategoryBudgetViewPage() {
  const { financialYearId } = useParams();
  const selectedFinancialYearId = Number(financialYearId);

  return (
    <div>
      <CategoryBudgetView
        financialYearId={
          Number.isInteger(selectedFinancialYearId) &&
          selectedFinancialYearId > 0
            ? selectedFinancialYearId
            : null
        }
      />
    </div>
  );
}


