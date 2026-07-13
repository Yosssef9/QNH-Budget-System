import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  AlertCircle,
  Boxes,
  Building2,
  CheckCircle2,
  Layers3,
} from "lucide-react";

import { getCfoPackage } from "../../api/cfoPackageReview.api";
import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";
import CollapsibleSection from "../CollapsibleSection";
import CurrencyText from "../CurrencyText";
import SortableHeader from "../SortableHeader";
import TablePagination from "../TablePagination";
import CfoMetric from "./CfoMetric";
import CfoReviewStatusBadge from "./CfoReviewStatusBadge";
import CfoSplitDetailsDrawer from "./CfoSplitDetailsDrawer";

const CATEGORY_ORDER = ["IT", "GENERAL", "BIOMEDICAL"];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getCategorySortValue(pkg) {
  const code = String(pkg?.category_code || pkg?.category_name || "")
    .trim()
    .toUpperCase();
  const index = CATEGORY_ORDER.findIndex((entry) => code.includes(entry));
  return index >= 0 ? index : CATEGORY_ORDER.length;
}

function sortPackages(packages) {
  return [...packages].sort((left, right) => {
    const leftOrder = getCategorySortValue(left);
    const rightOrder = getCategorySortValue(right);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left.category_name || "").localeCompare(
      String(right.category_name || ""),
    );
  });
}

function sumPackageItems(packages, selector) {
  return packages.reduce(
    (sum, pkg) =>
      sum +
      (pkg.items || []).reduce(
        (itemSum, item) => itemSum + toNumber(selector(item)),
        0,
      ),
    0,
  );
}

function getAllocationTotal(allocations = []) {
  return allocations.reduce(
    (sum, allocation) =>
      sum +
      toNumber(allocation.allocated_quantity) * toNumber(allocation.unit_price),
    0,
  );
}

function getItemEstimatedTotal(item) {
  return toNumber(item?.estimated_total) || getAllocationTotal(item?.allocations);
}

function buildDepartmentRows(packageResponses) {
  const departmentMap = new Map();

  packageResponses.forEach((response) => {
    const pkg = response?.package;
    const departments = response?.departmentView?.departments || [];

    departments.forEach((department) => {
      const key = String(department.department_id);
      const current =
        departmentMap.get(key) ||
        {
          department_id: department.department_id,
          department_name: department.department_name,
          department_code: department.department_code,
          item_count: 0,
          requested_quantity: 0,
          approved_quantity: 0,
          allocated_quantity: 0,
          estimated_total: 0,
          issue_count: 0,
          categories: [],
        };

      const items = (department.items || []).map((item) => ({
        ...item,
        package_id: pkg?.id,
        category_name: pkg?.category_name,
        category_code: pkg?.category_code,
      }));
      const estimatedTotal = items.reduce(
        (sum, item) => sum + getItemEstimatedTotal(item),
        0,
      );
      const issueCount = items.filter(
        (item) => item.reconciliation_status !== "RECONCILED",
      ).length;

      current.item_count += items.length;
      current.requested_quantity += toNumber(department.requested_quantity);
      current.approved_quantity += toNumber(department.approved_quantity);
      current.allocated_quantity += toNumber(department.allocated_quantity);
      current.estimated_total += estimatedTotal;
      current.issue_count += issueCount;
      current.categories.push({
        category_id: pkg?.category_id,
        category_name: pkg?.category_name,
        category_code: pkg?.category_code,
        items,
        requested_quantity: toNumber(department.requested_quantity),
        approved_quantity: toNumber(department.approved_quantity),
        allocated_quantity: toNumber(department.allocated_quantity),
        estimated_total: estimatedTotal,
        issue_count: issueCount,
      });

      departmentMap.set(key, current);
    });
  });

  return [...departmentMap.values()].sort((left, right) =>
    String(left.department_name || "").localeCompare(
      String(right.department_name || ""),
    ),
  );
}

function QuantityLine({ label, value }) {
  return (
    <span className="rounded-xl bg-slate-50 px-3 py-2 font-bold text-slate-700">
      {label}: <span className="text-slate-950">{value}</span>
    </span>
  );
}

function TotalViewTabs({ view, onChange }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("CATEGORY")}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
            view === "CATEGORY"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100",
          ].join(" ")}
        >
          <Layers3 size={16} />
          By category / requested item
        </button>
        <button
          type="button"
          onClick={() => onChange("DEPARTMENT")}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
            view === "DEPARTMENT"
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100",
          ].join(" ")}
        >
          <Building2 size={16} />
          By department
        </button>
      </div>
    </section>
  );
}

function CategoryPackageSection({ pkg, onSelectPackageItem }) {
  const [splitItem, setSplitItem] = useState(null);
  const packageValue = (pkg.items || []).reduce(
    (sum, item) => sum + toNumber(item.estimated_total),
    0,
  );
  const packageApproved = (pkg.items || []).reduce(
    (sum, item) => sum + toNumber(item.approved_quantity),
    0,
  );
  const allocated =
    pkg.summary?.allocatedQuantity || pkg.summary?.allocated_quantity || "-";

  return (
    <CollapsibleSection
      title={pkg.category_name}
      description={`FY ${pkg.financial_year} - ${pkg.items?.length || 0} package item${
        (pkg.items?.length || 0) === 1 ? "" : "s"
      }`}
      icon={<Layers3 size={20} />}
      defaultOpen
      action={<CfoReviewStatusBadge status={pkg.status} />}
      className="border-slate-200"
      headerClassName="bg-slate-50 hover:bg-slate-100"
      iconClassName="border-slate-200 text-slate-700"
    >
      <div className="mb-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <span className="rounded-xl bg-slate-50 px-3 py-2 font-bold text-slate-700">
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-blue-600" />
          {packageApproved} approved
        </span>
        <span className="rounded-xl bg-slate-50 px-3 py-2 font-bold text-slate-700">
          <Layers3 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
          {allocated} allocated
        </span>
        <span className="rounded-xl bg-slate-50 px-3 py-2 font-bold text-slate-700">
          <CurrencyText compact value={packageValue} />
        </span>
      </div>

      {(pkg.items || []).length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3 text-right">Requested</th>
                <th className="px-5 py-3 text-right">Approved</th>
                <th className="px-5 py-3 text-right">Allocated</th>
                <th className="px-5 py-3 text-right">Sub-items</th>
                <th className="px-5 py-3 text-right">Value</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pkg.items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() =>
                    onSelectPackageItem?.({
                      packageId: pkg.id,
                      packageItemId: item.id,
                    })
                  }
                  className="cursor-pointer hover:bg-blue-50/60"
                >
                  <td className="px-5 py-3">
                    <p className="font-bold text-slate-900">
                      {item.catalog_item_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.catalog_item_code || "Catalog item"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {item.requested_quantity}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {item.approved_quantity}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {item.allocated_quantity}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {item.active_sub_item_count || 0}
                  </td>
                  <td className="px-5 py-3 text-right font-bold">
                    <CurrencyText compact value={item.estimated_total} />
                  </td>
                  <td className="px-5 py-3">
                    <CfoReviewStatusBadge status={item.cfo_review_status} />
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSplitItem(item);
                      }}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                    >
                      View split
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-5 py-6 text-sm text-slate-500">
          <AlertCircle className="h-4 w-4" />
          No package items are available for this category.
        </div>
      )}
      <CfoSplitDetailsDrawer
        open={Boolean(splitItem)}
        onClose={() => setSplitItem(null)}
        packageId={pkg.id}
        packageItemId={splitItem?.id}
        item={splitItem}
      />
    </CollapsibleSection>
  );
}

function flattenDepartmentItems(department) {
  return department.categories.flatMap((category) =>
    (category.items || []).map((item) => ({
      ...item,
      category_name: category.category_name,
      category_code: category.category_code,
      package_id: item.package_id,
    })),
  );
}

function getSplitSummary(item) {
  const allocations = item.allocations || [];
  if (!allocations.length) return "No split";
  if (allocations.length === 1) {
    const allocation = allocations[0];
    return `${allocation.package_sub_item_name}: ${allocation.allocated_quantity}`;
  }
  return `${allocations.length} models`;
}

function DepartmentItemTable({ department, onSelectPackageItem }) {
  const [splitItem, setSplitItem] = useState(null);
  const rows = flattenDepartmentItems(department);
  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    rows,
    "catalog_item_name",
    "asc",
  );
  const pagination = usePagination(sortedRows.length, 10);
  const pagedRows = sortedRows.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize,
  );

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <SortableHeader
                  label="Category"
                  column="category_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Requested item"
                  column="catalog_item_name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Requested"
                  column="requested_quantity"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Approved"
                  column="approved_quantity"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Allocated"
                  column="allocated_quantity"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                />
                <th className="border border-slate-200 px-4 py-3">
                  Model split
                </th>
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Total value
                </th>
                <th className="border border-slate-200 px-4 py-3">Status</th>
                <th className="border border-slate-200 px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagedRows.map((item) => (
                <tr
                  key={`${item.package_id}-${item.department_item_id}`}
                  onClick={() =>
                    onSelectPackageItem?.({
                      packageId: item.package_id,
                      packageItemId: item.package_item_id,
                    })
                  }
                  className="cursor-pointer align-top hover:bg-blue-50/60"
                >
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {item.category_name}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">
                      {item.catalog_item_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.catalog_item_code || "Catalog item"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {item.requested_quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {item.approved_quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {item.allocated_quantity}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">
                      {getSplitSummary(item)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Shared unit prices by model
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    <CurrencyText compact value={getItemEstimatedTotal(item)} />
                  </td>
                  <td className="px-4 py-3">
                    <CfoReviewStatusBadge status={item.reconciliation_status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSplitItem(item);
                      }}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                    >
                      View split
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          totalRows={sortedRows.length}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          pageSizes={[10, 25, 50]}
        />
      </div>

      <CfoSplitDetailsDrawer
        open={Boolean(splitItem)}
        onClose={() => setSplitItem(null)}
        packageId={splitItem?.package_id}
        packageItemId={splitItem?.package_item_id}
        item={splitItem}
        focusDepartmentItemId={splitItem?.department_item_id}
      />
    </>
  );
}

export default function CfoTotalPackageOverview({ packages, onSelectPackageItem }) {
  const [view, setView] = useState("CATEGORY");
  const packageQueries = useQueries({
    queries: packages.map((pkg) => ({
      queryKey: ["cfo-package-review", "package", pkg.id],
      queryFn: () => getCfoPackage(pkg.id),
      enabled: Boolean(pkg.id),
    })),
  });

  const loading = packageQueries.some((query) => query.isLoading);
  const error = packageQueries.find((query) => query.isError)?.error;
  const packageResponses = packageQueries.map((query) => query.data).filter(Boolean);
  const packageDetails = packageResponses
    .map((response) => response?.package)
    .filter(Boolean);
  const sortedPackages = sortPackages(packageDetails);
  const departmentRows = useMemo(
    () => buildDepartmentRows(packageResponses),
    [packageResponses],
  );

  const totalItems = sortedPackages.reduce(
    (sum, pkg) => sum + (pkg.items || []).length,
    0,
  );
  const totalSubItems = sortedPackages.reduce(
    (sum, pkg) =>
      sum +
      (pkg.items || []).reduce(
        (itemSum, item) => itemSum + toNumber(item.active_sub_item_count),
        0,
      ),
    0,
  );
  const totalRequested = sumPackageItems(
    sortedPackages,
    (item) => item.requested_quantity,
  );
  const totalApproved = sumPackageItems(
    sortedPackages,
    (item) => item.approved_quantity,
  );
  const totalAllocated = sumPackageItems(
    sortedPackages,
    (item) => item.allocated_quantity,
  );
  const totalValue = sumPackageItems(
    sortedPackages,
    (item) => item.estimated_total,
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading total package overview...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-sm font-semibold text-rose-700">
        Could not load the total package overview.
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              View only
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">
              Total Package
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Combined read-only overview of all submitted category packages.
              CFO decisions remain inside each individual category package.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            {sortedPackages.length} category package
            {sortedPackages.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <CfoMetric label="Total value" value={totalValue} currency />
          <CfoMetric label="Package items" value={totalItems} />
          <CfoMetric label="Sub-items" value={totalSubItems} />
          <CfoMetric label="Requested qty" value={totalRequested} />
          <CfoMetric label="Approved qty" value={totalApproved} />
          <CfoMetric label="Allocated qty" value={totalAllocated} />
        </div>
      </section>

      <TotalViewTabs view={view} onChange={setView} />

      {view === "CATEGORY" &&
        sortedPackages.map((pkg) => (
          <CategoryPackageSection
            key={pkg.id}
            pkg={pkg}
            onSelectPackageItem={onSelectPackageItem}
          />
        ))}

      {view === "DEPARTMENT" && (
        <div className="space-y-4">
          {departmentRows.length ? (
            departmentRows.map((department) => (
              <CollapsibleSection
                key={department.department_id}
                title={department.department_name}
                description={`${department.department_code || "Department"} - ${
                  department.item_count
                } item${department.item_count === 1 ? "" : "s"} across submitted categories`}
                icon={<Building2 size={20} />}
                defaultOpen={department.issue_count > 0}
                className="border-slate-200"
                headerClassName="bg-slate-50 hover:bg-slate-100"
                iconClassName="border-slate-200 text-slate-700"
              >
                <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <QuantityLine label="Requested" value={department.requested_quantity} />
                  <QuantityLine label="Approved" value={department.approved_quantity} />
                  <QuantityLine label="Allocated" value={department.allocated_quantity} />
                  <QuantityLine label="Items" value={department.item_count} />
                  <QuantityLine label="Issues" value={department.issue_count} />
                  <span className="rounded-xl bg-blue-50 px-3 py-2 font-bold text-blue-900">
                    Value:{" "}
                    <CurrencyText compact value={department.estimated_total} />
                  </span>
                </div>
                <DepartmentItemTable
                  department={department}
                  onSelectPackageItem={onSelectPackageItem}
                />
              </CollapsibleSection>
            ))
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">
              No department demand is available across the submitted packages.
            </section>
          )}
        </div>
      )}

      {sortedPackages.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">
          <Boxes className="mb-2 h-5 w-5" />
          No submitted category packages are available for the total overview.
        </section>
      ) : null}
    </div>
  );
}
