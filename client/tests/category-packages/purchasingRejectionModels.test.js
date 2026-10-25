import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupPurchasingRejectionsByCatalog } from '../../src/components/category-packages/purchasingRejectionModels.js';

const rejection = (departmentId, overrides = {}) => ({
  exclusion_type: 'PURCHASING_REJECTED', budget_category_id: 3, catalog_item_id: 10,
  package_sub_item_id: 201, department_id: departmentId,
  model_name: 'General', reason: 'Specifications do not meet requirements',
  actor_name: 'Purchasing reviewer', actor_code: '2410',
  decided_at: '2026-10-22T10:08:00Z', ...overrides,
});

test('Five department allocations create just one rejected model badge entry', () => {
  const grouped = groupPurchasingRejectionsByCatalog([1, 2, 3, 4, 5].map(rejection), 3);
  assert.equal(grouped.get(10).size, 1);
  assert.deepEqual(grouped.get(10).get(201), {
    id: 201, name: 'General', reason: 'Specifications do not meet requirements',
    actorName: 'Purchasing reviewer', actorCode: '2410', decidedAt: '2026-10-22T10:08:00Z',
  });
});

test('Different rejected models retain their own reasons, actor details and timestamps', () => {
  const grouped = groupPurchasingRejectionsByCatalog([
    rejection(1),
    rejection(2, { package_sub_item_id: 202, model_name: 'Premium',
      reason: 'Alternative supplier required', actor_name: 'Another reviewer' }),
    rejection(3, { package_sub_item_id: 202, model_name: 'Premium',
      reason: 'Alternative supplier required', actor_name: 'Another reviewer' }),
  ], 3);
  assert.equal(grouped.get(10).size, 2);
  assert.equal(grouped.get(10).get(201).reason, 'Specifications do not meet requirements');
  assert.equal(grouped.get(10).get(202).reason, 'Alternative supplier required');
  assert.equal(grouped.get(10).get(202).actorName, 'Another reviewer');
});

test('Badge data respects category scope, ignores CM-zero rows and rejects absent identifiers', () => {
  const grouped = groupPurchasingRejectionsByCatalog([
    rejection(1),
    rejection(2, {budget_category_id: 4}),
    rejection(3, {exclusion_type: 'CM_ZERO'}),
    rejection(4, {package_sub_item_id: null}),
    rejection(5, {catalog_item_id: null}),
  ], 3);
  assert.equal(grouped.size, 1);
  assert.equal(grouped.get(10).size, 1);
  assert.equal(groupPurchasingRejectionsByCatalog([rejection(1)], undefined).size, 0);
});

test('Newer decision wins within the same model, without creating duplicate entries', () => {
  const grouped = groupPurchasingRejectionsByCatalog([
    rejection(1, {reason: 'Old reason', decided_at: '2026-10-21T10:08:00Z'}),
    rejection(2, {reason: 'Updated reason', decided_at: '2026-10-22T10:08:00Z'}),
  ], 3);
  assert.equal(grouped.get(10).size, 1);
  assert.equal(grouped.get(10).get(201).reason, 'Updated reason');
});

test('Package badge and drawer use the same source data with no new API request', () => {
  const workbench = readFileSync(new URL('../../src/components/category-packages/CategoryPackageWorkbench.jsx', import.meta.url), 'utf8');
  const badge = readFileSync(new URL('../../src/components/category-packages/PurchasingRejectionBadge.jsx', import.meta.url), 'utf8');
  const drawer = readFileSync(new URL('../../src/components/budgets/shared/exclusions/BudgetExclusionDetailsDrawer.jsx', import.meta.url), 'utf8');
  assert.match(workbench, /<PurchasingRejectionBadge/);
  assert.match(workbench, /groupPurchasingRejectionsByCatalog\(exclusionsQuery\.data/);
  assert.match(badge, /<Tooltip/);
  assert.match(badge, /model\.reason/);
  assert.match(badge, /model\.actorName/);
  assert.match(drawer, /departments\.length > 5/);
  assert.match(drawer, /events\.length > 5/);
  assert.match(drawer, /sticky top-0/);
  assert.match(drawer, /sticky bottom-0/);
});
