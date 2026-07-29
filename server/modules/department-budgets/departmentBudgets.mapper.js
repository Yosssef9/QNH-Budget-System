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

      submission_window_status:
        category.submission_window_status || "NOT_CONFIGURED",

      submission_window: category.submission_window_id
        ? {
            id: category.submission_window_id,
            status:
              category.submission_window_status || "NOT_CONFIGURED",

            closed_by: category.submission_window_closed_by || null,
            closed_by_name:
              category.submission_window_closed_by_name || null,
            closed_at: category.submission_window_closed_at || null,
            close_reason:
              category.submission_window_close_reason || null,

            reopened_by: category.submission_window_reopened_by || null,
            reopened_by_name:
              category.submission_window_reopened_by_name || null,
            reopened_at: category.submission_window_reopened_at || null,
            reopen_reason:
              category.submission_window_reopen_reason || null,
          }
        : null,

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
        item_code: row.item_code || null,
        category_id: row.budget_category_id,
        category_name: row.category_name,
        category_code: row.category_code,
        expense_type: row.expense_type,
        unit_of_measure_id: row.unit_of_measure_id || null,
        unit_name: row.unit_name || null,
        unit_code: row.unit_code || null,
        requested_quantity: toNumber(row.requested_quantity),
        quantity: toNumber(row.requested_quantity),
        hod_item_note: row.hod_item_note || null,
        hodItemNote: row.hod_item_note || null,
        is_project: row.is_project === true || row.is_project === 1,
        isProject: row.is_project === true || row.is_project === 1,
        category_approved_quantity:
          row.category_approved_quantity === null
            ? null
            : toNumber(row.category_approved_quantity),
        approved_amount: toNumber(row.approved_amount),
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
    total_approved_quantity: allItems.reduce(
      (sum, item) => sum + toNumber(item.category_approved_quantity),
      0,
    ),
    total_approved_amount: allItems.reduce(
      (sum, item) => sum + toNumber(item.approved_amount),
      0,
    ),
  };
}

export function mapAllDepartmentBudgetOverview(row) {
  return {
    id: row.id,
    financial_year_id: row.financial_year_id,
    financial_year: row.financial_year,
    financial_year_status: row.financial_year_status,
    department_id: row.department_id,
    department_name: row.department_name,
    department_code: row.department_code || null,
    status: row.overall_status,
    category_count: Number(row.category_count || 0),
    submitted_category_count: Number(row.submitted_category_count || 0),
    completed_category_count: Number(row.completed_category_count || 0),
    category_statuses: {
      IT: row.it_status || "DRAFT",
      BIOMEDICAL: row.biomedical_status || "DRAFT",
      GENERAL: row.general_status || "DRAFT",
    },
    items_count: Number(row.items_count || 0),
    total_requested_quantity: toNumber(row.total_requested_quantity),
    total_approved_quantity: toNumber(row.total_approved_quantity),
    total_approved_amount: toNumber(row.total_approved_amount),
    last_submitted_at: row.last_submitted_at || null,
    last_reviewed_at: row.last_reviewed_at || null,
    created_by: row.created_by,
    created_by_name: row.created_by_name || null,
    created_at: row.created_at,
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    row_version: mapRowVersion(row.row_version),
  };
}

export function mapCategoryDepartmentItemOverview(row) {
  return {
    id: row.department_budget_item_id,
    department_budget_item_id: row.department_budget_item_id,
    department_category_budget_id: row.department_category_budget_id,
    department_category_budget_status: row.department_category_budget_status,
    department_budget_id: row.department_budget_id,
    department_id: row.department_id,
    department_name: row.department_name,
    department_code: row.department_code || null,
    financial_year_id: row.financial_year_id,
    financial_year: row.financial_year,
    financial_year_status: row.financial_year_status,
    budget_category_id: row.budget_category_id,
    category_name: row.category_name,
    category_code: row.category_code,
    catalog_item_id: row.catalog_item_id,
    catalog_item_name: row.catalog_item_name,
    item_code: row.item_code,
    expense_type: row.expense_type,
    requested_quantity: toNumber(row.requested_quantity),
    hod_item_note: row.hod_item_note || null,
    hodItemNote: row.hod_item_note || null,
    is_project: row.is_project === true || row.is_project === 1,
    isProject: row.is_project === true || row.is_project === 1,
    category_approved_quantity: toNumber(row.category_approved_quantity),
    distribution_method: row.distribution_method,
    distribution: row.distribution_id ? [mapDistribution(row)] : [],
    review_status: row.review_status,
    review_note: row.review_note || null,
    reviewed_by_name: row.reviewed_by_name || null,
    reviewed_at: row.reviewed_at || null,
    adjustment: row.adjustment_request_id
      ? {
        id: row.adjustment_request_id,
        status: row.adjustment_status,
        requested_quantity: toNumber(row.adjustment_requested_quantity),
        reason: row.adjustment_reason || null,
        category_note: row.adjustment_category_note || null,
          submitted_at: row.adjustment_submitted_at || null,
        }
      : null,
  };
}

export function mapCategoryDepartmentItemsOverview(rows = []) {
  const itemMap = new Map();

  for (const row of rows) {
    const itemId = Number(row.department_budget_item_id);
    if (!itemId) continue;

    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, mapCategoryDepartmentItemOverview(row));
    } else if (row.distribution_id) {
      itemMap.get(itemId).distribution.push(mapDistribution(row));
    }
  }

  return Array.from(itemMap.values());
}
