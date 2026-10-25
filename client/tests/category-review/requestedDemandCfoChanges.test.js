import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCurrentCfoRevisionsByCatalogId } from '../../src/components/category-review/cfoRevisionFeedback.utils.js';

const item = (id, status, note = 'Please revise the approved quantity') => ({
  id: id + 100,
  catalog_item_id: id,
  cfo_review_status: status,
  cfo_review_note: note,
});

test('Only outstanding modifications from the current CFO return cycle appear', () => {
  const items = [item(1, 'NEEDS_MODIFICATION'), item(2, 'CFO_ACCEPTED'), item(3, 'NEEDS_MODIFICATION')];
  assert.deepEqual([...getCurrentCfoRevisionsByCatalogId(items, 'RETURNED_BY_CFO').keys()], [1, 3]);
  assert.equal(getCurrentCfoRevisionsByCatalogId(items, 'CFO_REVIEW_COMPLETED').size, 0);
  assert.equal(getCurrentCfoRevisionsByCatalogId(items, 'IN_CFO_REVIEW').size, 0);
  assert.equal(getCurrentCfoRevisionsByCatalogId(items, 'DRAFT').size, 0);
});

test('Legacy status only counts when authoritative current status is absent', () => {
  const rows = [
    {...item(1, 'CFO_ACCEPTED'), package_item_cfo_review_status: 'NEEDS_MODIFICATION'},
    {catalog_item_id: 2, package_item_cfo_review_status: 'NEEDS_MODIFICATION', package_item_cfo_review_note: 'Correct amount'},
    item(3, 'NEEDS_MODIFICATION'),
  ];
  const result = getCurrentCfoRevisionsByCatalogId(rows, 'RETURNED_BY_CFO');
  assert.equal(result.has(1), false);
  assert.equal(result.get(2).package_item_cfo_review_note, 'Correct amount');
  assert.equal(result.has(3), true);
});

test('Missing IDs are ignored and one affected catalog item is only counted once', () => {
  const rows = [
    item(7, 'NEEDS_MODIFICATION', ''),
    item(7, 'NEEDS_MODIFICATION', 'Updated instruction'),
    item(null, 'NEEDS_MODIFICATION'),
    item(-1, 'NEEDS_MODIFICATION'),
    item('garbage', 'NEEDS_MODIFICATION'),
  ];
  const result = getCurrentCfoRevisionsByCatalogId(rows, 'RETURNED_BY_CFO');
  assert.deepEqual([...result.keys()], [7]);
  assert.equal(result.get(7).cfo_review_note, 'Updated instruction');
});

test('Requested Demand uses the shared Stage 2 instruction tooltip, row click isolation and normal table filters', () => {
  const source = readFileSync(new URL('../../src/components/category-review/RequestedDemandView.jsx', import.meta.url), 'utf8');
  assert.match(source, /getCurrentCfoRevisionsByCatalogId\(cfoPackageItems, packageStatus\)/);
  assert.match(source, /hasCurrentCfoChanges && cfoOnly/);
  assert.match(source, /CFO Changes \{flaggedCount\}/);
  assert.match(source, /<CfoFeedbackNote[\s\S]*?trigger="revision-badge"/);
  assert.match(source, /shared=\{cfoFeedback\.getLabel/);
  assert.match(source, /matchesSearch && matchesExpense && matchesReview && matchesUnit && matchesCfo/);
  const feedback = readFileSync(new URL('../../src/components/category-review/CfoRevisionFeedback.jsx', import.meta.url), 'utf8');
  assert.match(feedback, /event\.stopPropagation\(\)/);
  assert.match(feedback, /<Tooltip[\s\S]*?open=\{open\}/);
});
