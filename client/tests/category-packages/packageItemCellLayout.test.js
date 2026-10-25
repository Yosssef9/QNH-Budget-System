import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/components/category-packages/CategoryPackageWorkbench.jsx', import.meta.url), 'utf8');
const cellStart = source.indexOf('"min-w-[335px] px-5 py-4 lg:min-w-[390px]"');
const itemCell = cellStart >= 0 ? source.slice(cellStart, source.indexOf('</td>', cellStart)) : '';

test('Package Items name has its own no-wrap row and full-name tooltip', () => {
  assert.ok(itemCell);
  assert.match(itemCell, /title=\{item\.catalog_item_name\}/);
  assert.match(itemCell, /truncate whitespace-nowrap font-black text-slate-950/);
  assert.ok(itemCell.indexOf('item.catalog_item_name}</p>') < itemCell.indexOf('aria-label={`${expanded ?'));
  assert.ok(itemCell.indexOf('aria-label={`${expanded ?') < itemCell.indexOf('item.unit_name || item.unit_code'));
});

test('CFO and Purchasing badges appear below unit information, flex-wrap only as whole badges', () => {
  assert.ok(itemCell.indexOf('item.unit_name || item.unit_code') < itemCell.indexOf('mt-2 flex min-w-0 flex-wrap items-center gap-2'));
  assert.match(itemCell, /<CfoFeedbackNote\s+[\s\S]*?trigger="revision-badge"/);
  assert.match(itemCell, /inline-flex shrink-0 whitespace-nowrap">\s*<PurchasingRejectionBadge/);
  assert.match(itemCell, /inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-200/);
});

test('Expander retains proper aria attributes and the table remains scrollable', () => {
  assert.match(itemCell, /aria-expanded=\{expanded\}/);
  assert.match(itemCell, /aria-controls=\{`general-price-editor-\$\{item\.id\}`\}/);
  assert.match(itemCell, /onClick=\{\(\) => toggleInlinePrice\(item\.id\)\}/);
  assert.match(source, /ref=\{itemsTableRef\} className="max-h-\[65vh\] overflow-auto"/);
});

test('Needs revision badge reuses the existing CFO instruction popover', () => {
  const feedback = readFileSync(new URL('../../src/components/category-review/CfoRevisionFeedback.jsx', import.meta.url), 'utf8');
  assert.match(itemCell, /note=\{item\.cfo_review_note \?\? item\.package_item_cfo_review_note\}/);
  assert.match(itemCell, /shared=\{cfoFeedback\.getLabel\(item\) === "Shared instruction"\}/);
  assert.match(feedback, /trigger = "note"/);
  assert.match(feedback, /trigger === "revision-badge" \? \(/);
  assert.match(feedback, /<CfoRevisionBadge compact \/>/);
  assert.match(feedback, /<Tooltip[\s\S]*?open=\{open\}/);
  assert.match(feedback, /onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\)/);
});
