import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getProjectFilterOptionsService,
  getProjectBudgetItemDetailsService,
  getProjectBudgetItemsService,
} from "../services/projects.service.js";

export const getProjectBudgetItems = asyncHandler(async (req, res) => {
  const data = await getProjectBudgetItemsService({
    query: req.query,
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Project budget items fetched successfully",
      data,
    }),
  );
});

export const getProjectBudgetItemDetails = asyncHandler(async (req, res) => {
  const data = await getProjectBudgetItemDetailsService({
    budgetItemId: Number(req.params.budgetItemId),
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Project budget item fetched successfully",
      data,
    }),
  );
});

export const getProjectFilterOptions = asyncHandler(async (req, res) => {
  const data = await getProjectFilterOptionsService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Project filter options fetched successfully",
      data,
    }),
  );
});
