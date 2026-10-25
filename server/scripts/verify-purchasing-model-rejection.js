/** Fast contract checks without SQL or React dependencies. Execute: node scripts/verify-purchasing-model-rejection.js */
import assert from "node:assert/strict";
import { validateRejectModelsPayload } from "../modules/purchasing-price-review/purchasingPriceReview.validators.js";
import { hasPurchasingEligibleModelSql, isPurchasingModelIncludedSql } from "../modules/category-packages/purchasingExclusion.sql.js";
import { getCfoPackageEligibility } from "../../client/src/components/cfo-package-review/cfoTableSelectors.js";

const rv = Buffer.alloc(8, 1).toString("base64");
let assertions = 0;
function check(fn) { fn(); assertions += 1; }
function fails(body, code) {
  check(() => assert.throws(() => validateRejectModelsPayload(body), (error) => error.errorCode === code));
}
const valid = { row_version: rv, reason: "Rejected after Purchasing review",
  models: [{ package_sub_item_id: 15, row_version: rv }, { package_sub_item_id: 9, row_version: rv }] };
check(() => assert.deepEqual(validateRejectModelsPayload(valid).models.map((model) => model.package_sub_item_id), [9, 15]));
check(() => assert.equal(validateRejectModelsPayload(valid).reason, valid.reason));
fails({ ...valid, reason: "  " }, "PURCHASING_REJECTION_REASON_REQUIRED");
fails({ ...valid, reason: "x".repeat(1001) }, "PURCHASING_REJECTION_REASON_REQUIRED");
fails({ ...valid, models: [] }, "PURCHASING_REJECT_MODELS_REQUIRED");
fails({ ...valid, models: [valid.models[0], valid.models[0]] }, "PURCHASING_REJECT_DUPLICATE_MODEL");
fails({ ...valid, models: [{ package_sub_item_id: -1, row_version: rv }] }, "INVALID_ID");
fails({ ...valid, models: [{ package_sub_item_id: 1, row_version: "invalid" }] }, "INVALID_ROW_VERSION");
check(() => assert.match(isPurchasingModelIncludedSql("subItem"), /status = 'ACCEPTED'/));
check(() => assert.match(hasPurchasingEligibleModelSql("packageItem"), /quantity > 0/));
const flags = { canDecide: true, readOnly: false, finalized: false };
check(() => assert.equal(getCfoPackageEligibility({ status: "IN_CFO_REVIEW", items: [], purchasing_rejected_count: 2 }, flags).canComplete, true));
check(() => assert.equal(getCfoPackageEligibility({ status: "IN_CFO_REVIEW", items: [], purchasing_rejected_count: 0 }, flags).canComplete, false));
check(() => assert.equal(getCfoPackageEligibility({ status: "IN_CFO_REVIEW", items: [{ cfo_review_status: "CFO_ACCEPTED" }] }, flags).canComplete, true));
check(() => assert.equal(getCfoPackageEligibility({ status: "IN_CFO_REVIEW", items: [{ cfo_review_status: "PENDING_CFO_REVIEW" }] }, flags).canComplete, false));
check(() => assert.equal(getCfoPackageEligibility({ status: "IN_CFO_REVIEW", items: [], purchasing_rejected_count: 2 }, { ...flags, readOnly: true }).canComplete, false));
console.log(`Purchasing model rejection: ${assertions} contract assertions passed.`);
