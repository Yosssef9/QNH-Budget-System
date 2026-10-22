import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../../src/components/cfo-package-review/',import.meta.url);
const badge=readFileSync(new URL('CfoReviewStatusBadge.jsx',base),'utf8');
const table=readFileSync(new URL('CfoReviewTables.jsx',base),'utf8');
const drawer=readFileSync(new URL('CfoItemReviewDrawer.jsx',base),'utf8');
const tooltip=readFileSync(new URL('CfoActionTooltip.jsx',base),'utf8');
test('only NEEDS_MODIFICATION status shows saved CFO note in amber tooltip',()=>{
 assert.match(badge,/normalized === "NEEDS_MODIFICATION"/);
 assert.match(badge,/if \(!needsModification\) return badge;/);
 assert.match(badge,/description=\{String\(note \|\| ""\)\.trim\(\) \|\| "No modification reason recorded\."\}/);
 assert.match(badge,/variant="warning"/);
 assert.match(badge,/tabIndex=\{needsModification \? 0 : undefined\}/);
});
test('table and full-screen drawer pass their own saved cfo_review_note to badge',()=>{
 assert.match(table,/note=\{item\.cfo_review_note\}/);
 assert.match(drawer,/note=\{activeItem\.cfo_review_note\}/);
});
test('shared portal tooltip accepts readable long descriptions with hover and focus',()=>{
 for(const token of ['description: information','wide = false','whitespace-pre-wrap break-words','onMouseEnter={showDelayed}','onFocusCapture={showNow}','createPortal(']) assert.ok(tooltip.includes(token),token);
});
