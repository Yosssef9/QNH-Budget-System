export function mapCategory(row) {
  if (!row) return null;

  return {
    id: row.id,
    category_code: row.category_code,
    code: row.category_code,
    name: row.name,
    description: row.description,
    sort_order: row.sort_order,
    is_active: Boolean(row.is_active),
  };
}

export function mapUnit(row) {
  if (!row) return null;

  return {
    id: row.id,
    unit_code: row.unit_code,
    code: row.unit_code,
    name: row.name,
    description: row.description,
    is_active: Boolean(row.is_active),
  };
}

export function mapCatalogItem(row) {
  if (!row) return null;

  return {
    id: row.id,
    budget_category_id: row.budget_category_id,
    category_id: row.budget_category_id,
    category_name: row.category_name,
    category_code: row.category_code,
    item_code: row.item_code,
    name: row.name,
    description: row.description,
    expense_type: row.expense_type,
    unit_of_measure_id: row.unit_of_measure_id,
    unit_name: row.unit_name,
    unit_code: row.unit_code,
    sort_order: row.sort_order,
    is_active: Boolean(row.is_active),
    general_sub_item_id: row.general_sub_item_id ?? null,
  };
}

export function mapSubItem(row) {
  if (!row) return null;

  return {
    id: row.id,
    catalog_item_id: row.catalog_item_id,
    sub_item_code: row.sub_item_code,
    name: row.name,
    default_specification: row.default_specification,
    default_unit_of_measure_id: row.default_unit_of_measure_id,
    unit_name: row.unit_name,
    unit_code: row.unit_code,
    is_default_general: Boolean(row.is_default_general),
    is_active: Boolean(row.is_active),
    row_version: row.row_version,
  };
}

