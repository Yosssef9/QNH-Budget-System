import { ApiError } from "../utils/apiError.js";
import { poolPromise, sql } from "../config/db.js";
import { findBudgetSubItemByIdRepo } from "../repositories/budgetSubItems.repository.js";
import { findOpenFinancialYearRepo } from "../repositories/budgetRequests.repository.js";
import {
  createReviewSubItemRepo,
  deactivateReviewSubItemRepo,
  findCategoryByCodeOrNameRepo,
  getCategoryReviewPackageByIdRepo,
  getCategoryReviewByIdRepo,
  getCategoryReviewListRepo,
  getCategoryReviewPackageRepo,
  getDepartmentContributionsRepo,
  getDepartmentCategoryBudgetForCategoryReviewRepo,
  getDepartmentCategoryBudgetReviewCountsRepo,
  getDepartmentRequestItemForCategoryReviewRepo,
  getDepartmentRequestItemsForReviewRepo,
  getPackageTypeReviewValidationRowsRepo,
  getPackageDepartmentRequestReviewValidationRowsRepo,
  getReviewSubItemByIdRepo,
  getSelectedSubItemsRepo,
  returnDepartmentCategoryBudgetRepo,
  submitCategoryReviewPackageToCfoRepo,
  updateCategoryReviewApprovedQuantityRepo,
  updateCategoryReviewStatusRepo,
  updateDepartmentRequestItemReviewRepo,
  updateReviewSubItemRepo,
} from "../repositories/categoryReviews.repository.js";

function normalizeCategoryCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "BIOMEDICAL") return "BIOMEDICAL";
  if (normalized === "GENERAL") return "GENERAL";
  if (normalized === "IT") return "IT";

  return normalized;
}

async function withTransaction(work) {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function resolveCategoryReviewScope(budgetAccess) {
  const activeWorkspace = budgetAccess?.activeWorkspace;

  if (activeWorkspace?.type !== "CATEGORY_BUDGET_MANAGEMENT") {
    throw new ApiError(
      403,
      "Switch to a Category Budget Management Workspace to review category budgets",
      "INVALID_WORKSPACE",
    );
  }

  const categoryName = activeWorkspace?.category;

  if (!categoryName) {
    throw new ApiError(
      403,
      "No category scope found for the active workspace",
      "CATEGORY_SCOPE_REQUIRED",
    );
  }

  const category = await findCategoryByCodeOrNameRepo(
    normalizeCategoryCode(categoryName),
  );

  if (!category) {
    throw new ApiError(
      404,
      "Category scope was not found in budget categories",
      "CATEGORY_SCOPE_NOT_FOUND",
    );
  }

  return category;
}

async function loadReviewInScope({ reviewId, budgetAccess, transaction = null }) {
  const category = await resolveCategoryReviewScope(budgetAccess);
  const review = await getCategoryReviewByIdRepo(reviewId, transaction);

  if (!review) {
    throw new ApiError(
      404,
      "Category review record not found",
      "CATEGORY_REVIEW_NOT_FOUND",
    );
  }

  if (Number(review.category_id) !== Number(category.id)) {
    throw new ApiError(
      403,
      "You cannot manage this category review",
      "FORBIDDEN",
    );
  }

  if (review.financial_year_status !== "OPEN") {
    throw new ApiError(
      409,
      "Category review can only be modified while the financial year is open",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (
    ["SUBMITTED_TO_CFO", "APPROVED", "CANCELLED"].includes(
      review.category_review_status,
    )
  ) {
    throw new ApiError(
      409,
      "This category review item is locked and cannot be modified",
      "CATEGORY_REVIEW_LOCKED",
    );
  }

  return { category, review };
}

export async function getCategoryReviewListService({ budgetAccess }) {
  const category = await resolveCategoryReviewScope(budgetAccess);
  const financialYear = await findOpenFinancialYearRepo();

  if (!financialYear) {
    throw new ApiError(
      404,
      "No open financial year found",
      "OPEN_FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  const packageRow = await getCategoryReviewPackageRepo({
    financialYearId: financialYear.id,
    categoryId: category.id,
  });

  if (!packageRow) {
    return {
      financialYear,
      category,
      package: null,
      reviews: [],
    };
  }

  const reviews = await getCategoryReviewListRepo({
    financialYearId: financialYear.id,
    categoryId: category.id,
  });

  return {
    financialYear,
    category,
    package: packageRow,
    reviews,
  };
}

export async function getCategoryReviewDetailsService({
  reviewId,
  budgetAccess,
}) {
  const category = await resolveCategoryReviewScope(budgetAccess);
  const review = await getCategoryReviewByIdRepo(reviewId);

  if (!review) {
    throw new ApiError(
      404,
      "Category review record not found",
      "CATEGORY_REVIEW_NOT_FOUND",
    );
  }

  if (Number(review.category_id) !== Number(category.id)) {
    throw new ApiError(
      403,
      "You cannot view this category review",
      "FORBIDDEN",
    );
  }

  const [departmentContributions, selectedSubItems] = await Promise.all([
    getDepartmentContributionsRepo(reviewId),
    getSelectedSubItemsRepo(reviewId),
  ]);

  return {
    review,
    departmentContributions,
    selectedSubItems,
  };
}

export async function getDepartmentRequestItemsForReviewService({
  reviewId,
  budgetAccess,
}) {
  const category = await resolveCategoryReviewScope(budgetAccess);
  const review = await getCategoryReviewByIdRepo(reviewId);

  if (!review) {
    throw new ApiError(
      404,
      "Category review record not found",
      "CATEGORY_REVIEW_NOT_FOUND",
    );
  }

  if (Number(review.category_id) !== Number(category.id)) {
    throw new ApiError(
      403,
      "You cannot view department requests for this category review",
      "FORBIDDEN",
    );
  }

  const departmentRequestItems =
    await getDepartmentRequestItemsForReviewRepo(reviewId);

  return {
    review,
    departmentRequestItems,
  };
}

export async function updateDepartmentRequestItemReviewService({
  requestItemId,
  payload,
  user,
  budgetAccess,
}) {
  return withTransaction(async (transaction) => {
    const category = await resolveCategoryReviewScope(budgetAccess);
    const requestItem = await getDepartmentRequestItemForCategoryReviewRepo({
      requestItemId,
      transaction,
    });

    if (!requestItem) {
      throw new ApiError(
        404,
        "Department request item not found",
        "REQUEST_ITEM_NOT_FOUND",
      );
    }

    if (Number(requestItem.category_id) !== Number(category.id)) {
      throw new ApiError(
        403,
        "You cannot review this department request item",
        "FORBIDDEN",
      );
    }

    if (requestItem.financial_year_status !== "OPEN") {
      throw new ApiError(
        409,
        "Department request items can only be reviewed while the financial year is open",
        "FINANCIAL_YEAR_NOT_OPEN",
      );
    }

    if (!["SUBMITTED", "RETURNED"].includes(requestItem.department_category_budget_status)) {
      throw new ApiError(
        409,
        "Only submitted or returned department category budgets can be reviewed",
        "DEPARTMENT_CATEGORY_BUDGET_NOT_REVIEWABLE",
      );
    }

    return updateDepartmentRequestItemReviewRepo({
      requestItemId,
      reviewStatus: payload.reviewStatus,
      note: payload.note,
      reviewedBy: user.userId,
      transaction,
    });
  });
}

export async function returnDepartmentCategoryBudgetService({
  categoryBudgetId,
  payload,
  user,
  budgetAccess,
}) {
  return withTransaction(async (transaction) => {
    const category = await resolveCategoryReviewScope(budgetAccess);
    const categoryBudget = await getDepartmentCategoryBudgetForCategoryReviewRepo({
      categoryBudgetId,
      transaction,
    });

    if (!categoryBudget) {
      throw new ApiError(
        404,
        "Department category budget not found",
        "DEPARTMENT_CATEGORY_BUDGET_NOT_FOUND",
      );
    }

    if (Number(categoryBudget.category_id) !== Number(category.id)) {
      throw new ApiError(
        403,
        "You cannot return this department category budget",
        "FORBIDDEN",
      );
    }

    if (categoryBudget.financial_year_status !== "OPEN") {
      throw new ApiError(
        409,
        "Department category budgets can only be returned while the financial year is open",
        "FINANCIAL_YEAR_NOT_OPEN",
      );
    }

    if (!["SUBMITTED", "RETURNED"].includes(categoryBudget.status)) {
      throw new ApiError(
        409,
        "Only submitted or returned department category budgets can be returned",
        "DEPARTMENT_CATEGORY_BUDGET_NOT_RETURNABLE",
      );
    }

    const counts = await getDepartmentCategoryBudgetReviewCountsRepo({
      categoryBudgetId,
      transaction,
    });
    const needsModification = Number(counts.needs_modification_count || 0);

    if (!needsModification) {
      throw new ApiError(
        409,
        "At least one item must be marked as needing modification before returning the budget",
        "NO_ITEMS_NEED_MODIFICATION",
      );
    }

    const returned = await returnDepartmentCategoryBudgetRepo({
      categoryBudgetId,
      returnNote: payload.returnNote,
      returnedBy: user.userId,
      transaction,
    });

    if (!returned) {
      throw new ApiError(
        409,
        "Department category budget could not be returned",
        "DEPARTMENT_CATEGORY_BUDGET_RETURN_FAILED",
      );
    }

    return returned;
  });
}

export async function updateApprovedQuantityService({
  reviewId,
  approvedQuantity,
  user,
  budgetAccess,
}) {
  return withTransaction(async (transaction) => {
    await loadReviewInScope({ reviewId, budgetAccess, transaction });

    const updated = await updateCategoryReviewApprovedQuantityRepo({
      reviewId,
      approvedQuantity,
      updatedBy: user.userId,
      transaction,
    });

    return updated;
  });
}

export async function updateCategoryReviewStatusService({
  reviewId,
  payload,
  user,
  budgetAccess,
}) {
  return withTransaction(async (transaction) => {
    await loadReviewInScope({ reviewId, budgetAccess, transaction });

    const updated = await updateCategoryReviewStatusRepo({
      reviewId,
      status: payload.status,
      note: payload.note,
      reviewedBy: user.userId,
      transaction,
    });

    return updated;
  });
}

export async function createReviewSubItemService({
  reviewId,
  payload,
  user,
  budgetAccess,
}) {
  return withTransaction(async (transaction) => {
    const { review } = await loadReviewInScope({
      reviewId,
      budgetAccess,
      transaction,
    });

    const subItem = await findBudgetSubItemByIdRepo(
      payload.budgetSubItemId,
      transaction,
    );

    if (!subItem || !subItem.is_active) {
      throw new ApiError(
        404,
        "Active budget sub-item not found",
        "SUB_ITEM_NOT_FOUND",
      );
    }

    if (Number(subItem.budget_type_id) !== Number(review.budget_type_id)) {
      throw new ApiError(
        400,
        "Selected sub-item does not belong to this budget type",
        "SUB_ITEM_TYPE_MISMATCH",
      );
    }

    return createReviewSubItemRepo({
      reviewId,
      budgetSubItemId: payload.budgetSubItemId,
      nameSnapshot: subItem.name,
      specificationSnapshot: subItem.specification_summary,
      quantity: payload.quantity,
      unitCost: payload.unitCost,
      note: payload.note,
      createdBy: user.userId,
      transaction,
    });
  });
}

export async function updateReviewSubItemService({
  reviewId,
  lineId,
  payload,
  user,
  budgetAccess,
}) {
  return withTransaction(async (transaction) => {
    await loadReviewInScope({ reviewId, budgetAccess, transaction });
    const line = await getReviewSubItemByIdRepo(lineId, transaction);

    if (!line || Number(line.category_type_review_id) !== Number(reviewId)) {
      throw new ApiError(
        404,
        "Review sub-item line not found",
        "REVIEW_SUB_ITEM_NOT_FOUND",
      );
    }

    return updateReviewSubItemRepo({
      lineId,
      quantity: payload.quantity,
      unitCost: payload.unitCost,
      note: payload.note,
      updatedBy: user.userId,
      transaction,
    });
  });
}

export async function deleteReviewSubItemService({
  reviewId,
  lineId,
  user,
  budgetAccess,
}) {
  return withTransaction(async (transaction) => {
    await loadReviewInScope({ reviewId, budgetAccess, transaction });
    const line = await getReviewSubItemByIdRepo(lineId, transaction);

    if (!line || Number(line.category_type_review_id) !== Number(reviewId)) {
      throw new ApiError(
        404,
        "Review sub-item line not found",
        "REVIEW_SUB_ITEM_NOT_FOUND",
      );
    }

    return deactivateReviewSubItemRepo({
      lineId,
      updatedBy: user.userId,
      transaction,
    });
  });
}

export async function submitCategoryReviewPackageToCfoService({
  packageId,
  user,
  budgetAccess,
}) {
  return withTransaction(async (transaction) => {
    const category = await resolveCategoryReviewScope(budgetAccess);
    const packageRow = await getCategoryReviewPackageByIdRepo(
      packageId,
      transaction,
    );

    if (!packageRow) {
      throw new ApiError(
        404,
        "Category review package not found",
        "CATEGORY_REVIEW_PACKAGE_NOT_FOUND",
      );
    }

    if (Number(packageRow.category_id) !== Number(category.id)) {
      throw new ApiError(
        403,
        "You cannot submit this category review package",
        "FORBIDDEN",
      );
    }

    if (packageRow.financial_year_status !== "OPEN") {
      throw new ApiError(
        409,
        "Category review package can only be submitted while the financial year is open",
        "FINANCIAL_YEAR_NOT_OPEN",
      );
    }

    const rows = await getPackageTypeReviewValidationRowsRepo(
      packageId,
      transaction,
    );
    const unreviewedDepartmentRows =
      await getPackageDepartmentRequestReviewValidationRowsRepo(
        packageId,
        transaction,
      );

    if (!rows.length) {
      throw new ApiError(
        409,
        "No consolidated items are available for this package",
        "CATEGORY_REVIEW_EMPTY",
      );
    }

    const invalidRows = [];

    for (const row of unreviewedDepartmentRows) {
      invalidRows.push(
        `${row.budget_type_name}: ${row.department_name} request is not accepted`,
      );
    }

    for (const row of rows) {
      const approvedQuantity =
        row.approved_quantity === null || row.approved_quantity === undefined
          ? null
          : Number(row.approved_quantity);
      const selectedQuantity = Number(row.total_selected_sub_item_quantity || 0);

      if (approvedQuantity === null) {
        invalidRows.push(`${row.budget_type_name}: approved quantity is missing`);
        continue;
      }

      const alreadyAcceptedByCfo = row.cfo_review_status === "REVIEWED_ACCEPTED";

      if (alreadyAcceptedByCfo) {
        continue;
      }

      if (row.category_review_status === "NEEDS_MODIFICATION") {
        invalidRows.push(`${row.budget_type_name}: still needs modification`);
        continue;
      }

      if (Math.abs(approvedQuantity - selectedQuantity) > 0.0001) {
        invalidRows.push(
          `${row.budget_type_name}: approved quantity must equal selected sub-item quantity`,
        );
        continue;
      }

      if (row.category_review_status !== "REVIEWED_ACCEPTED") {
        invalidRows.push(`${row.budget_type_name}: must be marked reviewed`);
      }
    }

    if (invalidRows.length) {
      throw new ApiError(
        409,
        `Package cannot be submitted to CFO. ${invalidRows.join("; ")}`,
        "CATEGORY_REVIEW_VALIDATION_FAILED",
      );
    }

    const updated = await submitCategoryReviewPackageToCfoRepo({
      packageId,
      submittedBy: user.userId,
      transaction,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Category review package is not in a submittable status",
        "CATEGORY_REVIEW_PACKAGE_NOT_SUBMITTABLE",
      );
    }

    return updated;
  });
}
