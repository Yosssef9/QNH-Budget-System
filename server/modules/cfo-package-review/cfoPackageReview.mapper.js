function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function mapCfoPackageQueueRow(row) {
  return {
    id: row.id,
    financial_year_id: row.financial_year_id,
    financial_year: row.financial_year,
    financial_year_status: row.financial_year_status,
    budget_category_id: row.budget_category_id,
    category_code: row.category_code,
    category_name: row.category_name,
    status: row.status,
    row_version: row.row_version,
    submitted_to_cfo_by: row.submitted_to_cfo_by,
    submitted_to_cfo_by_name: row.submitted_to_cfo_by_name,
    submitted_to_cfo_at: row.submitted_to_cfo_at,
    returned_by_cfo: row.returned_by_cfo,
    returned_by_cfo_name: row.returned_by_cfo_name,
    returned_at: row.returned_at,
    return_reason: row.return_reason,
    cfo_review_completed_by: row.cfo_review_completed_by,
    cfo_review_completed_by_name: row.cfo_review_completed_by_name,
    cfo_review_completed_at: row.cfo_review_completed_at,
    summary: {
      package_items: Number(row.package_item_count || 0),
      pending_items: Number(row.pending_item_count || 0),
      accepted_items: Number(row.accepted_item_count || 0),
      needs_modification_items: Number(row.needs_modification_item_count || 0),
      requested_quantity: toNumber(row.requested_quantity),
      approved_quantity: toNumber(row.approved_quantity),
      allocated_quantity: toNumber(row.allocated_quantity),
      estimated_total: toNumber(row.estimated_total),
    },
  };
}
