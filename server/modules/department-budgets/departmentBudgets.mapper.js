function mapRowVersion(rowVersion) {
  if (!rowVersion) return null;
  if (Buffer.isBuffer(rowVersion)) return rowVersion.toString("base64");
  return String(rowVersion);
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function mapDistribution(row) {
  return {
    id: row.distribution_id,
    period_type: row.period_type,
    period_no: Number(row.period_no),
    quantity: toNumber(row.distribution_quantity),
  };
}

export function mapDepartmentBudgetSummary(row) {
  return {
    id: row.id,
    financial_year_id: row.financial_year_id,
    financial_year: row.financial_year,
    financial_year_status: row.financial_year_status,
    department_id: row.department_id,
    department_name: row.department_name,
    department_code: row.department_code || null,
    status: row.overall_status,
    items_count: Number(row.items_count || 0),
    total_requested_quantity: toNumber(row.total_requested_quantity),
    created_by: row.created_by,
    created_by_name: row.created_by_name || null,
    created_at: row.created_at,
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    row_version: mapRowVersion(row.row_version),
  };
}

export function mapDepartmentBudgetDetail({
  budget,
  categories = [],
  itemRows = [],
}) {
  if (!budget) return null;

  const categoryMap = new Map();

  for (const category of categories) {
    categoryMap.set(Number(category.department_category_budget_id), {
      id: category.department_category_budget_id,
      department_category_budget_id: category.department_category_budget_id,
      department_budget_id: category.department_budget_id,
      budget_category_id: category.budget_category_id,
      category_id: category.budget_category_id,
      category_code: category.category_code,
      category_name: category.category_name,
      status: category.status,
      submitted_by: category.submitted_by,
      submitted_by_name: category.submitted_by_name || null,
      submitted_at: category.submitted_at,
      returned_by: category.returned_by,
      returned_by_name: category.returned_by_name || null,
      returned_at: category.returned_at,
      return_reason: category.return_reason || null,
      item_count: Number(category.item_count || 0),
      total_requested_quantity: toNumber(category.total_requested_quantity),
      row_version: mapRowVersion(category.row_version),
      items: [],
    });
  }

  const itemMap = new Map();

  for (const row of itemRows) {
    if (!row.item_id) continue;

    if (!itemMap.has(Number(row.item_id))) {
      itemMap.set(Number(row.item_id), {
        id: row.item_id,
        department_category_budget_id: row.department_category_budget_id,
        catalog_item_id: row.catalog_item_id,
        type_id: row.catalog_item_id,
        type_name: row.catalog_item_name,
        catalog_item_name: row.catalog_item_name,
        category_id: row.budget_category_id,
        category_name: row.category_name,
        category_code: row.category_code,
        expense_type: row.expense_type,
        requested_quantity: toNumber(row.requested_quantity),
        quantity: toNumber(row.requested_quantity),
        category_approved_quantity:
          row.category_approved_quantity === null
            ? null
            : toNumber(row.category_approved_quantity),
        distribution_method: row.distribution_method,
        review_status: row.review_status,
        review_note: row.review_note || null,
        reviewed_by: row.reviewed_by || null,
        reviewed_by_name: row.reviewed_by_name || null,
        reviewed_at: row.reviewed_at || null,
        is_active: row.is_active === true || row.is_active === 1,
        row_version: mapRowVersion(row.item_row_version),
        distribution: [],
      });
    }

    if (row.distribution_id) {
      itemMap.get(Number(row.item_id)).distribution.push(mapDistribution(row));
    }
  }

  for (const item of itemMap.values()) {
    const category = categoryMap.get(Number(item.department_category_budget_id));
    if (category) category.items.push(item);
  }

  const categoryList = Array.from(categoryMap.values());
  const allItems = categoryList.flatMap((category) => category.items);

  return {
    id: budget.id,
    financial_year_id: budget.financial_year_id,
    financial_year: budget.financial_year,
    financial_year_status: budget.financial_year_status,
    department_id: budget.department_id,
    department_name: budget.department_name,
    department_code: budget.department_code || null,
    status: budget.overall_status,
    created_by: budget.created_by,
    created_by_name: budget.created_by_name || null,
    created_at: budget.created_at,
    updated_by: budget.updated_by,
    updated_at: budget.updated_at,
    row_version: mapRowVersion(budget.row_version),
    categories: categoryList,
    items: allItems,
    items_count: allItems.length,
    total_requested_quantity: allItems.reduce(
      (sum, item) => sum + toNumber(item.requested_quantity),
      0,
    ),
  };
}
