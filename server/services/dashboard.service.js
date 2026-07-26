import { getDashboardStatsRepo } from "../repositories/dashboard.repository.js";

function getWorkspaceCategoryId(access) {
  return (
    access?.budgetCategory?.id ??
    access?.category?.id ??
    access?.selectedWorkspace?.budgetCategory?.id ??
    access?.workspace?.budgetCategory?.id ??
    null
  );
}

function toOptionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    const error = new Error(`${fieldName} must be a positive integer`);
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
}

export async function getDashboardStatsService(budgetAccess, filters = {}) {
  return await getDashboardStatsRepo({
    budgetCategoryId: getWorkspaceCategoryId(budgetAccess),
    financialYearId: toOptionalPositiveInteger(
      filters.financialYearId,
      "Financial year id",
    ),
  });
}
