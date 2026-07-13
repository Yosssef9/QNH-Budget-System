function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function mapTransfer(row) {
  return {
    id: row.id,
    status: row.status,
    financial_year_id: row.financial_year_id,
    financial_year: row.financial_year,
    financial_year_status: row.financial_year_status,
    category_budget_package_id: row.category_budget_package_id,
    budget_category_id: row.budget_category_id,
    category_name: row.category_name,
    category_code: row.category_code,
    from_package_sub_item_id: row.from_package_sub_item_id,
    to_package_sub_item_id: row.to_package_sub_item_id,
    from_item_name: row.from_item_name,
    from_sub_item_name: row.from_sub_item_name,
    from_expense_type: row.from_expense_type,
    to_item_name: row.to_item_name,
    to_sub_item_name: row.to_sub_item_name,
    to_expense_type: row.to_expense_type,
    amount: toNumber(row.transfer_amount),
    transfer_amount: toNumber(row.transfer_amount),
    transfer_quantity: toNumber(row.source_quantity),
    source_quantity: toNumber(row.source_quantity),
    destination_quantity: toNumber(row.destination_quantity),
    source_unit_price_snapshot: toNumber(row.source_unit_price_snapshot),
    destination_unit_price_snapshot: toNumber(row.destination_unit_price_snapshot),
    reason: row.reason,
    requested_by: row.requested_by,
    requested_by_name: row.requested_by_name,
    requested_at: row.requested_at,
    approved_by: row.approved_by,
    approved_by_name: row.approved_by_name,
    approved_at: row.approved_at,
    rejected_by: row.rejected_by,
    rejected_by_name: row.rejected_by_name,
    rejected_at: row.rejected_at,
    rejection_note: row.rejection_reason,
    row_version: row.row_version,
  };
}

export function mapTransferSubItem(row) {
  return {
    id: row.id,
    package_sub_item_id: row.package_sub_item_id,
    package_item_id: row.package_item_id,
    category_budget_package_id: row.category_budget_package_id,
    financial_year_id: row.financial_year_id,
    financial_year: row.financial_year,
    financial_year_status: row.financial_year_status,
    budget_category_id: row.budget_category_id,
    category_name: row.category_name,
    catalog_item_id: row.catalog_item_id,
    catalog_item_name: row.catalog_item_name,
    name: row.name,
    sub_item_name: row.sub_item_name,
    expense_type: row.expense_type,
    quantity: toNumber(row.quantity),
    unit_price: toNumber(row.unit_price),
    available_quantity: toNumber(row.available_quantity),
    available_amount: toNumber(row.available_amount),
    total_amount: toNumber(row.available_amount),
    is_locked: Number(row.is_locked || 0),
  };
}
