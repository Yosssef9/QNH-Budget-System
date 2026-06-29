import { withTransaction } from "../database/transaction.js";
import { ApiError } from "../utils/apiError.js";
import {
  countRequestItemsRepo,
  createDepartmentBudgetRepo,
  createRequestItemRepo,
  deactivateRequestItemRepo,
  ensureDepartmentCategoryBudgetRepo,
  findBudgetTypeByIdRepo,
  findDepartmentBudgetRepo,
  findOpenFinancialYearRepo,
  findRequestItemByIdRepo,
  findRequestItemByTypeRepo,
  getActiveBudgetCategoriesRepo,
  getDepartmentCategoryBudgetByIdRepo,
  getDepartmentCategoryBudgetsRepo,
  getRequestItemsByCategoryBudgetRepo,
  getRequestTypeIdsRepo,
  replaceRequestItemDistributionRepo,
  submitDepartmentCategoryBudgetRepo,
  updateDepartmentBudgetStatusRepo,
  updateRequestItemRepo,
} from "../repositories/budgetRequests.repository.js";
import {
  ensureCategoryReviewPackageRepo,
  ensureCategoryTypeReviewRepo,
} from "../repositories/categoryReviews.repository.js";

function requireDepartmentWorkspace(budgetAccess, permissionName) {
  const activeWorkspace = budgetAccess?.activeWorkspace;
  const departmentId = budgetAccess?.department?.id;

  if (activeWorkspace?.type && activeWorkspace.type !== "DEPARTMENT") {
    throw new ApiError(
      403,
      "Switch to a Department Workspace to manage department requests",
      "INVALID_WORKSPACE",
    );
  }

  if (!departmentId) {
    throw new ApiError(403, "No department workspace selected", "NO_DEPARTMENT");
  }

  if (permissionName && budgetAccess?.permissions?.[permissionName] !== true) {
    throw new ApiError(
      403,
      `Missing permission ${permissionName}`,
      "MISSING_PERMISSION",
    );
  }

  return departmentId;
}

function assertOpenFinancialYear(financialYearStatus) {
  if (financialYearStatus !== "OPEN") {
    throw new ApiError(
      400,
      "Budget requests can only be modified while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }
}

function assertCategoryBudgetEditable(categoryBudget) {
  if (!["DRAFT", "RETURNED"].includes(categoryBudget.status)) {
    throw new ApiError(
      400,
      "This category budget is not editable in its current status",
      "CATEGORY_BUDGET_NOT_EDITABLE",
    );
  }
}

function mapRequestItems(rows = []) {
  const items = new Map();

  rows.forEach((row) => {
    if (!items.has(row.id)) {
      items.set(row.id, {
        id: row.id,
        department_category_budget_id: row.department_category_budget_id,
        budget_type_id: row.budget_type_id,
        budget_type_name: row.budget_type_name,
        expense_type: row.expense_type,
        requested_quantity: Number(row.requested_quantity || 0),
        distribution_method: row.distribution_method,
        distribution_level: row.distribution_level,
        review_status: row.review_status,
        is_reviewed: row.is_reviewed === true || row.is_reviewed === 1,
        is_edit_locked:
          row.is_edit_locked === true || row.is_edit_locked === 1,
        review_note: row.review_note,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
        distribution: [],
      });
    }

    if (row.period_no) {
      items.get(row.id).distribution.push({
        period_type: row.period_type,
        period_no: Number(row.period_no),
        quantity: Number(row.distribution_quantity || 0),
      });
    }
  });

  return Array.from(items.values());
}

function validateDistributionTotal(distribution = [], requestedQuantity) {
  if (!distribution.length) return;

  const total = distribution.reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0,
  );

  if (Math.abs(total - Number(requestedQuantity || 0)) > 0.0001) {
    throw new ApiError(
      400,
      "Distribution quantity must equal requested quantity",
      "INVALID_DISTRIBUTION_TOTAL",
    );
  }
}

async function loadAndAuthorizeCategoryBudget({
  categoryBudgetId,
  budgetAccess,
  permissionName,
  transaction = null,
}) {
  const departmentId = requireDepartmentWorkspace(budgetAccess, permissionName);
  const categoryBudget = await getDepartmentCategoryBudgetByIdRepo(
    categoryBudgetId,
    transaction,
  );

  if (!categoryBudget) {
    throw new ApiError(
      404,
      "Department category budget not found",
      "CATEGORY_BUDGET_NOT_FOUND",
    );
  }

  if (Number(categoryBudget.department_id) !== Number(departmentId)) {
    throw new ApiError(
      403,
      "You cannot access this department category budget",
      "FORBIDDEN",
    );
  }

  return categoryBudget;
}

export async function getCurrentBudgetRequestService({ budgetAccess, user }) {
  const departmentId = requireDepartmentWorkspace(
    budgetAccess,
    "can_view_budget",
  );
  const financialYear = await findOpenFinancialYearRepo();

  if (!financialYear) {
    throw new ApiError(
      404,
      "No open financial year found",
      "OPEN_FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  return await withTransaction(async (transaction) => {
    let departmentBudget = await findDepartmentBudgetRepo({
      financialYearId: financialYear.id,
      departmentId,
      transaction,
    });

    if (!departmentBudget) {
      departmentBudget = await createDepartmentBudgetRepo({
        financialYearId: financialYear.id,
        departmentId,
        createdBy: user.userId,
        transaction,
      });

      departmentBudget = await findDepartmentBudgetRepo({
        financialYearId: financialYear.id,
        departmentId,
        transaction,
      });
    }

    const categories = await getActiveBudgetCategoriesRepo(transaction);

    for (const category of categories) {
      await ensureDepartmentCategoryBudgetRepo({
        departmentBudgetId: departmentBudget.id,
        categoryId: category.id,
        createdBy: user.userId,
        transaction,
      });
    }

    const categoryBudgets = await getDepartmentCategoryBudgetsRepo(
      departmentBudget.id,
      transaction,
    );

    return {
      financialYear,
      departmentBudget,
      categoryBudgets,
    };
  });
}

export async function getCategoryBudgetItemsService({
  categoryBudgetId,
  budgetAccess,
}) {
  const categoryBudget = await loadAndAuthorizeCategoryBudget({
    categoryBudgetId,
    budgetAccess,
    permissionName: "can_view_budget",
  });
  const rows = await getRequestItemsByCategoryBudgetRepo(categoryBudgetId);

  return {
    categoryBudget,
    items: mapRequestItems(rows),
  };
}

export async function createRequestItemService({
  categoryBudgetId,
  payload,
  budgetAccess,
  user,
}) {
  return await withTransaction(async (transaction) => {
    const categoryBudget = await loadAndAuthorizeCategoryBudget({
      categoryBudgetId,
      budgetAccess,
      permissionName: "can_edit_budget",
      transaction,
    });

    assertOpenFinancialYear(categoryBudget.financial_year_status);
    assertCategoryBudgetEditable(categoryBudget);

    const budgetType = await findBudgetTypeByIdRepo(
      payload.budget_type_id,
      transaction,
    );

    if (!budgetType) {
      throw new ApiError(404, "Budget type not found", "BUDGET_TYPE_NOT_FOUND");
    }

    if (Number(budgetType.category_id) !== Number(categoryBudget.category_id)) {
      throw new ApiError(
        400,
        "Budget type does not belong to this category",
        "BUDGET_TYPE_CATEGORY_MISMATCH",
      );
    }

    const existing = await findRequestItemByTypeRepo({
      categoryBudgetId,
      budgetTypeId: payload.budget_type_id,
      transaction,
    });

    if (existing) {
      throw new ApiError(
        409,
        "This budget type already exists in the category request",
        "DUPLICATE_REQUEST_ITEM",
      );
    }

    validateDistributionTotal(payload.distribution, payload.requested_quantity);

    const item = await createRequestItemRepo({
      categoryBudgetId,
      budgetTypeId: payload.budget_type_id,
      requestedQuantity: payload.requested_quantity,
      distributionMethod: payload.distribution_method,
      distributionLevel: payload.distribution_level,
      createdBy: user.userId,
      transaction,
    });

    await replaceRequestItemDistributionRepo({
      requestItemId: item.id,
      distributionRows: payload.distribution,
      transaction,
    });

    await updateDepartmentBudgetStatusRepo({
      departmentBudgetId: categoryBudget.department_budget_id,
      status: "IN_PROGRESS",
      updatedBy: user.userId,
      transaction,
    });

    return item;
  });
}

export async function updateRequestItemService({
  requestItemId,
  payload,
  budgetAccess,
  user,
}) {
  return await withTransaction(async (transaction) => {
    const existing = await findRequestItemByIdRepo(requestItemId, transaction);

    if (!existing) {
      throw new ApiError(404, "Request item not found", "REQUEST_ITEM_NOT_FOUND");
    }

    const categoryBudget = await loadAndAuthorizeCategoryBudget({
      categoryBudgetId: existing.department_category_budget_id,
      budgetAccess,
      permissionName: "can_edit_budget",
      transaction,
    });

    assertOpenFinancialYear(existing.financial_year_status);
    assertCategoryBudgetEditable(categoryBudget);

    if (existing.is_edit_locked === true || existing.is_edit_locked === 1) {
      throw new ApiError(
        400,
        "This item has already been reviewed and cannot be modified",
        "REQUEST_ITEM_LOCKED",
      );
    }

    const requestedQuantity =
      payload.requested_quantity ?? Number(existing.requested_quantity);

    if (payload.distribution) {
      validateDistributionTotal(payload.distribution, requestedQuantity);
    }

    const updated = await updateRequestItemRepo({
      requestItemId,
      requestedQuantity: payload.requested_quantity ?? null,
      distributionMethod: payload.distribution_method ?? null,
      distributionLevel:
        payload.distribution_level !== undefined
          ? payload.distribution_level
          : existing.distribution_level,
      reviewNote: payload.review_note ?? null,
      updatedBy: user.userId,
      transaction,
    });

    if (payload.distribution) {
      await replaceRequestItemDistributionRepo({
        requestItemId,
        distributionRows: payload.distribution,
        transaction,
      });
    }

    return updated;
  });
}

export async function deleteRequestItemService({
  requestItemId,
  budgetAccess,
  user,
}) {
  return await withTransaction(async (transaction) => {
    const existing = await findRequestItemByIdRepo(requestItemId, transaction);

    if (!existing) {
      throw new ApiError(404, "Request item not found", "REQUEST_ITEM_NOT_FOUND");
    }

    const categoryBudget = await loadAndAuthorizeCategoryBudget({
      categoryBudgetId: existing.department_category_budget_id,
      budgetAccess,
      permissionName: "can_edit_budget",
      transaction,
    });

    assertOpenFinancialYear(existing.financial_year_status);
    assertCategoryBudgetEditable(categoryBudget);

    if (existing.is_edit_locked === true || existing.is_edit_locked === 1) {
      throw new ApiError(
        400,
        "This item has already been reviewed and cannot be deleted",
        "REQUEST_ITEM_LOCKED",
      );
    }

    return await deactivateRequestItemRepo({
      requestItemId,
      updatedBy: user.userId,
      transaction,
    });
  });
}

export async function submitCategoryBudgetService({
  categoryBudgetId,
  budgetAccess,
  user,
}) {
  return await withTransaction(async (transaction) => {
    const categoryBudget = await loadAndAuthorizeCategoryBudget({
      categoryBudgetId,
      budgetAccess,
      permissionName: "can_edit_budget",
      transaction,
    });

    assertOpenFinancialYear(categoryBudget.financial_year_status);
    assertCategoryBudgetEditable(categoryBudget);

    const itemsCount = await countRequestItemsRepo(categoryBudgetId, transaction);

    if (itemsCount === 0) {
      throw new ApiError(
        400,
        "Cannot submit an empty category budget",
        "CATEGORY_BUDGET_EMPTY",
      );
    }

    const submitted = await submitDepartmentCategoryBudgetRepo({
      categoryBudgetId,
      submittedBy: user.userId,
      transaction,
    });

    if (!submitted) {
      throw new ApiError(
        409,
        "Category budget could not be submitted",
        "CATEGORY_BUDGET_SUBMIT_FAILED",
      );
    }

    const packageRow = await ensureCategoryReviewPackageRepo({
      financialYearId: categoryBudget.financial_year_id,
      categoryId: categoryBudget.category_id,
      createdBy: user.userId,
      transaction,
    });
    const typeIds = await getRequestTypeIdsRepo(categoryBudgetId, transaction);

    for (const budgetTypeId of typeIds) {
      await ensureCategoryTypeReviewRepo({
        packageId: packageRow.id,
        budgetTypeId,
        createdBy: user.userId,
        transaction,
      });
    }

    return {
      categoryBudget: submitted,
      categoryReviewPackage: packageRow,
      consolidatedTypeCount: typeIds.length,
    };
  });
}
