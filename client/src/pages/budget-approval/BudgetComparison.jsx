import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Filter,
  Loader2,
  PackageSearch,
  Search,
} from "lucide-react";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../../theme/statusStyles";
import CurrencyText from "../../components/CurrencyText";
import BudgetComparisonInsights from "./BudgetComparisonInsights";
import {
  exportBudgetComparisonCsv,
  getDepartmentRanking,
  getDuplicateDepartmentItems,
  getTopCostItems,
  getUnitPriceVarianceItems,
} from "../../helpers/budgetComparisonAnalytics.helper";
import { useBudgetComparison } from "../../hooks/budgets/useBudgetApproval";
import { formatNumber } from "../../utils/formatters";
import { toNumber } from "../../utils/number";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
const ALL = "ALL";

function uniqueOptions(rows, key, labelKey = key) {
  const map = new Map();

  rows.forEach((row) => {
    const value = row[key];
    const label = row[labelKey];

    if (value !== null && value !== undefined && value !== "") {
      map.set(String(value), String(label ?? value));
    }
  });

  return [...map.entries()].map(([value, label]) => ({ value, label }));
}

export default function BudgetComparison() {
  const { data = [], isLoading, isError } = useBudgetComparison();

  const [filters, setFilters] = useState({
    financialYear: ALL,
    statuses: [],
    departmentIds: [],
    categoryIds: [],
    typeIds: [],
    expenseTypes: [],
    search: "",
  });
  const [detailedPage, setDetailedPage] = useState(1);
  const [detailedPageSize, setDetailedPageSize] = useState(25);
  const options = useMemo(() => {
    return {
      years: uniqueOptions(data, "financial_year"),
      departments: uniqueOptions(data, "department_id", "department_name"),
      statuses: uniqueOptions(data, "status"),
      categories: uniqueOptions(data, "category_id", "category_name"),
      types: uniqueOptions(data, "type_id", "type_name"),
      expenseTypes: uniqueOptions(data, "expense_type"),
    };
  }, [data]);
  const itemOptions = useMemo(() => {
    if (filters.categoryIds.length === 0) {
      return options.types;
    }

    const selectedCategoryIds = new Set(filters.categoryIds);

    return uniqueOptions(
      data.filter((row) => selectedCategoryIds.has(String(row.category_id))),
      "type_id",
      "type_name",
    );
  }, [data, filters.categoryIds, options.types]);
  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return data.filter((row) => {
      if (
        filters.financialYear !== ALL &&
        String(row.financial_year) !== filters.financialYear
      ) {
        return false;
      }

      if (
        filters.departmentIds.length > 0 &&
        !filters.departmentIds.includes(String(row.department_id))
      ) {
        return false;
      }

      if (
        filters.statuses.length > 0 &&
        !filters.statuses.includes(String(row.status))
      ) {
        return false;
      }
      if (
        filters.categoryIds.length > 0 &&
        !filters.categoryIds.includes(String(row.category_id))
      ) {
        return false;
      }
      if (
        filters.typeIds.length > 0 &&
        !filters.typeIds.includes(String(row.type_id))
      ) {
        return false;
      }
      if (
        filters.expenseTypes.length > 0 &&
        !filters.expenseTypes.includes(String(row.expense_type))
      ) {
        return false;
      }
      if (search) {
        const text = [
          row.department_name,
          row.financial_year,
          row.status,
          row.category_name,
          row.type_name,
          row.expense_type,
        ]
          .join(" ")
          .toLowerCase();

        if (!text.includes(search)) return false;
      }

      return true;
    });
  }, [data, filters]);
  const detailedTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / detailedPageSize));
  }, [filteredRows.length, detailedPageSize]);

  useEffect(() => {
    setDetailedPage(1);
  }, [filters, detailedPageSize]);

  useEffect(() => {
    if (detailedPage > detailedTotalPages) {
      setDetailedPage(detailedTotalPages);
    }
  }, [detailedPage, detailedTotalPages]);
  useEffect(() => {
    if (filters.categoryIds.length === 0) return;

    const allowedTypeIds = new Set(
      itemOptions.map((item) => String(item.value)),
    );

    const validTypeIds = filters.typeIds.filter((typeId) =>
      allowedTypeIds.has(String(typeId)),
    );

    if (validTypeIds.length !== filters.typeIds.length) {
      setFilters((prev) => ({
        ...prev,
        typeIds: validTypeIds,
      }));
    }
  }, [filters.categoryIds, filters.typeIds, itemOptions]);
  const paginatedDetailedRows = useMemo(() => {
    const start = (detailedPage - 1) * detailedPageSize;
    return filteredRows.slice(start, start + detailedPageSize);
  }, [filteredRows, detailedPage, detailedPageSize]);

  const detailedStartRow =
    filteredRows.length === 0 ? 0 : (detailedPage - 1) * detailedPageSize + 1;

  const detailedEndRow = Math.min(
    detailedPage * detailedPageSize,
    filteredRows.length,
  );
  const summary = useMemo(() => {
    const budgetIds = new Set(filteredRows.map((row) => row.budget_id));
    const departments = new Set(filteredRows.map((row) => row.department_id));

    return {
      budgetsCount: budgetIds.size,
      departmentsCount: departments.size,
      totalQuantity: filteredRows.reduce(
        (sum, row) => sum + toNumber(row.quantity),
        0,
      ),
      totalAmount: filteredRows.reduce(
        (sum, row) => sum + toNumber(row.total_amount),
        0,
      ),
    };
  }, [filteredRows]);

  const groupedByItem = useMemo(() => {
    const map = new Map();

    filteredRows.forEach((row) => {
      const key = String(row.type_id);

      if (!map.has(key)) {
        map.set(key, {
          type_id: row.type_id,
          type_name: row.type_name,
          category_name: row.category_name,
          expense_type: row.expense_type,
          departments: new Set(),
          budgets: new Set(),
          statuses: new Set(),
          totalQuantity: 0,
          totalAmount: 0,
          unitPrices: [],
          rows: [],
        });
      }

      const item = map.get(key);

      item.departments.add(row.department_name);
      item.budgets.add(row.budget_id);
      item.statuses.add(row.status);
      item.totalQuantity += toNumber(row.quantity);
      item.totalAmount += toNumber(row.total_amount);
      item.unitPrices.push(toNumber(row.unit_price));
      item.rows.push(row);
    });

    return [...map.values()]
      .map((item) => ({
        ...item,
        departments: [...item.departments],
        budgetsCount: item.budgets.size,
        statuses: [...item.statuses],
        avgUnitPrice:
          item.unitPrices.length > 0
            ? item.unitPrices.reduce((a, b) => a + b, 0) /
              item.unitPrices.length
            : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredRows]);
  const departmentsInView = useMemo(() => {
    const map = new Map();

    filteredRows.forEach((row) => {
      map.set(String(row.department_id), {
        id: row.department_id,
        name: row.department_name,
      });
    });

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRows]);

  const itemDepartmentMatrix = useMemo(() => {
    return groupedByItem.map((item) => {
      const departmentMap = new Map();

      item.rows.forEach((row) => {
        const key = String(row.department_id);

        if (!departmentMap.has(key)) {
          departmentMap.set(key, {
            quantity: 0,
            amount: 0,
          });
        }

        const cell = departmentMap.get(key);
        cell.quantity += toNumber(row.quantity);
        cell.amount += toNumber(row.total_amount);
      });

      return {
        ...item,
        departmentMap,
      };
    });
  }, [groupedByItem]);

  const topCostItems = useMemo(
    () => getTopCostItems(groupedByItem, 10),
    [groupedByItem],
  );

  const duplicateItems = useMemo(
    () => getDuplicateDepartmentItems(groupedByItem),
    [groupedByItem],
  );

  const varianceItems = useMemo(
    () => getUnitPriceVarianceItems(groupedByItem),
    [groupedByItem],
  );

  const departmentRanking = useMemo(
    () => getDepartmentRanking(filteredRows),
    [filteredRows],
  );
  function updateFilter(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetFilters() {
    setFilters({
      financialYear: ALL,
      statuses: [],
      departmentIds: [],
      categoryIds: [],
      typeIds: [],
      expenseTypes: [],
      search: "",
    });
  }
  function filterByItem(typeId) {
    setFilters((prev) => ({
      ...prev,
      typeIds: [String(typeId)],
    }));
  }

  function filterByDepartment(departmentId) {
    setFilters((prev) => ({
      ...prev,
      departmentIds: [String(departmentId)],
    }));
  }
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Loading comparison data...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
        Failed to load budget comparison.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          icon={<BarChart3 size={22} />}
          label="Budgets"
          value={summary.budgetsCount}
        />
        <SummaryCard
          icon={<Building2 size={22} />}
          label="Departments"
          value={summary.departmentsCount}
        />
        <SummaryCard
          icon={<PackageSearch size={22} />}
          label="Total Quantity"
          value={formatNumber(summary.totalQuantity)}
        />
        <SummaryCard
          icon={<CalendarDays size={22} />}
          label="Total Amount"
          value={<CurrencyText value={summary.totalAmount} />}
        />
      </section>
      <BudgetComparisonInsights
        topCostItems={topCostItems}
        duplicateItems={duplicateItems}
        varianceItems={varianceItems}
        departmentRanking={departmentRanking}
        onExport={() => exportBudgetComparisonCsv(filteredRows)}
        onFilterItem={filterByItem}
        onFilterDepartment={filterByDepartment}
      />
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Filter size={18} />
              Comparison Filters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter by year, department, status, category, item, expense type,
              or search text.
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SelectFilter
            label="Year"
            value={filters.financialYear}
            options={options.years}
            onChange={(value) => updateFilter("financialYear", value)}
          />
          <MultiSelectFilter
            label="Department"
            values={filters.departmentIds}
            options={options.departments}
            onChange={(values) => updateFilter("departmentIds", values)}
          />
          <MultiSelectFilter
            label="Status"
            values={filters.statuses}
            options={options.statuses}
            onChange={(values) => updateFilter("statuses", values)}
          />
          <MultiSelectFilter
            label="Category"
            values={filters.categoryIds}
            options={options.categories}
            onChange={(values) => updateFilter("categoryIds", values)}
          />
          <MultiSelectFilter
            label="Item"
            values={filters.typeIds}
            options={itemOptions}
            onChange={(values) => updateFilter("typeIds", values)}
          />
          <MultiSelectFilter
            label="Expense"
            values={filters.expenseTypes}
            options={options.expenseTypes}
            onChange={(values) => updateFilter("expenseTypes", values)}
          />
        </div>

        <div className="relative mt-4">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Search department, item, category, status..."
            className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">Item Comparison</h2>
          <p className="mt-1 text-sm text-slate-500">
            Shows each item across all matching budgets.
          </p>
        </div>

        <div className="enterprise-scrollbar max-h-[75vh] overflow-auto scroll-smooth">
          <table className="min-w-[1200px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-sm">
              <tr>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Item
                </th>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Category
                </th>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Departments
                </th>
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Budgets
                </th>
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Total Qty
                </th>
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Avg Unit Price
                </th>
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Total Amount
                </th>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Statuses
                </th>
              </tr>
            </thead>

            <tbody>
              {groupedByItem.map((item) => (
                <tr key={item.type_id} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3 font-bold text-slate-900">
                    {item.type_name}
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    {item.category_name}
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    {item.departments.join(", ")}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold">
                    {item.budgetsCount}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold">
                    {formatNumber(item.totalQuantity)}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right">
                    <CurrencyText value={item.avgUnitPrice} />
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold text-blue-600">
                    <CurrencyText value={item.totalAmount} />
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.statuses.map((status) => (
                        <span
                          key={status}
                          className={`rounded-full border px-2 py-1 text-[11px] font-bold ${getBudgetStatusStyle(status).badge}`}
                        >
                          {getBudgetStatusLabel(status)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}

              {groupedByItem.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="border border-slate-200 px-4 py-10 text-center font-semibold text-slate-500"
                  >
                    No matching comparison results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Department Comparison Matrix
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Compare each item quantity and amount across departments.
          </p>
        </div>

        <div className="enterprise-scrollbar max-h-[75vh] overflow-auto scroll-smooth">
          <table className="min-w-[1400px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-sm">
              <tr>
                <th className="sticky left-0 z-10 border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                  Item
                </th>

                <th className="border border-slate-200 px-4 py-3 text-right">
                  Overall Qty
                </th>

                <th className="border border-slate-200 px-4 py-3 text-right">
                  Overall Amount
                </th>

                {departmentsInView.map((department) => (
                  <th
                    key={department.id}
                    className="border border-slate-200 px-4 py-3 text-center"
                  >
                    {department.name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {itemDepartmentMatrix.map((item) => (
                <tr key={item.type_id} className="hover:bg-slate-50">
                  <td className="sticky left-0 z-10 border border-slate-200 bg-white px-4 py-3">
                    <p className="font-bold text-slate-900">{item.type_name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {item.category_name} · {item.expense_type}
                    </p>
                  </td>

                  <td className="border border-slate-200 px-4 py-3 text-right font-bold">
                    {formatNumber(item.totalQuantity)}
                  </td>

                  <td className="border border-slate-200 px-4 py-3 text-right font-bold text-blue-600">
                    <CurrencyText value={item.totalAmount} />
                  </td>

                  {departmentsInView.map((department) => {
                    const cell = item.departmentMap.get(String(department.id));

                    return (
                      <td
                        key={department.id}
                        className="border border-slate-200 px-4 py-3 text-center"
                      >
                        {cell ? (
                          <div>
                            <p className="font-bold text-slate-900">
                              Qty: {formatNumber(cell.quantity)}
                            </p>
                            <p className="mt-1 text-xs font-bold text-blue-600">
                              <CurrencyText value={cell.amount} />
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {itemDepartmentMatrix.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + departmentsInView.length}
                    className="border border-slate-200 px-4 py-10 text-center font-semibold text-slate-500"
                  >
                    No comparison results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Detailed Matching Budgets
          </h2>
        </div>

        <div className="enterprise-scrollbar max-h-[75vh] overflow-auto scroll-smooth">
          <table className="min-w-[1300px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-sm">
              <tr>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Department
                </th>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Year
                </th>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Status
                </th>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Category
                </th>
                <th className="border border-slate-200 px-4 py-3 text-left">
                  Item
                </th>
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Quantity
                </th>
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Unit Price
                </th>
                <th className="border border-slate-200 px-4 py-3 text-right">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedDetailedRows.map((row, index) => (
                <tr
                  key={`${row.budget_id}-${row.type_id}-${index}`}
                  className="hover:bg-slate-50"
                >
                  <td className="border border-slate-200 px-4 py-3 font-semibold">
                    {row.department_name}
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    {row.financial_year}
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] font-bold ${getBudgetStatusStyle(row.status).badge}`}
                    >
                      {getBudgetStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    {row.category_name}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 font-semibold">
                    {row.type_name}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold">
                    {formatNumber(row.quantity)}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right">
                    <CurrencyText value={row.unit_price} />
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold text-blue-600">
                    <CurrencyText value={row.total_amount} />
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="border border-slate-200 px-4 py-10 text-center font-semibold text-slate-500"
                  >
                    No detailed rows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 border-t border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm font-semibold text-slate-500">
            Showing <span className="text-slate-900">{detailedStartRow}</span>
            {" - "}
            <span className="text-slate-900">{detailedEndRow}</span>
            {" of "}
            <span className="text-slate-900">{filteredRows.length}</span>
            {" rows"}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[25, 50, 100].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setDetailedPageSize(size)}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-bold transition",
                  detailedPageSize === size
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {size}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setDetailedPage((page) => Math.max(1, page - 1))}
              disabled={detailedPage <= 1}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              Page {detailedPage} / {detailedTotalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setDetailedPage((page) =>
                  Math.min(detailedTotalPages, page + 1),
                )
              }
              disabled={detailedPage >= detailedTotalPages}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  const selectOptions = [{ value: ALL, label: "All" }, ...options];

  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>

      <div className="mt-1">
        <SearchableMultiSelect
          multiple={false}
          disableClear
          value={value}
          onChange={(e) => onChange(e.target.value)}
          options={selectOptions}
          placeholder={`Select ${label}`}
          searchPlaceholder={`Search ${label.toLowerCase()}...`}
        />
      </div>
    </label>
  );
}
function MultiSelectFilter({ label, values, options, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>

      <div className="mt-1">
        <SearchableMultiSelect
          multiple
          values={values}
          onChange={(e) => onChange(e.target.value)}
          options={options}
          placeholder={`All ${label}`}
          searchPlaceholder={`Search ${label.toLowerCase()}...`}
          maxVisibleBadges={2}
        />
      </div>
    </label>
  );
}
function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
