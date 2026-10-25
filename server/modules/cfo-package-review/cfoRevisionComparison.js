// Pure calculation shared by CM and CFO. The stored CFO-return snapshot is the
// baseline; intermediate CM edits never replace it.
const amount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value) => Math.round(value * 10000) / 10000;
const pct = (before, after) => before === 0 ? null : round((after - before) * 100 / Math.abs(before));
const asList = (json, key) => {
  try { const parsed = typeof json === 'string' ? JSON.parse(json) : json; return Array.isArray(parsed?.[key]) ? parsed[key] : []; }
  catch { return []; }
};

export function compareCfoReturnedItem(row, { stage = 'CM' } = {}) {
  const previousModels = asList(row.snapshot_json, 'subItems');
  const currentModels = asList(row.current_models_json, 'models');
  const byId = new Map(previousModels.map(model => [Number(model.package_sub_item_id), model]));
  const currentIds = new Set(currentModels.map(model => Number(model.id)));
  const modelChanges = currentModels.map(model => {
    const old = byId.get(Number(model.id));
    const beforePrice = old ? amount(old.unit_price) : null;
    const afterPrice = stage === 'CM'
      ? amount(model.category_manager_unit_price ?? model.unit_price)
      : amount(model.unit_price);
    const beforeQty = old ? amount(old.quantity) : 0;
    const afterQty = amount(model.quantity);
    return {
      id: Number(model.id), name: model.name, decision: model.purchasing_decision || null,
      previous_quantity: old ? beforeQty : null, current_quantity: afterQty,
      quantity_percent: old ? pct(beforeQty, afterQty) : null,
      previous_price: beforePrice, current_price: afterPrice,
      price_percent: old ? pct(beforePrice, afterPrice) : null,
      previous_total: old ? round(beforeQty * beforePrice) : null,
      current_total: round(afterQty * afterPrice),
      removed: false,
    };
  });
  for (const old of previousModels) {
    if (currentIds.has(Number(old.package_sub_item_id))) continue;
    modelChanges.push({
      id: Number(old.package_sub_item_id), name: old.name, removed: true,
      previous_quantity: amount(old.quantity), current_quantity: 0,
      quantity_percent: -100, previous_price: amount(old.unit_price), current_price: null,
      price_percent: null, previous_total: round(amount(old.quantity) * amount(old.unit_price)), current_total: 0,
    });
  }
  const before = amount(row.item_total_amount);
  // CFO figures must use current Purchasing-accepted models only; CM
  // proposal comparisons omit rejected models, regardless of old allocations.
  const eligibleModels = currentModels.filter(model => stage === 'CFO'
    ? model.purchasing_decision === 'ACCEPTED'
    : model.purchasing_decision !== 'REJECTED');
  const after = round(eligibleModels.reduce((sum, model) => sum + amount(model.quantity) * amount(
    stage === 'CM' ? model.category_manager_unit_price ?? model.unit_price : model.unit_price
  ), 0));
  const qtyBefore = amount(row.approved_quantity);
  const qtyAfter = amount(row.current_approved_quantity);
  return {
    snapshot_id: Number(row.snapshot_id), item_id: Number(row.item_id),
    reviewed: Boolean(row.is_reviewed), reviewed_at: row.reviewed_at || null,
    baseline_at: row.baseline_at,
    previous_quantity: qtyBefore, current_quantity: qtyAfter, quantity_percent: pct(qtyBefore, qtyAfter),
    previous_total: before, current_total: after, change_amount: round(after - before),
    change_percent: pct(before, after),
    financially_changed: round(after) !== round(before) || qtyAfter !== qtyBefore ||
      modelChanges.some(model => model.removed || model.previous_price == null ||
        model.current_price !== model.previous_price || model.current_quantity !== model.previous_quantity),
    models: modelChanges,
  };
}

export function summarizeRevisionItems(items = []) {
  const reviewed = items.filter(item => item.reviewed).length;
  return { total: items.length, reviewed, remaining: items.length - reviewed,
    changed: items.filter(item => item.financially_changed).length,
    unchanged: items.filter(item => !item.financially_changed).length };
}
