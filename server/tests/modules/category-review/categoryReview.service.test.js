import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

vi.mock("../../../services/notification.service.js", () => ({
  queueNotification: vi.fn(),
}));

vi.mock("../../../modules/category-review/categoryReview.repository.js", () => ({
  closeSubmissionWindowRepo: vi.fn(),
  countActiveReviewStatusesRepo: vi.fn(),
  createWorkflowHistoryRepo: vi.fn(),
  findDepartmentBudgetItemForReviewRepo: vi.fn(),
  findDepartmentCategoryBudgetForReviewRepo: vi.fn(),
  findDepartmentCategoryReviewReopenContextRepo: vi.fn(),
  findOpenSubmissionWindowForCategoryRepo: vi.fn(),
  listCategoryReviewQueueRepo: vi.fn(),
  listItemsForReviewBudgetRepo: vi.fn(),
  markCategoryBudgetReviewCompletedRepo: vi.fn(),
  markPackageItemNeedsReconciliationRepo: vi.fn(),
  reopenDepartmentCategoryReviewRepo: vi.fn(),
  reopenSubmissionWindowRepo: vi.fn(),
  updateItemReviewDecisionRepo: vi.fn(),
}));

import { queueNotification } from "../../../services/notification.service.js";
import {
  closeSubmissionWindowRepo,
  countActiveReviewStatusesRepo,
  createWorkflowHistoryRepo,
  findDepartmentBudgetItemForReviewRepo,
  findDepartmentCategoryBudgetForReviewRepo,
  findDepartmentCategoryReviewReopenContextRepo,
  findOpenSubmissionWindowForCategoryRepo,
  listCategoryReviewQueueRepo,
  listItemsForReviewBudgetRepo,
  markCategoryBudgetReviewCompletedRepo,
  markPackageItemNeedsReconciliationRepo,
  reopenDepartmentCategoryReviewRepo,
  reopenSubmissionWindowRepo,
  updateItemReviewDecisionRepo,
} from "../../../modules/category-review/categoryReview.repository.js";
import {
  closeCategorySubmissionWindowService,
  completeDepartmentCategoryReviewService,
  decideCategoryReviewItemService,
  listCategoryReviewQueueService,
  reopenCategorySubmissionWindowService,
  reopenDepartmentCategoryReviewService,
} from "../../../modules/category-review/categoryReview.service.js";
import {
  validateItemDecisionPayload,
  validateReopenDepartmentCategoryReviewPayload,
} from "../../../modules/category-review/categoryReview.validators.js";
import { PERMISSION_CODES } from "../../../../shared/permissions/permissionCodes.js";

const categoryAccess = {
  userRoleId: 52,
  workspaceType: "CATEGORY",
  role: { code: "CATEGORY_BUDGET_MANAGER" },
  category: { id: 1, name: "IT" },
  permissionCodes: [
    PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
    PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS,
    PERMISSION_CODES.CONTROL_CATEGORY_SUBMISSION_WINDOW,
  ],
};
const VALID_ROW_VERSION_BUFFER = Buffer.from(
  "0000000000000001",
  "hex",
);

const VALID_ROW_VERSION_BASE64 =
  VALID_ROW_VERSION_BUFFER.toString("base64");
const categoryBudget = {
  id: 100,
  department_budget_id: 50,
  budget_category_id: 1,
  status: "IN_CATEGORY_REVIEW",
  financial_year_id: 9,
  financial_year: 2027,
  financial_year_status: "OPEN",
  department_id: 10,
  department_name: "Information Technology",
  category_name: "IT",
};
const completedCategoryReview = {
  id: 100,
  department_budget_id: 50,
  budget_category_id: 1,
  status: "CATEGORY_REVIEW_COMPLETED",

  financial_year_id: 9,
  financial_year: 2027,
  financial_year_status: "OPEN",

  department_id: 10,
  department_name: "Information Technology",

  category_name: "IT",

  category_review_completed_by: 7,
  category_review_completed_at: new Date(
    "2026-07-05T09:00:00.000Z",
  ),

  category_package_id: 20,
  category_package_status: "DRAFT",

  submitted_to_cfo_by: null,
  submitted_to_cfo_at: null,

  row_version: VALID_ROW_VERSION_BUFFER,
};
const reviewItem = {
  id: 200,
  department_category_budget_id: 100,
  catalog_item_id: 30,
  requested_quantity: 12,
  category_approved_quantity: null,
  review_status: "PENDING_CATEGORY_REVIEW",
  is_active: true,
  category_budget_status: "IN_CATEGORY_REVIEW",
  budget_category_id: 1,
  financial_year_id: 9,
  financial_year: 2027,
  financial_year_status: "OPEN",
  department_id: 10,
  department_name: "Information Technology",
  category_name: "IT",
};
function captureValidationError(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }

  throw new Error(
    "Expected the validator to throw an error",
  );
}
describe("category review service", () => {
beforeEach(() => {
  vi.clearAllMocks();

  listCategoryReviewQueueRepo.mockResolvedValue([]);

  findOpenSubmissionWindowForCategoryRepo.mockResolvedValue({
    id: 900,
    financial_year_id: 9,
    financial_year: 2027,
    financial_year_status: "OPEN",
    budget_category_id: 1,
    category_name: "IT",
    status: "OPEN",
  });

  findDepartmentCategoryBudgetForReviewRepo.mockResolvedValue(
    categoryBudget,
  );

  findDepartmentCategoryReviewReopenContextRepo.mockResolvedValue(
    completedCategoryReview,
  );

  listItemsForReviewBudgetRepo.mockResolvedValue([]);

  findDepartmentBudgetItemForReviewRepo.mockResolvedValue(
    reviewItem,
  );

  updateItemReviewDecisionRepo.mockResolvedValue({
    id: 200,
  });

  markCategoryBudgetReviewCompletedRepo.mockResolvedValue({
    id: 100,
  });

  reopenDepartmentCategoryReviewRepo.mockResolvedValue({
    id: 100,
  });

  markPackageItemNeedsReconciliationRepo.mockResolvedValue(
    undefined,
  );

  countActiveReviewStatusesRepo.mockResolvedValue({
    total_count: 1,
    reviewed_count: 1,
    pending_count: 0,
  });

  createWorkflowHistoryRepo.mockResolvedValue(undefined);
  queueNotification.mockResolvedValue(undefined);
});

  it("lists only the selected category workspace queue", async () => {
    await listCategoryReviewQueueService({ budgetAccess: categoryAccess });

    expect(listCategoryReviewQueueRepo).toHaveBeenCalledWith({
      budgetCategoryId: 1,
    });
  });

  it("rejects non-category workspaces", async () => {
    await expect(
      listCategoryReviewQueueService({
        budgetAccess: {
          ...categoryAccess,
          workspaceType: "DEPARTMENT",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "CATEGORY_WORKSPACE_REQUIRED",
    });
  });

  it("closes the selected category submission window", async () => {
    closeSubmissionWindowRepo.mockResolvedValue({ id: 900 });
    findOpenSubmissionWindowForCategoryRepo
      .mockResolvedValueOnce({
        id: 900,
        financial_year_id: 9,
        financial_year: 2027,
        financial_year_status: "OPEN",
        budget_category_id: 1,
        category_name: "IT",
        status: "OPEN",
      })
      .mockResolvedValueOnce({
        id: 900,
        financial_year_id: 9,
        financial_year: 2027,
        financial_year_status: "OPEN",
        budget_category_id: 1,
        category_name: "IT",
        status: "CLOSED",
      });

    await closeCategorySubmissionWindowService({
      closeReason: "Cutoff reached",
      actorUserId: 7,
      budgetAccess: categoryAccess,
    });

    expect(closeSubmissionWindowRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        window_id: 900,
        actor_user_id: 7,
        close_reason: "Cutoff reached",
      }),
    );
    expect(createWorkflowHistoryRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        entity_type: "CATEGORY_SUBMISSION_WINDOW",
        action: "CATEGORY_SUBMISSION_WINDOW_CLOSED",
        old_status: "OPEN",
        new_status: "CLOSED",
      }),
    );
    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "CATEGORY_SUBMISSION_WINDOW_CLOSED",
        entityType: "CATEGORY_SUBMISSION_WINDOW",
      }),
    );
  });

  it("requires a closed window before reopening", async () => {
    findOpenSubmissionWindowForCategoryRepo.mockResolvedValue({
      id: 900,
      financial_year_id: 9,
      financial_year: 2027,
      financial_year_status: "OPEN",
      budget_category_id: 1,
      category_name: "IT",
      status: "OPEN",
    });

    await expect(
      reopenCategorySubmissionWindowService({
        reopenReason: "Need more corrections",
        actorUserId: 7,
        budgetAccess: categoryAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "CATEGORY_SUBMISSION_WINDOW_ALREADY_OPEN",
    });
  });

  it("reopens a closed selected category submission window with a reason", async () => {
    reopenSubmissionWindowRepo.mockResolvedValue({ id: 900 });
    findOpenSubmissionWindowForCategoryRepo
      .mockResolvedValueOnce({
        id: 900,
        financial_year_id: 9,
        financial_year: 2027,
        financial_year_status: "OPEN",
        budget_category_id: 1,
        category_name: "IT",
        status: "CLOSED",
      })
      .mockResolvedValueOnce({
        id: 900,
        financial_year_id: 9,
        financial_year: 2027,
        financial_year_status: "OPEN",
        budget_category_id: 1,
        category_name: "IT",
        status: "OPEN",
        reopen_reason: "Need more corrections",
      });

    await reopenCategorySubmissionWindowService({
      reopenReason: "Need more corrections",
      actorUserId: 7,
      budgetAccess: categoryAccess,
    });

    expect(reopenSubmissionWindowRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        window_id: 900,
        actor_user_id: 7,
        reopen_reason: "Need more corrections",
      }),
    );
    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "CATEGORY_SUBMISSION_WINDOW_REOPENED",
      }),
    );
  });

  it("blocks window control when financial year is not open", async () => {
    findOpenSubmissionWindowForCategoryRepo.mockResolvedValue({
      id: 900,
      financial_year_id: 9,
      financial_year: 2027,
      financial_year_status: "PRE_CLOSING",
      budget_category_id: 1,
      category_name: "IT",
      status: "OPEN",
    });

    await expect(
      closeCategorySubmissionWindowService({
        closeReason: "",
        actorUserId: 7,
        budgetAccess: categoryAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "FINANCIAL_YEAR_NOT_OPEN",
    });
  });

  it("accepts approved quantity zero as a reviewed item decision", () => {
    expect(
      validateItemDecisionPayload({
        category_approved_quantity: 0,
        review_note: "",
      }),
    ).toEqual({
      category_approved_quantity: 0,
      review_note: null,
    });
  });

  it("saves an item decision with approved quantity and workflow history", async () => {
    await decideCategoryReviewItemService({
      itemId: 200,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        category_approved_quantity: 10,
        review_note: "Approved with adjusted quantity",
      },
    });

    expect(updateItemReviewDecisionRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        item_id: 200,
        category_approved_quantity: 10,
      }),
    );
    expect(createWorkflowHistoryRepo).toHaveBeenCalled();
  });

  it("notifies the affected department when an already-reviewed decision changes", async () => {
    findDepartmentBudgetItemForReviewRepo.mockResolvedValue({
      ...reviewItem,
      review_status: "CATEGORY_REVIEW_COMPLETED",
      category_approved_quantity: 12,
      review_note: "Original decision",
    });

    await decideCategoryReviewItemService({
      itemId: 200,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        category_approved_quantity: 8,
        review_note: "Updated after package review",
      },
    });

    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "DEPARTMENT_BUDGET_APPROVAL_UPDATED",
        payload: expect.objectContaining({
          departmentId: reviewItem.department_id,
          previousApprovedQuantity: 12,
          newApprovedQuantity: 8,
        }),
      }),
    );
  });

  it("blocks completion unless every active item is reviewed", async () => {
    countActiveReviewStatusesRepo.mockResolvedValue({
      total_count: 2,
      reviewed_count: 1,
      pending_count: 1,
    });

    await expect(
      completeDepartmentCategoryReviewService({
        departmentCategoryBudgetId: 100,
        actorUserId: 7,
        budgetAccess: categoryAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "CATEGORY_REVIEW_INCOMPLETE",
    });
  });

  it("completes review when every active item is reviewed", async () => {
    await completeDepartmentCategoryReviewService({
      departmentCategoryBudgetId: 100,
      actorUserId: 7,
      budgetAccess: categoryAccess,
    });

    expect(markCategoryBudgetReviewCompletedRepo).toHaveBeenCalled();
    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "CATEGORY_REVIEW_COMPLETED",
      }),
    );
  });
  describe("return completed department review to In Review", () => {
  it("reopens a completed review without requiring a reason", async () => {
    await reopenDepartmentCategoryReviewService({
      departmentCategoryBudgetId: 100,

      payload: {
        row_version: VALID_ROW_VERSION_BUFFER,
      },

      actorUserId: 7,
      budgetAccess: categoryAccess,
    });

    expect(
      findDepartmentCategoryReviewReopenContextRepo,
    ).toHaveBeenCalledWith(
      100,
      { transaction: true },
    );

    expect(
      reopenDepartmentCategoryReviewRepo,
    ).toHaveBeenCalledWith(
      { transaction: true },
      {
        department_category_budget_id: 100,
        actor_user_id: 7,
        row_version: VALID_ROW_VERSION_BUFFER,
      },
    );

    expect(
      createWorkflowHistoryRepo,
    ).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        entity_type:
          "DEPARTMENT_CATEGORY_BUDGET",

        entity_id: 100,

        action:
          "DEPARTMENT_CATEGORY_REVIEW_REOPENED",

        old_status:
          "CATEGORY_REVIEW_COMPLETED",

        new_status:
          "IN_CATEGORY_REVIEW",

        note:
          "IT review reopened for Information Technology",
      }),
    );
  });

  it("reports a concurrency conflict when row version is stale", async () => {
    reopenDepartmentCategoryReviewRepo.mockResolvedValue(
      null,
    );

    await expect(
      reopenDepartmentCategoryReviewService({
        departmentCategoryBudgetId: 100,

        payload: {
          row_version:
            VALID_ROW_VERSION_BUFFER,
        },

        actorUserId: 7,
        budgetAccess: categoryAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode:
        "CATEGORY_REVIEW_REOPEN_CONFLICT",
    });

    expect(
      createWorkflowHistoryRepo,
    ).not.toHaveBeenCalled();
  });

  it("blocks reopening after package submission to CFO", async () => {
    findDepartmentCategoryReviewReopenContextRepo.mockResolvedValue(
      {
        ...completedCategoryReview,
        category_package_status:
          "IN_CFO_REVIEW",
      },
    );

    await expect(
      reopenDepartmentCategoryReviewService({
        departmentCategoryBudgetId: 100,

        payload: {
          row_version:
            VALID_ROW_VERSION_BUFFER,
        },

        actorUserId: 7,
        budgetAccess: categoryAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode:
        "CATEGORY_PACKAGE_ALREADY_SUBMITTED_TO_CFO",
    });

    expect(
      reopenDepartmentCategoryReviewRepo,
    ).not.toHaveBeenCalled();
  });
});

describe("reopen department review payload validator", () => {
  it("accepts row version without a reopen reason", () => {
    const result =
      validateReopenDepartmentCategoryReviewPayload({
        row_version:
          VALID_ROW_VERSION_BASE64,
      });

    expect(
      Buffer.isBuffer(result.row_version),
    ).toBe(true);

    expect(result.row_version).toEqual(
      VALID_ROW_VERSION_BUFFER,
    );

    expect(result).not.toHaveProperty(
      "reopen_reason",
    );
  });

  it("requires row version", () => {
    const error = captureValidationError(() =>
      validateReopenDepartmentCategoryReviewPayload(
        {},
      ),
    );

    expect(error).toMatchObject({
      statusCode: 400,
      errorCode: "ROW_VERSION_REQUIRED",
    });
  });

  it("rejects malformed row version", () => {
    const error = captureValidationError(() =>
      validateReopenDepartmentCategoryReviewPayload(
        {
          row_version: "AQID",
        },
      ),
    );

    expect(error).toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_ROW_VERSION",
    });
  });
});
});
