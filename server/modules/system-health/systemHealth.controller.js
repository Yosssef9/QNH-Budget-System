import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getSystemHealthSummaryService } from "./systemHealth.service.js";

export const getSystemHealthSummary = asyncHandler(async (_req, res) => {
  const data = await getSystemHealthSummaryService();

  res.json(
    new ApiResponse({
      message: "System health fetched successfully",
      data,
    }),
  );
});
