export function createRow(
  id,
  category = "",
  item = "",
  method = "MONTHLY",
  quantity = 0,
  unitPrice = 0,
  monthly = [],
  quarterly = [],
  isNew = true,
) {
  return {
    id,
    category,
    item,
    method,
    quantity,
    unitPrice,
    monthly,
    quarterly,
    isSaved: false,
    isNew,
  };
}

export function mapBudgetItemToRow(item) {
  const method =
    item.distribution_method === "CUSTOM" && item.distribution_level === "MONTH"
      ? "CUSTOM_MONTHLY"
      : item.distribution_method === "CUSTOM" &&
          item.distribution_level === "QUARTER"
        ? "CUSTOM_QUARTERLY"
        : item.distribution_method;

  const monthly = Array(12).fill(0);
  const quarterly = Array(4).fill(0);

  for (const period of item.distribution || []) {
    if (period.period_type === "MONTH") {
      monthly[Number(period.period_no) - 1] = Number(period.quantity || 0);
    }

    if (period.period_type === "QUARTER") {
      quarterly[Number(period.period_no) - 1] = Number(period.quantity || 0);
    }
  }

  const row = createRow(
    item.id,
    item.category_id,
    item.type_id,
    method,
    Number(item.quantity || 0),
    Number(item.unit_price || 0),
    monthly,
    quarterly,
    false,
  );

  return {
    ...row,
    categoryName: item.category_name,
    typeName: item.type_name,
    categoryIsActive:
      item.category_is_active === true || item.category_is_active === 1,
    typeIsActive: item.type_is_active === true || item.type_is_active === 1,
    expenseType: item.expense_type,
    isSaved: true,
    isNew: false,
    savedSnapshot: JSON.stringify({
      category: row.category,
      item: row.item,
      method: row.method,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      monthly: row.monthly,
      quarterly: row.quarterly,
    }),
  };
}
