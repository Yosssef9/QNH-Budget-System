import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

vi.mock(
  "../../../modules/category-packages/categoryPackages.repository.js",
  () => ({
    createPackageSubItemAttachmentRepo: vi.fn(),
    createWorkflowHistoryRepo: vi.fn(),
    deactivatePackageSubItemAttachmentRepo: vi.fn(),
    findPackageAttachmentContextRepo: vi.fn(),
    findPackageContextBySubItemRepo: vi.fn(),
    listPackageSubItemAttachmentsRepo: vi.fn(),
    listPackageSubItemPriceHistoryRepo: vi.fn(),
  }),
);

vi.mock(
  "../../../modules/purchasing-price-review/purchasingPriceReview.repository.js",
  () => ({
    acceptAllPurchasingPricesRepo: vi.fn(),
    acceptPurchasingPriceRepo: vi.fn(),
    findCurrentPriceReviewRepo: vi.fn(),
    findPurchasingPackageRepo: vi.fn(),
    getPurchasingSubmissionReadinessRepo: vi.fn(),
    listPurchasingFinancialYearsRepo: vi.fn(),
    listPurchasingPackageDetailRowsRepo: vi.fn(),
    listPurchasingPackagesRepo: vi.fn(),
    reopenPurchasingPriceRepo: vi.fn(),
    submitPurchasingPackageToCfoRepo: vi.fn(),
    touchPurchasingPackageRepo: vi.fn(),
    updatePurchasingPriceRepo: vi.fn(),
  }),
);

import { PERMISSION_CODES } from "../../../../shared/permissions/permissionCodes.js";
import {
  acceptPurchasingPriceService,
  savePurchasingPricesService,
  savePurchasingPriceService,
  submitPurchasingPackageToCfoService,
} from "../../../modules/purchasing-price-review/purchasingPriceReview.service.js";
import {
  acceptPurchasingPriceRepo,
  findCurrentPriceReviewRepo,
  findPurchasingPackageRepo,
  getPurchasingSubmissionReadinessRepo,
  listPurchasingPackageDetailRowsRepo,
  submitPurchasingPackageToCfoRepo,
  updatePurchasingPriceRepo,
} from "../../../modules/purchasing-price-review/purchasingPriceReview.repository.js";

const purchasingAccess = {
  userRoleId: 80,
  workspaceType: "GLOBAL",
  role: { code: "PURCHASING_PRICE_REVIEWER" },
  permissionCodes: [
    PERMISSION_CODES.VIEW_PURCHASING_PRICE_REVIEWS,
    PERMISSION_CODES.REVIEW_CATEGORY_PACKAGE_PRICES,
    PERMISSION_CODES.SUBMIT_PRICED_CATEGORY_PACKAGES_TO_CFO,
  ],
};

const packageRow = {
  id: 300,
  financial_year_id: 9,
  financial_year: 2027,
  financial_year_status: "OPEN",
  budget_category_id: 1,
  category_code: "IT",
  category_name: "IT",
  status: "IN_PURCHASING_REVIEW",
  purchasing_review_round: 2,
  total_price_count: 1,
  pending_price_count: 1,
  accepted_price_count: 0,
  row_version: "AAAAAAAAAAE=",
};

const pendingReview = {
  id: 500,
  category_budget_package_id: 300,
  category_budget_package_sub_item_id: 600,
  package_item_id: 400,
  financial_year_id: 9,
  package_status: "IN_PURCHASING_REVIEW",
  review_round: 2,
  purchasing_unit_price: 450,
  status: "PENDING",
  decision_source: "MANUAL",
  cfo_review_status: "NEEDS_MODIFICATION",
  row_version: "AAAAAAAAAAI=",
};

describe("Purchasing price review service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findPurchasingPackageRepo.mockResolvedValue(packageRow);
    listPurchasingPackageDetailRowsRepo.mockResolvedValue([]);
    findCurrentPriceReviewRepo.mockResolvedValue(pendingReview);
  });

  it("saves a pending Purchasing price without changing the effective package price", async () => {
    updatePurchasingPriceRepo.mockResolvedValue({
      ...pendingReview,
      purchasing_unit_price: 425,
    });

    await savePurchasingPriceService({
      packageId: 300,
      packageSubItemId: 600,
      payload: {
        purchasing_unit_price: 425,
        row_version: Buffer.from("0000000000000002", "hex"),
      },
      actorUserId: 7,
      budgetAccess: purchasingAccess,
    });

    expect(updatePurchasingPriceRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({ purchasing_unit_price: 425 }),
    );
    expect(submitPurchasingPackageToCfoRepo).not.toHaveBeenCalled();
  });

  it("saves multiple changed prices in one transaction", async () => {
    updatePurchasingPriceRepo.mockResolvedValue({
      ...pendingReview,
      purchasing_unit_price: 425,
    });

    await savePurchasingPricesService({
      packageId: 300,
      payload: {
        row_version: Buffer.from("0000000000000001", "hex"),
        prices: [
          {
            package_sub_item_id: 600,
            purchasing_unit_price: 425,
            row_version: Buffer.from("0000000000000002", "hex"),
          },
        ],
      },
      actorUserId: 7,
      budgetAccess: purchasingAccess,
    });

    expect(updatePurchasingPriceRepo).toHaveBeenCalledTimes(1);
    expect(updatePurchasingPriceRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({ purchasing_unit_price: 425 }),
    );
  });

  it("allows a carried-forward price to be reopened when its CFO item needs modification", async () => {
    findCurrentPriceReviewRepo.mockResolvedValue({
      ...pendingReview,
      status: "ACCEPTED",
      decision_source: "CARRIED_FORWARD",
    });
    updatePurchasingPriceRepo.mockResolvedValue({
      ...pendingReview,
      purchasing_unit_price: 400,
    });

    await savePurchasingPriceService({
      packageId: 300,
      packageSubItemId: 600,
      payload: {
        purchasing_unit_price: 400,
        row_version: Buffer.from("0000000000000002", "hex"),
      },
      actorUserId: 7,
      budgetAccess: purchasingAccess,
    });

    expect(updatePurchasingPriceRepo).toHaveBeenCalled();
  });

  it("accepts a pending price", async () => {
    acceptPurchasingPriceRepo.mockResolvedValue({
      ...pendingReview,
      status: "ACCEPTED",
    });

    await acceptPurchasingPriceService({
      packageId: 300,
      packageSubItemId: 600,
      payload: { row_version: Buffer.from("0000000000000002", "hex") },
      actorUserId: 7,
      budgetAccess: purchasingAccess,
    });

    expect(acceptPurchasingPriceRepo).toHaveBeenCalled();
  });

  it("blocks CFO submission while any current-round price is pending", async () => {
    getPurchasingSubmissionReadinessRepo.mockResolvedValue({
      total_price_count: 2,
      pending_price_count: 1,
      invalid_price_count: 0,
    });

    await expect(
      submitPurchasingPackageToCfoService({
        packageId: 300,
        payload: {
          row_version: Buffer.from("0000000000000001", "hex"),
          note: null,
        },
        actorUserId: 7,
        budgetAccess: purchasingAccess,
      }),
    ).rejects.toMatchObject({ errorCode: "PURCHASING_PRICES_NOT_READY" });

    expect(submitPurchasingPackageToCfoRepo).not.toHaveBeenCalled();
  });

  it("submits accepted current-round prices as the effective CFO prices", async () => {
    getPurchasingSubmissionReadinessRepo.mockResolvedValue({
      total_price_count: 2,
      pending_price_count: 0,
      invalid_price_count: 0,
    });
    submitPurchasingPackageToCfoRepo.mockResolvedValue({ id: 300 });

    await submitPurchasingPackageToCfoService({
      packageId: 300,
      payload: {
        row_version: Buffer.from("0000000000000001", "hex"),
        note: null,
      },
      actorUserId: 7,
      budgetAccess: purchasingAccess,
    });

    expect(submitPurchasingPackageToCfoRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({ package_id: 300, review_round: 2 }),
    );
  });
});
