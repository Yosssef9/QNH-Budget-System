import { ApiError } from "../utils/apiError.js";
import {
  getMyBudgetsRepo,
  findOpenFinancialYearRepo,
  findActiveDepartmentByIdRepo,
  findBudgetByDepartmentAndYearRepo,
  createBudgetRepo,
  getCurrentBudgetRepo,
} from "../repositories/budgets.repository.js";

export async function getCurrentBudgetService({ budgetAccess }) {
  const financialYear = await findOpenFinancialYearRepo();

  if (!financialYear) {
    throw new ApiError(
      404,
      "No open financial year found",
      "OPEN_FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  const isGlobal =
    budgetAccess.isGlobalAdmin === true ||
    budgetAccess.permissions?.can_approve_budget === true;

  const departmentId = budgetAccess.department?.id || null;

  if (!isGlobal && !departmentId) {
    throw new ApiError(
      403,
      "You are not assigned to any department budget",
      "NO_DEPARTMENT_ACCESS",
    );
  }

  if (isGlobal) {
    throw new ApiError(
      400,
      "Global users must select a department",
      "DEPARTMENT_REQUIRED",
    );
  }

  const budget = await getCurrentBudgetRepo({
    departmentId,
    financialYearId: financialYear.id,
  });

  if (!budget) {
    throw new ApiError(
      404,
      "No draft budget found for your department in the open financial year",
      "CURRENT_BUDGET_NOT_FOUND",
    );
  }

  return {
    budget,
    financialYear,
  };
}
export async function getMyBudgetsService(budgetAccess) {
  const canSeeAll =
    budgetAccess.isGlobalAdmin === true ||
    budgetAccess.permissions?.can_approve_budget === true;

  const userDepartmentId = budgetAccess.department?.id || null;

  if (!canSeeAll && !userDepartmentId) {
    throw new ApiError(
      403,
      "You are not assigned to any department budget",
      "NO_DEPARTMENT_ACCESS",
    );
  }

  return await getMyBudgetsRepo({
    canSeeAll,
    departmentId: userDepartmentId,
  });
}

export async function createBudgetService({ body, user, budgetAccess }) {
  const financialYear = await findOpenFinancialYearRepo();

  if (!financialYear) {
    throw new ApiError(
      400,
      "No open financial year. Budget creation is not allowed.",
      "OPEN_FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  const isGlobal =
    budgetAccess.isGlobalAdmin === true ||
    budgetAccess.permissions?.can_approve_budget === true;

  const userDepartmentId = budgetAccess.department?.id || null;
  const departmentId =
    body.department_id || body.departmentId || userDepartmentId;

  if (!departmentId) {
    throw new ApiError(
      400,
      "department_id is required for users without department assignment",
      "DEPARTMENT_REQUIRED",
    );
  }

  if (!isGlobal && departmentId !== userDepartmentId) {
    throw new ApiError(
      403,
      "You cannot create a budget for this department",
      "FORBIDDEN",
    );
  }

  const department = await findActiveDepartmentByIdRepo(departmentId);

  if (!department) {
    throw new ApiError(
      404,
      "Active department not found",
      "DEPARTMENT_NOT_FOUND",
    );
  }

  const existingBudget = await findBudgetByDepartmentAndYearRepo({
    departmentId,
    financialYearId: financialYear.id,
  });

  if (existingBudget) {
    if (["DRAFT", "RETURNED"].includes(existingBudget.status)) {
      return {
        budget: existingBudget,
        financialYear,
        alreadyExists: true,
      };
    }

    throw new ApiError(
      409,
      `Budget already exists for ${department.name} in ${financialYear.year}`,
      "BUDGET_ALREADY_EXISTS",
    );
  }

  const budget = await createBudgetRepo({
    departmentId,
    financialYearId: financialYear.id,
    createdBy: user.userId,
  });

  return {
    budget,
    financialYear,
    alreadyExists: false,
  };
}
