import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { getBudgetRolesService } from "../services/budgetAccessRoles.service.js";

export const getBudgetAccessRoles = asyncHandler(async (req, res) => {
  const data = await getBudgetRolesService();

  return res.status(200).json(
    new ApiResponse({
      message: "Budget roles fetched successfully",
      data,
    }),
  );
});