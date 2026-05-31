import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  getFinancialYearsService,
  getOpenFinancialYearService,
  createFinancialYearService,
  closeFinancialYearService,
  preCloseFinancialYearService,
  getFinancialYearByIdService,
  getCurrentFinancialYearService,
} from "../services/financialYears.service.js";
import {
  validateCreateFinancialYear,
  validateFinancialYearId,
} from "../validators/financialYears.validator.js";
import { auditLog } from "../utils/audit.js";
export const getFinancialYears = asyncHandler(async (req, res) => {
  const years = await getFinancialYearsService();

  return res.json(
    new ApiResponse({
      message: "Financial years fetched successfully",
      data: years,
    }),
  );
});

export const getOpenFinancialYear = asyncHandler(async (req, res) => {
  const openYear = await getOpenFinancialYearService();

  return res.json(
    new ApiResponse({
      message: "Open financial year fetched successfully",
      data: openYear,
    }),
  );
});

export const createFinancialYear = asyncHandler(async (req, res) => {
  const body = validateCreateFinancialYear(req.body);

  const financialYear = await createFinancialYearService({
    year: body.year,
    startedBy: req.user.userId,
  });
  await auditLog(req, {
    action: "CREATE_FINANCIAL_YEAR",
    entityName: `Financial Year ${financialYear.year}`,
    entityType: "FINANCIAL_YEAR",
    entityId: String(financialYear.id),
    description: `Created financial year ${financialYear.year}`,
    newValues: financialYear,
  });
  return res.status(201).json(
    new ApiResponse({
      message: `Financial year ${body.year} opened successfully`,
      data: financialYear,
    }),
  );
});

export const closeFinancialYear = asyncHandler(async (req, res) => {
  const id = validateFinancialYearId(req.params.id);

  const oldFinancialYear = await getFinancialYearByIdService(id);

  const financialYear = await closeFinancialYearService({
    id,
    closedBy: req.user.userId,
  });

  await auditLog(req, {
    action: "CLOSE_FINANCIAL_YEAR",
    entityName: `Financial Year ${financialYear.year}`,
    entityType: "FINANCIAL_YEAR",
    entityId: String(financialYear.id),
    description: `Closed financial year ${financialYear.year}`,
    oldValues: oldFinancialYear,
    newValues: financialYear,
  });

  return res.json(
    new ApiResponse({
      message: `Financial year ${financialYear.year} closed successfully`,
      data: financialYear,
    }),
  );
});
export const preCloseFinancialYear = asyncHandler(async (req, res) => {
  const id = validateFinancialYearId(req.params.id);

  const oldFinancialYear = await getFinancialYearByIdService(id);

  const financialYear = await preCloseFinancialYearService({
    id,
    preClosedBy: req.user.userId,
  });

  await auditLog(req, {
    action: "PRE_CLOSE_FINANCIAL_YEAR",
    entityName: `Financial Year ${financialYear.year}`,
    entityType: "FINANCIAL_YEAR",
    entityId: String(financialYear.id),
    description: `Moved financial year ${financialYear.year} from OPEN to PRE_CLOSING`,
    oldValues: oldFinancialYear,
    newValues: financialYear,
  });
  return res.json(
    new ApiResponse({
      message: `Financial year ${financialYear.year} moved to pre-closing successfully`,
      data: financialYear,
    }),
  );
});
export const getCurrentFinancialYear = asyncHandler(async (req, res) => {
  const financialYear = await getCurrentFinancialYearService();

  return res.json(
    new ApiResponse({
      message: "Current financial year fetched successfully",
      data: financialYear,
    }),
  );
});