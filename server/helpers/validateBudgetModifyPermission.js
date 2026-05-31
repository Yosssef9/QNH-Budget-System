import { ApiError } from "../utils/apiError.js";

export function validateBudgetModifyPermission({ budget, budgetAccess }) {
  const isGlobal =
    budgetAccess?.isGlobalAdmin === true ||
    budgetAccess?.permissions?.can_approve_budget === true;

  const userDepartmentId = budgetAccess?.department?.id || null;

  if (!isGlobal && budget.department_id !== userDepartmentId) {
    throw new ApiError(
      403,
      "You cannot modify this department budget",
      "FORBIDDEN",
    );
  }
}
