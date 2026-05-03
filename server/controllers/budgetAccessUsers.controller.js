import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { getBudgetAccessUsersService } from "../services/budgetAccessUsers.service.js";

export const getBudgetAccessUsers = asyncHandler(async (req, res) => {
  const data = await getBudgetAccessUsersService(req.query);

  return res.status(200).json(
    new ApiResponse({
      message: "Users fetched successfully",
      data,
    }),
  );
});
