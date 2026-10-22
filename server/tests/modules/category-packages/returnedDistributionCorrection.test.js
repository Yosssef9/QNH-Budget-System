import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReturnedCustomDistribution } from '../../../modules/category-packages/returnedDistributionCorrection.js';
import { validateDepartmentApprovedQuantityPayload } from '../../../modules/category-packages/categoryPackages.validators.js';
const ctx = { distribution_method: 'MONTHLY', unit_code: 'UNIT', unit_name: 'Unit' };
const valid = (overrides={}) => ({context:ctx,requestedRows:[],approvedQuantity:8,rows:[
  {period_type:'MONTH',period_no:1,quantity:5},
  {period_type:'MONTH',period_no:2,quantity:3}],...overrides});
test('returned correction: custom monthly distribution normalizes missing months',()=>{
  const rows=validateReturnedCustomDistribution(valid());
  assert.equal(rows.length,12);assert.equal(rows[0].quantity,5);assert.equal(rows[1].quantity,3);assert.equal(rows[11].quantity,0);
});
test('returned correction: distribution-only edit permitted when approved quantity unchanged',()=>{
  const rows=validateReturnedCustomDistribution(valid({rows:[{period_type:'MONTH',period_no:3,quantity:8}]}));
  assert.equal(rows[2].quantity,8);
});
test('returned correction: reject mismatch / duplicate period / invalid unit quantities',()=>{
  assert.throws(()=>validateReturnedCustomDistribution(valid({approvedQuantity:7})),/total/);
  assert.throws(()=>validateReturnedCustomDistribution(valid({rows:[{period_type:'MONTH',period_no:1,quantity:4},{period_type:'MONTH',period_no:1,quantity:4}]})),/period/);
  assert.throws(()=>validateReturnedCustomDistribution(valid({rows:[{period_type:'MONTH',period_no:1,quantity:7.5},{period_type:'MONTH',period_no:2,quantity:0.5}]})),/quantity/);
});
test('returned correction: quarterly custom and auto compatibility',()=>{
  const rows=validateReturnedCustomDistribution(valid({context:{...ctx,distribution_method:'QUARTERLY'},rows:[{period_type:'QUARTER',period_no:1,quantity:8}]}));
  assert.equal(rows.length,4);
  assert.throws(()=>validateReturnedCustomDistribution(valid({context:{...ctx,distribution_method:'ANNUAL'}})),/editable/);
});
test('returned correction: validates mode, rows and preserves legacy input',()=>{
  const row_version=Buffer.alloc(8).toString('base64');
  assert.equal(validateDepartmentApprovedQuantityPayload({category_approved_quantity:8,row_version}).approved_distribution_mode,null);
  assert.equal(validateDepartmentApprovedQuantityPayload({category_approved_quantity:8,row_version,approved_distribution_mode:'AUTO'}).approved_distribution_mode,'AUTO');
  assert.throws(()=>validateDepartmentApprovedQuantityPayload({category_approved_quantity:8,row_version,approved_distribution_mode:'SURPRISE'}),/mode/);
  assert.throws(()=>validateDepartmentApprovedQuantityPayload({category_approved_quantity:8,row_version,approved_distribution_mode:'CUSTOM',approved_distribution:{}}),/distribution/);
  assert.throws(()=>validateDepartmentApprovedQuantityPayload({category_approved_quantity:8,row_version,approved_distribution_mode:'CUSTOM',approved_distribution:[{period_type:'MONTH',period_no:1}]}),/required/);
});
