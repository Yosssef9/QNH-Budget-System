import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupCfoExclusions, filterCfoExclusionGroups } from '../../src/components/cfo-package-review/cfoExclusionGroups.js';

const rejectedRow = (departmentId, overrides = {}) => ({
  exclusion_type: 'PURCHASING_REJECTED',
  budget_category_id: 3,
  catalog_item_id: 100,
  package_sub_item_id: 700,
  decision_entity_id: 900,
  item_name: 'Ambulance Stretcher',
  model_name: 'General',
  category_name: 'Biomedical',
  department_id: departmentId,
  department_name: `Department ${departmentId}`,
  excluded_quantity: 8,
  excluded_amount: 75200,
  actor_name: 'Purchasing Reviewer',
  actor_code: '2410',
  decided_at: '2026-10-22T10:08:00',
  reason: 'Model does not meet requirements',
  history: [{ action: 'PURCHASING_MODEL_REJECTED', actor_name: 'Purchasing Reviewer', decided_at: '2026-10-22T10:08:00' }],
  ...overrides,
});

test('five allocations of the same purchasing model become one grouped row', () => {
  const group = groupCfoExclusions([1, 2, 3, 4, 5].map(id => rejectedRow(id)))[0];
  assert.equal(group.departments.length, 5);
  assert.equal(group.excludedQuantity, 40);
  assert.equal(group.excludedAmount, 376000);
  assert.equal(group.decisions.length, 1);
  assert.equal(group.history.length, 1, 'repeated history must not appear for every department allocation');
});

test('different model IDs must stay separate even when names are identical', () => {
  const groups = groupCfoExclusions([
    rejectedRow(1),
    rejectedRow(2, { package_sub_item_id: 701, decision_entity_id: 901, model_name: 'General' }),
  ]);
  assert.equal(groups.length, 2);
});

test('CM zero requests group per catalog/category but preserve independent decisions and reasons', () => {
  const base = {
    exclusion_type: 'CM_ZERO', budget_category_id: 3, catalog_item_id: 100,
    item_name: 'Ambulance Stretcher', model_name: null, category_name: 'Biomedical',
    requested_quantity: 10, excluded_quantity: 10, excluded_amount: 0,
    history: [], decided_at: '2026-10-22T08:00:00',
  };
  const groups = groupCfoExclusions([
    { ...base, decision_entity_id: 1, department_id: 1, department_name: 'ICU', reason: 'Unavailable' },
    { ...base, decision_entity_id: 2, department_id: 2, department_name: 'ER', excluded_quantity: 12, reason: 'Not required' },
    { ...base, decision_entity_id: 3, department_id: 3, department_name: 'L&D', budget_category_id: 4 },
  ]);
  assert.equal(groups.length, 2);
  const category3 = groups.find(group => group.categoryId === 3);
  assert.equal(category3.departments.length, 2);
  assert.equal(category3.decisions.length, 2);
  assert.equal(category3.hasMixedReasons, true);
  assert.equal(category3.excludedQuantity, 22);
  assert.equal(category3.excludedAmount, 0);
});

test('multiple rows for same department consolidate departmental quantity without losing model decisions', () => {
  const groups = groupCfoExclusions([
    rejectedRow(1, { excluded_quantity: 3, excluded_amount: 300 }),
    rejectedRow(1, { excluded_quantity: 5, excluded_amount: 500 }),
  ]);
  assert.equal(groups[0].departments.length, 1);
  assert.equal(groups[0].departments[0].excludedQuantity, 8);
  assert.equal(groups[0].departments[0].excludedAmount, 800);
  assert.equal(groups[0].decisions.length, 1);
});

test('search works on department and model; exclusion type filter never loses source groups', () => {
  const purchasing = rejectedRow(1);
  const cm = { ...rejectedRow(2), exclusion_type: 'CM_ZERO', decision_entity_id: 123 };
  const groups = groupCfoExclusions([purchasing, cm]);
  assert.equal(filterCfoExclusionGroups(groups, { search: 'department 1' }).length, 1);
  assert.equal(filterCfoExclusionGroups(groups, { search: 'General' }).length, 2);
  assert.equal(filterCfoExclusionGroups(groups, { type: 'PURCHASING_REJECTED' }).length, 1);
  assert.equal(filterCfoExclusionGroups(groups, { type: 'CM_ZERO' }).length, 1);
});
