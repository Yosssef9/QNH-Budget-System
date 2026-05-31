import { toNumber } from "../utils/number";

export function getTopCostItems(groupedByItem, limit = 10) {
  return [...groupedByItem]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

export function getDuplicateDepartmentItems(groupedByItem) {
  return groupedByItem
    .filter((item) => item.departments.length > 1)
    .sort((a, b) => b.departments.length - a.departments.length);
}

export function getUnitPriceVarianceItems(groupedByItem) {
  return groupedByItem
    .map((item) => {
      const prices = item.unitPrices.filter((price) => price > 0);

      if (prices.length < 2) return null;

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      return {
        ...item,
        minPrice,
        maxPrice,
        variance: maxPrice - minPrice,
        variancePercent:
          minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0,
      };
    })
    .filter(Boolean)
    .filter((item) => item.variance > 0)
    .sort((a, b) => b.variance - a.variance);
}

export function getDepartmentRanking(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const key = String(row.department_id);

    if (!map.has(key)) {
      map.set(key, {
        department_id: row.department_id,
        department_name: row.department_name,
        totalQuantity: 0,
        totalAmount: 0,
        itemsCount: 0,
      });
    }

    const department = map.get(key);
    department.totalQuantity += toNumber(row.quantity);
    department.totalAmount += toNumber(row.total_amount);
    department.itemsCount += 1;
  });

  return [...map.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}

export function exportBudgetComparisonCsv(rows) {
  const headers = [
    "Department",
    "Financial Year",
    "Status",
    "Category",
    "Item",
    "Expense Type",
    "Quantity",
    "Unit Price",
    "Total Amount",
  ];

  const csvRows = rows.map((row) => [
    row.department_name,
    row.financial_year,
    row.status,
    row.category_name,
    row.type_name,
    row.expense_type,
    row.quantity,
    row.unit_price,
    row.total_amount,
  ]);

  const csv = [headers, ...csvRows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `budget-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
