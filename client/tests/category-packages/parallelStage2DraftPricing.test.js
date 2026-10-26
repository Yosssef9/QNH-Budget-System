import test from 'node:test';
import assert from 'node:assert/strict';
import { filterStage2Items, packagePriceStatus, scopePackageItem } from '../../src/components/category-packages/packageStage2Filters.js';

const pending = {
  id: 42, catalog_item_id: 142, catalog_item_name: 'Defibrillator', catalog_item_code: 'BIO-42',
  catalog_expense_type: 'CAPEX', active_sub_item_count: 1,
  requested_quantity: 12, approved_quantity: 5, allocated_quantity: 5,
  department_count: 3, reviewed_request_count: 1, pending_review_count: 2,
  model_unit_prices: [{ quantity: 5, category_manager_unit_price: 1000 }],
  expense_contributions: [
    { department_id: 1, expense_type: 'CAPEX', requested_quantity: 5, approved_quantity: 5, allocated_quantity: 5, estimated_allocated_value: 5000, item_review_status: 'CATEGORY_REVIEW_COMPLETED', department_review_status: 'CATEGORY_REVIEW_COMPLETED' },
    { department_id: 2, expense_type: 'CAPEX', requested_quantity: 3, approved_quantity: 0, allocated_quantity: 0, item_review_status: 'PENDING_CATEGORY_REVIEW', department_review_status: 'IN_CATEGORY_REVIEW' },
    { department_id: 3, expense_type: 'CAPEX', requested_quantity: 4, approved_quantity: 0, allocated_quantity: 0, item_review_status: 'PENDING_CATEGORY_REVIEW', department_review_status: 'IN_CATEGORY_REVIEW' },
  ],
};
const options = { search: '', expenseType: 'ALL', departmentId: 'ALL', status: 'ALL', priceStatus: 'ALL', modelStatus: 'ALL', allocationStatus: 'ALL', reviewStatus: 'ALL' };

test('pending department requests remain visible as one package item without increasing approved demand', () => {
  const rows = filterStage2Items([pending], options);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].view_requested_quantity, 12);
  assert.equal(rows[0].view_approved_quantity, 5);
  assert.equal(rows[0].view_pending_review_count, 2);
  assert.equal(rows[0].view_department_count, 3);
});

test('department filtering includes unreviewed requests and never turns them into approvals', () => {
  const finance = scopePackageItem(pending, 'ALL', '2');
  assert.equal(finance.view_requested_quantity, 3);
  assert.equal(finance.view_approved_quantity, 0);
  assert.equal(finance.view_pending_review_count, 1);
  assert.equal(finance.view_department_count, 1);
  assert.equal(finance.view_estimated_value, 0);
  assert.equal(scopePackageItem(pending, 'ALL', '77'), null);
});

test('CM review filter combines with existing search and department filter', () => {
  assert.equal(filterStage2Items([pending], { ...options, reviewStatus:'PENDING', search:'defib' }).length, 1);
  assert.equal(filterStage2Items([pending], { ...options, reviewStatus:'REVIEWED' }).length, 0);
  assert.equal(filterStage2Items([pending], { ...options, reviewStatus:'PENDING', departmentId:'1' }).length, 0);
  assert.equal(filterStage2Items([pending], { ...options, reviewStatus:'REVIEWED', departmentId:'1' }).length, 1);
});

test('unapproved General model can be priced before review and does not require procurement', () => {
  const draft = { ...pending, approved_quantity: 0, pending_review_count: 2, model_unit_prices:[{ quantity:0, category_manager_unit_price:null }] };
  assert.equal(packagePriceStatus(draft), 'MISSING');
  assert.equal(packagePriceStatus({ ...draft, model_unit_prices:[{ quantity:0, category_manager_unit_price:950 }] }), 'PRICED');
  assert.equal(packagePriceStatus({ ...draft, pending_review_count:0 }), 'NOT_REQUIRED');
});

test('completed zero approval is not treated as a pending request', () => {
  const rejected = { ...pending, approved_quantity:0, pending_review_count:0, reviewed_request_count:3,
    expense_contributions: pending.expense_contributions.map(c => ({...c, item_review_status:'CATEGORY_REVIEW_COMPLETED', department_review_status:'CATEGORY_REVIEW_COMPLETED'})) };
  assert.equal(filterStage2Items([rejected], { ...options, reviewStatus:'PENDING' }).length, 0);
  assert.equal(filterStage2Items([rejected], { ...options, reviewStatus:'REVIEWED' }).length, 1);
});
