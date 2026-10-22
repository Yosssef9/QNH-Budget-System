import { test } from 'node:test';
import assert from 'node:assert/strict';
import {buildCfoRows, filterCfoRows, buildCfoDepartments, getCfoPackageEligibility, cfoChange, cfoItemCounts} from '../../src/components/cfo-package-review/cfoTableSelectors.js';
const a={id:1,catalog_item_name:'Scanner',catalog_expense_type:'CAPEX',estimated_total:80,category_manager_estimated_total:100,cfo_review_status:'PENDING_CFO_REVIEW'};
const b={id:2,catalog_item_name:'Bed',catalog_expense_type:'OPEX',estimated_total:150,category_manager_estimated_total:110,cfo_review_status:'CFO_ACCEPTED'};
const responses=[{package:{id:15,category_name:'IT',category_code:'IT',items:[a],status:'IN_CFO_REVIEW'}, departmentView:{departments:[{department_id:3,department_name:'Nursing',requested_quantity:5,approved_quantity:4,items:[{id:3,package_item_id:1,requested_quantity:5,approved_quantity:4,allocations:[{allocated_quantity:4,unit_price:10}],reconciliation_status:'RECONCILED'}]}]}}, {package:{id:16,category_name:'General',category_code:'GENERAL',items:[b]},departmentView:{departments:[{department_id:3,department_name:'Nursing',requested_quantity:2,approved_quantity:2,items:[{id:4,package_item_id:2,requested_quantity:2,approved_quantity:2,allocations:[{allocated_quantity:2,unit_price:20}],reconciliation_status:'RECONCILED'}]}]}}];
test('combines items without mixing category ids',()=>{const rows=buildCfoRows(responses);assert.deepEqual(rows.map(r=>r.package_id),[15,16]);assert.equal(filterCfoRows(rows,{category:'IT'}).length,1);assert.equal(filterCfoRows(rows,{search:'bed',status:'CFO_ACCEPTED'}).length,1);});
test('filters CAPEX and status correctly',()=>{const rows=buildCfoRows(responses);assert.deepEqual(filterCfoRows(rows,{expense:'OPEX'}).map(x=>x.id),[2]);assert.deepEqual(filterCfoRows(rows,{status:'PENDING'}).map(x=>x.id),[1]);});
test('signed price variance and counts',()=>{assert.equal(cfoChange(a),-20);assert.equal(cfoChange(b),40);assert.deepEqual(cfoItemCounts([a,b]),{all:2,accepted:1,needs:0,pending:1});});
test('return and complete eligibility remains category-specific',()=>{const pkg={status:'IN_CFO_REVIEW',items:[{...a,cfo_review_status:'NEEDS_MODIFICATION'},{...b,cfo_review_status:'CFO_ACCEPTED'}]};assert.equal(getCfoPackageEligibility(pkg,{canDecide:true}).canReturn,true);assert.equal(getCfoPackageEligibility(pkg,{canDecide:true}).canComplete,false);assert.equal(getCfoPackageEligibility({...pkg,items:[b]},{canDecide:true}).canComplete,true);assert.equal(getCfoPackageEligibility(pkg,{canDecide:true,readOnly:true}).canReturn,false);});
test('department values sum allocations, never entire shared package amount',()=>{const dep=buildCfoDepartments(responses)[0];assert.equal(dep.value,80);assert.equal(dep.categoryCount,2);assert.equal(dep.itemCount,2);});
test('department category filter preserves only selected allocations',async()=>{ const {filterCfoDepartments}=await import('../../src/components/cfo-package-review/cfoTableSelectors.js'); const filtered=filterCfoDepartments(buildCfoDepartments(responses),'IT');assert.equal(filtered.length,1);assert.equal(filtered[0].itemCount,1);assert.equal(filtered[0].value,40);assert.equal(filtered[0].approved,4);});
test('model-name search is supported without loading an item drawer',()=>{const row={...a,category_code:'IT',model_unit_prices:[{name:'ZX-410 door controller'}]};assert.equal(filterCfoRows([row],{search:'ZX-410'}).length,1);});

test('category next action always reflects one category and never auto-submits', async () => {
  const {getCfoPackageNextAction} = await import('../../src/components/cfo-package-review/cfoTableSelectors.js');
  const pending = {status:'IN_CFO_REVIEW',items:[a,b]};
  let eligibility = getCfoPackageEligibility(pending,{canDecide:true});
  assert.deepEqual(getCfoPackageNextAction(pending,eligibility),{kind:'REVIEW_PENDING',label:'Review 1 pending'});
  const returnable = {...pending,items:[{...a,cfo_review_status:'NEEDS_MODIFICATION'},b]};
  eligibility = getCfoPackageEligibility(returnable,{canDecide:true});
  assert.deepEqual(getCfoPackageNextAction(returnable,eligibility),{kind:'RETURN',label:'Return to CM'});
  const completable = {...pending,items:[b]};
  eligibility = getCfoPackageEligibility(completable,{canDecide:true});
  assert.deepEqual(getCfoPackageNextAction(completable,eligibility),{kind:'COMPLETE',label:'Complete review'});
  const complete = {...completable,status:'CFO_REVIEW_COMPLETED'};
  assert.equal(getCfoPackageNextAction(complete,getCfoPackageEligibility(complete,{canDecide:true})).kind,'COMPLETED');
});

test('read-only and returned packages never offer unauthorized return or complete', async () => {
  const {getCfoPackageNextAction} = await import('../../src/components/cfo-package-review/cfoTableSelectors.js');
  const eligible={status:'IN_CFO_REVIEW',items:[{...a,cfo_review_status:'NEEDS_MODIFICATION'}]};
  const locked=getCfoPackageEligibility(eligible,{canDecide:true,readOnly:true});
  assert.equal(getCfoPackageNextAction(eligible,locked).kind,'VIEW_ITEMS');
  const returned={...eligible,status:'RETURNED_TO_CATEGORY_MANAGER'};
  assert.equal(getCfoPackageNextAction(returned,getCfoPackageEligibility(returned,{canDecide:true})).kind,'VIEW_ITEMS');
});

test('department CAPEX/OPEX filters use package item expense type and recompute every subtotal', async()=>{
  const {filterCfoDepartments}=await import('../../src/components/cfo-package-review/cfoTableSelectors.js');
  const all=buildCfoDepartments(responses);
  assert.deepEqual(all[0].items.map(i=>i.catalog_expense_type),['CAPEX','OPEX']);
  const capex=filterCfoDepartments(all,{expense:'CAPEX'});
  assert.equal(capex.length,1);
  assert.equal(capex[0].itemCount,1);
  assert.equal(capex[0].categoryCount,1);
  assert.equal(capex[0].requested,5);
  assert.equal(capex[0].approved,4);
  assert.equal(capex[0].value,40);
  const opex=filterCfoDepartments(all,{expense:'OPEX'});
  assert.equal(opex[0].value,40);
  assert.equal(opex[0].approved,2);
  assert.equal(filterCfoDepartments(all,{category:'IT',expense:'OPEX'}).length,0);
});

test('department text search matches whole department or individual requested item',async()=>{
  const {filterCfoDepartments}=await import('../../src/components/cfo-package-review/cfoTableSelectors.js');
  const all=buildCfoDepartments(responses);
  assert.equal(filterCfoDepartments(all,{search:'Nursing'})[0].itemCount,2);
  assert.equal(filterCfoDepartments(all,{search:'Bed'})[0].itemCount,1);
  assert.equal(filterCfoDepartments(all,{search:'Bed'})[0].value,40);
  assert.equal(filterCfoDepartments(all,{search:'missing'}).length,0);
});

test('department filtering does not mutate original data, so drawer filters can diverge',async()=>{
  const {filterCfoDepartments}=await import('../../src/components/cfo-package-review/cfoTableSelectors.js');
  const departments=buildCfoDepartments(responses);
  const it=filterCfoDepartments(departments,{category:'IT'});
  const all=filterCfoDepartments(departments,{category:'ALL'});
  assert.equal(it[0].itemCount,1);
  assert.equal(all[0].itemCount,2);
  assert.equal(departments[0].items.length,2);
});
