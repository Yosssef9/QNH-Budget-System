import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { auditLog } from "../utils/audit.js";
import {
  createBudgetItemService,
  getBudgetItemsService,
  deleteBudgetItemService,
  replaceBudgetItemsService,
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

export async function deleteBudgetItem(req, res, next) {
  try {
    const { budgetId, itemId } = req.params;

    await deleteBudgetItemService({
      budgetId: Number(budgetId),
      itemId: Number(itemId),
      user: req.user,
      budgetAccess: req.budgetAccess,
    });

    res.json({
      success: true,
      message: "Budget item deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
export async function replaceBudgetItems(req, res, next) {
  try {
    const { budgetId } = req.params;

    const result = await replaceBudgetItemsService({
      budgetId: Number(budgetId),
      items: req.body.items || [],
      user: req.user,
      budgetAccess: req.budgetAccess,
    });
    await auditLog(req, {
      action: "SAVE_BUDGET",
      entityName: `${
        req.budgetAccess?.department?.name || "Department"
      } Budget`,
      entityType: "BUDGET",
      entityId: String(budgetId),
      description: `Saved budget draft`,
      newValues: {
        itemsCount: req.body.items?.length || 0,
      },
    });

    res.json({
      success: true,
      message: "Budget items replaced successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
