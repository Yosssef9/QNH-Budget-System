import { ApiError } from "../utils/apiError.js";
import {
  getFinancialYearsRepo,
  findFinancialYearByYear,
  findFinancialYearById,
  findOpenFinancialYearRepo,
  findActiveFinancialYearRepo,
  createFinancialYearRepo,
  preCloseFinancialYearRepo,
  closeFinancialYearRepo,
  countNotApprovedBudgetsForYearRepo,
  countPendingTransferRequestsForYearRepo,
  countUnfinishedPOLinksForYearRepo,
  findLatestFinancialYearRepo,
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
export async function getCurrentFinancialYearService() {
  const financialYear = await findLatestFinancialYearRepo();

  if (!financialYear) {
    throw new ApiError(
      404,
      "No financial year found",
      "FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  return financialYear;
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
  const latestYear = await findLatestFinancialYearRepo();

  if (latestYear && year !== Number(latestYear.year) + 1) {
    throw new ApiError(
      400,
      `Invalid financial year sequence. The next financial year must be ${Number(latestYear.year) + 1}.`,
      "INVALID_FINANCIAL_YEAR_SEQUENCE",
      {
        latestYear: latestYear.year,
        requiredNextYear: Number(latestYear.year) + 1,
        requestedYear: year,
      },
    );
  }
  const activeYear = await findActiveFinancialYearRepo();

  if (activeYear) {
    throw new ApiError(
      409,
      `Financial year ${activeYear.year} is still ${activeYear.status}. Close it first.`,
      "ACTIVE_FINANCIAL_YEAR_ALREADY_EXISTS",
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

  if (financialYear.status !== "PRE_CLOSING") {
    throw new ApiError(
      400,
      "Only PRE_CLOSING financial years can be closed",
      "FINANCIAL_YEAR_NOT_PRE_CLOSING",
    );
  }

  const pendingTransfers = await countPendingTransferRequestsForYearRepo(
    financialYear.id,
  );

  if (pendingTransfers > 0) {
    throw new ApiError(
      400,
      `Cannot close financial year. There are ${pendingTransfers} pending transfer request(s).`,
      "FINANCIAL_YEAR_HAS_PENDING_TRANSFERS",
      { pendingTransfers },
    );
  }

  const unfinishedPOLinks = await countUnfinishedPOLinksForYearRepo(
    financialYear.id,
  );

  if (unfinishedPOLinks > 0) {
    throw new ApiError(
      400,
      `Cannot close financial year. There are ${unfinishedPOLinks} unfinished PO link(s).`,
      "FINANCIAL_YEAR_HAS_UNFINISHED_PO_LINKS",
      { unfinishedPOLinks },
    );
  }

  const closedYear = await closeFinancialYearRepo({ id, closedBy });

  if (!closedYear) {
    throw new ApiError(409, "Financial year could not be closed");
  }

  return closedYear;
}
export async function preCloseFinancialYearService({ id, preClosedBy }) {
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
      "Only OPEN financial years can be moved to pre-closing",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  const notApprovedCount = await countNotApprovedBudgetsForYearRepo(
    financialYear.id,
  );

  if (notApprovedCount > 0) {
    throw new ApiError(
      400,
      `Cannot pre-close financial year. There are ${notApprovedCount} budget(s) not approved yet.`,
      "FINANCIAL_YEAR_HAS_NOT_APPROVED_BUDGETS",
      { notApprovedCount },
    );
  }

  const preClosedYear = await preCloseFinancialYearRepo({ id, preClosedBy });
  if (!preClosedYear) {
    throw new ApiError(409, "Financial year could not be pre-closed");
  }

  return preClosedYear;
}
export async function getFinancialYearByIdService(id) {
  return await findFinancialYearById(id);
}
