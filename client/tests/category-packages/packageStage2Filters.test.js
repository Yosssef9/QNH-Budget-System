import test from "node:test";
import assert from "node:assert/strict";
import { scopePackageItem, filterStage2Items, filterStage2Departments, packagePriceStatus, compareStage2Items } from "../../src/components/category-packages/packageStage2Filters.js";

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

// Regression: Stage 2 can contain preconfigured package items even when no
// department review is complete (approved quantity=0, no contributions).
test("CAPEX and OPEX filter catalog-only package items before department review", () => {
  const items = [
    { id: 1, catalog_item_name: "AI Server", catalog_expense_type: "CAPEX", approved_quantity: 0, allocated_quantity: 0, department_count: 0, expense_contributions: [] },
    { id: 2, catalog_item_name: "AnyDesk License", catalog_expense_type: "OPEX", approved_quantity: 0, allocated_quantity: 0, department_count: 0, expense_contributions: [] },
    { id: 3, catalog_item_name: "Unclassified Item", approved_quantity: 0, expense_contributions: [] },
  ];
  const opts = { expenseType: "CAPEX", departmentId: "ALL", search: "", priceStatus: "ALL", modelStatus: "ALL", allocationStatus: "ALL", status: "ALL", sortBy: "NAME" };
  const capex = filterStage2Items(items, opts);
  const opex = filterStage2Items(items, { ...opts, expenseType: "OPEX" });
  assert.deepEqual(capex.map((item) => item.catalog_item_name), ["AI Server"]);
  assert.deepEqual(opex.map((item) => item.catalog_item_name), ["AnyDesk License"]);
  assert.equal(capex[0].view_approved_quantity, 0);
  assert.equal(capex[0].view_department_count, 0);
  assert.equal(capex[0].view_catalog_fallback, true);
  assert.equal(filterStage2Items(items, { ...opts, expenseType: "ALL" }).length, 3);
  assert.equal(scopePackageItem(items[0], "CAPEX", "2"), null);
});

test("approved expense contributions always override catalog classification", () => {
  const catalogCapex = { ...one, catalog_expense_type: "CAPEX" };
  assert.equal(scopePackageItem(catalogCapex, "OPEX").view_approved_quantity, 4);
  assert.equal(scopePackageItem(catalogCapex, "CAPEX").view_approved_quantity, 10);
  const capexOnly = { ...catalogCapex, expense_contributions: [one.expense_contributions[0]] };
  assert.equal(scopePackageItem(capexOnly, "OPEX"), null);
});

test("do not use catalog classification to conceal unexplained positive demand", () => {
  assert.equal(scopePackageItem({ id: 1, catalog_expense_type: "CAPEX", approved_quantity: 5, expense_contributions: [] }, "CAPEX"), null);
});


test("all sortable headers order the complete filtered result before pagination", () => {
  const items = [
    { ...one, id: 1, catalog_item_name: "Bravo", approved_quantity: 10, allocated_quantity: 10, active_sub_item_count: 2, department_count: 3, category_manager_estimated_total: 200, reconciliation_status: "SHORT", model_unit_prices: [{category_manager_unit_price: 100},{category_manager_unit_price: 150}], expense_contributions: [] },
    { ...one, id: 2, catalog_item_name: "Alpha", approved_quantity: 5, allocated_quantity: 5, active_sub_item_count: 1, department_count: 2, category_manager_estimated_total: 100, reconciliation_status: "RECONCILED", model_unit_prices: [{category_manager_unit_price: 50}], expense_contributions: [] },
    { ...one, id: 3, catalog_item_name: "Charlie", approved_quantity: 15, allocated_quantity: 15, active_sub_item_count: 1, department_count: 1, category_manager_estimated_total: null, reconciliation_status: "EXCESS", model_unit_prices: [{category_manager_unit_price: null}], expense_contributions: [] },
  ];
  const options = { search: "", expenseType: "ALL", departmentId: "ALL", priceStatus: "ALL", modelStatus: "ALL", allocationStatus: "ALL", status: "ALL" };
  const orderedIds = (column, direction) => filterStage2Items(items, { ...options, sortBy: column, sortDirection: direction }).map(item=>item.id);
  assert.deepEqual(orderedIds("NAME", "asc"), [2,1,3]);
  assert.deepEqual(orderedIds("NAME", "desc"), [3,1,2]);
  assert.deepEqual(orderedIds("DEMAND", "asc"), [2,1,3]);
  assert.deepEqual(orderedIds("DEMAND", "desc"), [3,1,2]);
  assert.deepEqual(orderedIds("DEPARTMENTS", "asc"), [3,2,1]);
  assert.deepEqual(orderedIds("MODELS", "desc"), [1,2,3]);
  assert.deepEqual(orderedIds("UNIT_PRICE", "asc"), [2,1,3]); // Missing/multiple last (name tiebreak)
  assert.deepEqual(orderedIds("VALUE", "desc"), [1,2,3]); // Unpriced last in both directions
  assert.deepEqual(orderedIds("RECONCILIATION", "asc"), [3,2,1]);
  assert.deepEqual(orderedIds("RECONCILIATION", "desc"), [1,2,3]);
});

test("issues sort uses blocker counts and remains stable for ties", () => {
  const blockers = new Map([[1, [{}, {}]], [2, [{}]], [3, [{}, {}, {}]]]);
  const items = [{id:1,catalog_item_name:"A"},{id:2,catalog_item_name:"B"},{id:3,catalog_item_name:"C"}];
  assert.deepEqual(items.slice().sort((a,b)=>compareStage2Items(a,b,"ATTENTION","desc",blockers)).map(i=>i.id),[3,1,2]);
  assert.deepEqual(items.slice().sort((a,b)=>compareStage2Items(a,b,"ATTENTION","asc",blockers)).map(i=>i.id),[2,1,3]);
});
