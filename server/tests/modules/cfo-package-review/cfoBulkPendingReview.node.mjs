import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateBulkPendingItemsPayload, validateMarkAllNeedsModificationPayload } from '../../../modules/cfo-package-review/cfoPackageReview.validators.js';
import { pendingCfoSnapshot, suggestCfoReturnReason } from '../../../../client/src/components/cfo-package-review/cfoBulkReviewHelpers.js';
import { getCfoPackageEligibility } from '../../../../client/src/components/cfo-package-review/cfoTableSelectors.js';

const rowVersion = Buffer.from([1,2,3,4,5,6,7,8]).toString('base64');
const source = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const pending = {id:22, catalog_item_name:'Patient Monitor', row_version:rowVersion,cfo_review_status:'PENDING_CFO_REVIEW'};
const accepted = {id:23, catalog_item_name:'Scanner', row_version:rowVersion,cfo_review_status:'CFO_ACCEPTED'};
const modified = {id:24, catalog_item_name:'Defibrillator',row_version:rowVersion,cfo_review_status:'NEEDS_MODIFICATION',cfo_review_note:'Check model and budget.'};
const pkg = {id:10, category_name:'Biomedical',status:'IN_CFO_REVIEW',items:[pending,accepted,modified]};

test('pending snapshot excludes already accepted and flagged items',()=>{
  assert.deepEqual(pendingCfoSnapshot(pkg),[{id:22,row_version:rowVersion}]);
});
test('validates accept snapshot without a note',()=>{
  const value=validateBulkPendingItemsPayload({row_version:rowVersion,expected_pending_items:pendingCfoSnapshot(pkg)});
  assert.equal(value.expected_pending_items.length,1);
  assert.equal(value.note,null);
  assert.equal(value.row_version.toString('base64'),rowVersion);
});
test('modification requires the common pending-items note',()=>{
  const base={row_version:rowVersion,expected_pending_items:pendingCfoSnapshot(pkg)};
  assert.throws(()=>validateMarkAllNeedsModificationPayload(base),e=>e.errorCode==='CFO_REVIEW_NOTE_REQUIRED');
  assert.equal(validateMarkAllNeedsModificationPayload({...base,note:'Missing manufacturer details'}).note,'Missing manufacturer details');
});
test('rejects missing snapshot and duplicate ids, malformed rowversions',()=>{
  assert.throws(()=>validateBulkPendingItemsPayload({row_version:rowVersion}),e=>e.errorCode==='CFO_BULK_SNAPSHOT_REQUIRED');
  assert.throws(()=>validateBulkPendingItemsPayload({row_version:rowVersion,expected_pending_items:[pending,pending]}),e=>e.errorCode==='CFO_BULK_DUPLICATE_ITEM');
  assert.throws(()=>validateBulkPendingItemsPayload({row_version:rowVersion,expected_pending_items:[{id:22,row_version:'bad'}]}),e=>e.errorCode==='CFO_BULK_INVALID_VERSION');
});
test('package tools show pending operations only while category can be reviewed',()=>{
  const e=getCfoPackageEligibility(pkg,{canDecide:true});
  assert.equal(e.canAcceptPending,true);assert.equal(e.canMarkPending,true);
  assert.equal(e.canReturn,false);assert.equal(e.canComplete,false);
  assert.equal(getCfoPackageEligibility(pkg,{canDecide:true,readOnly:true}).canAcceptPending,false);
});
test('return reason derives item names and notes without mutating them',()=>{
  const reason=suggestCfoReturnReason(pkg);
  assert.match(reason,/Biomedical/);assert.match(reason,/Defibrillator/);assert.match(reason,/Check model and budget/);
  assert.equal(pkg.items[2].cfo_review_note,'Check model and budget.');
});
test('very long suggested return reasons cannot exceed 1000 characters',()=>{
  const p={...pkg,items:Array.from({length:50},(_,i)=>({...modified,id:i,catalog_item_name:'Long name '+i,cfo_review_note:'x'.repeat(100)}))};
  assert.ok(suggestCfoReturnReason(p).length<=1000);
});
test('SQL bulk update affects only pending category items and returns old statuses',()=>{
  const repo=source('../../../modules/cfo-package-review/cfoPackageReview.repository.js');
  const snippet=repo.split('export async function updatePendingCfoPackageItemsRepo')[1].split('export async function countPackageCfoReviewStatusesRepo')[0];
  assert.match(snippet,/category_budget_package_id = @packageId/);
  assert.match(snippet,/cfo_review_status = '\$\{CATEGORY_PACKAGE_ITEM_CFO_STATUS\.PENDING_CFO_REVIEW\}'/);
  assert.match(snippet,/DELETED\.cfo_review_status/);
  assert.match(snippet,/INTO @Updated/);
  assert.match(snippet,/SELECT id, old_status, old_note, new_status FROM @Updated/);
  assert.match(snippet,/hasPositiveApprovedPackageDemandSql/);
});
test('bulk transaction checks item versions and writes individual item history',()=>{
  const service=source('../../../modules/cfo-package-review/cfoPackageReview.service.js');
  const block=service.split('export async function bulkDecidePendingCfoItemsService')[1].split('export async function acceptPendingCfoItemsService')[0];
  assert.match(block,/lockCfoPackageForBulkRepo/);
  assert.match(block,/listPendingCfoItemsForBulkRepo/);
  assert.match(block,/expectedById\.get\(item\.id\) !== item\.row_version/);
  assert.match(block,/throw new ApiError\(409/);
  assert.match(block,/CATEGORY_BUDGET_PACKAGE_ITEM/);
  assert.match(block,/updated\.length !== current\.length/);
});
test('UI exposes both bulk actions in expanded package tools only',()=>{
  const table=source('../../../../client/src/components/cfo-package-review/CfoReviewTables.jsx');
  const body=table.split('export function CfoCategoryTable')[1];
  assert.match(body,/ACCEPT_ALL_PENDING/);
  assert.match(body,/MARK_ALL_NEEDS_MODIFICATION/);
  assert.match(body,/Accept all \{e\.counts\.pending\} pending/);
  assert.match(body,/Mark \{e\.counts\.pending\} pending for modification/);
});
