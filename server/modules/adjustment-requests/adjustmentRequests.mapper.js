export function mapAdjustmentRequest(row) {
  if (!row) return null;

  return {
    id: row.id,
    department_category_budget_id: row.department_category_budget_id,
    status: row.status,
    reason: row.reason,
    submitted_by: row.submitted_by,
    submitted_by_name: row.submitted_by_name,
    submitted_at: row.submitted_at,
    category_reviewed_by: row.category_reviewed_by,
    category_reviewed_by_name: row.category_reviewed_by_name,
    category_reviewed_at: row.category_reviewed_at,
    category_note: row.category_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    row_version: row.row_version,
    item: {
      id: row.item_id,
      change_type: row.change_type,
      existing_department_budget_item_id: row.existing_department_budget_item_id,
      catalog_item_id: row.catalog_item_id,
      catalog_item_name: row.catalog_item_name,
      item_code: row.item_code,
      expense_type: row.expense_type,
      current_requested_quantity:
        row.current_requested_quantity === null
          ? null
          : Number(row.current_requested_quantity),
      requested_quantity:
        row.proposed_requested_quantity === null
          ? null
          : Number(row.proposed_requested_quantity),
      requested_amount:
        row.requested_amount === null ? null : Number(row.requested_amount),
      description: row.description,
    },
    category: {
      id: row.budget_category_id,
      name: row.category_name,
      code: row.category_code,
    },
    financial_year: {
      id: row.financial_year_id,
      year: row.financial_year,
      status: row.financial_year_status,
    },
    department: {
      id: row.department_id,
      name: row.department_name,
      code: row.department_code,
    },
  };
}

export function mapEligibleAdjustmentItems(rows = []) {
  return {
    existingItems: rows
      .filter((row) => row.is_in_budget)
      .map((row) => ({
        existing_department_budget_item_id: row.existing_department_budget_item_id,
        catalog_item_id: row.catalog_item_id,
        catalog_item_name: row.catalog_item_name,
        item_code: row.item_code,
        expense_type: row.expense_type,
        unit_of_measure_id: row.unit_of_measure_id,
        unit_name: row.unit_name,
        unit_code: row.unit_code,
        requested_quantity: Number(row.requested_quantity || 0),
        category_approved_quantity: Number(row.category_approved_quantity || 0),
        review_status: row.review_status,
      })),
    availableNewItems: rows
      .filter((row) => !row.is_in_budget)
      .map((row) => ({
        catalog_item_id: row.catalog_item_id,
        catalog_item_name: row.catalog_item_name,
        item_code: row.item_code,
        expense_type: row.expense_type,
        unit_of_measure_id: row.unit_of_measure_id,
        unit_name: row.unit_name,
        unit_code: row.unit_code,
      })),
  };
}
