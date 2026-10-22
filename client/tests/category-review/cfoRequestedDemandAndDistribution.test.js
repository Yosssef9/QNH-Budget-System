import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file = (name) => readFileSync(new URL(`../../src/${name}`,import.meta.url),'utf8');
test('Requested Demand item rows are interactive and View does not bubble',()=>{
  const s=file('components/category-review/RequestedDemandView.jsx');
  assert.match(s,/aria-label=\{`View requested demand details for/);
  assert.match(s,/onKeyDown=\{\(event\) => \{/);
  assert.match(s,/event.stopPropagation\(\); setSelectedItem\(item\)/);
});
test('Details drawer only shows meaningful CFO statuses and saved reasons',()=>{
  const s=file('components/category-review/RequestedDemandDetailsDrawer.jsx');
  assert.match(s,/cfoReview\?\.cfo_review_status === "CFO_ACCEPTED"/);
  assert.match(s,/cfoReview\?\.cfo_review_status === "NEEDS_MODIFICATION"/);
  assert.match(s,/\{cfoReview.cfo_review_note\}/);
  assert.doesNotMatch(s,/Pending CFO Review/);
});
test('Returned item editor allows Auto and Custom controls and saves distribution payload',()=>{
  const d=file('components/category-review/CategoryReviewItemDrawer.jsx');
  const p=file('pages/category-review/CategoryReviewPage.jsx');
  assert.match(d,/disabled=\{locked \|\| returnedCorrection \|\| saving\}/); // note field only
  assert.match(p,/approved_distribution_mode: approvedDistributionMode,\s*approved_distribution: approvedDistribution,\s*row_version/);
});
test('Package Items filter actions align in the same responsive grid',()=>{
  const s=file('components/category-packages/CategoryPackageWorkbench.jsx');
  assert.match(s,/items-end justify-end gap-2 self-end md:col-span-2 xl:col-span-2/);
});
