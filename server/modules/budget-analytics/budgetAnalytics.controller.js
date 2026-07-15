import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { getBudgetAnalyticsOverviewService } from "./budgetAnalytics.service.js";

export const getBudgetAnalyticsOverview = asyncHandler(async (req, res) => {
  const data = await getBudgetAnalyticsOverviewService({
    query: req.query,
  });

  res.json(
    new ApiResponse({
      message: "Budget analytics fetched successfully",
      data,
    }),
  );
});
