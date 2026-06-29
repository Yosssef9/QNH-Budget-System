import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  createBudgetSubItemService,
  deactivateBudgetSubItemService,
  getBudgetSubItemsService,
  updateBudgetSubItemService,
} from "../services/budgetSubItems.service.js";
import {
  validateBudgetSubItemCreatePayload,
  validateBudgetSubItemId,
  validateBudgetSubItemUpdatePayload,
  validateBudgetTypeQuery,
} from "../validators/budgetSubItems.validator.js";

export const getBudgetSubItems = asyncHandler(async (req, res) => {
  const query = validateBudgetTypeQuery(req.query);
  const data = await getBudgetSubItemsService({
    ...query,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Budget sub-items fetched successfully",
      data,
    }),
  );
});

export const createBudgetSubItem = asyncHandler(async (req, res) => {
  const payload = validateBudgetSubItemCreatePayload(req.body);
  const data = await createBudgetSubItemService({
    payload,
    userId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  return res.status(201).json(
    new ApiResponse({
      message: "Budget sub-item created successfully",
      data,
    }),
  );
});

export const updateBudgetSubItem = asyncHandler(async (req, res) => {
  const subItemId = validateBudgetSubItemId(req.params.subItemId);
  const payload = validateBudgetSubItemUpdatePayload(req.body);
  const data = await updateBudgetSubItemService({
    subItemId,
    payload,
    userId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Budget sub-item updated successfully",
      data,
    }),
  );
});

export const deactivateBudgetSubItem = asyncHandler(async (req, res) => {
  const subItemId = validateBudgetSubItemId(req.params.subItemId);
  const data = await deactivateBudgetSubItemService({
    subItemId,
    userId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  return res.json(
    new ApiResponse({
      message: "Budget sub-item deactivated successfully",
      data,
    }),
  );
});
