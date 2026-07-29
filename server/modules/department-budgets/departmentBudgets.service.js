import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import { hasAnyPermission as hasAnyCanonicalPermission } from "../../../shared/permissions/permissionCodes.js";
import {
  ALL_DEPARTMENT_BUDGETS_OVERVIEW_PERMISSIONS,
  CATEGORY_SUBMISSION_WINDOW_STATUS,
  CATEGORY_BUDGET_OVERVIEW_PERMISSIONS,
  DEPARTMENT_BUDGET_ITEM_STATUS,
  DEPARTMENT_BUDGET_PERMISSIONS,
  DEPARTMENT_CATEGORY_BUDGET_STATUS,
  DEPARTMENT_WORKSPACE_ROLE_CODES,
  DISTRIBUTION_METHODS,
  DISTRIBUTION_PERIOD_TYPES,
  WORKFLOW_ACTIONS,
} from "./departmentBudgets.constants.js";
import {
  countActiveItemsForCategoryBudgetRepo,
  createWorkflowHistoryRepo,
  deactivateCategoryBudgetItemsNotInListRepo,
  ensureGeneralPackageSubItemRepo,
  ensurePackageItemRepo,
  findCategoryPackageRepo,
  findCurrentDepartmentBudgetRepo,
  findDepartmentBudgetByIdRepo,
  findDepartmentCategoryBudgetRepo,
  findGeneralCatalogSubItemRepo,
  findLatestFinancialYearRepo,
  findSubmissionWindowRepo,
  listCategoryBudgetsForDepartmentBudgetRepo,
  listCategoryDepartmentItemsOverviewRepo,
  listAllDepartmentBudgetsOverviewRepo,
  listDepartmentBudgetsRepo,
  listCopyableCategoryBudgetHistoryRepo,
  listHistoryItemsForCategoryBudgetRepo,
  listItemsForCategoryBudgetRepo,
  listItemsForDepartmentBudgetRepo,
  markCategoryBudgetSubmittedRepo,
  markItemsPendingCategoryReviewRepo,
  replaceItemDistributionsRepo,
  touchDepartmentCategoryBudgetRepo,
  upsertDepartmentCategoryBudgetItemRepo,
  validateActiveCatalogItemForCategoryRepo,
} from "./departmentBudgets.repository.js";
import {
  mapAllDepartmentBudgetOverview,
  mapDepartmentBudgetDetail,
  mapDepartmentBudgetSummary,
  mapCategoryDepartmentItemsOverview,
} from "./departmentBudgets.mapper.js";

function getActorUserId(user) {
  return user?.userId ?? user?.USER_ID ?? null;
}

function getUserRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getActingWorkspace(budgetAccess) {
  return budgetAccess?.workspaceType ?? budgetAccess?.type ?? null;
}

function hasAnyPermission(budgetAccess, permissions) {
  return hasAnyCanonicalPermission(budgetAccess, permissions);
}

function assertDepartmentWorkspace(budgetAccess) {
  const roleCode = budgetAccess?.role?.code ?? budgetAccess?.role_code;
  const departmentId = budgetAccess?.department?.id;

  if (
    budgetAccess?.workspaceType !== "DEPARTMENT" &&
    budgetAccess?.type !== "DEPARTMENT"
  ) {
    throw new ApiError(
      403,
      "Select a department workspace to access department budgets",
      "DEPARTMENT_WORKSPACE_REQUIRED",
    );
  }

  if (!DEPARTMENT_WORKSPACE_ROLE_CODES.includes(roleCode) || !departmentId) {
    throw new ApiError(
      403,
      "The active workspace is not assigned to a department",
      "DEPARTMENT_SCOPE_REQUIRED",
    );
  }

  return Number(departmentId);
}

function assertCanView(budgetAccess) {
  if (!hasAnyPermission(budgetAccess, DEPARTMENT_BUDGET_PERMISSIONS.VIEW)) {
    throw new ApiError(
      403,
      "You do not have permission to view department budget requests",
      "DEPARTMENT_BUDGET_VIEW_DENIED",
    );
  }
}

function assertCanViewAllBudgets(budgetAccess) {
  if (
    !hasAnyPermission(budgetAccess, ALL_DEPARTMENT_BUDGETS_OVERVIEW_PERMISSIONS)
  ) {
    throw new ApiError(
      403,
      "You do not have permission to view all department budgets",
      "ALL_DEPARTMENT_BUDGETS_VIEW_DENIED",
    );
  }
}

function assertCanManage(budgetAccess) {
  if (!hasAnyPermission(budgetAccess, DEPARTMENT_BUDGET_PERMISSIONS.MANAGE)) {
    throw new ApiError(
      403,
      "You do not have permission to manage department budget requests",
      "DEPARTMENT_BUDGET_MANAGE_DENIED",
    );
  }
}

function assertCanSubmit(budgetAccess) {
  if (!hasAnyPermission(budgetAccess, DEPARTMENT_BUDGET_PERMISSIONS.SUBMIT)) {
    throw new ApiError(
      403,
      "You do not have permission to submit department category budgets",
      "DEPARTMENT_BUDGET_SUBMIT_DENIED",
    );
  }
}

function assertCategoryOverviewAccess(budgetAccess) {
  if (!hasAnyPermission(budgetAccess, CATEGORY_BUDGET_OVERVIEW_PERMISSIONS)) {
    throw new ApiError(
      403,
      "You do not have permission to view category budget overview",
      "CATEGORY_BUDGET_OVERVIEW_DENIED",
    );
  }

  const categoryId =
    budgetAccess?.budgetCategory?.id ??
    budgetAccess?.category?.id ??
    budgetAccess?.selectedWorkspace?.budgetCategory?.id ??
    null;

  if (!categoryId) {
    throw new ApiError(
      403,
      "Select a category workspace to view category budget overview",
      "CATEGORY_WORKSPACE_REQUIRED",
    );
  }

  return Number(categoryId);
}

function assertOwnDepartmentBudget(budget, departmentId) {
  if (!budget) {
    throw new ApiError(404, "Department budget not found", "BUDGET_NOT_FOUND");
  }

  if (Number(budget.department_id) !== Number(departmentId)) {
    throw new ApiError(
      403,
      "You cannot access another department budget",
      "DEPARTMENT_BUDGET_SCOPE_DENIED",
    );
  }
}

function groupCategoryItemRows(rows) {
  const itemMap = new Map();

  for (const row of rows) {
    if (!itemMap.has(Number(row.item_id))) {
      itemMap.set(Number(row.item_id), {
        id: row.item_id,
        catalog_item_id: row.catalog_item_id,
        requested_quantity: Number(row.requested_quantity || 0),
        distribution_method: row.distribution_method,
        review_status: row.review_status,
        distribution: [],
      });
    }

    if (row.distribution_id) {
      itemMap.get(Number(row.item_id)).distribution.push({
        period_type: row.period_type,
        period_no: Number(row.period_no),
        quantity: Number(row.distribution_quantity || 0),
      });
    }
  }

  return Array.from(itemMap.values());
}

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function normalizeDistributions(item) {
  if (item.distribution_method === DISTRIBUTION_METHODS.ANNUAL) {
    return [
      {
        period_type: DISTRIBUTION_PERIOD_TYPES.YEAR,
        period_no: 1,
        quantity: item.requested_quantity,
      },
    ];
  }

  const expectedType =
    item.distribution_method === DISTRIBUTION_METHODS.MONTHLY
      ? DISTRIBUTION_PERIOD_TYPES.MONTH
      : item.distribution_method === DISTRIBUTION_METHODS.QUARTERLY
        ? DISTRIBUTION_PERIOD_TYPES.QUARTER
        : null;

  const rows = item.distribution.filter(
    (distribution) =>
      !expectedType || distribution.period_type === expectedType,
  );

  if (!rows.length) {
    throw new ApiError(
      400,
      "Distribution rows are required for the selected distribution method",
      "DISTRIBUTION_REQUIRED",
    );
  }

  return rows;
}

function assertDistributionMatchesQuantity(item) {
  const distributions = normalizeDistributions(item);
  const total = roundQuantity(
    distributions.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
  );
  const requested = roundQuantity(item.requested_quantity);

  if (total !== requested) {
    throw new ApiError(
      400,
      "Distribution total must equal requested quantity",
      "DISTRIBUTION_TOTAL_MISMATCH",
      {
        catalogItemId: item.catalog_item_id,
        requestedQuantity: requested,
        distributedQuantity: total,
      },
    );
  }

  return distributions;
}

function assertDuplicateCatalogItems(items) {
  const seen = new Set();

  for (const item of items) {
    const key = Number(item.catalog_item_id);
    if (seen.has(key)) {
      throw new ApiError(
        409,
        "The same catalog item cannot be requested twice in one category budget",
        "DUPLICATE_CATALOG_ITEM",
      );
    }
    seen.add(key);
  }
}

async function buildDepartmentBudgetDetail(
  departmentBudgetId,
  transaction = null,
) {
  const budget = await findDepartmentBudgetByIdRepo(
    departmentBudgetId,
    transaction,
  );
  const categories = await listCategoryBudgetsForDepartmentBudgetRepo(
    departmentBudgetId,
    transaction,
  );
  const itemRows = await listItemsForDepartmentBudgetRepo(
    departmentBudgetId,
    transaction,
  );

  return mapDepartmentBudgetDetail({ budget, categories, itemRows });
}

export async function getCurrentDepartmentBudgetService({ budgetAccess }) {
  assertCanView(budgetAccess);
  const departmentId = assertDepartmentWorkspace(budgetAccess);
  const budget = await findCurrentDepartmentBudgetRepo({ departmentId });

  if (!budget) {
    const latestYear = await findLatestFinancialYearRepo();
    throw new ApiError(
      404,
      latestYear
        ? "No department budget has been initialized for your department in the current financial year"
        : "No financial year has been opened",
      "CURRENT_DEPARTMENT_BUDGET_NOT_FOUND",
    );
  }

  const detail = await buildDepartmentBudgetDetail(budget.id);

  return {
    budget: detail,
    financialYear: {
      id: detail.financial_year_id,
      year: detail.financial_year,
      status: detail.financial_year_status,
    },
  };
}

export async function listMyDepartmentBudgetsService({ budgetAccess }) {
  assertCanView(budgetAccess);
  const departmentId = assertDepartmentWorkspace(budgetAccess);
  const budgets = await listDepartmentBudgetsRepo({ departmentId });

  return budgets.map(mapDepartmentBudgetSummary);
}

export async function listAllDepartmentBudgetsOverviewService({ budgetAccess }) {
  assertCanViewAllBudgets(budgetAccess);
  const rows = await listAllDepartmentBudgetsOverviewRepo();

  return rows.map(mapAllDepartmentBudgetOverview);
}

export async function listCategoryBudgetOverviewService({ budgetAccess }) {
  const budgetCategoryId = assertCategoryOverviewAccess(budgetAccess);
  const rows = await listCategoryDepartmentItemsOverviewRepo({
    budgetCategoryId,
  });

  return mapCategoryDepartmentItemsOverview(rows);
}

export async function getDepartmentBudgetByIdService({
  departmentBudgetId,
  budgetAccess,
}) {
  const budget = await findDepartmentBudgetByIdRepo(departmentBudgetId);

  if (hasAnyPermission(budgetAccess, ALL_DEPARTMENT_BUDGETS_OVERVIEW_PERMISSIONS)) {
    if (!budget) {
      throw new ApiError(404, "Department budget not found", "BUDGET_NOT_FOUND");
    }
    return buildDepartmentBudgetDetail(departmentBudgetId);
  }

  assertCanView(budgetAccess);
  const departmentId = assertDepartmentWorkspace(budgetAccess);
  assertOwnDepartmentBudget(budget, departmentId);

  return buildDepartmentBudgetDetail(departmentBudgetId);
}

export async function getCopyableBudgetHistoryService({ budgetAccess }) {
  assertCanView(budgetAccess);
  const departmentId = assertDepartmentWorkspace(budgetAccess);
  const rows = await listCopyableCategoryBudgetHistoryRepo({ departmentId });

  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    department_id: row.department_id,
    department_name: row.department_name,
    category_id: row.budget_category_id,
    category_name: row.category_name,
    status: row.status,
    items_count: Number(row.items_count || 0),
    total_requested_quantity: Number(row.total_requested_quantity || 0),
    total_amount: Number(row.total_requested_quantity || 0),
  }));
}

export async function getBudgetHistoryItemsService({
  departmentCategoryBudgetId,
  budgetAccess,
}) {
  assertCanView(budgetAccess);
  const departmentId = assertDepartmentWorkspace(budgetAccess);
  const categoryBudget = await findDepartmentCategoryBudgetRepo(
    departmentCategoryBudgetId,
  );

  if (!categoryBudget) {
    throw new ApiError(
      404,
      "Department category budget history not found",
      "DEPARTMENT_CATEGORY_BUDGET_NOT_FOUND",
    );
  }

  if (Number(categoryBudget.department_id) !== Number(departmentId)) {
    throw new ApiError(
      403,
      "You cannot access another department budget history",
      "DEPARTMENT_BUDGET_SCOPE_DENIED",
    );
  }

  const itemRows = await listHistoryItemsForCategoryBudgetRepo(
    departmentCategoryBudgetId,
  );
  const detail = mapDepartmentBudgetDetail({
    budget: {
      id: categoryBudget.department_budget_id,
      financial_year_id: categoryBudget.financial_year_id,
      financial_year: categoryBudget.financial_year,
      financial_year_status: categoryBudget.financial_year_status,
      department_id: categoryBudget.department_id,
      department_name: categoryBudget.department_name,
      overall_status: categoryBudget.status,
    },
    categories: [
      {
        department_category_budget_id: categoryBudget.id,
        department_budget_id: categoryBudget.department_budget_id,
        budget_category_id: categoryBudget.budget_category_id,
        category_code: categoryBudget.category_code,
        category_name: categoryBudget.category_name,
        status: categoryBudget.status,
      },
    ],
    itemRows,
  });

  return detail.items;
}

export async function saveDepartmentCategoryItemsService({
  departmentCategoryBudgetId,
  items,
  actorUserId,
  budgetAccess,
}) {
  assertCanManage(budgetAccess);
  const departmentId = assertDepartmentWorkspace(budgetAccess);
  assertDuplicateCatalogItems(items);

  const saved = await withTransaction(async (transaction) => {
    const categoryBudget = await findDepartmentCategoryBudgetRepo(
      departmentCategoryBudgetId,
      transaction,
    );

    if (!categoryBudget) {
      throw new ApiError(
        404,
        "Department category budget not found",
        "DEPARTMENT_CATEGORY_BUDGET_NOT_FOUND",
      );
    }

    if (Number(categoryBudget.department_id) !== Number(departmentId)) {
      throw new ApiError(
        403,
        "You cannot modify another department budget",
        "DEPARTMENT_BUDGET_SCOPE_DENIED",
      );
    }

    if (categoryBudget.financial_year_status !== "OPEN") {
      throw new ApiError(
        400,
        "Department budgets can only be edited while the financial year is OPEN",
        "FINANCIAL_YEAR_NOT_OPEN",
      );
    }

    if (categoryBudget.status !== DEPARTMENT_CATEGORY_BUDGET_STATUS.DRAFT) {
      throw new ApiError(
        400,
        "Only draft category budgets can be edited",
        "DEPARTMENT_CATEGORY_BUDGET_READ_ONLY",
      );
    }

    const keepItemIds = [];

    for (const item of items) {
      const catalogItem = await validateActiveCatalogItemForCategoryRepo(
        {
          catalogItemId: item.catalog_item_id,
          budgetCategoryId: categoryBudget.budget_category_id,
          transaction,
        },
      );

      if (!catalogItem) {
        throw new ApiError(
          400,
          "Selected catalog item is not active in this category",
          "INVALID_CATALOG_ITEM",
          { catalogItemId: item.catalog_item_id },
        );
      }

      const distributions = assertDistributionMatchesQuantity(item);
      const savedItem = await upsertDepartmentCategoryBudgetItemRepo(
        transaction,
        {
          id: item.id,
          department_category_budget_id: departmentCategoryBudgetId,
          catalog_item_id: item.catalog_item_id,
          catalog_item_name_snapshot: catalogItem.name,
          catalog_item_code_snapshot: catalogItem.item_code,
          expense_type_snapshot: catalogItem.expense_type,
          unit_of_measure_id_snapshot: catalogItem.unit_of_measure_id,
          unit_name_snapshot: catalogItem.unit_name,
          unit_code_snapshot: catalogItem.unit_code,
          is_project: Boolean(item.is_project ?? item.isProject),
          requested_quantity: item.requested_quantity,
          distribution_method: item.distribution_method,
          hod_item_note: item.hod_item_note,
          actor_user_id: actorUserId,
        },
      );

      keepItemIds.push(Number(savedItem.id));

      await replaceItemDistributionsRepo(transaction, {
        itemId: savedItem.id,
        distributions,
      });
    }

    await deactivateCategoryBudgetItemsNotInListRepo(transaction, {
      departmentCategoryBudgetId,
      keepItemIds,
      actorUserId,
    });

    await touchDepartmentCategoryBudgetRepo(transaction, {
      departmentCategoryBudgetId,
      actorUserId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: categoryBudget.financial_year_id,
      entity_type: "DEPARTMENT_CATEGORY_BUDGET",
      entity_id: departmentCategoryBudgetId,
      action: WORKFLOW_ACTIONS.CATEGORY_DRAFT_SAVED,
      old_status: categoryBudget.status,
      new_status: categoryBudget.status,
      note: "Department category budget draft saved",
      new_values_json: JSON.stringify({ itemCount: items.length }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return buildDepartmentBudgetDetail(
      categoryBudget.department_budget_id,
      transaction,
    );
  });

  return saved;
}

async function ensurePackageRecordsForSubmittedItems({
  transaction,
  categoryBudget,
  items,
  actorUserId,
}) {
  const packageHeader = await findCategoryPackageRepo(
    {
      financialYearId: categoryBudget.financial_year_id,
      budgetCategoryId: categoryBudget.budget_category_id,
    },
    transaction,
  );

  if (!packageHeader) {
    throw new ApiError(
      500,
      "Category package is missing for this financial year and category",
      "CATEGORY_PACKAGE_NOT_INITIALIZED",
    );
  }

  for (const item of items) {
    const packageItem = await ensurePackageItemRepo(transaction, {
      category_budget_package_id: packageHeader.id,
      catalog_item_id: item.catalog_item_id,
      catalog_item_name_snapshot: item.catalog_item_name,
      catalog_item_code_snapshot: item.item_code,
      expense_type_snapshot: item.expense_type,
      unit_of_measure_id_snapshot: item.unit_of_measure_id,
      unit_name_snapshot: item.unit_name,
      unit_code_snapshot: item.unit_code,
      actor_user_id: actorUserId,
    });

    const generalSubItem = await findGeneralCatalogSubItemRepo(
      { catalogItemId: item.catalog_item_id },
      transaction,
    );

    if (!generalSubItem) {
      throw new ApiError(
        400,
        "The selected catalog item does not have an active General sub-item",
        "GENERAL_SUB_ITEM_MISSING",
        { catalogItemId: item.catalog_item_id },
      );
    }

    await ensureGeneralPackageSubItemRepo(transaction, {
      category_budget_package_item_id: packageItem.id,
      catalog_sub_item_id: generalSubItem.id,
      name: generalSubItem.name,
      specification: generalSubItem.default_specification,
      unit_of_measure_id: generalSubItem.default_unit_of_measure_id,
      actor_user_id: actorUserId,
    });
  }
}

export async function submitDepartmentCategoryBudgetService({
  departmentCategoryBudgetId,
  actorUserId,
  budgetAccess,
}) {
  assertCanSubmit(budgetAccess);
  const departmentId = assertDepartmentWorkspace(budgetAccess);

  const submitted = await withTransaction(async (transaction) => {
    const categoryBudget = await findDepartmentCategoryBudgetRepo(
      departmentCategoryBudgetId,
      transaction,
    );

    if (!categoryBudget) {
      throw new ApiError(
        404,
        "Department category budget not found",
        "DEPARTMENT_CATEGORY_BUDGET_NOT_FOUND",
      );
    }

    if (Number(categoryBudget.department_id) !== Number(departmentId)) {
      throw new ApiError(
        403,
        "You cannot submit another department budget",
        "DEPARTMENT_BUDGET_SCOPE_DENIED",
      );
    }

    if (categoryBudget.financial_year_status !== "OPEN") {
      throw new ApiError(
        400,
        "Department category budgets can only be submitted while the financial year is OPEN",
        "FINANCIAL_YEAR_NOT_OPEN",
      );
    }

    if (categoryBudget.status !== DEPARTMENT_CATEGORY_BUDGET_STATUS.DRAFT) {
      throw new ApiError(
        400,
        "Only draft category budgets can be submitted",
        "INVALID_DEPARTMENT_CATEGORY_BUDGET_STATUS",
      );
    }

    const window = await findSubmissionWindowRepo(
      {
        financialYearId: categoryBudget.financial_year_id,
        budgetCategoryId: categoryBudget.budget_category_id,
      },
      transaction,
    );

    if (!window || window.status !== CATEGORY_SUBMISSION_WINDOW_STATUS.OPEN) {
      throw new ApiError(
        400,
        "This category submission window is closed",
        "CATEGORY_SUBMISSION_WINDOW_CLOSED",
      );
    }

    const itemCount = await countActiveItemsForCategoryBudgetRepo(
      departmentCategoryBudgetId,
      transaction,
    );

    if (itemCount === 0) {
      throw new ApiError(
        400,
        "Add at least one item before submitting this category budget",
        "DEPARTMENT_CATEGORY_BUDGET_HAS_NO_ITEMS",
      );
    }

    const items = groupCategoryItemRows(
      await listItemsForCategoryBudgetRepo(
        departmentCategoryBudgetId,
        transaction,
      ),
    );

    for (const item of items) {
      assertDistributionMatchesQuantity(item);
    }

    await ensurePackageRecordsForSubmittedItems({
      transaction,
      categoryBudget,
      items,
      actorUserId,
    });

    await markItemsPendingCategoryReviewRepo(transaction, {
      departmentCategoryBudgetId,
      actorUserId,
    });

    const updated = await markCategoryBudgetSubmittedRepo(transaction, {
      department_category_budget_id: departmentCategoryBudgetId,
      submitted_by: actorUserId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "The category budget status changed before submission",
        "DEPARTMENT_CATEGORY_BUDGET_SUBMIT_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: categoryBudget.financial_year_id,
      entity_type: "DEPARTMENT_CATEGORY_BUDGET",
      entity_id: departmentCategoryBudgetId,
      action: WORKFLOW_ACTIONS.CATEGORY_SUBMITTED,
      old_status: categoryBudget.status,
      new_status: DEPARTMENT_CATEGORY_BUDGET_STATUS.IN_CATEGORY_REVIEW,
      note: `${categoryBudget.category_name} budget submitted to Category Manager`,
      new_values_json: JSON.stringify({ itemCount: items.length }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return {
      categoryBudget,
      itemCount: items.length,
      detail: await buildDepartmentBudgetDetail(
        categoryBudget.department_budget_id,
        transaction,
      ),
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.DEPARTMENT_CATEGORY_BUDGET_SUBMITTED,
    entityType: "DEPARTMENT_CATEGORY_BUDGET",
    entityId: departmentCategoryBudgetId,
    payload: {
      departmentCategoryBudgetId,
      categoryBudgetId: departmentCategoryBudgetId,
      categoryId: submitted.categoryBudget.budget_category_id,
      departmentId: submitted.categoryBudget.department_id,
      departmentName: submitted.categoryBudget.department_name,
      categoryName: submitted.categoryBudget.category_name,
      financialYear: submitted.categoryBudget.financial_year,
      itemCount: submitted.itemCount,
      submittedBy: actorUserId,
      actorUserId,
    },
  });

  return submitted.detail;
}
