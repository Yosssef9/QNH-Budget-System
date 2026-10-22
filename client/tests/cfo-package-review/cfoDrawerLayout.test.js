import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const drawerSource = readFileSync(new URL('../../src/components/budgets/shared/drawers/AnimatedDrawer.jsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../../src/pages/cfo-package-review/CfoPackageReviewPage.jsx', import.meta.url), 'utf8');
const itemSource = readFileSync(new URL('../../src/components/cfo-package-review/CfoItemReviewDrawer.jsx', import.meta.url), 'utf8');

test('left-side CFO category timeline opts into left-side opening and closing', () => {
  assert.ok(pageSource.includes('side="left" maxWidth="max-w-xl"'));
  assert.match(drawerSource, /const offscreenX = drawerSide === "left" \? "-100%" : "100%"/);
  assert.match(drawerSource, /initial=\{\{ x: offscreenX \}\}/);
  assert.match(drawerSource, /exit=\{\{ x: offscreenX \}\}/);
  assert.match(drawerSource, /drawerSide === "left" \? "left-0" : "right-0"/);
});

test('full-screen drawers still use full viewport and right-side default', () => {
  assert.match(drawerSource, /fullScreen \? "right" : "left"/);
  assert.match(drawerSource, /"inset-0 h-screen w-screen"/);
  assert.match(itemSource, /<AnimatedDrawer open=\{Boolean\(activeItem\)\} onClose=\{onCloseItem\} fullScreen>/);
});

test('all four CFO item tabs render in an unrestricted full-width workspace', () => {
  assert.match(itemSource, /<div className="w-full min-w-0 space-y-5">/);
  assert.doesNotMatch(itemSource, /mx-auto max-w-6xl/);
  for (const marker of ['detailTab === "MODELS"', 'detailTab === "DEPARTMENTS"', 'detailTab === "ATTACHMENTS"', 'grid min-w-0 gap-4 xl:grid-cols-2']) {
    assert.ok(itemSource.includes(marker), `Missing full-width tab layout: ${marker}`);
  }
  assert.match(itemSource, /min-w-\[960px\] w-full/);
  assert.match(itemSource, /min-w-\[1060px\] w-full/);
  assert.match(itemSource, /md:grid-cols-2 2xl:grid-cols-3/);
});
