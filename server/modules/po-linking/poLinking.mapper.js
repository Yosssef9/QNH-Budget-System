function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function rowVersion(value) {
  return value ? Buffer.from(value).toString("base64") : null;
}

export function mapPackageSubItem(row = {}) {
  const name = row.name || `${row.catalog_item_name || "-"} / ${row.sub_item_name || "-"}`;

  return {
    ...row,
    id: row.id,
    budget_item_id: row.id,
    budget_type_name: name,
    department_name: row.category_name,
    approved_qty: toNumber(row.approved_qty),
    approved_linked_qty: toNumber(row.approved_linked_qty),
    pending_linked_qty: toNumber(row.pending_linked_qty),
    remaining_qty: toNumber(row.remaining_qty),
    total_amount: toNumber(row.total_amount),
    row_version: rowVersion(row.row_version),
  };
}

export function mapPurchaseInvoiceLine(row = {}) {
  return {
    ...row,
    po_qty: toNumber(row.po_qty),
    bonus_qty: toNumber(row.bonus_qty),
    unit_cost: toNumber(row.unit_cost),
    net_amount: toNumber(row.net_amount),
    approved_qty: toNumber(row.approved_qty),
    pending_qty: toNumber(row.pending_qty),
    available_qty: toNumber(row.available_qty),
  };
}

export function mapPoLink(row = {}) {
  return {
    ...row,
    budget_item_id: row.category_budget_package_sub_item_id,
    budget_type_name:
      row.budget_type_name ||
      row.package_sub_item_label ||
      `${row.catalog_item_name || "-"} / ${row.sub_item_name || "-"}`,
    department_name: row.category_name,
    unit_cost: toNumber(row.unit_cost),
    po_unit_cost: toNumber(row.po_unit_cost ?? row.unit_cost),
    requested_qty: toNumber(row.requested_qty),
    linked_amount: toNumber(row.linked_amount),
    budget_item_quantity: toNumber(row.budget_item_quantity),
    budget_item_unit_price: toNumber(row.budget_item_unit_price),
    budget_item_total_amount: toNumber(row.budget_item_total_amount),
    row_version: rowVersion(row.row_version),
  };
}

export function mapPoMapping(row = {}) {
  return {
    ...row,
    budget_type_id: row.catalog_sub_item_id,
    budget_type_name:
      row.catalog_item_name && row.sub_item_name
        ? `${row.catalog_item_name} / ${row.sub_item_name}`
        : row.sub_item_name,
    row_version: rowVersion(row.row_version),
  };
}
