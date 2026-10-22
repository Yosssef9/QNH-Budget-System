import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../../src/', import.meta.url);
const page = readFileSync(new URL('pages/cfo-package-review/CfoPackageReviewPage.jsx', root), 'utf8');
const table = readFileSync(new URL('components/cfo-package-review/CfoReviewTables.jsx', root), 'utf8');
const drawer = readFileSync(new URL('components/cfo-package-review/CfoItemReviewDrawer.jsx', root), 'utf8');
test('both individual Accept entry points save directly, never open a modal', () => {
  assert.equal((page.match(/onAccept=\{acceptItemImmediately\}/g) || []).length, 2);
  assert.ok(!page.includes("setModal({type:'ACCEPT'"));
  assert.ok(!page.includes("modal.type==='ACCEPT'"));
  assert.ok(page.includes("decision: 'CFO_ACCEPTED'"));
});
test('single Accept lock blocks duplicate API calls and flags both button locations', () => {
  assert.match(page, /acceptingItemsRef\.current\.has\(key\)/);
  assert.match(page, /acceptingItemsRef\.current\.add\(key\)/);
  assert.match(page, /acceptingItemsRef\.current\.delete\(key\)/);
  assert.match(table, /disabled=\{!editable \|\| accepting \|\| alreadyAccepted\}/);
  assert.match(drawer, /disabled=\{accepting \|\| activeItem\.cfo_review_status === 'CFO_ACCEPTED'\}/);
});
test('modification and high-impact decisions retain their confirmation modal', () => {
  for (const type of ['NEEDS_MODIFICATION', 'ACCEPT_ALL_PENDING', 'RETURN', 'COMPLETE', 'FINALIZE_ANNUAL']) {
    assert.ok(page.includes(type));
  }
  assert.match(page, /<DecisionModal/);
  assert.match(page, /onNeedsModification=\{item=>setModal\(\{type:'NEEDS_MODIFICATION'/);
});
