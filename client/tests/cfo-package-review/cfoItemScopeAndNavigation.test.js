import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  buildCfoRows, buildCfoDepartments, filterCfoRows, filterCfoDepartments,
  cfoItemUnitExpense, summarizeCfoItemScope, summarizeCfoDepartmentScope,
  summarizeCfoCategoryScope,
} from '../../src/components/cfo-package-review/cfoTableSelectors.js';

const pkgA={id:1,category_name:'IT',category_code:'IT',status:'IN_CFO_REVIEW',summary:{estimated_total:430},items:[
 {id:11,catalog_item_name:'Licensing',unit_name:'License',catalog_item_code:'LICENSING',catalog_expense_type:'OPEX',estimated_total:230,cfo_review_status:'CFO_ACCEPTED'},
 {id:12,catalog_item_name:'Computer',unit_name:'Unit',catalog_expense_type:'CAPEX',estimated_total:200,cfo_review_status:'PENDING_CFO_REVIEW'},
]};
const pkgB={id:2,category_name:'General',category_code:'GENERAL',status:'RETURNED_BY_CFO',summary:{estimated_total:270},items:[
 {id:21,catalog_item_name:'Maintenance',unit_name:'Contract',catalog_expense_type:'OPEX',estimated_total:270,cfo_review_status:'NEEDS_MODIFICATION'},
]};
const responses=[
 {package:pkgA,departmentView:{departments:[{department_id:9,department_name:'Nursing',requested_quantity:3,approved_quantity:3,items:[{department_item_id:91,package_item_id:11,requested_quantity:2,approved_quantity:2,allocations:[{allocated_quantity:2,unit_price:115,unit_of_measure_name:'License'}],reconciliation_status:'RECONCILED'},{department_item_id:92,package_item_id:12,requested_quantity:1,approved_quantity:1,allocations:[{allocated_quantity:1,unit_price:200,unit_of_measure_name:'Unit'}],reconciliation_status:'RECONCILED'}]}]}},
 {package:pkgB,departmentView:{departments:[{department_id:9,department_name:'Nursing',requested_quantity:3,approved_quantity:3,items:[{department_item_id:93,package_item_id:21,requested_quantity:3,approved_quantity:3,allocations:[{allocated_quantity:3,unit_price:90,unit_of_measure_name:'Contract'}],reconciliation_status:'RECONCILED'}]}]}},
];

test('subtitles use catalog units and expense types, never redundant generic codes',()=>{
 const rows=buildCfoRows(responses);
 assert.equal(cfoItemUnitExpense(rows[0]),'License · OPEX');
 assert.equal(cfoItemUnitExpense(rows[1]),'Unit · CAPEX');
 const deps=buildCfoDepartments(responses);
 assert.equal(cfoItemUnitExpense(deps[0].items[2]),'Contract · OPEX');
 assert.equal(cfoItemUnitExpense({allocations:[{unit_of_measure_name:'Contract'}],expense_type:'OPEX'}),'Contract · OPEX');
 assert.equal(cfoItemUnitExpense({catalog_item_code:'SAME_AS_NAME'}),'Unit not specified');
});
test('item summary value responds to category, expense, status, search; not pagination',()=>{
 const rows=buildCfoRows(responses);
 assert.deepEqual(summarizeCfoItemScope(rows),{all:3,accepted:1,needs:1,pending:1,value:700});
 const capex=filterCfoRows(rows,{expense:'CAPEX'});
 assert.deepEqual(summarizeCfoItemScope(capex),{all:1,accepted:0,needs:0,pending:1,value:200});
 assert.equal(summarizeCfoItemScope(filterCfoRows(rows,{expense:'OPEX',category:'IT'})).value,230);
 assert.equal(summarizeCfoItemScope(filterCfoRows(rows,{status:'NEEDS_MODIFICATION'})).value,270);
 assert.equal(summarizeCfoItemScope(filterCfoRows(rows,{search:'Computer'})).value,200);
});
test('department summary follows allocation-based expense/category/item search',()=>{
 const depts=buildCfoDepartments(responses);
 assert.deepEqual(summarizeCfoDepartmentScope(depts),{departments:1,items:3,value:700,approved:6,issues:0});
 const it=filterCfoDepartments(depts,{category:'IT',expense:'OPEX'});
 assert.deepEqual(summarizeCfoDepartmentScope(it),{departments:1,items:1,value:230,approved:2,issues:0});
 const contract=filterCfoDepartments(depts,{search:'Maintenance'});
 assert.equal(summarizeCfoDepartmentScope(contract).value,270);
 assert.equal(summarizeCfoDepartmentScope(filterCfoDepartments(depts,{search:'not found'})).value,0);
});
test('category summary labels package workflow states and totals correctly',()=>{
 assert.deepEqual(summarizeCfoCategoryScope([pkgA,pkgB]),{categories:2,value:700,completed:0,inReview:1,returned:1});
});
test('department row from item drawer opens new overlay, not entire main view',()=>{
 const item=readFileSync(new URL('../../src/components/cfo-package-review/CfoItemReviewDrawer.jsx',import.meta.url),'utf8');
 const page=readFileSync(new URL('../../src/pages/cfo-package-review/CfoPackageReviewPage.jsx',import.meta.url),'utf8');
 assert.match(item,/onClick=\{\(\) => onOpenDepartment\?\.\(dep\.department_id, activeItem\.category_code\)\}/);
 assert.match(item,/aria-label=\{`Open \$\{dep\.department_name\} department requests`\}/);
 assert.match(page,/setItemDepartmentContext\(\{departmentId,categoryCode\}\)/);
 assert.match(page,/useCategoryBackOverlay\(Boolean\(itemDepartmentContext\)/);
 assert.match(page,/<CfoDepartmentDetailsDrawer key=/);
 assert.doesNotMatch(page,/setFocusedDepartmentId\(departmentId\);setSelectedRowKey\(null\)/);
});
test('department search is controlled by the CFO page for matching KPI totals',()=>{
 const table=readFileSync(new URL('../../src/components/cfo-package-review/CfoReviewTables.jsx',import.meta.url),'utf8');
 const page=readFileSync(new URL('../../src/pages/cfo-package-review/CfoPackageReviewPage.jsx',import.meta.url),'utf8');
 assert.match(table,/onSearchChange\?\.\(e\.target\.value\)/);
 assert.match(page,/filterCfoDepartments\(departments,\{search:departmentSearch,category,expense\}\)/);
 assert.match(page,/search=\{departmentSearch\} onSearchChange=\{setDepartmentSearch\}/);
});
