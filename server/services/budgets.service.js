import { ApiError } from "../utils/apiError.js";
import {
  getMyBudgetsRepo,
  findOpenFinancialYearRepo,
  findActiveDepartmentByIdRepo,
  findBudgetByDepartmentAndYearRepo,
  createBudgetRepo,
  getCurrentBudgetRepo,
  getBudgetForSubmitRepo,
  countActiveBudgetItemsRepo,
  submitBudgetRepo,
  getBudgetByIdRepo,
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
      "No budget found for your department in the open financial year",
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
    const isEditableStatus = ["DRAFT", "RETURNED"];

    if (isEditableStatus.includes(existingBudget.status)) {
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

export async function submitBudgetService({ budgetId, user, budgetAccess }) {
  const budget = await getBudgetForSubmitRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found", "BUDGET_NOT_FOUND");
  }
  if (budget.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Budget submission is only allowed while financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (!["DRAFT", "RETURNED"].includes(budget.status)) {
    throw new ApiError(
      400,
      "Only draft or returned budgets can be submitted",
      "INVALID_BUDGET_STATUS",
    );
  }

  const canSeeAll =
    budgetAccess.isGlobalAdmin === true ||
    budgetAccess.permissions?.can_approve_budget === true;

  const userDepartmentId = budgetAccess.department?.id || null;

  if (!canSeeAll && budget.department_id !== userDepartmentId) {
    throw new ApiError(403, "You cannot submit this budget", "FORBIDDEN");
  }

  const itemsCount = await countActiveBudgetItemsRepo(budgetId);

  if (itemsCount === 0) {
    throw new ApiError(
      400,
      "Cannot submit budget without items",
      "BUDGET_HAS_NO_ITEMS",
    );
  }

  return await submitBudgetRepo({
    budgetId,
    submittedBy: user.userId,
  });
}
export async function getBudgetDetailsService(budgetId) {
  const budget = await getBudgetByIdRepo(budgetId);

  if (!budget) {
    throw new ApiError(404, "Budget not found");
  }

  return budget;
}
