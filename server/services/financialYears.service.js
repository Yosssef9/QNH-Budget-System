import { ApiError } from "../utils/apiError.js";
import {
  findFinancialYearByYear,
  createFinancialYearRepo,
  getActiveDepartmentsCount,
  createDraftBudgetsForFinancialYear,
} from "../repositories/financialYears.repository.js";

export async function startFinancialYearService({ year, startedBy }) {
  const existingYear = await findFinancialYearByYear(year);

  if (existingYear) {
    throw new ApiError(
      409,
      `Financial year ${year} already exists`,
      "FINANCIAL_YEAR_ALREADY_EXISTS"
    );
  }

  const activeDepartmentsCount = await getActiveDepartmentsCount();

  if (activeDepartmentsCount === 0) {
    throw new ApiError(
      400,
      "Cannot start financial year because no active departments exist",
      "NO_ACTIVE_DEPARTMENTS"
    );
  }

  const financialYear = await createFinancialYearRepo({
    year,
    startedBy,
  });

  const createdBudgetsCount = await createDraftBudgetsForFinancialYear({
    financialYearId: financialYear.id,
    createdBy: startedBy,
  });

  return {
    financialYear,
    createdBudgetsCount,
  };
}