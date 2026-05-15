import { ApiError } from "../utils/apiError.js";
import {
  getFinancialYearsRepo,
  findFinancialYearByYear,
  findFinancialYearById,
  findOpenFinancialYearRepo,
  createFinancialYearRepo,
  closeFinancialYearRepo,
  countNotApprovedBudgetsForYearRepo,
} from "../repositories/financialYears.repository.js";

export async function getFinancialYearsService() {
  return await getFinancialYearsRepo();
}

export async function getOpenFinancialYearService() {
  const openYear = await findOpenFinancialYearRepo();

  if (!openYear) {
    throw new ApiError(
      404,
      "No open financial year found",
      "OPEN_FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  return openYear;
}

export async function createFinancialYearService({ year, startedBy }) {
  const existingYear = await findFinancialYearByYear(year);

  if (existingYear) {
    throw new ApiError(
      409,
      `Financial year ${year} already exists`,
      "FINANCIAL_YEAR_ALREADY_EXISTS",
    );
  }

  const openYear = await findOpenFinancialYearRepo();

  if (openYear) {
    throw new ApiError(
      409,
      `Financial year ${openYear.year} is already open. Close it first.`,
      "OPEN_FINANCIAL_YEAR_ALREADY_EXISTS",
    );
  }

  return await createFinancialYearRepo({ year, startedBy });
}

export async function closeFinancialYearService({ id, closedBy }) {
  const financialYear = await findFinancialYearById(id);

  if (!financialYear) {
    throw new ApiError(
      404,
      "Financial year not found",
      "FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  if (financialYear.status !== "OPEN") {
    throw new ApiError(
      400,
      "Only open financial years can be closed",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  const notApprovedCount = await countNotApprovedBudgetsForYearRepo(
    financialYear.id,
  );

  if (notApprovedCount > 0) {
    throw new ApiError(
      400,
      `Cannot close financial year. There are ${notApprovedCount} active budget(s) not approved yet.`,
      "FINANCIAL_YEAR_HAS_NOT_APPROVED_BUDGETS",
      { notApprovedCount },
    );
  }

  const closedYear = await closeFinancialYearRepo({ id, closedBy });

  if (!closedYear) {
    throw new ApiError(
      409,
      "Financial year was already closed",
      "FINANCIAL_YEAR_ALREADY_CLOSED",
    );
  }

  return closedYear;
}
