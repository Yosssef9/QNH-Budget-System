import test from "node:test";
import assert from "node:assert/strict";
import { scopePackageItem, filterStage2Items, filterStage2Departments, packagePriceStatus } from "../../src/components/category-packages/packageStage2Filters.js";

const one = {
  id: 9, catalog_item_name: "Computers Set", catalog_item_code: "IT009",
  active_sub_item_count: 1, model_unit_prices: [{ category_manager_unit_price: 100 }],
  approved_quantity: 14, allocated_quantity: 14, department_count: 2,
  category_manager_estimated_total: 1400, reconciliation_status: "RECONCILED",
  expense_contributions: [
    { department_id: 1, expense_type: "CAPEX", approved_quantity: 10, allocated_quantity: 10, estimated_allocated_value: 1000, unpriced_allocations: 0 },
    { department_id: 2, expense_type: "OPEX", approved_quantity: 4, allocated_quantity: 4, estimated_allocated_value: 400, unpriced_allocations: 0 },
  ],
};

test("CAPEX filters scoped approved demand and allocation-based value without mutating package", () => {
  const scoped = scopePackageItem(one, "CAPEX", "ALL");
  assert.equal(scoped.view_approved_quantity, 10);
  assert.equal(scoped.view_department_count, 1);
  assert.equal(scoped.view_estimated_value, 1000);
  assert.equal(one.approved_quantity, 14);
  assert.equal(scopePackageItem(one, "OPEX", "ALL").view_approved_quantity, 4);
  assert.equal(scopePackageItem(one, "ALL", "ALL").view_approved_quantity, 14);
  assert.equal(scopePackageItem(one, "CAPEX", "2"), null);
});

test("filters combine price, status, and search", () => {
  const found = filterStage2Items([one], {
    expenseType: "CAPEX", departmentId: "ALL", search: "computers",
    priceStatus: "PRICED", modelStatus: "ALL", allocationStatus: "ALL", status: "RECONCILED", sortBy: "NAME",
  });
  assert.equal(found.length, 1);
  assert.equal(packagePriceStatus({ model_unit_prices: [{ category_manager_unit_price: null }] }), "MISSING");
  assert.equal(filterStage2Items([one], {expenseType:"CAPEX", departmentId:"ALL", search:"absent",priceStatus:"ALL",modelStatus:"ALL",allocationStatus:"ALL",status:"ALL"}).length,0);
});

test("department filtering recalculates totals per expense type", () => {
  const data = { departments: [{ department_id: 1, items: [
    {expense_type: "CAPEX", approved_quantity: 2, allocated_quantity: 2, requested_quantity: 2, reconciliation_status: "RECONCILED"},
    {expense_type: "OPEX", approved_quantity: 3, allocated_quantity: 1, requested_quantity: 3, reconciliation_status: "SHORT"},
  ] }] };
  const filtered = filterStage2Departments(data, "CAPEX");
  assert.equal(filtered.summary.approved_quantity, 2);
  assert.equal(filtered.departments[0].item_count, 1);
  assert.equal(data.departments[0].items.length, 2);
});

test("scoped monetary total is unavailable for unpriced or not allocated demand", () => {
  const item = {...one, model_unit_prices: [{category_manager_unit_price:null}], expense_contributions:[{department_id:1,expense_type:"CAPEX",approved_quantity:10,allocated_quantity:0,estimated_allocated_value:0,unpriced_allocations:0}]};
  assert.equal(scopePackageItem(item,"CAPEX").view_estimated_value,null);
});
