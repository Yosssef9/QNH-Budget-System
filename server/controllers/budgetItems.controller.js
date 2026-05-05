import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";

import {
  createBudgetItemService,
  getBudgetItemsService,
} from "../services/budgetItems.service.js";

import {
  validateBudgetIdParam,
  validateCreateBudgetItem,
} from "../validators/budgetItems.validator.js";

export const createBudgetItem = asyncHandler(async (req, res) => {
  const budgetId = validateBudgetIdParam(req.params);

  validateCreateBudgetItem(req.body);

  const result = await createBudgetItemService({
    budgetId,
    body: req.body,
    user: req.user,
    budgetAccess: req.budgetAccess,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Budget item created successfully",
      data: result,
    }),
  );
});

export async function getBudgetItems(req, res, next) {
  try {
    const result = await getBudgetItemsService({
      budgetId: Number(req.params.budgetId),
      budgetAccess: req.budgetAccess,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
