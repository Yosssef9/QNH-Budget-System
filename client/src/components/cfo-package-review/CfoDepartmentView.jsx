import { useState } from "react";
import { Building2, Eye } from "lucide-react";

import usePagination from "../../hooks/usePagination";
import useTableSort from "../../hooks/useTableSort";
import CollapsibleSection from "../CollapsibleSection";
import CurrencyText from "../CurrencyText";
import SortableHeader from "../SortableHeader";
import TablePagination from "../TablePagination";
import CfoReviewStatusBadge from "./CfoReviewStatusBadge";
import CfoSplitDetailsDrawer from "./CfoSplitDetailsDrawer";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getAllocationTotal(allocations = []) {
  return allocations.reduce(
    (sum, allocation) =>
      sum +
      toNumber(allocation.allocated_quantity) * toNumber(allocation.unit_price),
    0,
  );
}

function getDepartmentTotal(department) {
  return (department.items || []).reduce(
    (sum, item) => sum + getAllocationTotal(item.allocations),
    0,
  );
}

function getIssueCount(department) {
  return (department.items || []).filter(
    (item) => item.reconciliation_status !== "RECONCILED",
  ).length;
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

function DepartmentTable({ department, packageId, onSelectPackageItem }) {
  const [splitItem, setSplitItem] = useState(null);
  const rows = department.items || [];
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
                  key={item.department_item_id}
                  onClick={() => onSelectPackageItem(item.package_item_id)}
                  className="cursor-pointer align-top hover:bg-blue-50/60"
                >
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
                      Unit prices are shared by package model.
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    <CurrencyText compact value={getAllocationTotal(item.allocations)} />
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
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
        packageId={splitItem?.package_id || packageId}
        packageItemId={splitItem?.package_item_id}
        item={splitItem}
        focusDepartmentItemId={splitItem?.department_item_id}
      />
    </>
  );
}

export default function CfoDepartmentView({
  departments,
  packageId,
  onSelectPackageItem,
}) {
  if (!departments?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">
        No department demand is available for this package.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {departments.map((department) => {
        const issueCount = getIssueCount(department);
        const departmentTotal = getDepartmentTotal(department);

        return (
          <CollapsibleSection
            key={department.department_id}
            title={department.department_name}
            description={`${department.department_code || "Department"} - ${
              department.item_count || department.items?.length || 0
            } item${(department.item_count || department.items?.length || 0) === 1 ? "" : "s"}`}
            icon={<Building2 size={20} />}
            defaultOpen={issueCount > 0}
            action={
              <CfoReviewStatusBadge status={department.reconciliation_status} />
            }
            className="border-slate-200"
            headerClassName="bg-slate-50 hover:bg-slate-100"
            iconClassName="border-slate-200 text-slate-700"
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Requested
                </p>
                <p className="text-base font-black text-slate-950">
                  {department.requested_quantity}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Approved
                </p>
                <p className="text-base font-black text-slate-950">
                  {department.approved_quantity}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Allocated
                </p>
                <p className="text-base font-black text-slate-950">
                  {department.allocated_quantity}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Issues
                </p>
                <p className="text-base font-black text-slate-950">
                  {issueCount}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-blue-600">
                  Department total
                </p>
                <p className="text-base font-black text-blue-900">
                  <CurrencyText compact value={departmentTotal} />
                </p>
              </div>
            </div>

            <DepartmentTable
              department={department}
              packageId={packageId}
              onSelectPackageItem={onSelectPackageItem}
            />
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
