import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import { hasPermission } from "../../../shared/permissions/permissionCodes.js";
import {
  CATEGORY_REVIEW_PERMISSIONS,
  CATEGORY_REVIEW_ROLE_CODES,
  CATEGORY_REVIEW_WORKFLOW_ACTIONS,
  CATEGORY_SUBMISSION_WINDOW_STATUS,
  DEPARTMENT_BUDGET_ITEM_STATUS,
  DEPARTMENT_CATEGORY_BUDGET_STATUS,
  CATEGORY_BUDGET_PACKAGE_STATUS,
} from "./categoryReview.constants.js";
import {
  closeSubmissionWindowRepo,
  countActiveReviewStatusesRepo,
  createWorkflowHistoryRepo,
  findDepartmentBudgetItemForReviewRepo,
  findDepartmentCategoryBudgetForReviewRepo,
  findOpenSubmissionWindowForCategoryRepo,
  listCategoryReviewQueueRepo,
  listItemsForReviewBudgetRepo,
  markCategoryBudgetReviewCompletedRepo,
  reopenSubmissionWindowRepo,
  updateItemReviewDecisionRepo,
  findDepartmentCategoryReviewReopenContextRepo,
  reopenDepartmentCategoryReviewRepo,
  markPackageItemNeedsReconciliationRepo,
} from "./categoryReview.repository.js";
import {
  mapCategoryReviewDetail,
  mapReviewQueue,
} from "./categoryReview.mapper.js";

function getUserRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getActingWorkspace(budgetAccess) {
  return budgetAccess?.workspaceType ?? budgetAccess?.type ?? null;
}

function getWorkspaceCategoryId(budgetAccess) {
  return (
    budgetAccess?.category?.id ??
    budgetAccess?.budgetCategory?.id ??
    budgetAccess?.budget_category_id ??
    null
  );
}

function assertCategoryWorkspace(budgetAccess) {
  const workspaceType = budgetAccess?.workspaceType ?? budgetAccess?.type;
  const roleCode = budgetAccess?.role?.code ?? budgetAccess?.role_code;
  const categoryId = getWorkspaceCategoryId(budgetAccess);

  if (workspaceType !== "CATEGORY") {
    throw new ApiError(
      403,
      "Select a category workspace to review department category budgets",
      "CATEGORY_WORKSPACE_REQUIRED",
    );
  }

  if (!CATEGORY_REVIEW_ROLE_CODES.includes(roleCode) || !categoryId) {
    throw new ApiError(
      403,
      "The active workspace is not assigned to a budget category",
      "CATEGORY_SCOPE_REQUIRED",
    );
  }

  return Number(categoryId);
}

function assertViewPermission(budgetAccess) {
  if (!hasPermission(budgetAccess, CATEGORY_REVIEW_PERMISSIONS.VIEW)) {
    throw new ApiError(
      403,
      "You do not have permission to view category budget requests",
      "CATEGORY_REVIEW_VIEW_DENIED",
    );
  }
}

function assertReviewPermission(budgetAccess) {
  if (!hasPermission(budgetAccess, CATEGORY_REVIEW_PERMISSIONS.REVIEW)) {
    throw new ApiError(
      403,
      "You do not have permission to review department category requests",
      "CATEGORY_REVIEW_DECISION_DENIED",
    );
  }
}

function assertWindowPermission(budgetAccess) {
  if (
    !hasPermission(budgetAccess, CATEGORY_REVIEW_PERMISSIONS.CONTROL_WINDOW)
  ) {
    throw new ApiError(
      403,
      "You do not have permission to control category submission windows",
      "CATEGORY_SUBMISSION_WINDOW_CONTROL_DENIED",
    );
  }
}

function assertCategoryScope(record, budgetCategoryId) {
  if (!record) {
    throw new ApiError(
      404,
      "Department category budget not found",
      "DEPARTMENT_CATEGORY_BUDGET_NOT_FOUND",
    );
  }

  if (Number(record.budget_category_id) !== Number(budgetCategoryId)) {
    throw new ApiError(
      403,
      "You cannot access another category workspace",
      "CATEGORY_SCOPE_DENIED",
    );
  }
}

function assertReviewableHeader(categoryBudget) {
  if (categoryBudget.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Category review is only allowed while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (
    categoryBudget.status !==
    DEPARTMENT_CATEGORY_BUDGET_STATUS.IN_CATEGORY_REVIEW
  ) {
    throw new ApiError(
      400,
      "Only category budgets in category review can be updated",
      "CATEGORY_BUDGET_NOT_IN_REVIEW",
    );
  }
}

function normalizeCounts(counts) {
  return {
    total: Number(counts?.total_count || 0),
    reviewed: Number(counts?.reviewed_count || 0),
    pending: Number(counts?.pending_count || 0),
  };
}

function normalizeNote(value) {
  return String(value || "").trim();
}

function quantityChanged(left, right) {
  const leftValue = Number(left ?? 0);
  const rightValue = Number(right ?? 0);

  return Math.round(leftValue * 10000) !== Math.round(rightValue * 10000);
}

async function buildDetail(departmentCategoryBudgetId, transaction = null) {
  const budget = await findDepartmentCategoryBudgetForReviewRepo(
    departmentCategoryBudgetId,
    transaction,
  );

  const itemRows = budget
    ? await listItemsForReviewBudgetRepo(
        departmentCategoryBudgetId,
        transaction,
      )
    : [];

  return mapCategoryReviewDetail({
    budget,
    itemRows,
  });
}

export async function listCategoryReviewQueueService({ budgetAccess }) {
  assertViewPermission(budgetAccess);

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const [rows, window] = await Promise.all([
    listCategoryReviewQueueRepo({
      budgetCategoryId,
    }),
    findOpenSubmissionWindowForCategoryRepo({
      budgetCategoryId,
    }),
  ]);

  return mapReviewQueue({
    rows,
    window,
  });
}

export async function getCategorySubmissionWindowService({ budgetAccess }) {
  assertViewPermission(budgetAccess);

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const window = await findOpenSubmissionWindowForCategoryRepo({
    budgetCategoryId,
  });

  if (!window) {
    throw new ApiError(
      404,
      "No active financial-year submission window was found for this category",
      "CATEGORY_SUBMISSION_WINDOW_NOT_FOUND",
    );
  }

  return mapReviewQueue({
    rows: [],
    window,
  }).submissionWindow;
}

export async function closeCategorySubmissionWindowService({
  closeReason,
  actorUserId,
  budgetAccess,
}) {
  assertWindowPermission(budgetAccess);

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const closed = await withTransaction(async (transaction) => {
    const window = await findOpenSubmissionWindowForCategoryRepo(
      {
        budgetCategoryId,
      },
      transaction,
    );

    if (!window) {
      throw new ApiError(
        404,
        "No active financial-year submission window was found for this category",
        "CATEGORY_SUBMISSION_WINDOW_NOT_FOUND",
      );
    }

    if (window.financial_year_status !== "OPEN") {
      throw new ApiError(
        400,
        "Submission windows can only be controlled while the financial year is OPEN",
        "FINANCIAL_YEAR_NOT_OPEN",
      );
    }

    if (window.status !== CATEGORY_SUBMISSION_WINDOW_STATUS.OPEN) {
      throw new ApiError(
        409,
        "This category submission window is already closed",
        "CATEGORY_SUBMISSION_WINDOW_ALREADY_CLOSED",
      );
    }

    const updated = await closeSubmissionWindowRepo(transaction, {
      window_id: window.id,
      actor_user_id: actorUserId,
      close_reason: closeReason,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "The submission window status changed before it could be closed",
        "CATEGORY_SUBMISSION_WINDOW_CLOSE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: window.financial_year_id,
      entity_type: "CATEGORY_SUBMISSION_WINDOW",
      entity_id: window.id,
      action: CATEGORY_REVIEW_WORKFLOW_ACTIONS.SUBMISSION_WINDOW_CLOSED,
      old_status: window.status,
      new_status: CATEGORY_SUBMISSION_WINDOW_STATUS.CLOSED,
      note: closeReason,
      new_values_json: JSON.stringify({
        categoryId: window.budget_category_id,
        categoryName: window.category_name,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    const latestWindow = await findOpenSubmissionWindowForCategoryRepo(
      {
        budgetCategoryId,
      },
      transaction,
    );

    return latestWindow;
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_SUBMISSION_WINDOW_CLOSED,
    entityType: "CATEGORY_SUBMISSION_WINDOW",
    entityId: closed.id,
    payload: {
      categoryId: closed.budget_category_id,
      categoryName: closed.category_name,
      financialYear: closed.financial_year,
      status: CATEGORY_SUBMISSION_WINDOW_STATUS.CLOSED,
      reason: closeReason,
      actorUserId,
    },
  });

  return mapReviewQueue({
    rows: [],
    window: closed,
  }).submissionWindow;
}

export async function reopenCategorySubmissionWindowService({
  reopenReason,
  actorUserId,
  budgetAccess,
}) {
  assertWindowPermission(budgetAccess);

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const reopened = await withTransaction(async (transaction) => {
    const window = await findOpenSubmissionWindowForCategoryRepo(
      {
        budgetCategoryId,
      },
      transaction,
    );

    if (!window) {
      throw new ApiError(
        404,
        "No active financial-year submission window was found for this category",
        "CATEGORY_SUBMISSION_WINDOW_NOT_FOUND",
      );
    }

    if (window.financial_year_status !== "OPEN") {
      throw new ApiError(
        400,
        "Submission windows can only be controlled while the financial year is OPEN",
        "FINANCIAL_YEAR_NOT_OPEN",
      );
    }

    if (window.status !== CATEGORY_SUBMISSION_WINDOW_STATUS.CLOSED) {
      throw new ApiError(
        409,
        "This category submission window is already open",
        "CATEGORY_SUBMISSION_WINDOW_ALREADY_OPEN",
      );
    }

    const updated = await reopenSubmissionWindowRepo(transaction, {
      window_id: window.id,
      actor_user_id: actorUserId,
      reopen_reason: reopenReason,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "The submission window status changed before it could be reopened",
        "CATEGORY_SUBMISSION_WINDOW_REOPEN_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: window.financial_year_id,
      entity_type: "CATEGORY_SUBMISSION_WINDOW",
      entity_id: window.id,
      action: CATEGORY_REVIEW_WORKFLOW_ACTIONS.SUBMISSION_WINDOW_REOPENED,
      old_status: window.status,
      new_status: CATEGORY_SUBMISSION_WINDOW_STATUS.OPEN,
      note: reopenReason,
      new_values_json: JSON.stringify({
        categoryId: window.budget_category_id,
        categoryName: window.category_name,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    const latestWindow = await findOpenSubmissionWindowForCategoryRepo(
      {
        budgetCategoryId,
      },
      transaction,
    );

    return latestWindow;
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_SUBMISSION_WINDOW_REOPENED,
    entityType: "CATEGORY_SUBMISSION_WINDOW",
    entityId: reopened.id,
    payload: {
      categoryId: reopened.budget_category_id,
      categoryName: reopened.category_name,
      financialYear: reopened.financial_year,
      status: CATEGORY_SUBMISSION_WINDOW_STATUS.OPEN,
      reason: reopenReason,
      actorUserId,
    },
  });

  return mapReviewQueue({
    rows: [],
    window: reopened,
  }).submissionWindow;
}

export async function getCategoryReviewBudgetService({
  departmentCategoryBudgetId,
  budgetAccess,
}) {
  assertViewPermission(budgetAccess);

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const budget = await findDepartmentCategoryBudgetForReviewRepo(
    departmentCategoryBudgetId,
  );

  assertCategoryScope(budget, budgetCategoryId);

  return buildDetail(departmentCategoryBudgetId);
}

export async function decideCategoryReviewItemService({
  itemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertReviewPermission(budgetAccess);

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);
  let approvalUpdateNotification = null;

  const detail = await withTransaction(async (transaction) => {
    const item = await findDepartmentBudgetItemForReviewRepo(
      itemId,
      transaction,
    );

    if (!item || !item.is_active) {
      throw new ApiError(
        404,
        "Department budget item not found",
        "DEPARTMENT_BUDGET_ITEM_NOT_FOUND",
      );
    }

    assertCategoryScope(item, budgetCategoryId);

    assertReviewableHeader({
      status: item.category_budget_status,
      financial_year_status: item.financial_year_status,
    });

    const approvedQuantity =
      payload.category_approved_quantity === null
        ? Number(item.requested_quantity || 0)
        : payload.category_approved_quantity;

    const updated = await updateItemReviewDecisionRepo(transaction, {
      item_id: itemId,
      category_approved_quantity: approvedQuantity,
      review_note: payload.review_note,
      actor_user_id: actorUserId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "The item review state changed before the decision was saved",
        "CATEGORY_REVIEW_ITEM_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: item.financial_year_id,
      entity_type: "DEPARTMENT_CATEGORY_BUDGET_ITEM",
      entity_id: itemId,
      action:
        item.review_status ===
        DEPARTMENT_BUDGET_ITEM_STATUS.CATEGORY_REVIEW_COMPLETED
          ? CATEGORY_REVIEW_WORKFLOW_ACTIONS.ITEM_DECISION_UPDATED
          : CATEGORY_REVIEW_WORKFLOW_ACTIONS.ITEM_REVIEWED,
      old_status: item.review_status,
      new_status: DEPARTMENT_BUDGET_ITEM_STATUS.CATEGORY_REVIEW_COMPLETED,
      note: payload.review_note,
      old_values_json: JSON.stringify({
        categoryApprovedQuantity: item.category_approved_quantity,
      }),
      new_values_json: JSON.stringify({
        categoryApprovedQuantity: approvedQuantity,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    if (
      item.review_status ===
        DEPARTMENT_BUDGET_ITEM_STATUS.CATEGORY_REVIEW_COMPLETED &&
      (quantityChanged(item.category_approved_quantity, approvedQuantity) ||
        normalizeNote(item.review_note) !== normalizeNote(payload.review_note))
    ) {
      approvalUpdateNotification = {
        notificationType: NOTIFICATION_TYPES.DEPARTMENT_BUDGET_APPROVAL_UPDATED,
        entityType: "DEPARTMENT_CATEGORY_BUDGET_ITEM",
        entityId: itemId,
        payload: {
          departmentCategoryBudgetId: item.department_category_budget_id,
          departmentBudgetItemId: itemId,
          departmentId: item.department_id,
          departmentName: item.department_name,
          categoryId: item.budget_category_id,
          categoryName: item.category_name,
          itemName: item.catalog_item_name,
          requestedQuantity: item.requested_quantity,
          previousApprovedQuantity: item.category_approved_quantity,
          newApprovedQuantity: approvedQuantity,
          reviewNote: payload.review_note,
          financialYear: item.financial_year,
          actorUserId,
        },
      };
    }

    return buildDetail(item.department_category_budget_id, transaction);
  });

  if (approvalUpdateNotification) {
    await queueNotification(approvalUpdateNotification);
  }

  return detail;
}

export async function completeDepartmentCategoryReviewService({
  departmentCategoryBudgetId,
  actorUserId,
  budgetAccess,
}) {
  assertReviewPermission(budgetAccess);

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const completed = await withTransaction(async (transaction) => {
    const budget = await findDepartmentCategoryBudgetForReviewRepo(
      departmentCategoryBudgetId,
      transaction,
    );

    assertCategoryScope(budget, budgetCategoryId);
    assertReviewableHeader(budget);

    const counts = normalizeCounts(
      await countActiveReviewStatusesRepo(
        departmentCategoryBudgetId,
        transaction,
      ),
    );

    if (counts.total === 0 || counts.reviewed !== counts.total) {
      throw new ApiError(
        400,
        "Every active item must be reviewed before completing category review",
        "CATEGORY_REVIEW_INCOMPLETE",
        counts,
      );
    }

    const updated = await markCategoryBudgetReviewCompletedRepo(transaction, {
      department_category_budget_id: departmentCategoryBudgetId,
      actor_user_id: actorUserId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "The category budget status changed before review completion",
        "CATEGORY_REVIEW_COMPLETE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: budget.financial_year_id,
      entity_type: "DEPARTMENT_CATEGORY_BUDGET",
      entity_id: departmentCategoryBudgetId,
      action: CATEGORY_REVIEW_WORKFLOW_ACTIONS.REVIEW_COMPLETED,
      old_status: budget.status,
      new_status: DEPARTMENT_CATEGORY_BUDGET_STATUS.CATEGORY_REVIEW_COMPLETED,
      note: `${budget.category_name} review completed for ${budget.department_name}`,
      new_values_json: JSON.stringify({
        reviewedCount: counts.reviewed,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return {
      budget,
      detail: await buildDetail(departmentCategoryBudgetId, transaction),
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_REVIEW_COMPLETED,
    entityType: "DEPARTMENT_CATEGORY_BUDGET",
    entityId: departmentCategoryBudgetId,
    payload: {
      departmentCategoryBudgetId,
      departmentId: completed.budget.department_id,
      departmentName: completed.budget.department_name,
      categoryId: completed.budget.budget_category_id,
      categoryName: completed.budget.category_name,
      financialYear: completed.budget.financial_year,
      actorUserId,
    },
  });

  return completed.detail;
}

function assertReopenableReview(categoryBudget) {
  if (categoryBudget.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Department review can only be reopened while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (
    categoryBudget.status !==
    DEPARTMENT_CATEGORY_BUDGET_STATUS.CATEGORY_REVIEW_COMPLETED
  ) {
    throw new ApiError(
      400,
      "Only a completed department category review can be reopened",
      "CATEGORY_REVIEW_NOT_COMPLETED",
    );
  }

  if (!categoryBudget.category_package_id) {
    throw new ApiError(
      409,
      "The category package could not be found",
      "CATEGORY_PACKAGE_NOT_FOUND",
    );
  }

  if (
    categoryBudget.category_package_status !==
      CATEGORY_BUDGET_PACKAGE_STATUS.DRAFT ||
    categoryBudget.submitted_to_cfo_at
  ) {
    throw new ApiError(
      400,
      "The department review cannot be reopened after the category package has been submitted to CFO",
      "CATEGORY_PACKAGE_ALREADY_SUBMITTED_TO_CFO",
    );
  }
}
export async function reopenDepartmentCategoryReviewService({
  departmentCategoryBudgetId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertReviewPermission(budgetAccess);

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  return withTransaction(async (transaction) => {
    /*
     * Load and lock the department review and its related
     * category package inside the transaction.
     */
    const categoryBudget = await findDepartmentCategoryReviewReopenContextRepo(
      departmentCategoryBudgetId,
      transaction,
    );

    /*
     * Confirm that the selected review belongs to the
     * Category Manager's active category workspace.
     */
    assertCategoryScope(categoryBudget, budgetCategoryId);

    /*
     * The review can only be reopened when:
     * - Financial year is OPEN
     * - Department review is completed
     * - Related category package exists
     * - Package is still DRAFT
     * - Package has not been submitted to CFO
     */
    assertReopenableReview(categoryBudget);

    /*
     * Change only the department header:
     *
     * CATEGORY_REVIEW_COMPLETED
     * -> IN_CATEGORY_REVIEW
     *
     * Existing item quantities, notes and item review statuses
     * remain unchanged.
     */
    const updated = await reopenDepartmentCategoryReviewRepo(transaction, {
      department_category_budget_id: departmentCategoryBudgetId,

      actor_user_id: actorUserId,

      row_version: payload.row_version,
    });

    /*
     * A null result means the row was changed by another
     * request or the supplied row_version is stale.
     */
    if (!updated) {
      throw new ApiError(
        409,
        "The department review changed before it could be reopened",
        "CATEGORY_REVIEW_REOPEN_CONFLICT",
      );
    }

    /*
     * Store the business workflow event in the same transaction
     * as the department status change.
     */
    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: categoryBudget.financial_year_id,

      entity_type: "DEPARTMENT_CATEGORY_BUDGET",

      entity_id: departmentCategoryBudgetId,

      action: CATEGORY_REVIEW_WORKFLOW_ACTIONS.REVIEW_REOPENED,

      old_status: DEPARTMENT_CATEGORY_BUDGET_STATUS.CATEGORY_REVIEW_COMPLETED,

      new_status: DEPARTMENT_CATEGORY_BUDGET_STATUS.IN_CATEGORY_REVIEW,

     note: `${categoryBudget.category_name} review reopened for ${categoryBudget.department_name}`,

      old_values_json: JSON.stringify({
        categoryReviewCompletedBy:
          categoryBudget.category_review_completed_by ?? null,

        categoryReviewCompletedAt:
          categoryBudget.category_review_completed_at ?? null,

        categoryPackageId: categoryBudget.category_package_id,

        categoryPackageStatus: categoryBudget.category_package_status,

        submittedToCfoAt: categoryBudget.submitted_to_cfo_at ?? null,
      }),

      new_values_json: JSON.stringify({
        reopenedForEditing: true,
        categoryReviewCompletedBy: null,
        categoryReviewCompletedAt: null,
      }),

      user_role_id: getUserRoleId(budgetAccess),

      acting_workspace: getActingWorkspace(budgetAccess),

      created_by: actorUserId,
    });

    /*
     * Return the refreshed department review.
     * The mapper should now return:
     *
     * status: IN_CATEGORY_REVIEW
     * can_reopen_review: false
     *
     * The existing item decisions remain populated.
     */
    return buildDetail(departmentCategoryBudgetId, transaction);
  });
}
