import { ApiError } from "../utils/apiError.js";
import { withTransaction } from "../database/transaction.js";
import { queueNotification } from "./notification.service.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";
import { findBudgetTypeByIdRepo } from "../repositories/budgetRequests.repository.js";
import {
  createRequestItemRepo,
  findOpenFinancialYearRepo,
  replaceRequestItemDistributionRepo,
} from "../repositories/budgetRequests.repository.js";
import {
  findCategoryByCodeOrNameRepo,
  getDepartmentCategoryBudgetForCategoryReviewRepo,
  getDepartmentRequestItemForCategoryReviewRepo,
  returnDepartmentCategoryBudgetRepo,
  updateDepartmentRequestItemReviewRepo,
} from "../repositories/categoryReviews.repository.js";
import {
  createBudgetChangeRequestItemRepo,
  createBudgetChangeRequestRepo,
  getApprovedCategoryPackageRepo,
  getApprovedCategoryTypeReviewRepo,
  getBudgetChangeRequestByIdRepo,
  getBudgetChangeRequestItemsRepo,
  getDepartmentRequestItemForChangeRepo,
  listBudgetChangeRequestsRepo,
  markBudgetChangeRequestAppliedRepo,
  markBudgetChangeRequestItemAppliedRepo,
  updateCategoryChangeRequestDecisionRepo,
  updateCfoChangeRequestDecisionRepo,
} from "../repositories/budgetChangeRequests.repository.js";

function normalizeCategoryCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "BIOMEDICAL") return "BIOMEDICAL";
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "IT") return "IT";

  return normalized;
}

function requireDepartmentWorkspace(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type !== "DEPARTMENT") {
    throw new ApiError(
      403,
      "Switch to a Department Workspace to create change requests",
      "INVALID_WORKSPACE",
    );
  }

  if (!activeWorkspace?.department?.id) {
    throw new ApiError(403, "No department workspace selected", "NO_DEPARTMENT");
  }

  if (!activeWorkspace?.permissions?.can_edit_budget) {
    throw new ApiError(
      403,
      "Missing permission can_edit_budget",
      "MISSING_PERMISSION",
    );
  }

  return activeWorkspace.department;
}

async function resolveCategoryWorkspace(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type !== "CATEGORY_BUDGET_MANAGEMENT") {
    throw new ApiError(
      403,
      "Switch to a Category Budget Management Workspace to review change requests",
      "INVALID_WORKSPACE",
    );
  }

  const category = await findCategoryByCodeOrNameRepo(
    normalizeCategoryCode(activeWorkspace?.category),
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category scope was not found in budget categories",
      "CATEGORY_SCOPE_NOT_FOUND",
    );
  }

  return category;
}

function requireCfoWorkspace(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (
    activeWorkspace?.type !== "CFO_REVIEW" ||
    !activeWorkspace?.permissions?.can_approve_budget
  ) {
    throw new ApiError(
      403,
      "Switch to the CFO / Budget Approval Workspace to review change requests",
      "INVALID_WORKSPACE",
    );
  }
}

function assertOpenBeforePreClosing(financialYear) {
  if (!financialYear || financialYear.status !== "OPEN") {
    throw new ApiError(
      409,
      "Change requests are allowed only while the financial year is open",
      "CHANGE_REQUESTS_CLOSED",
    );
  }
}

async function loadChangeRequestWithItems(requestId, transaction = null) {
  const request = await getBudgetChangeRequestByIdRepo(requestId, transaction);

  if (!request) {
    throw new ApiError(
      404,
      "Budget change request not found",
      "CHANGE_REQUEST_NOT_FOUND",
    );
  }

  const items = await getBudgetChangeRequestItemsRepo(requestId, transaction);

  return { request, items };
}

export async function createBudgetChangeRequestService({
  payload,
  user,
  budgetAccess,
}) {
  const department = requireDepartmentWorkspace(budgetAccess);

  const result = await withTransaction(async (transaction) => {
    const financialYear = await findOpenFinancialYearRepo(transaction);
    assertOpenBeforePreClosing(financialYear);

    const budgetType = await findBudgetTypeByIdRepo(
      payload.budgetTypeId,
      transaction,
    );

    if (!budgetType) {
      throw new ApiError(404, "Budget type not found", "BUDGET_TYPE_NOT_FOUND");
    }

    let existingRequestItem = null;

    if (
      payload.requestType !== "ADD_ITEM" &&
      !payload.existingDepartmentRequestItemId
    ) {
      throw new ApiError(
        400,
        "existingDepartmentRequestItemId is required for existing item changes",
        "AFFECTED_ITEM_REQUIRED",
      );
    }

    if (payload.existingDepartmentRequestItemId) {
      existingRequestItem = await getDepartmentRequestItemForChangeRepo({
        requestItemId: payload.existingDepartmentRequestItemId,
        transaction,
      });

      if (!existingRequestItem) {
        throw new ApiError(
          404,
          "Existing department request item not found",
          "REQUEST_ITEM_NOT_FOUND",
        );
      }

      if (Number(existingRequestItem.department_id) !== Number(department.id)) {
        throw new ApiError(
          403,
          "You cannot request changes for another department",
          "FORBIDDEN",
        );
      }

      if (Number(existingRequestItem.budget_type_id) !== Number(budgetType.id)) {
        throw new ApiError(
          400,
          "Existing item does not match the requested budget type",
          "BUDGET_TYPE_MISMATCH",
        );
      }
    }

    if (payload.requestType === "ADD_ITEM") {
      if (payload.existingDepartmentRequestItemId) {
        throw new ApiError(
          400,
          "existingDepartmentRequestItemId is not allowed for add-item change requests",
          "AFFECTED_ITEM_NOT_ALLOWED",
        );
      }

      if (!payload.targetDepartmentCategoryBudgetId) {
        throw new ApiError(
          400,
          "targetDepartmentCategoryBudgetId is required for add-item change requests",
          "TARGET_CATEGORY_BUDGET_REQUIRED",
        );
      }

      const targetCategoryBudget =
        await getDepartmentCategoryBudgetForCategoryReviewRepo({
          categoryBudgetId: payload.targetDepartmentCategoryBudgetId,
          transaction,
        });

      if (!targetCategoryBudget) {
        throw new ApiError(
          404,
          "Target department category budget not found",
          "TARGET_CATEGORY_BUDGET_NOT_FOUND",
        );
      }

      if (Number(targetCategoryBudget.department_id) !== Number(department.id)) {
        throw new ApiError(
          403,
          "You cannot request new items for another department",
          "FORBIDDEN",
        );
      }

      if (Number(targetCategoryBudget.category_id) !== Number(budgetType.category_id)) {
        throw new ApiError(
          400,
          "Target category budget does not match the budget type category",
          "CATEGORY_MISMATCH",
        );
      }
    }

    const packageRow = await getApprovedCategoryPackageRepo({
      financialYearId: financialYear.id,
      categoryId: budgetType.category_id,
      transaction,
    });

    if (!packageRow) {
      throw new ApiError(
        409,
        "Change requests require an approved category budget",
        "CATEGORY_BUDGET_NOT_APPROVED",
      );
    }

    const typeReview = await getApprovedCategoryTypeReviewRepo({
      packageId: packageRow.id,
      budgetTypeId: budgetType.id,
      transaction,
    });

    if (!typeReview && payload.requestType !== "ADD_ITEM") {
      throw new ApiError(
        409,
        "The requested item is not approved in this category budget",
        "ITEM_NOT_APPROVED",
      );
    }

    if (payload.requestType === "ADD_ITEM" && typeReview) {
      throw new ApiError(
        409,
        "Use quantity or modification change requests for existing approved items",
        "ITEM_ALREADY_APPROVED",
      );
    }

    const currentRequestedQuantity = existingRequestItem
      ? Number(existingRequestItem.requested_quantity || 0)
      : null;
    const currentApprovedQuantity = typeReview
      ? Number(typeReview.approved_quantity || 0)
      : null;
    const quantityDelta =
      payload.quantityDelta ??
      (payload.requestedQuantity !== null && currentApprovedQuantity !== null
        ? Number(payload.requestedQuantity) - currentApprovedQuantity
        : null);

    const changeRequest = await createBudgetChangeRequestRepo({
      financialYearId: financialYear.id,
      departmentId: department.id,
      categoryId: budgetType.category_id,
      packageId: packageRow.id,
      requestType: payload.requestType,
      reason: payload.reason,
      requestedBy: user.userId,
      transaction,
    });

    const changeItem = await createBudgetChangeRequestItemRepo({
      changeRequestId: changeRequest.id,
      budgetTypeId: budgetType.id,
      existingDepartmentRequestItemId: payload.existingDepartmentRequestItemId,
      targetDepartmentCategoryBudgetId: payload.targetDepartmentCategoryBudgetId,
      categoryTypeReviewId: typeReview?.id || payload.categoryTypeReviewId,
      currentRequestedQuantity,
      currentApprovedQuantity,
      requestedQuantity: payload.requestedQuantity,
      quantityDelta,
      description: payload.description,
      transaction,
    });

    return {
      request: changeRequest,
      item: changeItem,
      notificationPayload: {
        requestId: changeRequest.id,
        categoryId: budgetType.category_id,
        departmentName: department.name,
        categoryName: budgetType.category_name,
        budgetTypeName: budgetType.name,
        requestType: payload.requestType,
        currentApprovedQuantity,
        requestedQuantity: payload.requestedQuantity,
        quantityDelta,
        reason: payload.reason,
        requestedByName: user.userName,
        actorUserId: user.userId,
      },
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.BUDGET_CHANGE_REQUEST_SUBMITTED,
    entityType: "BUDGET_CHANGE_REQUEST",
    entityId: result.request.id,
    payload: result.notificationPayload,
  });

  return {
    request: result.request,
    item: result.item,
  };
}

export async function getMyBudgetChangeRequestsService({
  status,
  budgetAccess,
}) {
  const department = requireDepartmentWorkspace(budgetAccess);
  return listBudgetChangeRequestsRepo({
    status,
    departmentId: department.id,
  });
}

export async function getCategoryBudgetChangeRequestsService({
  status,
  budgetAccess,
}) {
  const category = await resolveCategoryWorkspace(budgetAccess);
  return listBudgetChangeRequestsRepo({
    status,
    categoryId: category.id,
  });
}

export async function getCfoBudgetChangeRequestsService({ status, budgetAccess }) {
  requireCfoWorkspace(budgetAccess);
  return listBudgetChangeRequestsRepo({ status });
}

export async function getBudgetChangeRequestDetailsService({
  requestId,
  budgetAccess,
}) {
  const { request, items } = await loadChangeRequestWithItems(requestId);
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type === "DEPARTMENT") {
    if (Number(request.department_id) !== Number(activeWorkspace.department?.id)) {
      throw new ApiError(403, "You cannot view this change request", "FORBIDDEN");
    }
  } else if (activeWorkspace?.type === "CATEGORY_BUDGET_MANAGEMENT") {
    const category = await resolveCategoryWorkspace(budgetAccess);

    if (Number(request.category_id) !== Number(category.id)) {
      throw new ApiError(403, "You cannot view this change request", "FORBIDDEN");
    }
  } else if (activeWorkspace?.type === "CFO_REVIEW") {
    requireCfoWorkspace(budgetAccess);
  } else {
    throw new ApiError(
      403,
      "Switch to a valid workspace to view change requests",
      "INVALID_WORKSPACE",
    );
  }

  return { request, items };
}

export async function decideCategoryBudgetChangeRequestService({
  requestId,
  payload,
  user,
  budgetAccess,
}) {
  const category = await resolveCategoryWorkspace(budgetAccess);

  return withTransaction(async (transaction) => {
    const { request } = await loadChangeRequestWithItems(requestId, transaction);

    assertOpenBeforePreClosing({
      status: request.financial_year_status,
    });

    if (Number(request.category_id) !== Number(category.id)) {
      throw new ApiError(403, "You cannot decide this change request", "FORBIDDEN");
    }

    const updated = await updateCategoryChangeRequestDecisionRepo({
      requestId,
      decision: payload.decision,
      note: payload.note,
      decidedBy: user.userId,
      transaction,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Only submitted change requests can receive a category decision",
        "CHANGE_REQUEST_NOT_DECIDABLE",
      );
    }

    return updated;
  });
}

export async function decideCfoBudgetChangeRequestService({
  requestId,
  payload,
  user,
  budgetAccess,
}) {
  requireCfoWorkspace(budgetAccess);

  return withTransaction(async (transaction) => {
    const { request } = await loadChangeRequestWithItems(requestId, transaction);

    assertOpenBeforePreClosing({
      status: request.financial_year_status,
    });

    const updated = await updateCfoChangeRequestDecisionRepo({
      requestId,
      decision: payload.decision,
      note: payload.note,
      decidedBy: user.userId,
      transaction,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Only category-accepted change requests can receive a CFO decision",
        "CHANGE_REQUEST_NOT_DECIDABLE",
      );
    }

    return updated;
  });
}

export async function applyBudgetChangeRequestService({
  requestId,
  user,
  budgetAccess,
}) {
  const category = await resolveCategoryWorkspace(budgetAccess);

  return withTransaction(async (transaction) => {
    const { request, items } = await loadChangeRequestWithItems(
      requestId,
      transaction,
    );

    assertOpenBeforePreClosing({
      status: request.financial_year_status,
    });

    if (Number(request.category_id) !== Number(category.id)) {
      throw new ApiError(403, "You cannot apply this change request", "FORBIDDEN");
    }

    if (request.status !== "ACCEPTED") {
      throw new ApiError(
        409,
        "Only accepted change requests can be applied",
        "CHANGE_REQUEST_NOT_ACCEPTED",
      );
    }

    for (const item of items) {
      let appliedRequestItemId = item.existing_department_request_item_id;
      let affectedCategoryBudgetId = null;

      if (request.request_type === "ADD_ITEM") {
        const categoryBudget = await getDepartmentCategoryBudgetForCategoryReviewRepo({
          categoryBudgetId: item.target_department_category_budget_id,
          transaction,
        });

        if (!categoryBudget) {
          throw new ApiError(
            400,
            "ADD_ITEM application requires a target department category budget",
            "TARGET_CATEGORY_BUDGET_REQUIRED",
          );
        }

        affectedCategoryBudgetId = categoryBudget.id;

        const created = await createRequestItemRepo({
          categoryBudgetId: categoryBudget.id,
          budgetTypeId: item.budget_type_id,
          requestedQuantity: item.requested_quantity,
          distributionMethod: "ANNUAL",
          distributionLevel: "YEAR",
          createdBy: user.userId,
          transaction,
        });

        await replaceRequestItemDistributionRepo({
          requestItemId: created.id,
          distributionRows: [
            {
              period_type: "YEAR",
              period_no: 1,
              quantity: item.requested_quantity,
            },
          ],
          transaction,
        });

        appliedRequestItemId = created.id;
      } else {
        const requestItem = await getDepartmentRequestItemForCategoryReviewRepo({
          requestItemId: appliedRequestItemId,
          transaction,
        });

        if (!requestItem) {
          throw new ApiError(
            404,
            "Affected department request item not found",
            "REQUEST_ITEM_NOT_FOUND",
          );
        }

        affectedCategoryBudgetId = requestItem.department_category_budget_id;

        await updateDepartmentRequestItemReviewRepo({
          requestItemId: appliedRequestItemId,
          reviewStatus: "NEEDS_MODIFICATION",
          note:
            request.reason ||
            "Item reopened due to accepted budget change request",
          reviewedBy: user.userId,
          transaction,
        });
      }

      await returnDepartmentCategoryBudgetRepo({
        categoryBudgetId: affectedCategoryBudgetId,
        returnNote: request.reason,
        returnedBy: user.userId,
        transaction,
      });

      await markBudgetChangeRequestItemAppliedRepo({
        itemId: item.id,
        appliedDepartmentRequestItemId: appliedRequestItemId,
        transaction,
      });
    }

    const applied = await markBudgetChangeRequestAppliedRepo({
      requestId,
      appliedBy: user.userId,
      transaction,
    });

    if (!applied) {
      throw new ApiError(
        409,
        "Change request could not be applied",
        "CHANGE_REQUEST_APPLY_FAILED",
      );
    }

    return applied;
  });
}
