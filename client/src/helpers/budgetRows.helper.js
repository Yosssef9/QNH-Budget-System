export function createRow(
  id,
  category = "",
  item = "",
  method = "MONTHLY",
  quantity = 0,
  monthly = [],
  quarterly = [],
  isNew = true,
  hodItemNote = "",
) {
  return {
    id,
    category,
    item,
    method,
    quantity,
    monthly,
    quarterly,
    hodItemNote,
    isSaved: false,
    isNew,
  };
}

export function mapBudgetItemToRow(item) {
  const method =
    item.distribution_method === "CUSTOM" &&
    item.distribution?.some((period) => period.period_type === "MONTH")
      ? "CUSTOM_MONTHLY"
      : item.distribution_method === "CUSTOM" &&
          item.distribution?.some((period) => period.period_type === "QUARTER")
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
    item.catalog_item_id ?? item.type_id,
    method,
    Number(item.requested_quantity ?? item.quantity ?? 0),
    monthly,
    quarterly,
    false,
    item.hod_item_note ?? item.hodItemNote ?? "",
  );

  return {
    ...row,
    categoryName: item.category_name,
    typeName: item.catalog_item_name ?? item.type_name,
    categoryIsActive:
      item.category_is_active === true || item.category_is_active === 1,
    typeIsActive: item.type_is_active === true || item.type_is_active === 1,
    expenseType: item.expense_type,
    reviewStatus: item.review_status,
    reviewNote: item.review_note,
    approvedQuantity:
      item.category_approved_quantity === null ||
      item.category_approved_quantity === undefined
        ? null
        : Number(item.category_approved_quantity),
    reviewedBy: item.reviewed_by,
    reviewedByName: item.reviewed_by_name,
    reviewedAt: item.reviewed_at,
    isSaved: true,
    isNew: false,
    savedSnapshot: JSON.stringify({
      category: row.category,
      item: row.item,
      method: row.method,
      quantity: row.quantity,
      monthly: row.monthly,
      quarterly: row.quarterly,
      hodItemNote: row.hodItemNote || "",
    }),
  };
}

export function mapBudgetHistoryItemToDraftRow(item) {
  const row = mapBudgetItemToRow(item);
  const sourceId = item.id ?? item.item_id ?? row.id;

  return {
    ...row,
    id: `copy-${sourceId}-${crypto.randomUUID()}`,
    reviewStatus: "DRAFT",
    reviewNote: null,
    approvedQuantity: null,
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    isSaved: false,
    isNew: true,
    savedSnapshot: null,
  };
}
