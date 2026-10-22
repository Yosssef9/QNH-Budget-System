import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cfoAcceptItemKey, updateCfoCachedAcceptedItem} from '../../src/components/cfo-package-review/cfoInstantAccept.js';

const original = {package: {id: 5, items: [
  {id: 20,row_version:'v1',cfo_review_status:'PENDING_CFO_REVIEW'},
  {id: 21,row_version:'v2',cfo_review_status:'NEEDS_MODIFICATION',cfo_review_note:'Keep this note'},
]}};
test('one-click acceptance updates only the confirmed item and version', () => {
  const accepted = {id:20,cfo_review_status:'CFO_ACCEPTED',row_version:'v3',cfo_review_note:null};
  const updated = updateCfoCachedAcceptedItem(original,accepted,'v1');
  assert.equal(updated.package.items[0].cfo_review_status,'CFO_ACCEPTED');
  assert.equal(updated.package.items[0].row_version,'v3');
  assert.deepEqual(updated.package.items[1],original.package.items[1]);
  assert.equal(original.package.items[0].cfo_review_status,'PENDING_CFO_REVIEW');
});
test('never overwrites newer cached decisions, stale versions, or missing responses', () => {
  const accepted={id:20,cfo_review_status:'CFO_ACCEPTED',row_version:'v3'};
  assert.strictEqual(updateCfoCachedAcceptedItem(original,accepted,'old'),original);
  assert.strictEqual(updateCfoCachedAcceptedItem(original,null,'v1'),original);
  assert.strictEqual(updateCfoCachedAcceptedItem(original,{...accepted,cfo_review_status:'NEEDS_MODIFICATION'},'v1'),original);
});
test('acceptance identity includes category package', () => {
  assert.notEqual(cfoAcceptItemKey({package_id:1,id:22}),cfoAcceptItemKey({package_id:2,id:22}));
});
