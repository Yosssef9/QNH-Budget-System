import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  FileText,
  Search,
  Wallet,
} from "lucide-react";

import Breadcrumbs from "../../components/Breadcrumbs";
import CollapsibleSection from "../../components/CollapsibleSection";
import CurrencyText from "../../components/CurrencyText";
import EnterpriseSearch from "../../components/EnterpriseSearch";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import SortableHeader from "../../components/SortableHeader";
import AdjustmentRequestDetailsDrawer from "../../components/adjustment-requests/AdjustmentRequestDetailsDrawer";
import BudgetMethodBadge from "../../components/budgets/shared/BudgetMethodBadge";
import BudgetDistributionDetailsDrawer from "../../components/budgets/shared/drawers/BudgetDistributionDetailsDrawer";
import PackageSubItemPOLinksDrawer from "../../components/budgets/shared/drawers/PackageSubItemPOLinksDrawer";
import {
  getCategoryBudgetOverview,
  getMyBudgets,
} from "../../api/budget.api";
import { getTransferItems } from "../../api/transfer.api";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";
import { formatDateTime } from "../../utils/dateFormatters";
import useTableSort from "../../hooks/useTableSort";
import { formatQty } from "../../utils/numberFormatter";

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

function MetricCard({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 min-w-0 break-words text-2xl font-black text-slate-950">
        {children || value}
      </div>
    </div>
  );
}

function DepartmentBudgetView() {
  const navigate = useNavigate();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["my-budgets"],
    queryFn: getMyBudgets,
  });

  const sortedBudgets = useMemo(
    () =>
      [...budgets].sort(
        (a, b) => Number(b.financial_year || 0) - Number(a.financial_year || 0),
      ),
    [budgets],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <Wallet size={14} />
              Department Workspace
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              My Department Budgets
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Select a financial year to view its budget items and adjustment
              request history.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Budgets" value={budgets.length} />
        <MetricCard
          label="Latest Year"
          value={sortedBudgets[0]?.financial_year || "-"}
        />
        <MetricCard
          label="Total Items"
          value={formatQuantity(
            budgets.reduce(
              (sum, budget) => sum + Number(budget.items_count || 0),
              0,
            ),
          )}
        />
        <MetricCard
          label="Requested Quantity"
          value={formatQuantity(
            budgets.reduce(
              (sum, budget) =>
                sum + Number(budget.total_requested_quantity || 0),
              0,
            ),
          )}
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">
            Budget Years
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Read-only department budget history across financial years.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Financial Year</th>
                <th className="px-4 py-3">Year Status</th>

                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Requested Quantity</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Loading budgets...
                  </td>
                </tr>
              ) : sortedBudgets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No budgets found.
                  </td>
                </tr>
              ) : (
                sortedBudgets.map((budget) => (
                  <tr
                    key={budget.id}
                    onClick={() => navigate(`/budgets/view/${budget.id}`)}
                    className="cursor-pointer border-t border-slate-200 transition hover:bg-blue-50/50"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/budgets/view/${budget.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-4 font-black text-slate-950">
                      FY {budget.financial_year}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {budget.financial_year_status}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {formatQuantity(budget.items_count)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-blue-700">
                      {formatQuantity(budget.total_requested_quantity)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {budget.updated_at ? formatDateTime(budget.updated_at) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
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

  return (
    <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-max min-w-full table-fixed border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-white">
          <tr className="text-slate-700">
            <SortableHeader
              label="Item / Model"
              column="typeName"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[300px]"
            />
            <SortableHeader
              label="Unit Price"
              column="unitPrice"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[150px]"
            />
            <SortableHeader
              label="Approved / Base"
              column="approvedAmount"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[170px]"
            />
            <SortableHeader
              label="Transfer In"
              column="transferIn"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />
            <SortableHeader
              label="Transfer Out"
              column="transferOut"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />
            <SortableHeader
              label="Pending Out"
              column="pendingOut"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />
            <SortableHeader
              label="Net Transfer"
              column="netTransfer"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />
            <SortableHeader
              label="PO Used"
              column="poUsed"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />
            <SortableHeader
              label="Pending PO"
              column="pendingPo"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[160px]"
            />
            <SortableHeader
              label="Remaining"
              column="remainingAmount"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="w-[180px]"
            />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((item) => (
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
  );
}

function cleanItemMetadata(item) {
  const parts = [item.expense_type];
  const code = item.item_code;

  if (code && !code.includes("_")) {
    parts.push(code);
  }

  return parts.filter(Boolean).join(" - ");
}

function formatSignedQuantity(value) {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";
  return `${sign}${formatQuantity(number)}`;
}

function getApprovalDifference(item) {
  return (
    Number(item.category_approved_quantity || 0) -
    Number(item.requested_quantity || 0)
  );
}

function getAdjustmentDifference(item) {
  if (!item.adjustment) return null;
  return (
    Number(item.adjustment.requested_quantity || 0) -
    Number(item.category_approved_quantity || 0)
  );
}

function buildAdjustmentDetailsRequest(item) {
  if (!item?.adjustment) return null;

  return {
    id: item.adjustment.id,
    status: item.adjustment.status,
    reason: item.adjustment.reason,
    category_note: item.adjustment.category_note,
    submitted_at: item.adjustment.submitted_at,
    department: {
      id: item.department_id,
      name: item.department_name,
    },
    category: {
      id: item.budget_category_id,
      name: item.category_name,
    },
    financial_year: {
      id: item.financial_year_id,
      year: item.financial_year,
    },
    item: {
      catalog_item_name: item.catalog_item_name,
      expense_type: item.expense_type,
      change_type: item.adjustment.change_type || "INCREASE_QUANTITY",
      current_requested_quantity: item.category_approved_quantity,
      requested_quantity: item.adjustment.requested_quantity,
      description: item.adjustment.description,
    },
    submitted_by_name: item.adjustment.submitted_by_name,
    category_reviewed_by_name: item.adjustment.category_reviewed_by_name,
  };
}

function CategoryDepartmentRequestsTable({ items }) {
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [selectedDistributionItem, setSelectedDistributionItem] = useState(null);

  const departments = useMemo(() => {
    const unique = new Map();
    items.forEach((item) => {
      unique.set(item.department_id, item.department_name);
    });
    return [
      { value: "ALL", label: "All Departments" },
      ...Array.from(unique.entries()).map(([id, name]) => ({
        value: String(id),
        label: name,
      })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const departmentMatch =
        departmentFilter === "ALL" ||
        String(item.department_id) === String(departmentFilter);
      const searchMatch =
        !q ||
        [
          item.department_name,
          item.catalog_item_name,
          item.item_code,
          item.review_note,
          item.adjustment?.reason,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      return departmentMatch && searchMatch;
    });
  }, [items, departmentFilter, search]);

  const rows = useMemo(
    () =>
      filteredItems.map((item) => ({
        ...item,
        departmentName: item.department_name || "-",
        itemName: item.catalog_item_name || "-",
        requestedQuantity: Number(item.requested_quantity || 0),
        approvedQuantity: Number(item.category_approved_quantity || 0),
        approvalDifference: getApprovalDifference(item),
        distributionMethod: item.distribution_method || "ANNUAL",
        reviewStatus: item.review_status || "NONE",
        adjustmentStatus: item.adjustment?.status || "NONE",
        adjustmentRequestedQuantity: Number(
          item.adjustment?.requested_quantity || 0,
        ),
      })),
    [filteredItems],
  );

  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    rows,
    "departmentName",
    "asc",
  );

  return (
    <>
      <CollapsibleSection
        title="Department Requests"
        description="Approved department demand for your assigned category"
        icon={<FileText size={22} />}
        defaultOpen
        className="bg-white"
        bodyClassName="space-y-4 bg-slate-50"
      >
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Search size={16} />
            Filter department requests
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="w-full sm:w-72">
              <EnterpriseSearch
                value={search}
                onChange={setSearch}
                placeholder="Search department items..."
                showClear
              />
            </div>
            <div className="w-full sm:w-72">
              <SearchableMultiSelect
                multiple={false}
                disableClear
                value={departmentFilter}
                options={departments}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value || "ALL")
                }
                placeholder="Department"
              />
            </div>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-max min-w-full table-fixed border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="text-slate-700">
                <SortableHeader
                  label="Department"
                  column="departmentName"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[220px]"
                />
                <SortableHeader
                  label="Item"
                  column="itemName"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[300px]"
                />
                <SortableHeader
                  label="Requested Qty"
                  column="requestedQuantity"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[145px]"
                />
                <SortableHeader
                  label="Approved Qty"
                  column="approvedQuantity"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[145px]"
                />
                <SortableHeader
                  label="Difference"
                  column="approvalDifference"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[145px]"
                />
                <SortableHeader
                  label="Distribution"
                  column="distributionMethod"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[180px]"
                />
                <SortableHeader
                  label="Review Status"
                  column="reviewStatus"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[185px]"
                />
                <SortableHeader
                  label="Adjustment Status"
                  column="adjustmentStatus"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="w-[190px]"
                />
                <th className="w-[250px] border border-slate-200 px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                  Latest Adjustment
                </th>
                <th className="w-[280px] border border-slate-200 px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                  Notes
                </th>
                <th className="w-[130px] border border-slate-200 px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((item) => {
                const metadata = cleanItemMetadata(item);
                const difference = item.approvalDifference;
                const adjustmentDifference = getAdjustmentDifference(item);
                const detailsRequest = buildAdjustmentDetailsRequest(item);

                return (
                  <tr key={item.id}>
                    <td className="border border-slate-200 px-4 py-4 align-top">
                      <div className="font-bold text-slate-900">
                        {item.departmentName}
                      </div>

                    </td>
                    <td className="border border-slate-200 px-4 py-4 align-top">
                      <div className="font-bold text-slate-900">
                        {item.itemName}
                      </div>
                      {(item.is_project === true || item.is_project === 1) && (
                        <div className="mt-1 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                          Project
                        </div>
                      )}
                      {metadata ? (
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {metadata}
                        </div>
                      ) : null}
                    </td>
                    <td className="border border-slate-200 px-4 py-4 text-center align-top font-semibold">
                      {formatQuantity(item.requestedQuantity)}
                    </td>
                    <td className="border border-slate-200 px-4 py-4 text-center align-top font-bold text-blue-700">
                      {formatQuantity(item.approvedQuantity)}
                    </td>
                    <td className="border border-slate-200 px-4 py-4 text-center align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          difference < 0
                            ? "bg-amber-50 text-amber-700"
                            : difference > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {formatSignedQuantity(difference)}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-4 py-4 text-center align-top">
                      <BudgetMethodBadge method={item.distributionMethod} />
                      <button
                        type="button"
                        onClick={() => setSelectedDistributionItem(item)}
                        className="mt-2 inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
                      >
                        View details
                      </button>
                    </td>
                    <td className="border border-slate-200 px-4 py-4 align-top">
                      <RequestStatusBadge status={item.reviewStatus} />
                    </td>
                    <td className="border border-slate-200 px-4 py-4 align-top">
                      <RequestStatusBadge status={item.adjustmentStatus} />
                    </td>
                    <td className="border border-slate-200 px-4 py-4 align-top">
                      {item.adjustment ? (
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-900">
                            Approved {formatQuantity(item.approvedQuantity)} -&gt;{" "}
                            Requested{" "}
                            {formatQuantity(item.adjustmentRequestedQuantity)}
                          </div>
                          <div className="text-xs font-black text-blue-700">
                            {adjustmentDifference === null
                              ? "-"
                              : formatSignedQuantity(adjustmentDifference)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">
                          None
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-200 px-4 py-4 align-top text-slate-600">
                      <div className="line-clamp-3 text-sm leading-5">
                        {item.adjustment?.category_note ||
                          item.adjustment?.reason ||
                          item.review_note ||
                          "-"}
                      </div>
                    </td>
                    <td className="border border-slate-200 px-4 py-4 align-top">
                      {detailsRequest ? (
                        <button
                          type="button"
                          onClick={() => setSelectedAdjustment(detailsRequest)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    No department requests found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <AdjustmentRequestDetailsDrawer
        open={Boolean(selectedAdjustment)}
        request={selectedAdjustment}
        onClose={() => setSelectedAdjustment(null)}
      />
      <BudgetDistributionDetailsDrawer
        open={Boolean(selectedDistributionItem)}
        item={selectedDistributionItem}
        title="Department Request Distribution"
        onClose={() => setSelectedDistributionItem(null)}
      />
    </>
  );
}

function CategoryBudgetView() {
  const { budgetAccess } = useAuth();
  const [selectedPoSubItem, setSelectedPoSubItem] = useState(null);
  const categoryName =
    budgetAccess?.budgetCategory?.name ||
    budgetAccess?.category?.name ||
    budgetAccess?.selectedWorkspace?.budgetCategory?.name ||
    "Assigned Category";

  const { data: balanceItems = [], isLoading: balancesLoading } = useQuery({
    queryKey: ["transfer-items"],
    queryFn: getTransferItems,
  });

  const { data: departmentItems = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["category-budget-overview"],
    queryFn: getCategoryBudgetOverview,
  });

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
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
          <Wallet size={14} />
          Category Manager Workspace
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Category Budget Overview
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          View {categoryName} balances, execution availability, and department
          requested items for your assigned category.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Package Models" value={balanceItems.length} />
        <MetricCard label="Base Quantity" value={formatQuantity(totalBaseQuantity)} />
        <MetricCard
          label="Approved Demand"
          value={formatQuantity(totalApprovedDemand)}
        />
        <MetricCard label="Remaining Amount">
          <CurrencyText compact value={totalRemaining} />
        </MetricCard>
      </section>

      <CollapsibleSection
        title="Category Balances"
        description="Package sub-item execution balances for your assigned category"
        icon={<Wallet size={22} />}
        defaultOpen
        className="bg-white"
        bodyClassName="bg-slate-50"
      >
        {balancesLoading ? (
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

      {requestsLoading ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
          Loading department requests...
        </div>
      ) : (
        <CategoryDepartmentRequestsTable items={departmentItems} />
      )}

      <PackageSubItemPOLinksDrawer
        open={Boolean(selectedPoSubItem)}
        packageSubItemId={selectedPoSubItem?.id}
        onClose={() => setSelectedPoSubItem(null)}
      />
    </div>
  );
}

export default function MyBudgetsPage() {
  const { budgetAccess } = useAuth();
  const navigate = useNavigate();
  const isBudgetApprover = can(
    budgetAccess,
    PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
  );
  const canViewCategoryBudget = can(
    budgetAccess,
    PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
  );
  const canCreateTransfers = can(
    budgetAccess,
    PERMISSION_CODES.CREATE_CATEGORY_TRANSFERS,
  );
  const isCategoryManagerView = canViewCategoryBudget || canCreateTransfers;

  if (isBudgetApprover) {
    navigate("/budgets/all", { replace: true });
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs />
      {isCategoryManagerView ? <CategoryBudgetView /> : <DepartmentBudgetView />}
    </div>
  );
}
