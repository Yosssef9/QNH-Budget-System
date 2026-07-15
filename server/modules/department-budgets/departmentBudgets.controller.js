import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { auditLog } from "../../utils/audit.js";
import {
  getCurrentDepartmentBudgetService,
  listCategoryBudgetOverviewService,
  getBudgetHistoryItemsService,
  getCopyableBudgetHistoryService,
  getDepartmentBudgetByIdService,
  listAllDepartmentBudgetsOverviewService,
  listMyDepartmentBudgetsService,
  saveDepartmentCategoryItemsService,
  submitDepartmentCategoryBudgetService,
} from "./departmentBudgets.service.js";
import {
  validateDepartmentBudgetId,
  validateDepartmentCategoryBudgetId,
  validateSaveCategoryItemsPayload,
} from "./departmentBudgets.validators.js";

export const getCurrentDepartmentBudget = asyncHandler(async (req, res) => {
  const data = await getCurrentDepartmentBudgetService({
    budgetAccess: req.budgetAccess,
  });

  res.json({
    success: true,
    ...data,
  });
});

export const getMyDepartmentBudgets = asyncHandler(async (req, res) => {
  const data = await listMyDepartmentBudgetsService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Department budgets fetched successfully",
      data,
    }),
  );
});

export const getAllDepartmentBudgets = asyncHandler(async (req, res) => {
  const data = await listAllDepartmentBudgetsOverviewService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "All department budgets fetched successfully",
      data,
    }),
  );
});

export const getCategoryBudgetOverview = asyncHandler(async (req, res) => {
  const data = await listCategoryBudgetOverviewService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Category budget overview fetched successfully",
      data,
    }),
  );
});

export const getDepartmentBudgetById = asyncHandler(async (req, res) => {
  const data = await getDepartmentBudgetByIdService({
    departmentBudgetId: validateDepartmentBudgetId(req.params.departmentBudgetId),
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Department budget fetched successfully",
      data,
    }),
  );
});

export const getApprovedBudgetHistory = asyncHandler(async (req, res) => {
  const data = await getCopyableBudgetHistoryService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Budget history fetched successfully",
      data,
    }),
  );
});

export const getBudgetHistoryItems = asyncHandler(async (req, res) => {
  const data = await getBudgetHistoryItemsService({
    departmentCategoryBudgetId: validateDepartmentCategoryBudgetId(
      req.params.departmentCategoryBudgetId,
    ),
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Budget history items fetched successfully",
      data,
    }),
  );
});

export const saveDepartmentCategoryItems = asyncHandler(async (req, res) => {
  const departmentCategoryBudgetId = validateDepartmentCategoryBudgetId(
    req.params.departmentCategoryBudgetId,
  );
  const payload = validateSaveCategoryItemsPayload(req.body);

  const data = await saveDepartmentCategoryItemsService({
    departmentCategoryBudgetId,
    items: payload.items,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "SAVE_DEPARTMENT_CATEGORY_BUDGET",
    entityType: "DEPARTMENT_CATEGORY_BUDGET",
    entityId: String(departmentCategoryBudgetId),
    entityName: "Department Category Budget",
    description: "Saved department category budget draft",
    newValues: {
      itemCount: payload.items.length,
    },
  });

  res.json(
    new ApiResponse({
      message: "Department category budget saved successfully",
      data,
    }),
  );
});

export const submitDepartmentCategoryBudget = asyncHandler(async (req, res) => {
  const departmentCategoryBudgetId = validateDepartmentCategoryBudgetId(
    req.params.departmentCategoryBudgetId,
  );

  const data = await submitDepartmentCategoryBudgetService({
    departmentCategoryBudgetId,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "SUBMIT_DEPARTMENT_CATEGORY_BUDGET",
    entityType: "DEPARTMENT_CATEGORY_BUDGET",
    entityId: String(departmentCategoryBudgetId),
    entityName: "Department Category Budget",
    description: "Submitted department category budget to Category Manager",
    newValues: {
      status: "IN_CATEGORY_REVIEW",
    },
  });

  res.json(
    new ApiResponse({
      message: "Department category budget submitted successfully",
      data,
    }),
  );
});
