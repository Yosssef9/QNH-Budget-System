/** No SQL connection or dependencies. Contract checks for the decision safety boundaries. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { isPurchasingModelIncludedSql, hasPurchasingEligibleModelSql } from '../modules/category-packages/purchasingExclusion.sql.js';
const base = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = path => readFileSync(resolve(base, path), 'utf8');
let checks = 0;
function check(f) { f(); checks++; }
check(() => assert.match(isPurchasingModelIncludedSql('model'), /review_round/));
check(() => assert.match(isPurchasingModelIncludedSql('model'), /status = 'ACCEPTED'/));
check(() => assert.doesNotMatch(isPurchasingModelIncludedSql('model'), /NOT EXISTS/));
check(() => assert.match(hasPurchasingEligibleModelSql('item'), /eligibleSubItem\.is_active = 1/));
check(() => assert.match(src('modules/po-linking/poLinking.service.js'), /PO_LINK_PURCHASING_MODEL_NOT_ACCEPTED/g));
check(() => assert.match(src('modules/po-linking/poLinking.repository.js'), /decision\.status = 'ACCEPTED'/));
check(() => assert.match(src('modules/transfers/transfers.service.js'), /TRANSFER_MODEL_NOT_ACCEPTED_BY_PURCHASING/));
check(() => assert.match(src('modules/category-packages/categoryPackages.service.js'), /PURCHASING_REJECTED_MODEL_ALLOCATION_LOCKED/));
check(() => assert.match(src('modules/category-packages/categoryPackages.service.js'), /reduceRejectedAllocationRepo/));
check(() => assert.match(src('modules/category-packages/categoryPackages.repository.js'), /currentDecision\.rejection_reason AS purchasing_rejection_reason/));
check(() => assert.match(src('modules/purchasing-price-review/purchasingPriceReview.service.js'), /allocations: originalAllocations/));
check(() => assert.match(src('modules/budget-exclusions/budgetExclusions.repository.js'), /hist\.old_values_json, hist\.new_values_json/));
check(() => assert.match(src('repositories/dashboard.repository.js'), /purchasing_accepted_total_amount/));
console.log(`Purchasing decision integrity: ${checks} contract assertions passed.`);
