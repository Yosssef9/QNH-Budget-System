export function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function createRow(
  id,
  category = "",
  item = "",
  method = "MONTHLY",
  quantity = 0,
  unitPrice = 0,
  monthly = [],
  quarterly = [],
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

  return createRow(
    item.id,
    item.category_id,
    item.type_id,
    method,
    Number(item.quantity || 0),
    Number(item.unit_price || 0),
    monthly,
    quarterly,
  );
}
