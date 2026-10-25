import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupBudgetExclusions } from '../../src/components/budgets/shared/exclusions/budgetExclusionGroups.js';
const base = {
  exclusion_type: 'PURCHASING_REJECTED', budget_category_id: 3,
  catalog_item_id: 20, package_sub_item_id: 202, decision_entity_id: 707,
  item_name: 'Ambulance Stretcher', model_name: 'General',
  category_name: 'Biomedical', department_id: 11, department_name: 'ICU',
  excluded_quantity: 8, excluded_amount: 75200,
  review_round: 2, active_model_count: 2, rejected_model_count: 1,
  reason: 'Price/specification mismatch', history: [{
    action: 'PURCHASING_MODELS_REJECTED', entity_id: 202,
    new_values_json: JSON.stringify({ modelName: 'General', decision: 'REJECTED', allocations: [{ departmentName: 'ICU', quantity: 8 }] }),
  }],
};
test('item is partially excluded when one of two models is rejected', () => {
  const [g] = groupBudgetExclusions([base]);
  assert.equal(g.modelName, 'General');
  assert.equal(g.reviewRound, 2);
  assert.equal(g.itemExclusionScope, 'PARTIAL');
  assert.equal(g.rejectedModelCount, 1);
  assert.equal(g.activeModelCount, 2);
});
test('item becomes fully excluded only when all model decisions are rejected', () => {
  const [g] = groupBudgetExclusions([{...base, rejected_model_count: 2}]);
  assert.equal(g.itemExclusionScope, 'ALL_MODELS');
});
test('allocations from five departments preserve a single rejection audit event', () => {
  const records = [11,12,13,14,15].map(department_id => ({...base, department_id, department_name: `Dept ${department_id}`}));
  const [g] = groupBudgetExclusions(records);
  assert.equal(g.departments.length, 5);
  assert.equal(g.history.length, 1);
  assert.equal(JSON.parse(g.history[0].new_values_json).allocations[0].quantity, 8);
});
test('same model name with different database IDs is not merged', () => {
  const g = groupBudgetExclusions([base, {...base, package_sub_item_id: 203, decision_entity_id: 708}]);
  assert.equal(g.length, 2);
});
