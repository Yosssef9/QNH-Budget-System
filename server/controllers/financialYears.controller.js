import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { startFinancialYearService } from "../services/financialYears.service.js";
import { validateStartFinancialYear } from "../validators/financialYears.validator.js";

export const startFinancialYear = asyncHandler(async (req, res) => {
  // 1. validate request
  validateStartFinancialYear(req.body);

  // 2. call service
  const result = await startFinancialYearService({
    year: req.body.year,
    startedBy: req.user.userId,
  });

  // 3. return response
  return res.status(201).json(
    new ApiResponse({
      message: `Financial year ${req.body.year} started successfully`,
      data: result,
    })
  );
});