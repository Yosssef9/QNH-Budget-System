import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCfoItemsExcel, buildCfoDepartmentsExcel, buildCfoCategoriesExcel, buildCfoExclusionsExcel } from '../../src/components/cfo-package-review/cfoReviewExport.js';

test('item export honors supplied filtered/sorted rows and keeps missing CFO baselines blank', () => {
  const rows = [
    { id: 3, package_id: 9, category_name: 'BIOMEDICAL', catalog_item_name: 'Zeta',
      catalog_expense_type: 'CAPEX', approved_quantity: 16, requested_quantity: 20,
      category_manager_estimated_total: 160000, estimated_total: 144000,
      model_unit_prices: [{ name: 'General' }], active_sub_item_count: 1,
      cfo_review_status: 'NEEDS_MODIFICATION', cfo_review_note: 'Reduce quote' },
    { id: 1, package_id: 9, category_name: 'BIOMEDICAL', catalog_item_name: 'Alpha',
      catalog_expense_type: 'CAPEX', approved_quantity: 4, requested_quantity: 5,
      category_manager_estimated_total: 20000, estimated_total: 20000 },
  ];
  const report = buildCfoItemsExcel(rows, {9:{itemsById:{3:{previous_total:160000,current_total:144000,
    change_amount:-16000,change_percent:-10,previous_quantity:16,current_quantity:16,
    quantity_percent:0,models:[{previous_price:10000,current_price:9000,price_percent:-10}]}}}});
  assert.deepEqual(report.rows.map(row => row.item), ['Zeta', 'Alpha']);
  assert.equal(report.rows[0].changePercent, -0.1);
  assert.equal(report.rows[0].pricePercent, -0.1);
  assert.equal(report.rows[1].previousValue, null);
  assert.equal(report.rows[0].instruction, 'Reduce quote');
  assert.equal(report.totals.purchasingValue, 164000);
  assert.equal(report.totals.purchasingDelta, -16000);
});

test('department export retains current table ordering and numeric totals', () => {
  const report = buildCfoDepartmentsExcel([{name:'Radiology',categoryCount:2,itemCount:3,requested:16,approved:12,value:60000,issues:1},
    {name:'ER',categoryCount:1,itemCount:2,requested:10,approved:9,value:10000,issues:0}]);
  assert.equal(report.rows[0].department, 'Radiology');
  assert.equal(report.totals.allocatedValue, 70000);
  assert.equal(report.totals.approved, 21);
});

test('category export preserves package statuses and previous-cycle baseline', () => {
  const report = buildCfoCategoriesExcel([{id:7,category_name:'IT',status:'IN_CFO_REVIEW',items:[
    {estimated_total:500, cfo_review_status:'CFO_ACCEPTED'},{estimated_total:400, cfo_review_status:'NEEDS_MODIFICATION'}]}],
    {7:{category:{previous_total:1000,current_total:900,change_amount:-100,change_percent:-10}}});
  assert.equal(report.rows[0].value,900);
  assert.equal(report.rows[0].percent,-0.1);
  assert.equal(report.rows[0].needs,1);
});

test('exclusion export exposes exact rejected model and distinct reasons', () => {
  const report = buildCfoExclusionsExcel([{categoryName:'IT',itemName:'Printer',modelName:'General',
    exclusionType:'PURCHASING_REJECTED',itemExclusionScope:'ALL_MODELS',
    departments:[{name:'Finance',excludedQuantity:16}],excludedQuantity:16,excludedAmount:160000,reviewRound:2,
    decisions:[{reason:'Price too high'},{reason:'Price too high'}],latestDecision:{actorName:'Buyer',actorCode:'301'}}]);
  assert.equal(report.rows[0].model, 'General');
  assert.equal(report.rows[0].scope, 'All models rejected');
  assert.equal(report.rows[0].reasons, 'Price too high');
  assert.equal(report.totals.excludedQuantity,16);
});
