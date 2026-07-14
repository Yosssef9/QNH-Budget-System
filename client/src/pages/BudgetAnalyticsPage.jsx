import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileSearch,
  Layers3,
  Link2,
  PackageSearch,
  Repeat2,
  Wallet,
} from "lucide-react";

import AnalyticsMetricCard from "../components/budget-analytics/AnalyticsMetricCard";
import BudgetAnalyticsDetailsDrawer from "../components/budget-analytics/BudgetAnalyticsDetailsDrawer";
import BudgetAnalyticsTable from "../components/budget-analytics/BudgetAnalyticsTable";
import Breadcrumbs from "../components/Breadcrumbs";
import CurrencyText from "../components/CurrencyText";
import EnterpriseSearch from "../components/EnterpriseSearch";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import { useBudgetAnalyticsOverview } from "../hooks/budget-analytics/useBudgetAnalytics";
import { formatNumber, formatCompactSAR } from "../utils/formatters";
import { getBudgetStatusLabel, getBudgetStatusStyle } from "../theme/statusStyles";

const ALL = "ALL";

const TABS = [
  { key: "departmentBudgets", label: "Department Budgets", icon: Building2 },
  { key: "categoryPackages", label: "Category Packages", icon: PackageSearch },
  { key: "packageItems", label: "Package Items", icon: ClipboardList },
  { key: "packageSubItems", label: "Package Sub-Items", icon: Layers3 },
  { key: "departmentDemand", label: "Department Demand", icon: FileSearch },
  { key: "transfers", label: "Transfers", icon: Repeat2 },
  { key: "poLinks", label: "PO Links", icon: Link2 },
];

const EMPTY_ANALYTICS = {
  filters: { financialYears: [] },
  summary: {},
  departmentBudgets: [],
  categoryPackages: [],
  packageItems: [],
  packageSubItems: [],
  departmentDemand: [],
  transfers: [],
  poLinks: [],
};

function numberCell(value, digits = 4) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function StatusPill({ status }) {
  const style = getBudgetStatusStyle(status);
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${style.badge}`}>
      {getBudgetStatusLabel(status)}
    </span>
  );
}

function currencyCell(value) {
  return <CurrencyText value={value || 0} />;
}

function textMatches(row, search) {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  return Object.values(row)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function selectOptions(rows, key, labelKey = key) {
  const map = new Map();
  rows.forEach((row) => {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") {
      map.set(String(value), String(row[labelKey] ?? value));
    }
  });
  return [...map.entries()].map(([value, label]) => ({ value, label }));
}

function filterRows(rows, filters, searchable = true) {
  return rows.filter((row) => {
    if (
      filters.category !== ALL &&
      String(row.budget_category_id) !== filters.category
    ) {
      return false;
    }
    if (
      filters.department !== ALL &&
      String(row.department_id) !== filters.department
    ) {
      return false;
    }
    if (filters.status !== ALL && String(row.status) !== filters.status) {
      return false;
    }
    return searchable ? textMatches(row, filters.search) : true;
  });
}

function buildDrawerConfig({ type, row, data }) {
  if (!row) return null;

  const common = [
    { label: "Financial Year", value: row.financial_year },
    { label: "Year Status", value: row.financial_year_status },
    { label: "Category", value: row.category_name },
    { label: "Status", value: row.status || row.review_status || row.cfo_review_status },
  ];

  if (type === "departmentBudgets") {
    return {
      title: row.department_name,
      subtitle: "Department annual budget overview",
      fields: [
        { label: "Financial Year", value: row.financial_year },
        { label: "Department Code", value: row.department_code },
        { label: "Status", value: row.status },
        { label: "Categories Submitted", value: `${row.submitted_category_count || 0} / ${row.category_count || 0}` },
        { label: "Categories Completed", value: row.completed_category_count },
        { label: "Items", value: row.items_count },
        { label: "Requested Quantity", value: numberCell(row.requested_quantity) },
        { label: "Approved Quantity", value: numberCell(row.approved_quantity) },
        { label: "Approved Amount", value: row.approved_amount, currency: true },
      ],
      relatedTitle: "Department Demand",
      relatedRows: data.departmentDemand.filter(
        (item) => item.department_budget_id === row.department_budget_id,
      ),
      relatedColumns: [
        { key: "category_name", label: "Category" },
        { key: "catalog_item_name", label: "Item" },
        { key: "requested_quantity", label: "Requested" },
        { key: "approved_quantity", label: "Approved" },
        { key: "approved_value", label: "Approved Value", currency: true },
        { key: "review_status", label: "Review Status" },
      ],
    };
  }

  if (type === "categoryPackages") {
    return {
      title: row.category_name,
      subtitle: "Hospital-wide category package",
      fields: [
        ...common,
        { label: "Departments Submitted", value: `${row.submitted_department_count || 0} / ${row.total_department_count || 0}` },
        { label: "Departments Completed", value: row.completed_department_count },
        { label: "Package Items", value: row.package_item_count },
        { label: "Unreconciled Items", value: row.unreconciled_item_count },
        { label: "Requested Quantity", value: numberCell(row.requested_quantity) },
        { label: "Approved Quantity", value: numberCell(row.approved_quantity) },
        { label: "Package Value", value: row.package_value, currency: true },
      ],
      relatedTitle: "Package Items",
      relatedRows: data.packageItems.filter((item) => item.package_id === row.package_id),
      relatedColumns: [
        { key: "catalog_item_name", label: "Item" },
        { key: "requested_quantity", label: "Requested" },
        { key: "approved_quantity", label: "Approved" },
        { key: "package_quantity", label: "Package Quantity" },
        { key: "package_value", label: "Package Value", currency: true },
        { key: "cfo_review_status", label: "CFO Status" },
      ],
    };
  }

  if (type === "packageItems") {
    return {
      title: row.catalog_item_name,
      subtitle: `${row.category_name} package item`,
      fields: [
        ...common,
        { label: "Departments", value: row.department_count },
        { label: "Requested Quantity", value: numberCell(row.requested_quantity) },
        { label: "Approved Quantity", value: numberCell(row.approved_quantity) },
        { label: "Package Quantity", value: numberCell(row.package_quantity) },
        { label: "Package Value", value: row.package_value, currency: true },
        { label: "Sub-Items", value: row.sub_item_count },
        { label: "Needs Reconciliation", value: row.needs_reconciliation ? "Yes" : "No" },
      ],
      relatedTitle: "Package Sub-Items",
      relatedRows: data.packageSubItems.filter(
        (item) => item.package_item_id === row.package_item_id,
      ),
      relatedColumns: [
        { key: "sub_item_name", label: "Model" },
        { key: "base_quantity", label: "Base Quantity" },
        { key: "unit_price", label: "Unit Price", currency: true },
        { key: "base_value", label: "Base Value", currency: true },
        { key: "available_quantity", label: "Available" },
        { key: "attachment_count", label: "Attachments" },
      ],
    };
  }

  if (type === "packageSubItems") {
    return {
      title: row.sub_item_name,
      subtitle: `${row.category_name} - ${row.catalog_item_name}`,
      fields: [
        ...common,
        { label: "Generic Item", value: row.catalog_item_name },
        { label: "Base Quantity", value: numberCell(row.base_quantity) },
        { label: "Unit Price", value: row.unit_price, currency: true },
        { label: "Base Value", value: row.base_value, currency: true },
        { label: "Transfer In", value: numberCell(row.approved_transfer_in_quantity) },
        { label: "Transfer Out", value: numberCell(row.approved_transfer_out_quantity) },
        { label: "Pending Transfer Out", value: numberCell(row.pending_transfer_out_quantity) },
        { label: "PO Used", value: numberCell(row.approved_po_quantity) },
        { label: "PO Pending", value: numberCell(row.pending_po_quantity) },
        { label: "Available Quantity", value: numberCell(row.available_quantity) },
        { label: "Attachments", value: row.attachment_count },
      ],
      relatedTitle: "PO Links",
      relatedRows: data.poLinks.filter(
        (item) => item.package_sub_item_id === row.package_sub_item_id,
      ),
      relatedColumns: [
        { key: "invoice_no", label: "Invoice" },
        { key: "po_item_description", label: "PO Item" },
        { key: "requested_qty", label: "Quantity" },
        { key: "linked_amount", label: "Linked Amount", currency: true },
        { key: "status", label: "Status" },
      ],
    };
  }

  if (type === "departmentDemand") {
    return {
      title: row.catalog_item_name,
      subtitle: `${row.department_name} - ${row.category_name}`,
      fields: [
        ...common,
        { label: "Department", value: row.department_name },
        { label: "Requested Quantity", value: numberCell(row.requested_quantity) },
        { label: "Approved Quantity", value: numberCell(row.approved_quantity) },
        { label: "Allocated Quantity", value: numberCell(row.allocated_quantity) },
        { label: "Approved Value", value: row.approved_value, currency: true },
        { label: "Models", value: row.model_count },
        { label: "Distribution Method", value: row.distribution_method },
        { label: "Review Note", value: row.review_note },
      ],
    };
  }

  if (type === "transfers") {
    return {
      title: `Transfer #${row.id}`,
      subtitle: `${row.category_name} transfer impact`,
      fields: [
        ...common,
        { label: "Source Item", value: row.from_item_name },
        { label: "Source Model", value: row.from_sub_item_name },
        { label: "Source Quantity", value: numberCell(row.source_quantity) },
        { label: "Source Unit Price", value: row.from_unit_price, currency: true },
        { label: "Destination Item", value: row.to_item_name },
        { label: "Destination Model", value: row.to_sub_item_name },
        { label: "Destination Quantity", value: numberCell(row.destination_quantity) },
        { label: "Destination Unit Price", value: row.to_unit_price, currency: true },
        { label: "Requested By", value: row.requested_by_name },
        { label: "Approved By", value: row.approved_by_name },
        { label: "Reason", value: row.reason },
      ],
    };
  }

  return {
    title: `PO Link #${row.id}`,
    subtitle: `${row.category_name} - ${row.catalog_item_name}`,
    fields: [
      ...common,
      { label: "Package Model", value: row.sub_item_name },
      { label: "PO Invoice", value: row.invoice_no },
      { label: "PO Item Code", value: row.po_item_code },
      { label: "PO Item", value: row.po_item_description },
      { label: "Supplier", value: row.supplier_name },
      { label: "Linked Quantity", value: numberCell(row.requested_qty) },
      { label: "Unit Cost", value: row.unit_cost, currency: true },
      { label: "Linked Amount", value: row.linked_amount, currency: true },
      { label: "Requested By", value: row.requested_by_name },
      { label: "Approved By", value: row.approved_by_name },
    ],
  };
}

function columnsForTab(tab) {
  const commonYearCategory = [
    { key: "financial_year", label: "Year" },
    { key: "category_name", label: "Category" },
  ];

  const statusColumn = {
    key: "status",
    label: "Status",
    render: (row) => <StatusPill status={row.status} />,
  };

  const cfoStatusColumn = {
    key: "cfo_review_status",
    label: "CFO Status",
    render: (row) => <StatusPill status={row.cfo_review_status} />,
  };

  const definitions = {
    departmentBudgets: [
      { key: "financial_year", label: "Year" },
      { key: "department_name", label: "Department" },
      statusColumn,
      { key: "submitted_category_count", label: "Submitted" },
      { key: "completed_category_count", label: "Completed" },
      { key: "items_count", label: "Items" },
      { key: "requested_quantity", label: "Requested", render: (row) => numberCell(row.requested_quantity) },
      { key: "approved_quantity", label: "Approved", render: (row) => numberCell(row.approved_quantity) },
      { key: "approved_amount", label: "Approved Value", render: (row) => currencyCell(row.approved_amount) },
    ],
    categoryPackages: [
      ...commonYearCategory,
      statusColumn,
      { key: "submitted_department_count", label: "Submitted Depts" },
      { key: "completed_department_count", label: "Completed Depts" },
      { key: "package_item_count", label: "Items" },
      { key: "unreconciled_item_count", label: "Unreconciled" },
      { key: "approved_quantity", label: "Approved", render: (row) => numberCell(row.approved_quantity) },
      { key: "package_value", label: "Package Value", render: (row) => currencyCell(row.package_value) },
    ],
    packageItems: [
      ...commonYearCategory,
      { key: "catalog_item_name", label: "Generic Item" },
      cfoStatusColumn,
      { key: "department_count", label: "Departments" },
      { key: "requested_quantity", label: "Requested", render: (row) => numberCell(row.requested_quantity) },
      { key: "approved_quantity", label: "Approved", render: (row) => numberCell(row.approved_quantity) },
      { key: "package_quantity", label: "Packaged", render: (row) => numberCell(row.package_quantity) },
      { key: "package_value", label: "Value", render: (row) => currencyCell(row.package_value) },
      { key: "needs_reconciliation", label: "Reconciliation", render: (row) => (row.needs_reconciliation ? "Needs reconciliation" : "Reconciled") },
    ],
    packageSubItems: [
      ...commonYearCategory,
      { key: "catalog_item_name", label: "Generic Item" },
      { key: "sub_item_name", label: "Package Model" },
      { key: "base_quantity", label: "Base Qty", render: (row) => numberCell(row.base_quantity) },
      { key: "unit_price", label: "Unit Price", render: (row) => currencyCell(row.unit_price) },
      { key: "approved_po_quantity", label: "PO Used", render: (row) => numberCell(row.approved_po_quantity) },
      { key: "pending_po_quantity", label: "PO Pending", render: (row) => numberCell(row.pending_po_quantity) },
      { key: "available_quantity", label: "Available", render: (row) => numberCell(row.available_quantity) },
      { key: "attachment_count", label: "Attachments" },
    ],
    departmentDemand: [
      { key: "financial_year", label: "Year" },
      { key: "department_name", label: "Department" },
      { key: "category_name", label: "Category" },
      { key: "catalog_item_name", label: "Item" },
      { key: "review_status", label: "Review", render: (row) => <StatusPill status={row.review_status} /> },
      { key: "requested_quantity", label: "Requested", render: (row) => numberCell(row.requested_quantity) },
      { key: "approved_quantity", label: "Approved", render: (row) => numberCell(row.approved_quantity) },
      { key: "allocated_quantity", label: "Allocated", render: (row) => numberCell(row.allocated_quantity) },
      { key: "approved_value", label: "Approved Value", render: (row) => currencyCell(row.approved_value) },
    ],
    transfers: [
      ...commonYearCategory,
      statusColumn,
      { key: "from_item_name", label: "Source Item" },
      { key: "from_sub_item_name", label: "Source Model" },
      { key: "source_quantity", label: "Source Qty", render: (row) => numberCell(row.source_quantity) },
      { key: "to_item_name", label: "Destination Item" },
      { key: "to_sub_item_name", label: "Destination Model" },
      { key: "destination_quantity", label: "Destination Qty", render: (row) => numberCell(row.destination_quantity) },
    ],
    poLinks: [
      ...commonYearCategory,
      statusColumn,
      { key: "catalog_item_name", label: "Generic Item" },
      { key: "sub_item_name", label: "Package Model" },
      { key: "invoice_no", label: "Invoice" },
      { key: "po_item_description", label: "PO Item" },
      { key: "requested_qty", label: "Qty", render: (row) => numberCell(row.requested_qty) },
      { key: "linked_amount", label: "Linked Amount", render: (row) => currencyCell(row.linked_amount) },
    ],
  };

  return definitions[tab] || definitions.departmentBudgets;
}

function defaultSortForTab(tab) {
  const defaults = {
    departmentBudgets: "approved_amount",
    categoryPackages: "package_value",
    packageItems: "package_value",
    packageSubItems: "base_value",
    departmentDemand: "approved_value",
    transfers: "requested_at",
    poLinks: "linked_amount",
  };

  return defaults[tab] || "financial_year";
}

function rowKeyForTab(tab) {
  const keyBuilders = {
    departmentBudgets: (row) =>
      `department-budget-${row.department_budget_id}`,
    categoryPackages: (row) => `category-package-${row.package_id}`,
    packageItems: (row) => `package-item-${row.package_item_id}`,
    packageSubItems: (row) => `package-sub-item-${row.package_sub_item_id}`,
    departmentDemand: (row) => `department-demand-${row.department_item_id}`,
    transfers: (row) => `transfer-${row.id}`,
    poLinks: (row) => `po-link-${row.id}`,
  };

  return keyBuilders[tab] || ((row, index) => `${tab}-${index}`);
}

export default function BudgetAnalyticsPage() {
  const [financialYearId, setFinancialYearId] = useState(ALL);
  const [activeTab, setActiveTab] = useState("departmentBudgets");
  const [filters, setFilters] = useState({
    category: ALL,
    department: ALL,
    status: ALL,
    search: "",
  });
  const [drawer, setDrawer] = useState(null);

  const queryFilters = {
    financialYearId: financialYearId === ALL ? undefined : financialYearId,
  };
  const { data, isLoading, isError } = useBudgetAnalyticsOverview(queryFilters);

  const analytics = data || EMPTY_ANALYTICS;

  const activeRows = useMemo(
    () => analytics[activeTab] || [],
    [activeTab, analytics],
  );

  const options = useMemo(() => {
    const allRows = [
      ...analytics.departmentBudgets,
      ...analytics.categoryPackages,
      ...analytics.packageItems,
      ...analytics.packageSubItems,
      ...analytics.departmentDemand,
      ...analytics.transfers,
      ...analytics.poLinks,
    ];
    return {
      categories: selectOptions(allRows, "budget_category_id", "category_name"),
      departments: selectOptions(analytics.departmentDemand, "department_id", "department_name"),
      statuses: selectOptions(activeRows, activeTab === "packageItems" ? "cfo_review_status" : "status"),
    };
  }, [activeRows, activeTab, analytics]);

  const filteredRows = useMemo(() => {
    const normalized = activeRows.map((row) => ({
      ...row,
      status: row.status || row.review_status || row.cfo_review_status,
    }));

    return filterRows(normalized, filters);
  }, [activeRows, filters]);

  const drawerConfig = drawer
    ? buildDrawerConfig({
        type: drawer.type,
        row: drawer.row,
        data: analytics,
      })
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/" },
          { label: "Budget Analytics" },
        ]}
      />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            New Workflow Reporting
          </p>
        </div>

        <div className="grid gap-5 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <BarChart3 size={26} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  Budget Analytics
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                  Read-only analytics for department demand, category packages,
                  package sub-items, transfers, PO links, and execution balances.
                </p>
              </div>
            </div>
          </div>

        <div className="block">
  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
    Financial Year
  </span>

  <div className="mt-2">
    <SearchableMultiSelect
      name="financialYearId"
      multiple={false}
      disableClear
      value={financialYearId}
      options={[
        {
          value: ALL,
          label: "All financial years",
        },
        ...(analytics.filters?.financialYears || []).map((year) => ({
          value: String(year.id),
          label: `${year.year} - ${year.status}`,
        })),
      ]}
      placeholder="Select financial year"
      searchPlaceholder="Search financial year..."
      noResultsText="No financial years found"
      maxVisibleBadges={1}
      onChange={(event) =>
        setFinancialYearId(event.target.value)
      }
    />
  </div>
</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          icon={Building2}
          label="Departments"
          value={formatNumber(analytics.summary.department_count)}
          hint={`${formatNumber(analytics.summary.department_budget_count)} department budgets in view`}
        />
        <AnalyticsMetricCard
          icon={ClipboardList}
          label="Approved Quantity"
          value={formatNumber(analytics.summary.approved_quantity)}
          hint={`${formatNumber(analytics.summary.requested_quantity)} requested quantity`}
        />
        <AnalyticsMetricCard
          icon={Wallet}
          label="Package Value"
          value={`SAR ${formatCompactSAR(analytics.summary.package_value)}`}
          hint={`${formatNumber(analytics.summary.package_count)} category packages`}
        />
        <AnalyticsMetricCard
          icon={Link2}
          label="PO Used"
          value={`SAR ${formatCompactSAR(analytics.summary.po_used_value)}`}
          hint={`Pending PO value SAR ${formatCompactSAR(analytics.summary.pending_po_value)}`}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
          <EnterpriseSearch
            value={filters.search}
            onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
            placeholder="Search analytics rows..."
          />

         <SearchableMultiSelect
  name="category"
  multiple={false}
  disableClear
  value={filters.category}
  options={[
    { value: ALL, label: "All categories" },
    ...options.categories,
  ]}
  placeholder="Select category"
  searchPlaceholder="Search categories..."
  noResultsText="No categories found"
  maxVisibleBadges={1}
  onChange={(event) =>
    setFilters((prev) => ({
      ...prev,
      category: event.target.value,
    }))
  }
/>

<SearchableMultiSelect
  name="department"
  multiple={false}
  disableClear
  value={filters.department}
  options={[
    { value: ALL, label: "All departments" },
    ...options.departments,
  ]}
  placeholder="Select department"
  searchPlaceholder="Search departments..."
  noResultsText="No departments found"
  maxVisibleBadges={1}
  onChange={(event) =>
    setFilters((prev) => ({
      ...prev,
      department: event.target.value,
    }))
  }
/>

<SearchableMultiSelect
  name="status"
  multiple={false}
  disableClear
  value={filters.status}
  options={[
    { value: ALL, label: "All statuses" },
    ...options.statuses.map((option) => ({
      ...option,
      label: getBudgetStatusLabel(option.label),
    })),
  ]}
  placeholder="Select status"
  searchPlaceholder="Search statuses..."
  noResultsText="No statuses found"
  maxVisibleBadges={1}
  onChange={(event) =>
    setFilters((prev) => ({
      ...prev,
      status: event.target.value,
    }))
  }
/>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="enterprise-scrollbar flex gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setFilters((prev) => ({ ...prev, status: ALL }));
                }}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                  active
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-500">
          Loading budget analytics...
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
          Failed to load budget analytics.
        </div>
      ) : (
        <BudgetAnalyticsTable
          key={activeTab}
          tableKey={activeTab}
          rows={filteredRows}
          columns={columnsForTab(activeTab)}
          defaultSort={defaultSortForTab(activeTab)}
          rowKey={rowKeyForTab(activeTab)}
          onView={(row) => setDrawer({ type: activeTab, row })}
        />
      )}

      <BudgetAnalyticsDetailsDrawer
        open={Boolean(drawerConfig)}
        onClose={() => setDrawer(null)}
        {...(drawerConfig || {})}
      />
    </div>
  );
}
