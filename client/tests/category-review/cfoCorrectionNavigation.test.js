import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCfoRevisionItemEntry } from '../../src/components/category-packages/cfoRevisionItemEntry.js';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/components');
const read = (file) => fs.readFileSync(path.join(sourceRoot, file), 'utf8');
const general = (extra={}) => ({ id: 42, sub_item_code: 'GENERAL', is_default_general: true, ...extra });

test('one active default General model deep-links to its existing EditModelDrawer', () => {
  const model = general();
  assert.deepEqual(getCfoRevisionItemEntry([model]), { type: 'EDIT_GENERAL', model });
});
test('multiple models and no models open Models & Allocation', () => {
  assert.equal(getCfoRevisionItemEntry([]).type, 'MODELS');
  assert.equal(getCfoRevisionItemEntry([general(), {id:2,sub_item_code:'A'}]).type, 'MODELS');
});
test('one non-General model or invalid default-General flag opens Models & Allocation', () => {
  assert.equal(getCfoRevisionItemEntry([{id:3,sub_item_code:'MODEL'}]).type, 'MODELS');
  assert.equal(getCfoRevisionItemEntry([general({is_default_general:false})]).type, 'MODELS');
});
test('deleted models do not count toward active-model decision', () => {
  assert.equal(getCfoRevisionItemEntry([general(), {id:2,is_active:false}]).type, 'EDIT_GENERAL');
});
test('Department Review deep link waits for matching package-item details', () => {
  const code=read('category-packages/CategoryPackageWorkbench.jsx');
  assert.match(code, /Number\(detail\.package_item\?\.id\) !== Number\(pendingRevisionModelItemId\)/);
  assert.match(code, /setEditingSubItem\(entry\.model\)/);
  assert.match(code, /setWorkspaceInitialTab\("MODELS"\)/);
  assert.match(code, /setPendingRevisionModelItemId\(null\)/);
});
test('Department Breakdown rows are clickable, keyboard accessible and ignore nested button clicks', () => {
  const code=read('category-packages/CategoryPackageWorkbench.jsx');
  assert.match(code,/aria-label=\{`View items for \$\{department\.department_name\}`\}/);
  assert.match(code,/event\.target\.closest\("button,a,input,select,textarea,\[role='button'\]"\)/);
  assert.match(code,/onOpenDepartment\(department\.department_id\)/);
});
test('amber revision border belongs on first table cell, not tr', () => {
  for (const name of ['category-packages/CategoryPackageWorkbench.jsx','category-review/DepartmentReviewStage.jsx']) {
    const code=read(name);
    assert.match(code,/border-l-\[3px\] border-l-amber-500/);
  }
  assert.match(read('category-packages/CategoryPackageWorkbench.jsx'), /<td className=\{classNames\([\s\S]*?border-l-\[3px\] border-l-amber-500/);
  assert.match(read('category-review/DepartmentReviewStage.jsx'), /<td className=\{classNames\("px-5 py-4", returnedCorrection \? "border-l-\[3px\] border-l-amber-500"/);
});
test('full CFO reason displays in a large popover and supports close on click and Escape', () => {
  const code=read('category-review/CfoRevisionFeedback.jsx');
  assert.match(code,/w-\[min\(460px,calc\(100vw-48px\)\)\]/);
  assert.match(code,/whitespace-pre-wrap break-words text-sm/);
  assert.match(code,/Close CFO instruction/);
  assert.match(code,/event\.key === "Escape"/);
  assert.match(code,/data-cfo-feedback-popover/);
  assert.match(code,/zIndex: 100001/);
});
