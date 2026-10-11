import { useMemo, useState } from "react";
import { Eye, FileText } from "lucide-react";

import AdjustmentRequestDetailsDrawer from "../../adjustment-requests/AdjustmentRequestDetailsDrawer";
import BudgetMethodBadge from "../shared/BudgetMethodBadge";
import BudgetDistributionDetailsDrawer from "../shared/drawers/BudgetDistributionDetailsDrawer";
import CollapsibleSection from "../../CollapsibleSection";
import SortableHeader from "../../SortableHeader";
import TablePagination from "../../TablePagination";
import usePagination from "../../../hooks/usePagination";
import useTableSort from "../../../hooks/useTableSort";
import DepartmentCountPopover from "./DepartmentCountPopover";
import DepartmentRequestsToolbar from "./DepartmentRequestsToolbar";

const DEFAULT_FILTERS = {
  department: "ALL",
  expenseType: "ALL",
  distributionMethod: "ALL",
  reviewStatus: "ALL",
  adjustmentStatus: "ALL",
  projectType: "ALL",
};

function formatQuantity(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function humanize(value) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildOptions(values, allLabel, labeler = humanize) {
  const unique = Array.from(
    new Set(
      values
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map((value) => String(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return [
    { value: "ALL", label: allLabel },
    ...unique.map((value) => ({
      value,
      label: labeler(value),
    })),
  ];
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

function DifferenceBadge({ value }) {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        number < 0
          ? "bg-amber-50 text-amber-700"
          : number > 0
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-700"
      }`}
    >
      {sign}
      {formatQuantity(number)}
    </span>
  );
}

function TypeBadge({ value }) {
  const normalized = String(value || "").toUpperCase();
  const className =
    normalized === "CAPEX"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : normalized === "OPEX"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${className}`}
    >
      {value || "-"}
    </span>
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

function buildSummaryRows(rows) {
  const itemMap = new Map();

  rows.forEach((item) => {
    const hasCatalogIdentity =
      item.catalog_item_id !== null && item.catalog_item_id !== undefined;
    const key = hasCatalogIdentity
      ? `catalog:${item.catalog_item_id}`
      : `request:${item.id}`;

    if (!itemMap.has(key)) {
      itemMap.set(key, {
        id: key,
        catalogItemId: item.catalog_item_id ?? null,
        itemName: item.catalog_item_name || "-",
        itemCode: item.item_code || null,
        requestedQuantity: 0,
        approvedQuantity: 0,
        expenseTypes: new Set(),
        projectStates: new Set(),
        departmentMap: new Map(),
      });
    }

    const summary = itemMap.get(key);
    const requestedQuantity = Number(item.requested_quantity || 0);
    const approvedQuantity = Number(item.category_approved_quantity || 0);
    const departmentKey = String(item.department_id ?? item.department_name);

    summary.requestedQuantity += requestedQuantity;
    summary.approvedQuantity += approvedQuantity;

    if (item.expense_type) {
      summary.expenseTypes.add(String(item.expense_type));
    }

    summary.projectStates.add(
      item.is_project === true || item.is_project === 1
        ? "PROJECT"
        : "NON_PROJECT",
    );

    if (!summary.departmentMap.has(departmentKey)) {
      summary.departmentMap.set(departmentKey, {
        departmentId: departmentKey,
        departmentName: item.department_name || "-",
        departmentCode: item.department_code || null,
        requestedQuantity: 0,
        approvedQuantity: 0,
      });
    }

    const department = summary.departmentMap.get(departmentKey);
    department.requestedQuantity += requestedQuantity;
    department.approvedQuantity += approvedQuantity;
  });

  return Array.from(itemMap.values()).map((summary) => {
    const departments = Array.from(summary.departmentMap.values()).sort(
      (left, right) =>
        String(left.departmentName).localeCompare(String(right.departmentName)),
    );
    const expenseTypes = Array.from(summary.expenseTypes);
    const projectStates = Array.from(summary.projectStates);

    return {
      id: summary.id,
      catalogItemId: summary.catalogItemId,
      itemName: summary.itemName,
      itemCode: summary.itemCode,
      expenseType:
        expenseTypes.length === 1 ? expenseTypes[0] : expenseTypes.join(" / "),
      projectType:
        projectStates.length === 1 ? projectStates[0] : "MIXED",
      departmentCount: departments.length,
      departments,
      requestedQuantity: summary.requestedQuantity,
      approvedQuantity: summary.approvedQuantity,
      approvalDifference:
        summary.approvedQuantity - summary.requestedQuantity,
    };
  });
}

function DepartmentDetailTable({
  rows,
  sort,
  onSort,
  onSelectAdjustment,
  onSelectDistribution,
}) {
  return (
    <div className="enterprise-scrollbar max-h-[65vh] overflow-auto">
      <table className="w-max min-w-full table-fixed border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-white">
          <tr className="text-slate-700">
            <SortableHeader
              label="Department"
              column="departmentName"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[220px]"
            />
            <SortableHeader
              label="Item"
              column="itemName"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[300px]"
            />
            <SortableHeader
              label="Requested Qty"
              column="requestedQuantity"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[145px]"
            />
            <SortableHeader
              label="Approved Qty"
              column="approvedQuantity"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[145px]"
            />
            <SortableHeader
              label="Difference"
              column="approvalDifference"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[145px]"
            />
            <SortableHeader
              label="Distribution"
              column="distributionMethod"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[180px]"
            />
            <SortableHeader
              label="Review Status"
              column="reviewStatus"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[185px]"
            />
            <SortableHeader
              label="Adjustment Status"
              column="adjustmentStatus"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
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
          {rows.map((item) => {
            const metadata = cleanItemMetadata(item);
            const adjustmentDifference = getAdjustmentDifference(item);
            const detailsRequest = buildAdjustmentDetailsRequest(item);

            return (
              <tr key={item.id}>
                <td className="border border-slate-200 px-4 py-4 align-top">
                  <div className="font-bold text-slate-900">
                    {item.departmentName}
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-500">
                    HOD: {item.hod_name || "Not assigned"}
                  </div>
                </td>

                <td className="border border-slate-200 px-4 py-4 align-top">
                  <div className="font-bold text-slate-900">{item.itemName}</div>
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
                  <DifferenceBadge value={item.approvalDifference} />
                </td>

                <td className="border border-slate-200 px-4 py-4 text-center align-top">
                  <BudgetMethodBadge method={item.distributionMethod} />
                  <button
                    type="button"
                    onClick={() => onSelectDistribution(item)}
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
                      onClick={() => onSelectAdjustment(detailsRequest)}
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

          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={11}
                className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
              >
                No department requests match the current filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ItemSummaryTable({ rows, sort, onSort }) {
  return (
    <div className="enterprise-scrollbar max-h-[65vh] overflow-auto">
      <table className="w-max min-w-full table-fixed border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-white">
          <tr className="text-slate-700">
            <SortableHeader
              label="Item"
              column="itemName"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[320px]"
            />
            <SortableHeader
              label="Type"
              column="expenseType"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[150px]"
            />
            <SortableHeader
              label="Departments"
              column="departmentCount"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[190px]"
            />
            <SortableHeader
              label="Requested Qty"
              column="requestedQuantity"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[160px]"
            />
            <SortableHeader
              label="Approved Qty"
              column="approvedQuantity"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[160px]"
            />
            <SortableHeader
              label="Difference"
              column="approvalDifference"
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              onSort={onSort}
              className="w-[150px]"
            />
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td className="border border-slate-200 px-4 py-4 align-top">
                <div className="font-black text-slate-900">{item.itemName}</div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {item.itemCode && !item.itemCode.includes("_") ? (
                    <span className="text-xs font-semibold text-slate-500">
                      {item.itemCode}
                    </span>
                  ) : null}

                  {item.projectType === "PROJECT" ? (
                    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
                      Project
                    </span>
                  ) : item.projectType === "MIXED" ? (
                    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
                      Mixed Project Use
                    </span>
                  ) : null}
                </div>
              </td>

              <td className="border border-slate-200 px-4 py-4 text-center align-top">
                <TypeBadge value={item.expenseType} />
              </td>

              <td className="border border-slate-200 px-4 py-4 text-center align-top">
                <DepartmentCountPopover
                  itemName={item.itemName}
                  departments={item.departments}
                />
              </td>

              <td className="border border-slate-200 px-4 py-4 text-center align-top font-black text-slate-900">
                {formatQuantity(item.requestedQuantity)}
              </td>

              <td className="border border-slate-200 px-4 py-4 text-center align-top font-black text-blue-700">
                {formatQuantity(item.approvedQuantity)}
              </td>

              <td className="border border-slate-200 px-4 py-4 text-center align-top">
                <DifferenceBadge value={item.approvalDifference} />
              </td>
            </tr>
          ))}

          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
              >
                No item summaries match the current filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default function CategoryDepartmentRequestsTable({ items }) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("DEPARTMENT");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [selectedDistributionItem, setSelectedDistributionItem] = useState(null);

  const filterOptions = useMemo(() => {
    const departmentMap = new Map();

    items.forEach((item) => {
      departmentMap.set(String(item.department_id), item.department_name);
    });

    const departments = [
      { value: "ALL", label: "All Departments" },
      ...Array.from(departmentMap.entries())
        .map(([id, name]) => ({
          value: id,
          label: name || `Department ${id}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    ];

    return {
      departments,
      expenseTypes: buildOptions(
        items.map((item) => item.expense_type),
        "All",
        (value) => value,
      ),
      distributionMethods: buildOptions(
        items.map((item) => item.distribution_method || "ANNUAL"),
        "All Distribution Methods",
      ),
      reviewStatuses: buildOptions(
        items.map((item) => item.review_status || "NONE"),
        "All Review Statuses",
        (value) => (value === "NONE" ? "No Review" : humanize(value)),
      ),
      adjustmentStatuses: buildOptions(
        items.map((item) => item.adjustment?.status || "NONE"),
        "All Adjustment Statuses",
        (value) => (value === "NONE" ? "No Adjustment" : humanize(value)),
      ),
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const departmentMatch =
        filters.department === "ALL" ||
        String(item.department_id) === String(filters.department);
      const expenseTypeMatch =
        filters.expenseType === "ALL" ||
        String(item.expense_type || "") === filters.expenseType;
      const distributionMatch =
        filters.distributionMethod === "ALL" ||
        String(item.distribution_method || "ANNUAL") ===
          filters.distributionMethod;
      const reviewStatusMatch =
        filters.reviewStatus === "ALL" ||
        String(item.review_status || "NONE") === filters.reviewStatus;
      const adjustmentStatusMatch =
        filters.adjustmentStatus === "ALL" ||
        String(item.adjustment?.status || "NONE") === filters.adjustmentStatus;
      const isProject = item.is_project === true || item.is_project === 1;
      const projectTypeMatch =
        filters.projectType === "ALL" ||
        (filters.projectType === "PROJECT" && isProject) ||
        (filters.projectType === "NON_PROJECT" && !isProject);
      const searchMatch =
        !q ||
        [
          item.department_name,
          item.department_code,
          item.hod_name,
          item.catalog_item_name,
          item.item_code,
          item.expense_type,
          item.review_note,
          item.hod_item_note,
          item.adjustment?.reason,
          item.adjustment?.category_note,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      return (
        departmentMatch &&
        expenseTypeMatch &&
        distributionMatch &&
        reviewStatusMatch &&
        adjustmentStatusMatch &&
        projectTypeMatch &&
        searchMatch
      );
    });
  }, [filters, items, search]);

  const detailRows = useMemo(
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

  const summaryRows = useMemo(
    () => buildSummaryRows(filteredItems),
    [filteredItems],
  );

  const detailSort = useTableSort(detailRows, "departmentName", "asc");
  const summarySort = useTableSort(summaryRows, "itemName", "asc");
  const sortedRows =
    viewMode === "SUMMARY" ? summarySort.sortedRows : detailSort.sortedRows;
  const pagination = usePagination(sortedRows.length, 25);

  const paginatedRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [pagination.page, pagination.pageSize, sortedRows]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (filters.department !== "ALL") {
      const department = filterOptions.departments.find(
        (option) => String(option.value) === String(filters.department),
      );
      chips.push({
        key: "department",
        label: `Department: ${department?.label || filters.department}`,
      });
    }

    if (filters.expenseType !== "ALL") {
      chips.push({
        key: "expenseType",
        label: `Expense: ${filters.expenseType}`,
      });
    }

    if (filters.distributionMethod !== "ALL") {
      chips.push({
        key: "distributionMethod",
        label: `Distribution: ${humanize(filters.distributionMethod)}`,
      });
    }

    if (filters.reviewStatus !== "ALL") {
      chips.push({
        key: "reviewStatus",
        label: `Review: ${
          filters.reviewStatus === "NONE"
            ? "No Review"
            : humanize(filters.reviewStatus)
        }`,
      });
    }

    if (filters.adjustmentStatus !== "ALL") {
      chips.push({
        key: "adjustmentStatus",
        label: `Adjustment: ${
          filters.adjustmentStatus === "NONE"
            ? "No Adjustment"
            : humanize(filters.adjustmentStatus)
        }`,
      });
    }

    if (filters.projectType !== "ALL") {
      chips.push({
        key: "projectType",
        label:
          filters.projectType === "PROJECT" ? "Project" : "Non-Project",
      });
    }

    return chips;
  }, [filterOptions.departments, filters]);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    pagination.resetPage();
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    pagination.resetPage();
  }

  function removeFilter(key) {
    updateFilter(key, "ALL");
  }

  function handleSearchChange(value) {
    setSearch(value);
    pagination.resetPage();
  }

  function handleViewModeChange(nextMode) {
    setViewMode(nextMode);
    pagination.resetPage();
  }

  function handleDetailSort(column) {
    pagination.resetPage();
    detailSort.handleSort(column);
  }

  function handleSummarySort(column) {
    pagination.resetPage();
    summarySort.handleSort(column);
  }

  const pageRowCount =
    viewMode === "SUMMARY" ? summaryRows.length : detailRows.length;

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
        <DepartmentRequestsToolbar
          search={search}
          onSearchChange={handleSearchChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          filters={filters}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
          onRemoveFilter={removeFilter}
          filterOptions={filterOptions}
          activeFilterChips={activeFilterChips}
          counts={{
            visibleRows: pageRowCount,
            filteredRequests: filteredItems.length,
            totalRequests: items.length,
          }}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {viewMode === "SUMMARY" ? (
            <ItemSummaryTable
              rows={paginatedRows}
              sort={summarySort}
              onSort={handleSummarySort}
            />
          ) : (
            <DepartmentDetailTable
              rows={paginatedRows}
              sort={detailSort}
              onSort={handleDetailSort}
              onSelectAdjustment={setSelectedAdjustment}
              onSelectDistribution={setSelectedDistributionItem}
            />
          )}

          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            startRow={pagination.startRow}
            endRow={pagination.endRow}
            totalRows={pageRowCount}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
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

