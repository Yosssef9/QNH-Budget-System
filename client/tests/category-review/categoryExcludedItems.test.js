import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupBudgetExclusions, filterBudgetExclusionGroups } from '../../src/components/budgets/shared/exclusions/budgetExclusionGroups.js';

const row = (department, extra = {}) => ({
  exclusion_type: 'PURCHASING_REJECTED', budget_category_id: 3, catalog_item_id: 10,
  package_sub_item_id: 200, decision_entity_id: 303,
  item_name: 'Ambulance Stretcher', model_name: 'General', category_name: 'Biomedical',
  department_id: department, department_name: `Department ${department}`,
  excluded_quantity: 8, excluded_amount: 75200,
  actor_name: 'Purchasing reviewer', reason: 'Rejected for specification mismatch',
  history: [{action: 'PURCHASING_MODEL_REJECTED', decided_at: '2026-10-22T10:08:00Z'}],
  ...extra,
});

test('Category Manager model summary groups allocations without duplicating decisions or history', () => {
  const groups = groupBudgetExclusions([1, 2, 3, 4, 5].map(id => row(id)));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].departments.length, 5);
  assert.equal(groups[0].excludedQuantity, 40);
  assert.equal(groups[0].excludedAmount, 376000);
  assert.equal(groups[0].decisions.length, 1);
  assert.equal(groups[0].history.length, 1);
  assert.equal(filterBudgetExclusionGroups(groups, {search: 'department 3'}).length, 1);
});

test('Different models and CM-zero decisions preserve their independent identities/reasons', () => {
  const other = row(3, {package_sub_item_id: 201, decision_entity_id: 304});
  const zero = row(4, {
    exclusion_type: 'CM_ZERO', package_sub_item_id: null,
    decision_entity_id: 41, reason: 'Not required', model_name: null,
    excluded_quantity: 4, excluded_amount: 0,
  });
  const secondZero = {...zero, department_id: 5, department_name: 'Department 5', decision_entity_id: 42, reason: 'No allocation approved'};
  const groups = groupBudgetExclusions([row(1), other, zero, secondZero]);
  assert.equal(groups.length, 3);
  const cmGroup = groups.find(group => group.exclusionType === 'CM_ZERO');
  assert.equal(cmGroup.decisions.length, 2);
  assert.equal(cmGroup.hasMixedReasons, true);
  assert.equal(cmGroup.excludedQuantity, 8);
});

test('Stage 1 and 2 use separate tabs, leave the existing workbench mounted and no longer embed the old accordion', () => {
  const source = readFileSync(new URL('../../src/pages/category-review/CategoryReviewPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /<CategoryExclusionTabs/);
  assert.match(source, /stageContentTabs\.departments === "excluded"/);
  assert.match(source, /stageContentTabs\.package === "excluded"/);
  assert.match(source, /<DepartmentReviewStage/);
  assert.match(source, /<CategoryPackageWorkbench/);
  assert.doesNotMatch(source, /BudgetExclusionsPanel/);
});

test('Both stages share the existing full-screen exclusions drawer', () => {
  const source = readFileSync(new URL('../../src/components/budgets/shared/exclusions/BudgetExclusionDetailsDrawer.jsx', import.meta.url), 'utf8');
  assert.match(source, /<AnimatedDrawer open=\{open\} onClose=\{onClose\} fullScreen>/);
  assert.match(source, /Affected departments/);
  assert.match(source, /Decision history/);
});
