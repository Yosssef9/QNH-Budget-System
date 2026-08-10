function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function mapPurchasingFinancialYear(row) {
  return {
    id: row.id,
    year: row.year,
    status: row.status,
    package_count: Number(row.package_count || 0),
    pending_package_count: Number(row.pending_package_count || 0),
  };
}

export function mapPurchasingPackageQueueRow(row) {
  return {
    id: row.id,
    financial_year_id: row.financial_year_id,
    financial_year: row.financial_year,
    financial_year_status: row.financial_year_status,
    budget_category_id: row.budget_category_id,
    category_code: row.category_code,
    category_name: row.category_name,
    status: row.status,
    purchasing_review_round: Number(row.purchasing_review_round || 0),
    submitted_to_purchasing_at: row.submitted_to_purchasing_at,
    submitted_to_purchasing_by_name: row.submitted_to_purchasing_by_name,
    pending_price_count: Number(row.pending_price_count || 0),
    accepted_price_count: Number(row.accepted_price_count || 0),
    total_price_count: Number(row.total_price_count || 0),
    row_version: row.row_version,
  };
}

export function mapPurchasingPackageDetail(packageRow, rows = []) {
  const itemMap = new Map();

  for (const row of rows) {
    if (!itemMap.has(row.package_item_id)) {
      itemMap.set(row.package_item_id, {
        id: row.package_item_id,
        catalog_item_id: row.catalog_item_id,
        catalog_item_name: row.catalog_item_name,
        catalog_item_code: row.catalog_item_code,
        cfo_review_status: row.cfo_review_status,
        cfo_review_note: row.cfo_review_note,
        sub_items: [],
      });
    }

    if (row.package_sub_item_id) {
      const quantity = toNumber(row.quantity);
      const categoryManagerPrice =
        row.category_manager_unit_price === null
          ? null
          : toNumber(row.category_manager_unit_price);
      const effectivePrice =
        row.effective_unit_price === null
          ? null
          : toNumber(row.effective_unit_price);
      const purchasingPrice =
        row.purchasing_unit_price === null
          ? effectivePrice
          : toNumber(row.purchasing_unit_price);

      itemMap.get(row.package_item_id).sub_items.push({
        id: row.package_sub_item_id,
        catalog_sub_item_id: row.catalog_sub_item_id,
        sub_item_code: row.sub_item_code,
        name: row.package_sub_item_name,
        specification: row.specification,
        unit_of_measure_id: row.unit_of_measure_id,
        unit_of_measure_name: row.unit_of_measure_name,
        unit_of_measure_code: row.unit_of_measure_code,
        quantity,
        category_manager_unit_price: categoryManagerPrice,
        previous_purchasing_unit_price:
          row.previous_purchasing_unit_price === null
            ? null
            : toNumber(row.previous_purchasing_unit_price),
        purchasing_unit_price: purchasingPrice,
        estimated_total:
          purchasingPrice === null ? null : quantity * purchasingPrice,
        price_review_id: row.price_review_id,
        price_review_status:
          row.price_review_status ||
          (row.cfo_review_status === "CFO_ACCEPTED" ? "ACCEPTED" : null),
        decision_source: row.decision_source,
        reviewed_by: row.reviewed_by,
        reviewed_by_name: row.reviewed_by_name,
        reviewed_at: row.reviewed_at,
        category_manager_attachment_count: Number(
          row.category_manager_attachment_count || 0,
        ),
        purchasing_attachment_count: Number(
          row.purchasing_attachment_count || 0,
        ),
        row_version: row.price_review_row_version,
      });
    }
  }

  const items = [...itemMap.values()];
  const prices = items.flatMap((item) => item.sub_items);

  return {
    package: mapPurchasingPackageQueueRow(packageRow),
    summary: {
      item_count: items.length,
      price_count: prices.length,
      pending_price_count: prices.filter(
        (price) => price.price_review_status === "PENDING",
      ).length,
      accepted_price_count: prices.filter(
        (price) => price.price_review_status === "ACCEPTED",
      ).length,
      estimated_total: prices.reduce(
        (sum, price) => sum + Number(price.estimated_total || 0),
        0,
      ),
    },
    items,
  };
}
