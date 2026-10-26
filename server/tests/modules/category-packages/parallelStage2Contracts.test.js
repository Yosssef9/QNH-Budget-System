import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const repo = readFileSync(new URL('../../../modules/category-packages/categoryPackages.repository.js', import.meta.url), 'utf8');
const service = readFileSync(new URL('../../../modules/category-packages/categoryPackages.service.js', import.meta.url), 'utf8');

test('stage 2 demand includes IN_CATEGORY_REVIEW but gates CM approved quantity by completed review', () => {
  const query = repo.slice(repo.indexOf('export async function listPackageItemsRepo'), repo.indexOf('export async function listPackageItemExpenseContributionsRepo'));
  assert.match(query, /dcb\.status IN \('IN_CATEGORY_REVIEW'/);
  assert.match(query, /THEN item\.category_approved_quantity ELSE 0 END/);
  assert.match(query, /AS pending_review_count/);
});

test('department-scoped contributions include submitted pending requests but approved quantities remain gated', () => {
  const query = repo.slice(repo.indexOf('export async function listPackageItemExpenseContributionsRepo'), repo.indexOf('export async function listDepartmentPackageViewRowsRepo'));
  assert.match(query, /item\.requested_quantity/);
  assert.match(query, /item\.review_status AS item_review_status/);
  assert.match(query, /AS approved_quantity/);
});

test('package readiness blocks pending Stage 1 reviews and retains normal validation', () => {
  const functionBody = service.slice(service.indexOf('function buildReadiness('), service.indexOf('async function buildPackageReadiness('));
  assert.match(functionBody, /PACKAGE_DEPARTMENT_REVIEWS_PENDING/);
  assert.match(functionBody, /PACKAGE_SUB_ITEM_PRICE_REQUIRED/);
  assert.match(functionBody, /ITEM_NOT_RECONCILED/);
});

test('allocation endpoint still requires completed department item review', () => {
  const body = service.slice(service.indexOf('export async function replaceDepartmentItemAllocationsService('), service.indexOf('export async function getCategoryPackageReadinessService('));
  assert.match(body, /DEPARTMENT_ITEM_NOT_REVIEWED/);
});
