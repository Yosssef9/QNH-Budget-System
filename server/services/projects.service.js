import { ApiError } from "../utils/apiError.js";
import {
  getProjectFilterOptionsRepo,
  getProjectBudgetItemDetailsRepo,
  getProjectBudgetItemsRepo,
} from "../repositories/projects.repository.js";

function getProjectAccessScope(budgetAccess) {
  const canSeeAll =
    budgetAccess?.isGlobalAdmin === true ||
    budgetAccess?.permissions?.can_approve_budget === true;

  const canViewProjects =
    canSeeAll ||
    budgetAccess?.permissions?.can_view_budget === true ||
    budgetAccess?.permissions?.can_edit_budget === true;

  const departmentId = budgetAccess?.department?.id || null;

  if (!canViewProjects) {
    throw new ApiError(
      403,
      "You do not have permission to view project budget items",
      "FORBIDDEN",
    );
  }

  if (!canSeeAll && !departmentId) {
    throw new ApiError(
      403,
      "You are not assigned to any department budget",
      "NO_DEPARTMENT_ACCESS",
    );
  }

  return {
    canSeeAll,
    departmentId,
  };
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function getProjectBudgetItemsService({ query, budgetAccess }) {
  const scope = getProjectAccessScope(budgetAccess);

  return getProjectBudgetItemsRepo({
    canSeeAll: scope.canSeeAll,
    scopeDepartmentId: scope.departmentId,
    financialYearId: parseOptionalNumber(query.financialYearId),
    filterDepartmentId: scope.canSeeAll
      ? parseOptionalNumber(query.departmentId)
      : null,
    budgetId: parseOptionalNumber(query.budgetId),
    status: query.status ? String(query.status).trim() : null,
    search: query.search ? String(query.search).trim() : null,
  });
}

export async function getProjectFilterOptionsService({ budgetAccess }) {
  const scope = getProjectAccessScope(budgetAccess);
  const rows = await getProjectFilterOptionsRepo(scope);

  const financialYears = new Map();
  const departments = new Map();
  const budgets = new Map();

  rows.forEach((row) => {
    if (!financialYears.has(row.financial_year_id)) {
      financialYears.set(row.financial_year_id, {
        id: row.financial_year_id,
        year: row.financial_year,
        status: row.financial_year_status,
      });
    }

    if (!departments.has(row.department_id)) {
      departments.set(row.department_id, {
        id: row.department_id,
        name: row.department_name,
      });
    }

    if (!budgets.has(row.budget_id)) {
      budgets.set(row.budget_id, {
        id: row.budget_id,
        department_id: row.department_id,
        department_name: row.department_name,
        financial_year_id: row.financial_year_id,
        financial_year: row.financial_year,
        status: row.budget_status,
      });
    }
  });

  return {
    financialYears: [...financialYears.values()],
    departments: [...departments.values()],
    budgets: [...budgets.values()],
  };
}

export async function getProjectBudgetItemDetailsService({
  budgetItemId,
  budgetAccess,
}) {
  const scope = getProjectAccessScope(budgetAccess);

  const project = await getProjectBudgetItemDetailsRepo({
    budgetItemId,
    ...scope,
  });

  if (!project) {
    throw new ApiError(
      404,
      "Project budget item not found",
      "PROJECT_BUDGET_ITEM_NOT_FOUND",
    );
  }

  return project;
}
