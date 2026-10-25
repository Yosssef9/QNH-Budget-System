import express from "express";
import { verifyPortalJwt } from "../../shared/auth/verifyPortalJwt.js";
import { resolveBudgetWorkspace } from "../../shared/middleware/resolveBudgetWorkspace.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { hasAnyPermission, PERMISSION_CODES } from "../../../shared/permissions/permissionCodes.js";
import { listBudgetExclusionsRepo } from "./budgetExclusions.repository.js";

const VIEW_PERMISSIONS = [
  PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
  PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
  PERMISSION_CODES.VIEW_PURCHASING_PRICE_REVIEWS,
  PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
  PERMISSION_CODES.VIEW_BUDGET_REPORTS,
];

export function getBudgetExclusionScope(access) {
  if (!hasAnyPermission(access, VIEW_PERMISSIONS)) {
    throw new ApiError(403, "Not authorized to view budget exclusions", "BUDGET_EXCLUSIONS_DENIED");
  }
  const type = access?.workspaceType;
  if (type === "DEPARTMENT") {
    const departmentId = Number(access.department?.id);
    if (!Number.isInteger(departmentId) || departmentId <= 0 ||
        !hasAnyPermission(access, [PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS])) {
      throw new ApiError(403, "Department budget scope required", "BUDGET_DEPARTMENT_SCOPE_REQUIRED");
    }
    return { departmentId, categoryId: null, includeDraftPurchasing: false };
  }
  if (type === "CATEGORY") {
    const categoryId = Number(access.budgetCategory?.id || access.category?.id);
    if (!Number.isInteger(categoryId) || categoryId <= 0 ||
        !hasAnyPermission(access, [PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS])) {
      throw new ApiError(403, "Category budget scope required", "BUDGET_CATEGORY_SCOPE_REQUIRED");
    }
    return { departmentId: null, categoryId, includeDraftPurchasing: true };
  }
  if (type !== "GLOBAL" || !hasAnyPermission(access, [
    PERMISSION_CODES.VIEW_PURCHASING_PRICE_REVIEWS,
    PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES,
    PERMISSION_CODES.VIEW_BUDGET_REPORTS,
  ])) {
    throw new ApiError(403, "Global budget scope required", "BUDGET_EXCLUSIONS_SCOPE_REQUIRED");
  }
  const includeDraftPurchasing = hasAnyPermission(access, [PERMISSION_CODES.VIEW_PURCHASING_PRICE_REVIEWS]);
  return { departmentId: null, categoryId: null, includeDraftPurchasing };
}

const router = express.Router();
router.use(verifyPortalJwt);
router.use(resolveBudgetWorkspace);
router.get("/", asyncHandler(async (req, res) => {
  const financialYearId = Number(req.query.financialYearId);
  if (!Number.isSafeInteger(financialYearId) || financialYearId <= 0) {
    throw new ApiError(400, "Valid financialYearId is required", "BUDGET_EXCLUSIONS_YEAR_REQUIRED");
  }
  const scope = getBudgetExclusionScope(req.budgetAccess);
  const data = await listBudgetExclusionsRepo({ financialYearId, ...scope });
  res.json(new ApiResponse({ message: "Budget exclusions fetched", data }));
}));
export default router;
