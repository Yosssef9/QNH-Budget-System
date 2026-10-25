import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unitOfMeasureLabel, unitOfMeasureOptions, matchesUnitOfMeasure } from '../../src/components/category-review/unitOfMeasureFilter.js';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
const read = pathPart => fs.readFileSync(path.join(base, pathPart), 'utf8');
const rows = [
  { catalog_item_name: 'Contract A', unit_name: 'Contract' },
  { catalog_item_name: 'Contract B', unit_name: 'CONTRACT' },
  { catalog_item_name: 'Pump', unit_name: 'Unit' },
  { catalog_item_name: 'Incomplete' },
];

test('unit choices come from the complete input data and deduplicate case-insensitively', () => {
  assert.deepEqual(unitOfMeasureOptions(rows), [
    {value:'ALL',label:'All units of measure'},
    {value:'contract',label:'Contract'},
    {value:'unit',label:'Unit'},
  ]);
});
test('selected Unit of Measure matches normalized actual catalog values, not item names', () => {
  assert.equal(matchesUnitOfMeasure(rows[0], 'contract'), true);
  assert.equal(matchesUnitOfMeasure(rows[1], 'contract'), true);
  assert.equal(matchesUnitOfMeasure(rows[2], 'contract'), false);
  assert.equal(matchesUnitOfMeasure(rows[3], 'contract'), false);
  assert.equal(matchesUnitOfMeasure(rows[3], 'ALL'), true);
  assert.equal(unitOfMeasureLabel({unit_code:'LICENSE'}), 'LICENSE');
});
test('Requested Demand filters both CFO changes and catalog unit before paging', () => {
  const text=read('components/category-review/RequestedDemandView.jsx');
  assert.match(text,/const matchesUnit = matchesUnitOfMeasure\(item, unitFilter\)/);
  assert.match(text,/const matchesCfo = !activeCfoOnly \|\| flaggedByCatalogId\.has/);
  assert.match(text,/CFO Changes \{flaggedCount\}/);
  assert.match(text, /<CfoFeedbackNote[\s\S]*?trigger="revision-badge"/);
  assert.match(text,/border-l-\[3px\] border-l-amber-500/);
  assert.match(text,/options=\{requestedUnitOptions\}/);
});
test('Requested Demand detail expands beneath row and View Approval remains separate', () => {
  const text=read('components/category-review/RequestedDemandDetailsDrawer.jsx');
  assert.match(text,/setExpandedId\(\(current\) =>/);
  assert.match(text,/Approved Quantity/);
  assert.match(text,/onSaveApprovedQuantity\(\{ budget, item: activeReviewItem, quantity: quantityDraft \}\)/);
  assert.match(text,/event\.stopPropagation\(\);\s*onGoToDepartmentReview/);
  assert.doesNotMatch(text,/\{department\.department_code\}/);
});
test('Cross-department save uses item/budget context and updates queue totals', () => {
  const text=read('pages/category-review/CategoryReviewPage.jsx');
  assert.match(text,/async function saveRequestedDemandApprovedQuantity\(\{ budget, item, quantity \}\)/);
  assert.match(text,/budget\.status === "CATEGORY_REVIEW_COMPLETED"/);
  assert.match(text,/approved_distribution_mode: "AUTO"/);
  assert.match(text,/queryKey: \["category-review", "queue"\]/);
  assert.match(text,/isCountableUnit\(item\)/);
});
test('CM Package Items Unit filter resets and recalculates all matching item totals', () => {
  const text=read('components/category-packages/CategoryPackageWorkbench.jsx');
  assert.match(text,/Stage2Select label="Unit of Measure"/);
  assert.match(text,/filterStage2Items\([\s\S]*?\)\.filter\(\(item\) => matchesUnitOfMeasure\(item, unitFilter\)\)/);
  assert.match(text,/expenseScopedItems = useMemo\(\(\) =>\s*items\.filter\(\(item\) => matchesUnitOfMeasure\(item, unitFilter\)\)/);
  assert.match(text,/setUnitFilter\("ALL"\)/);
});

