/**
 * Map Purchasing-rejected package models to their parent catalog item for the
 * Package Preparation badge. The exclusions API returns one row per department
 * allocation, so keep one display decision per immutable package sub-item ID.
 * Never join by display name, and never combine reasons from distinct models.
 */
export function groupPurchasingRejectionsByCatalog(rows = [], budgetCategoryId) {
  const grouped = new Map();
  const categoryId = Number(budgetCategoryId);
  if (!Number.isFinite(categoryId) || budgetCategoryId == null) return grouped;

  for (const row of rows) {
    if (row?.exclusion_type !== 'PURCHASING_REJECTED' ||
        Number(row.budget_category_id) !== categoryId) continue;

    const catalogId = Number(row.catalog_item_id);
    const modelId = Number(row.package_sub_item_id);
    if (!Number.isFinite(catalogId) || row.catalog_item_id == null ||
        !Number.isFinite(modelId) || row.package_sub_item_id == null) continue;

    if (!grouped.has(catalogId)) grouped.set(catalogId, new Map());
    const models = grouped.get(catalogId);
    const current = models.get(modelId);
    const decidedAt = row.decided_at || null;
    const incomingTime = Date.parse(decidedAt || '') || 0;
    const currentTime = Date.parse(current?.decidedAt || '') || 0;

    if (!current || incomingTime > currentTime ||
        (incomingTime === currentTime && !current.reason && row.reason)) {
      models.set(modelId, {
        id: modelId,
        name: row.model_name || `Model #${modelId}`,
        reason: String(row.reason || '').trim(),
        actorName: row.actor_name || null,
        actorCode: row.actor_code || null,
        decidedAt,
      });
    }
  }
  return grouped;
}
