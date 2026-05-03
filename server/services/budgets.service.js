import { ApiError } from "../utils/apiError.js";
import { getMyBudgetsRepo } from "../repositories/budgets.repository.js";

export async function getMyBudgetsService(budgetAccess) {
  const canSeeAll =
    budgetAccess.is_global_admin === true ||
    budgetAccess.can_approve_budget === true;

  const hodDepartment = budgetAccess.departments?.[0];

  const departmentId = hodDepartment?.department_id || null;

  if (!canSeeAll && !departmentId) {
    throw new ApiError(
      403,
      "You are not assigned to any department budget",
      "NO_DEPARTMENT_ACCESS"
    );
  }

  return await getMyBudgetsRepo({
    canSeeAll,
    departmentId,
  });
}