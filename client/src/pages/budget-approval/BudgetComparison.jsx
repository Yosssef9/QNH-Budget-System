import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Filter,
  Loader2,
  PackageSearch,
  Search,
} from "lucide-react";

import { useBudgetComparison } from "../../hooks/budgets/useBudgetApproval";
import { formatNumber, formatSAR } from "../../utils/formatters";
import { toNumber } from "../../utils/number";

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
    departmentId: ALL,
    status: ALL,
    categoryId: ALL,
    typeId: ALL,
    expenseType: ALL,
    search: "",
  });

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
        filters.departmentId !== ALL &&
        String(row.department_id) !== filters.departmentId
      ) {
        return false;
      }

      if (filters.status !== ALL && String(row.status) !== filters.status) {
        return false;
      }

      if (
        filters.categoryId !== ALL &&
        String(row.category_id) !== filters.categoryId
      ) {
        return false;
      }

      if (filters.typeId !== ALL && String(row.type_id) !== filters.typeId) {
        return false;
      }

      if (
        filters.expenseType !== ALL &&
        String(row.expense_type) !== filters.expenseType
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

  function updateFilter(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetFilters() {
    setFilters({
      financialYear: ALL,
      departmentId: ALL,
      status: ALL,
      categoryId: ALL,
      typeId: ALL,
      expenseType: ALL,
      search: "",
    });
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
          value={formatSAR(summary.totalAmount)}
        />
      </section>

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
          <SelectFilter
            label="Department"
            value={filters.departmentId}
            options={options.departments}
            onChange={(value) => updateFilter("departmentId", value)}
          />
          <SelectFilter
            label="Status"
            value={filters.status}
            options={options.statuses}
            onChange={(value) => updateFilter("status", value)}
          />
          <SelectFilter
            label="Category"
            value={filters.categoryId}
            options={options.categories}
            onChange={(value) => updateFilter("categoryId", value)}
          />
          <SelectFilter
            label="Item"
            value={filters.typeId}
            options={options.types}
            onChange={(value) => updateFilter("typeId", value)}
          />
          <SelectFilter
            label="Expense"
            value={filters.expenseType}
            options={options.expenseTypes}
            onChange={(value) => updateFilter("expenseType", value)}
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

        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
                    {formatSAR(item.avgUnitPrice)}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold text-blue-600">
                    {formatSAR(item.totalAmount)}
                  </td>
                  <td className="border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.statuses.map((status) => (
                        <span
                          key={status}
                          className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
                        >
                          {status}
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
            Detailed Matching Budgets
          </h2>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1300px] w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
              {filteredRows.map((row, index) => (
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
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                      {row.status}
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
                    {formatSAR(row.unit_price)}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold text-blue-600">
                    {formatSAR(row.total_amount)}
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
      </section>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      >
        <option value={ALL}>All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
