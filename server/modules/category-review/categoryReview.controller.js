import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { auditLog } from "../../utils/audit.js";
import {
  closeCategorySubmissionWindowService,
  completeDepartmentCategoryReviewService,
  decideCategoryReviewItemService,
  getCategoryReviewBudgetService,
  getCategorySubmissionWindowService,
  listCategoryReviewQueueService,
  reopenCategorySubmissionWindowService,
  reopenDepartmentCategoryReviewService,
} from "./categoryReview.service.js";
import {
  validateDepartmentBudgetItemId,
  validateDepartmentCategoryBudgetId,
  validateCloseSubmissionWindowPayload,
  validateItemDecisionPayload,
  validateReopenSubmissionWindowPayload,
  validateReopenDepartmentCategoryReviewPayload,
} from "./categoryReview.validators.js";

export const listCategoryReviewQueue = asyncHandler(async (req, res) => {
  const data = await listCategoryReviewQueueService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Category review queue fetched successfully",
      data,
    }),
  );
});

export const getCategoryReviewBudget = asyncHandler(async (req, res) => {
  const departmentCategoryBudgetId = validateDepartmentCategoryBudgetId(
    req.params.departmentCategoryBudgetId,
  );

  const data = await getCategoryReviewBudgetService({
    departmentCategoryBudgetId,
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Category review budget fetched successfully",
      data,
    }),
  );
});

export const getCategorySubmissionWindow = asyncHandler(async (req, res) => {
  const data = await getCategorySubmissionWindowService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Category submission window fetched successfully",
      data,
    }),
  );
});

export const closeCategorySubmissionWindow = asyncHandler(async (req, res) => {
  const payload = validateCloseSubmissionWindowPayload(req.body);

  const data = await closeCategorySubmissionWindowService({
    closeReason: payload.close_reason,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CLOSE_CATEGORY_SUBMISSION_WINDOW",
    entityType: "CATEGORY_SUBMISSION_WINDOW",
    entityId: String(data.id),
    entityName: "Category Submission Window",
    description: "Closed category submission window",
    newValues: payload,
  });

  res.json(
    new ApiResponse({
      message: "Category submission window closed successfully",
      data,
    }),
  );
});

export const reopenCategorySubmissionWindow = asyncHandler(async (req, res) => {
  const payload = validateReopenSubmissionWindowPayload(req.body);

  const data = await reopenCategorySubmissionWindowService({
    reopenReason: payload.reopen_reason,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "REOPEN_CATEGORY_SUBMISSION_WINDOW",
    entityType: "CATEGORY_SUBMISSION_WINDOW",
    entityId: String(data.id),
    entityName: "Category Submission Window",
    description: "Reopened category submission window",
    newValues: payload,
  });

  res.json(
    new ApiResponse({
      message: "Category submission window reopened successfully",
      data,
    }),
  );
});

export const decideCategoryReviewItem = asyncHandler(async (req, res) => {
  const itemId = validateDepartmentBudgetItemId(req.params.itemId);
  const payload = validateItemDecisionPayload(req.body);

  const data = await decideCategoryReviewItemService({
    itemId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CATEGORY_REVIEW_ITEM_DECISION",
    entityType: "DEPARTMENT_CATEGORY_BUDGET_ITEM",
    entityId: String(itemId),
    entityName: "Department Category Budget Item",
    description: "Saved Category Manager item review decision",
    newValues: payload,
  });

  res.json(
    new ApiResponse({
      message: "Item review decision saved successfully",
      data,
    }),
  );
});

export const completeDepartmentCategoryReview = asyncHandler(
  async (req, res) => {
    const departmentCategoryBudgetId = validateDepartmentCategoryBudgetId(
      req.params.departmentCategoryBudgetId,
    );

    const data = await completeDepartmentCategoryReviewService({
      departmentCategoryBudgetId,
      actorUserId: req.user.userId,
      budgetAccess: req.budgetAccess,
    });

    await auditLog(req, {
      action: "COMPLETE_DEPARTMENT_CATEGORY_REVIEW",
      entityType: "DEPARTMENT_CATEGORY_BUDGET",
      entityId: String(departmentCategoryBudgetId),
      entityName: "Department Category Budget",
      description:
        "Completed Category Manager review for department category budget",
      newValues: {
        status: "CATEGORY_REVIEW_COMPLETED",
      },
    });

    res.json(
      new ApiResponse({
        message: "Category review completed successfully",
        data,
      }),
    );
  },
);
export const reopenDepartmentCategoryReview = asyncHandler(
  async (req, res) => {
    const departmentCategoryBudgetId =
      validateDepartmentCategoryBudgetId(
        req.params.departmentCategoryBudgetId,
      );

    const payload =
      validateReopenDepartmentCategoryReviewPayload(
        req.body,
      );

    const data =
      await reopenDepartmentCategoryReviewService({
        departmentCategoryBudgetId,
        payload,
        actorUserId: req.user.userId,
        budgetAccess: req.budgetAccess,
      });

    await auditLog(req, {
      action:
        "REOPEN_DEPARTMENT_CATEGORY_REVIEW",
      entityType:
        "DEPARTMENT_CATEGORY_BUDGET",
      entityId: String(
        departmentCategoryBudgetId,
      ),
      entityName:
        "Department Category Budget",
      description:
        "Returned completed department category review to In Review",
      oldValues: {
        status:
          "CATEGORY_REVIEW_COMPLETED",
      },
      newValues: {
        status: "IN_CATEGORY_REVIEW",
      },
    });

    res.json(
      new ApiResponse({
        message:
          "Department category review returned to In Review successfully",
        data,
      }),
    );
  },
);
