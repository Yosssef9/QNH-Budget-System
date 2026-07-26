import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { getDashboardStatsService } from "../services/dashboard.service.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await getDashboardStatsService(req.budgetAccess, {
    financialYearId: req.query.financialYearId,
  });

  return res.json(
    new ApiResponse({
      message: "Dashboard stats fetched successfully",
      data,
    }),
  );
});
