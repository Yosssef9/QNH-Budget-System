import {
  listAnalyticsFinancialYearsRepo,
  listCategoryPackageAnalyticsRepo,
  listDepartmentBudgetAnalyticsRepo,
  listDepartmentDemandAnalyticsRepo,
  listPackageItemAnalyticsRepo,
  listPackageSubItemAnalyticsRepo,
  listPoLinkAnalyticsRepo,
  listTransferAnalyticsRepo,
} from "./budgetAnalytics.repository.js";

function toOptionalInt(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    const error = new Error("Financial year id must be a positive integer");
    error.statusCode = 400;
    error.code = "INVALID_FINANCIAL_YEAR_ID";
    throw error;
  }

  return number;
}

function buildSummary({
  departmentBudgets,
  categoryPackages,
  packageSubItems,
  transfers,
  poLinks,
}) {
  return {
    department_count: new Set(
      departmentBudgets.map((row) => row.department_id),
    ).size,
    department_budget_count: departmentBudgets.length,
    package_count: categoryPackages.length,
    requested_quantity: departmentBudgets.reduce(
      (sum, row) => sum + Number(row.requested_quantity || 0),
      0,
    ),
    approved_quantity: departmentBudgets.reduce(
      (sum, row) => sum + Number(row.approved_quantity || 0),
      0,
    ),
    package_value: packageSubItems.reduce(
      (sum, row) => sum + Number(row.base_value || 0),
      0,
    ),
    po_used_value: poLinks
      .filter((row) => row.status === "APPROVED")
      .reduce((sum, row) => sum + Number(row.linked_amount || 0), 0),
    pending_po_value: poLinks
      .filter((row) => row.status === "PENDING")
      .reduce((sum, row) => sum + Number(row.linked_amount || 0), 0),
    transfer_count: transfers.length,
    pending_transfer_count: transfers.filter(
      (row) => row.status === "PENDING_APPROVAL",
    ).length,
    cfo_completed_package_count: categoryPackages.filter(
      (row) => row.status === "CFO_REVIEW_COMPLETED",
    ).length,
  };
}

export async function getBudgetAnalyticsOverviewService({ query = {} }) {
  const financialYearId = toOptionalInt(query.financialYearId);

  const [
    financialYears,
    departmentBudgets,
    categoryPackages,
    packageItems,
    packageSubItems,
    departmentDemand,
    transfers,
    poLinks,
  ] = await Promise.all([
    listAnalyticsFinancialYearsRepo(),
    listDepartmentBudgetAnalyticsRepo({ financialYearId }),
    listCategoryPackageAnalyticsRepo({ financialYearId }),
    listPackageItemAnalyticsRepo({ financialYearId }),
    listPackageSubItemAnalyticsRepo({ financialYearId }),
    listDepartmentDemandAnalyticsRepo({ financialYearId }),
    listTransferAnalyticsRepo({ financialYearId }),
    listPoLinkAnalyticsRepo({ financialYearId }),
  ]);

  return {
    filters: {
      financialYearId,
      financialYears,
    },
    summary: buildSummary({
      departmentBudgets,
      categoryPackages,
      packageSubItems,
      transfers,
      poLinks,
    }),
    departmentBudgets,
    categoryPackages,
    packageItems,
    packageSubItems,
    departmentDemand,
    transfers,
    poLinks,
  };
}
