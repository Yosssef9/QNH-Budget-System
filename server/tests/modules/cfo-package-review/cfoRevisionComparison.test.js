import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCfoReturnedItem, summarizeRevisionItems } from '../../../modules/cfo-package-review/cfoRevisionComparison.js';
const baseline = {
  item_id: 1, snapshot_id: 10, item_total_amount: 160000, approved_quantity: 16,
  current_approved_quantity: 16, is_reviewed: 0,
  snapshot_json: JSON.stringify({subItems:[{package_sub_item_id:101,name:'General',quantity:16,unit_price:10000}]}),
};
const current = (quantity, cmPrice, review='ACCEPTED') => ({...baseline,
  current_models_json: JSON.stringify({models:[{id:101,name:'General',quantity,category_manager_unit_price:cmPrice,unit_price:cmPrice,purchasing_decision:review}]})
});
test('compares against immutable CFO-return baseline, not intermediate edits', () => {
  const cmp = compareCfoReturnedItem(current(16,9000), {stage:'CM'});
  assert.equal(cmp.previous_total, 160000);
  assert.equal(cmp.current_total, 144000);
  assert.equal(cmp.change_percent, -10);
  assert.equal(cmp.models[0].price_percent, -10);
});
test('combined price and quantity differences use old/new totals, not added percentages', () => {
  const cmp = compareCfoReturnedItem({...current(12,9000),current_approved_quantity:12},{stage:'CM'});
  assert.equal(cmp.change_percent, -32.5);
  assert.equal(cmp.quantity_percent, -25);
});
test('rejected General is never counted in CM proposal or CFO eligible values', () => {
  assert.equal(compareCfoReturnedItem(current(16,9000,'REJECTED'),{stage:'CFO'}).current_total,0);
  assert.equal(compareCfoReturnedItem(current(16,9000,'REJECTED'),{stage:'CM'}).current_total,0);
});
test('review flag is independent of actual financial changes', () => {
  const x=compareCfoReturnedItem({...current(16,10000),is_reviewed:1},{stage:'CM'});
  assert.equal(x.reviewed,true);
  assert.equal(x.financially_changed,false);
  assert.deepEqual(summarizeRevisionItems([x,{...x,reviewed:false,financially_changed:true}]), {total:2,reviewed:1,remaining:1,changed:1,unchanged:1});
});
test('baseline zero produces no misleading percentage', () => {
  assert.equal(compareCfoReturnedItem({...current(16,9000),item_total_amount:0},{stage:'CM'}).change_percent,null);
});
test('offsetting price changes across models still count as financially changed', () => {
  const cmp=compareCfoReturnedItem({...baseline,item_total_amount:200, snapshot_json:JSON.stringify({subItems:[
    {package_sub_item_id:1,name:'A',quantity:1,unit_price:100},{package_sub_item_id:2,name:'B',quantity:1,unit_price:100}
  ]}), current_approved_quantity:2,approved_quantity:2,current_models_json:JSON.stringify({models:[
    {id:1,name:'A',quantity:1,unit_price:90,category_manager_unit_price:90,purchasing_decision:'ACCEPTED'},
    {id:2,name:'B',quantity:1,unit_price:110,category_manager_unit_price:110,purchasing_decision:'ACCEPTED'}
  ]})},{stage:'CM'});
  assert.equal(cmp.current_total,200);
  assert.equal(cmp.financially_changed,true);
});
