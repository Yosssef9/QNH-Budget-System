import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  getFinancialYearsService,
  getOpenFinancialYearService,
  createFinancialYearService,
  closeFinancialYearService,
} from "../services/financialYears.service.js";
import {
  validateCreateFinancialYear,
  validateFinancialYearId,
} from "../validators/financialYears.validator.js";

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

  return res.status(201).json(
    new ApiResponse({
      message: `Financial year ${body.year} opened successfully`,
      data: financialYear,
    }),
  );
});

export const closeFinancialYear = asyncHandler(async (req, res) => {
  const id = validateFinancialYearId(req.params.id);

  const financialYear = await closeFinancialYearService({
    id,
    closedBy: req.user.userId,
  });

  return res.json(
    new ApiResponse({
      message: `Financial year ${financialYear.year} closed successfully`,
      data: financialYear,
    }),
  );
});
