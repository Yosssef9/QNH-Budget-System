import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCfoRevisionFeedback,
  cfoReturnSummary,
  isCfoRevisionItem,
  normalizeCfoReason,
} from '../../src/components/category-review/cfoRevisionFeedback.utils.js';
import { suggestCfoReturnReason } from '../../src/components/cfo-package-review/cfoBulkReviewHelpers.js';
import { mapReviewQueue } from '../../../server/modules/category-review/categoryReview.mapper.js';

const item = (id, status, note) => ({ id, cfo_review_status: status, cfo_review_note: note });

test('groups identical bulk notes and retains the affected item list', () => {
  const items = [item(1, 'NEEDS_MODIFICATION', 'Revise   prices'),item(2, 'NEEDS_MODIFICATION', 'Revise prices'),item(3, 'CFO_ACCEPTED', 'Revise prices')];
  const result = buildCfoRevisionFeedback(items);
  assert.equal(result.affectedCount,2);
  assert.equal(result.groups.length,1);
  assert.equal(result.groups[0].count,2);
  assert.equal(result.getLabel(items[0]),'Shared instruction');
  assert.equal(result.getLabel(items[1]),'Shared instruction');
});
test('individual reasons are preserved as separate instructions', () => {
  const data=[item(1,'NEEDS_MODIFICATION','Change quantity'),item(2,'NEEDS_MODIFICATION','New quotation')];
  const result=buildCfoRevisionFeedback(data);
  assert.equal(result.groups.length,2);
  assert.equal(result.otherReasonCount,1);
  assert.equal(result.getLabel(data[0]),'Item-specific instruction');
});
test('both Department Review and Package Items status names are recognized',()=>{
  assert.equal(isCfoRevisionItem({package_item_cfo_review_status:'NEEDS_MODIFICATION'}),true);
  assert.equal(isCfoRevisionItem({cfo_review_status:'CFO_ACCEPTED'}),false);
});
test('no labels or fabricated notes when there is no affected item',()=>{
  const result=buildCfoRevisionFeedback([item(1,'CFO_ACCEPTED','')]);
  assert.equal(result.affectedCount,0);
  assert.equal(result.mainReason,null);
});
test('normalizes whitespace for grouping without modifying stored records',()=>{
  const record=item(1,'NEEDS_MODIFICATION','A\n\nB');
  const result=buildCfoRevisionFeedback([record]);
  assert.equal(result.mainReason,'A B');
  assert.equal(record.cfo_review_note,'A\n\nB');
});
test('package summary is short and never repeats item notes',()=>{
  const message=cfoReturnSummary('Biomedical',8);
  assert.match(message,/8 items require revision/);
  assert.ok(message.length<170);
});
test('CFO return proposal does not repeat notes or item names',()=>{
  const summary=suggestCfoReturnReason({category_name:'Biomedical',items:[item(1,'NEEDS_MODIFICATION','same long note'),item(2,'NEEDS_MODIFICATION','same long note')]});
  assert.match(summary,/2 items require modification/);
  assert.doesNotMatch(summary,/same long note/);
  assert.ok(summary.length<175);
});
test('no affected CFO items means no proposed return summary',()=>{
  assert.equal(suggestCfoReturnReason({category_name:'IT',items:[item(5,'CFO_ACCEPTED','')]}),'');
});
test('normalization safely handles missing notes',()=>{
  assert.equal(normalizeCfoReason(null),'');
});

test('department queue mapper preserves CFO counts independently from department completion', () => {
  const mapped = mapReviewQueue({ rows: [{ department_category_budget_id: 15, department_name: 'Nursing', status: 'CATEGORY_REVIEW_COMPLETED', item_count: 8, cfo_revision_item_count: 3 }] });
  assert.equal(mapped.budgets[0].status, 'CATEGORY_REVIEW_COMPLETED');
  assert.equal(mapped.budgets[0].cfo_revision_item_count, 3);
});
