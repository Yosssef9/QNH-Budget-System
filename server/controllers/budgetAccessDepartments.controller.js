import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { getBudgetAccessDepartmentsService } from "../services/budgetAccessDepartments.service.js";

export const getBudgetAccessDepartments = asyncHandler(async (req, res) => {
  const data = await getBudgetAccessDepartmentsService();

  return res.status(200).json(
    new ApiResponse({
      message: "Departments fetched successfully",
      data,
    }),
  );
});
