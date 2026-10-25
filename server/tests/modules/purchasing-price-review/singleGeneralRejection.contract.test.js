import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../../../../", import.meta.url);
const source = (file) => readFileSync(new URL(file, root), "utf8");
const packages = source("server/modules/category-packages/categoryPackages.repository.js");
const packageService = source("server/modules/category-packages/categoryPackages.service.js");
const purchasing = source("server/modules/purchasing-price-review/purchasingPriceReview.repository.js");
const purchasingService = source("server/modules/purchasing-price-review/purchasingPriceReview.service.js");
const validators = source("server/modules/purchasing-price-review/purchasingPriceReview.validators.js");
const exclusion = source("server/modules/budget-exclusions/budgetExclusions.repository.js");
const allocationUI = source("client/src/components/category-packages/CategoryPackageWorkbench.jsx");
const purchasingUI = source("client/src/pages/purchasing-price-review/PurchasingPriceReviewPage.jsx");

test("single-General detection excludes any item with multiple active models", () => {
  assert.match(packages, /is_single_general/);
  assert.match(packages, /UPPER\(LTRIM\(RTRIM\(subItem.name\)\)\) = 'GENERAL'/);
  assert.match(packages, /COUNT\(\*\) FROM dbo\.BS_category_budget_package_sub_items AS sibling/);
});
test("rejected General cannot be released by a CFO-returned allocation", () => {
  assert.match(packageService, /isAuthorizedRelease = !isSingleGeneral/);
  assert.match(packageService, /The only General model was rejected by Purchasing/);
});
test("single rejected General cannot be bypassed by adding a replacement model", () => {
  assert.match(packageService, /findRejectedSingleGeneralForPackageItemRepo\(transaction, packageItemId\)/);
  assert.match(packageService, /CM cannot add a replacement model until Purchasing reinstates/);
  assert.match(packages, /findRejectedSingleGeneralForPackageItemRepo/);
  assert.match(allocationUI, /fullyRejectedGeneral/);
});
test("rejected General locks approved quantity and period distribution changes", () => {
  assert.match(packageService, /findRejectedSingleGeneralForDepartmentItemRepo\(transaction, departmentItemId, context.package_id\)/);
  assert.match(packageService, /PURCHASING_REJECTED_GENERAL_LOCKED/);
});
test("a newer rejection is carried forward instead of a historical acceptance", () => {
  assert.match(packages, /latestDecision.status = 'REJECTED'[\s\S]*?THEN 'REJECTED'/);
  assert.match(packages, /latestDecision.rejection_reason ELSE NULL/);
  const roundCreation = packages.slice(packages.indexOf("export async function markPackageSubmittedToPurchasingRepo"));
  assert.doesNotMatch(roundCreation, /AND review.status = 'ACCEPTED'\s+ORDER BY review.review_round DESC/);
});
test("carry-forward accepts only the latest decision and unchanged quantity", () => {
  assert.match(packages, /latestDecision.status = 'ACCEPTED'/);
  assert.match(packages, /latestDecision.quantity_snapshot = COALESCE\(subItem.quantity, 0\)/);
  assert.match(packages, /updated.old_status = '\$\{CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO\}'/);
});
test("returned categories keep all current items in the new Purchasing round", () => {
  assert.doesNotMatch(packages, /updated.old_status = '\$\{CATEGORY_PACKAGE_STATUS.DRAFT\}'\s+OR packageItem.cfo_review_status/);
});
test("reinstatement requires a new reason rather than reusing the old reason", () => {
  assert.match(validators, /PURCHASING_REINSTATEMENT_REASON_REQUIRED/);
  assert.match(purchasingService, /old_status: "REJECTED", new_status: "PENDING", note: payload.reason/);
  assert.match(purchasingService, /reinstatementReason: payload.reason/);
});
test("post-CFO correction is Purchasing-only and guarded against completed CFO decisions", () => {
  assert.match(purchasingService, /PURCHASING_PRICE_REVIEW_PERMISSIONS.SUBMIT/);
  assert.match(purchasing, /pkg.status = '\$\{CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW\}'/);
  assert.match(purchasing, /item.cfo_review_status NOT IN/);
  assert.match(purchasingService, /PURCHASING_POST_CFO_CORRECTION_BLOCKED/);
});
test("post-CFO correction never invents a new accepted decision", () => {
  assert.match(purchasing, /status = 'PENDING',[\s\S]*?WHERE id = @reviewId/);
  assert.match(purchasing, /submitted_to_cfo_at = NULL/);
});
test("fully rejected General clears stale CFO modification when submitted", () => {
  assert.match(purchasing, /rejectedReview.status = 'REJECTED'/);
  assert.match(purchasingService, /resetCfoStatusForRejectedSingleGeneralRepo\(transaction/);
  assert.match(purchasing, /THEN '\$\{CATEGORY_PACKAGE_ITEM_CFO_STATUS.PENDING_CFO_REVIEW\}'/);
});
test("current-round draft rejection is not published to other roles", () => {
  assert.match(exclusion, /pkg.status <> 'IN_PURCHASING_REVIEW' AND pkg.submitted_to_cfo_at IS NOT NULL/);
  assert.match(exclusion, /review.decision_source = 'CARRIED_FORWARD'/);
});
test("CM allocation shows rejection, accepted quantities and locks one General", () => {
  assert.match(allocationUI, /isRejectedSingleGeneral/);
  assert.match(allocationUI, /Purchasing excluded:/);
  assert.match(allocationUI, /Purchasing accepted:/);
  assert.match(allocationUI, /isRejectedSingleGeneral \|\|/);
});
test("Purchasing UI requires an entered reason for reinstatement", () => {
  assert.match(purchasingUI, /PurchasingReinstateDialog/);
  assert.match(purchasingUI, /payload: \{ row_version: row.row_version, reason \}/);
});
