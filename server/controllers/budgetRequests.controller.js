import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  createRequestItemService,
  deleteRequestItemService,
  getCategoryBudgetItemsService,
  getCurrentBudgetRequestService,
  submitCategoryBudgetService,
  updateRequestItemService,
} from "../services/budgetRequests.service.js";
import {
  validateCategoryBudgetId,
  validateCreateRequestItem,
  validateRequestItemId,
  validateUpdateRequestItem,
} from "../validators/budgetRequests.validator.js";
import { auditLog } from "../utils/audit.js";

export const getCurrentBudgetRequest = asyncHandler(async (req, res) => {
  const data = await getCurrentBudgetRequestService({
    budgetAccess: req.budgetAccess,
    user: req.user,
  });

  return res.json(
    new ApiResponse({
      message: "Current department budget request fetched successfully",
      data,
    }),
  );
});

export const getCategoryBudgetItems = asyncHandler(async (req, res) => {
  const categoryBudgetId = validateCategoryBudgetId(
    req.params.categoryBudgetId,
  );
  const data = await getCategoryBudgetItemsService({
    categoryBudgetId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Category request items fetched successfully",
      data,
    }),
  );
});

export const createRequestItem = asyncHandler(async (req, res) => {
  const categoryBudgetId = validateCategoryBudgetId(
    req.params.categoryBudgetId,
  );
  const payload = validateCreateRequestItem(req.body);
  const data = await createRequestItemService({
    categoryBudgetId,
    payload,
    budgetAccess: req.budgetAccess,
    user: req.user,
  });

  await auditLog(req, {
    action: "CREATE_BUDGET_REQUEST_ITEM",
    entityType: "DEPARTMENT_BUDGET_REQUEST_ITEM",
    entityId: String(data.id),
    entityName: "Department Budget Request Item",
    description: "Created department budget request item",
    newValues: data,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Budget request item created successfully",
      data,
    }),
  );
});

export const updateRequestItem = asyncHandler(async (req, res) => {
  const requestItemId = validateRequestItemId(req.params.requestItemId);
  const payload = validateUpdateRequestItem(req.body);
  const data = await updateRequestItemService({
    requestItemId,
    payload,
    budgetAccess: req.budgetAccess,
    user: req.user,
  });

  await auditLog(req, {
    action: "UPDATE_BUDGET_REQUEST_ITEM",
    entityType: "DEPARTMENT_BUDGET_REQUEST_ITEM",
    entityId: String(requestItemId),
    entityName: "Department Budget Request Item",
    description: "Updated department budget request item",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "Budget request item updated successfully",
      data,
    }),
  );
});

export const deleteRequestItem = asyncHandler(async (req, res) => {
  const requestItemId = validateRequestItemId(req.params.requestItemId);
  const data = await deleteRequestItemService({
    requestItemId,
    budgetAccess: req.budgetAccess,
    user: req.user,
  });

  await auditLog(req, {
    action: "DELETE_BUDGET_REQUEST_ITEM",
    entityType: "DEPARTMENT_BUDGET_REQUEST_ITEM",
    entityId: String(requestItemId),
    entityName: "Department Budget Request Item",
    description: "Deleted department budget request item",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "Budget request item deleted successfully",
      data,
    }),
  );
});

export const submitCategoryBudget = asyncHandler(async (req, res) => {
  const categoryBudgetId = validateCategoryBudgetId(
    req.params.categoryBudgetId,
  );
  const data = await submitCategoryBudgetService({
    categoryBudgetId,
    budgetAccess: req.budgetAccess,
    user: req.user,
  });

  await auditLog(req, {
    action: "SUBMIT_DEPARTMENT_CATEGORY_BUDGET",
    entityType: "DEPARTMENT_CATEGORY_BUDGET",
    entityId: String(categoryBudgetId),
    entityName: "Department Category Budget",
    description: "Submitted department category budget for category review",
    newValues: data,
  });

  return res.json(
    new ApiResponse({
      message: "Department category budget submitted successfully",
      data,
    }),
  );
});

