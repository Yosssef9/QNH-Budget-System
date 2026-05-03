import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { getMyBudgetsService } from "../services/budgets.service.js";

export const getMyBudgets = asyncHandler(async (req, res) => {
  const budgets = await getMyBudgetsService(req.budgetAccess);

  return res.json(
    new ApiResponse({
      message: "Budgets fetched successfully",
      data: budgets,
    }),
  );
});
