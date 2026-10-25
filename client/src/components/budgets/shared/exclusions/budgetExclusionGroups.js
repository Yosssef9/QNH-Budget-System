/**
 * Shared exclusion read-model grouping. The API returns a row for each affected
 * department allocation. Group the overview without discarding the original
 * department allocations or independent decision/audit records.
 *
 * IMPORTANT: A name is never used as the primary model identity. The current
 * purchasing review row / package sub-item is the canonical decision scope.
 */
const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const rowIdentity = (row) => {
  if (row.exclusion_type === 'PURCHASING_REJECTED') {
    return `PURCHASING_REJECTED:${row.budget_category_id}:${row.package_sub_item_id ?? `review-${row.decision_entity_id}`}`;
  }
  // CM zero decisions are individual department requests for the same catalog
  // item. Aggregate their presentation, but retain each source decision.
  return `CM_ZERO:${row.budget_category_id}:${row.catalog_item_id ?? `decision-${row.decision_entity_id}`}`;
};

function lastDecisionDate(decisions) {
  return decisions.reduce((latest, decision) => {
    const date = new Date(decision.decided_at || 0).getTime();
    return Number.isFinite(date) && date > latest ? date : latest;
  }, 0);
}

export function groupBudgetExclusions(rows = []) {
  const grouped = new Map();
  for (const row of rows) {
    if (!['PURCHASING_REJECTED', 'CM_ZERO'].includes(row.exclusion_type)) continue;
    const key = rowIdentity(row);
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        exclusionType: row.exclusion_type,
        itemName: row.item_name || 'Budget item',
        modelName: row.model_name || null,
        categoryName: row.category_name || 'Category',
        categoryId: row.budget_category_id,
        catalogItemId: row.catalog_item_id,
        modelId: row.package_sub_item_id ?? null,
        reviewRound: row.review_round ?? null,
        activeModelCount: row.active_model_count == null ? null : Number(row.active_model_count),
        rejectedModelCount: row.rejected_model_count == null ? null : Number(row.rejected_model_count),
        excludedQuantity: 0,
        excludedAmount: 0,
        departments: [],
        decisions: [],
        history: [],
        decisionMap: new Map(),
        departmentMap: new Map(),
      });
    }
    const group = grouped.get(key);
    const quantity = asNumber(row.excluded_quantity);
    const amount = asNumber(row.excluded_amount);
    group.excludedQuantity += quantity;
    group.excludedAmount += amount;

    const departmentKey = row.department_id == null
      ? `name:${row.department_name || 'Unknown'}`
      : `id:${row.department_id}`;
    if (!group.departmentMap.has(departmentKey)) {
      const department = {
        key: departmentKey,
        id: row.department_id,
        name: row.department_name || 'Unknown department',
        excludedQuantity: 0,
        excludedAmount: 0,
        decisionIds: new Set(),
      };
      group.departmentMap.set(departmentKey, department);
      group.departments.push(department);
    }
    const department = group.departmentMap.get(departmentKey);
    department.excludedQuantity += quantity;
    department.excludedAmount += amount;

    const decisionKey = String(row.decision_entity_id ?? `${departmentKey}:${group.decisions.length}`);
    department.decisionIds.add(decisionKey);
    if (!group.decisionMap.has(decisionKey)) {
      const decision = {
        id: decisionKey,
        actorName: row.actor_name || null,
        actorCode: row.actor_code || null,
        reason: row.reason || null,
        decidedAt: row.decided_at || null,
        departments: [],
        history: Array.isArray(row.history) ? row.history : [],
      };
      group.decisionMap.set(decisionKey, decision);
      group.decisions.push(decision);
    }
    const decision = group.decisionMap.get(decisionKey);
    if (!decision.departments.includes(department.name)) decision.departments.push(department.name);
  }

  return Array.from(grouped.values()).map(group => {
    // History belongs to the decision entity (not each department allocation).
    // Include each source entity only once, even if its history repeats on 20 rows.
    const history = group.decisions.flatMap(decision => decision.history.map((event, index) => ({
      ...event,
      key: `${decision.id}:${index}`,
      departmentNames: decision.departments,
    }))).sort((a, b) => asNumber(new Date(b.decided_at).getTime()) - asNumber(new Date(a.decided_at).getTime()));
    const sortedDecisions = [...group.decisions].sort((a, b) =>
      asNumber(new Date(b.decidedAt).getTime()) - asNumber(new Date(a.decidedAt).getTime()));
    return {
      key: group.key,
      exclusionType: group.exclusionType,
      itemName: group.itemName,
      modelName: group.modelName,
      categoryName: group.categoryName,
      categoryId: group.categoryId,
      catalogItemId: group.catalogItemId,
      modelId: group.modelId,
      reviewRound: group.reviewRound,
      activeModelCount: group.activeModelCount,
      rejectedModelCount: group.rejectedModelCount,
      itemExclusionScope: group.exclusionType !== 'PURCHASING_REJECTED' ? null :
        group.activeModelCount > 0 && group.rejectedModelCount >= group.activeModelCount ? 'ALL_MODELS' : 'PARTIAL',
      excludedQuantity: Number(group.excludedQuantity.toFixed(4)),
      excludedAmount: Number(group.excludedAmount.toFixed(4)),
      departments: group.departments.map(department => ({
        key: department.key,
        id: department.id,
        name: department.name,
        excludedQuantity: Number(department.excludedQuantity.toFixed(4)),
        excludedAmount: Number(department.excludedAmount.toFixed(4)),
        decisionCount: department.decisionIds.size,
      })).sort((a, b) => a.name.localeCompare(b.name)),
      decisions: sortedDecisions,
      history,
      latestDecision: sortedDecisions[0] || null,
      lastDecisionTimestamp: lastDecisionDate(sortedDecisions),
      hasMixedReasons: new Set(sortedDecisions.map(decision => decision.reason?.trim() || '')).size > 1,
    };
  }).sort((a, b) => a.itemName.localeCompare(b.itemName) ||
    String(a.modelName || '').localeCompare(String(b.modelName || '')) ||
    a.exclusionType.localeCompare(b.exclusionType));
}

export function filterBudgetExclusionGroups(groups = [], { search = '', type = 'ALL' } = {}) {
  const term = String(search).trim().toLocaleLowerCase();
  return groups.filter(group => {
    if (type !== 'ALL' && group.exclusionType !== type) return false;
    if (!term) return true;
    return [group.itemName, group.modelName, group.categoryName,
      ...group.departments.map(department => department.name)]
      .some(value => String(value || '').toLocaleLowerCase().includes(term));
  });
}
