import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCfoTooltipPosition } from '../../src/components/cfo-package-review/cfoActionTooltipPosition.js';

const table = readFileSync(new URL('../../src/components/cfo-package-review/CfoReviewTables.jsx', import.meta.url), 'utf8');
const tooltip = readFileSync(new URL('../../src/components/cfo-package-review/CfoActionTooltip.jsx', import.meta.url), 'utf8');
const anchor = (left, top, width=36, height=36) => ({left, top, width, height, bottom:top+height});

test('portal tooltip centers above a normal action button', () => {
  const pos = getCfoTooltipPosition({anchor:anchor(380,220),viewportWidth:1200,viewportHeight:800,width:150,height:38});
  assert.deepEqual(pos,{centerX:398, top:172, below:false, arrowX:75});
});
test('portal tooltip stays inside right viewport edge and points to sticky actions', () => {
  const pos = getCfoTooltipPosition({anchor:anchor(1148,220),viewportWidth:1200,viewportHeight:800,width:220,height:38});
  assert.equal(pos.centerX,1078);
  assert.ok(pos.centerX + 110 <= 1200-12);
  assert.ok(pos.arrowX > 110);
});
test('portal tooltip stays inside left viewport edge', () => {
  const pos = getCfoTooltipPosition({anchor:anchor(3,220),viewportWidth:1200,viewportHeight:800,width:180,height:38});
  assert.equal(pos.centerX,102);
  assert.ok(pos.arrowX >= 12);
});
test('portal tooltip flips below buttons near the top of the screen', () => {
  const pos = getCfoTooltipPosition({anchor:anchor(300,8),viewportWidth:1200,viewportHeight:800,width:160,height:44});
  assert.equal(pos.below,true);
  assert.equal(pos.top,54);
});
test('all item actions use reusable color-coded tooltip in approved order', () => {
  const start = table.indexOf('<CfoActionButton Icon={Check}');
  const actions = table.slice(start,table.indexOf('</div>',start));
  const tokens = ['Icon={Check}', 'Icon={MessageSquareWarning}', 'Icon={History}', 'Icon={Eye}'];
  const offsets = tokens.map(t=>actions.indexOf(t));
  assert.ok(offsets.every(i=>i>=0));
  assert.deepEqual(offsets,[...offsets].sort((a,b)=>a-b));
  for(const variant of ['success','warning','violet','info']) assert.ok(actions.includes(`variant="${variant}"`));
  assert.doesNotMatch(table,/bg-slate-900 px-2\.5 py-1\.5 text-center/);
  assert.match(table,/CfoActionTooltip Icon=\{RotateCcw\} label="Return to CM"/);
  assert.match(table,/CfoActionTooltip Icon=\{Check\} label="Complete Review"/);
});
test('accessible hover/focus and disabled explanations use a non-clipped portal', () => {
  assert.match(tooltip,/role="tooltip"/);
  assert.match(tooltip,/createPortal\(/);
  assert.match(tooltip,/onFocusCapture=\{showNow\}/);
  assert.match(tooltip,/disabledReason/);
  assert.match(tooltip,/onMouseEnter=\{showDelayed\}/);
  assert.match(tooltip,/window\.addEventListener\('scroll', updatePosition, true\)/);
  assert.match(tooltip,/pointer-events-none/);
});
