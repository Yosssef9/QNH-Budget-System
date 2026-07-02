import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import {
  CATEGORY_PACKAGE_STATUS,
  CATEGORY_SUBMISSION_WINDOW_STATUS,
  DEPARTMENT_CATEGORY_BUDGET_STATUS,
  FINANCIAL_YEAR_STATUS,
  REQUIRED_CATEGORY_CODES,
  WORKFLOW_ACTIONS,
} from "./financialYears.constants.js";
import {
  countDepartmentBudgetsForYearRepo,
  countIncompleteCategoryPackagesForYearRepo,
  countOpenChangeRequestsForYearRepo,
  countPendingPoLinksForYearRepo,
  countPendingTransfersForYearRepo,
  createCategoryPackageRepo,
  createDepartmentBudgetRepo,
  createDepartmentCategoryBudgetRepo,
  createFinancialYearRepo,
  createSubmissionWindowRepo,
  createWorkflowHistoryRepo,
  findActiveFinancialYearRepo,
  findFinancialYearByIdRepo,
  findFinancialYearByYearRepo,
  findLatestFinancialYearRepo,
  findOpenFinancialYearRepo,
  getFinancialYearsRepo,
  listActiveBudgetCategoriesRepo,
  listActiveDepartmentsRepo,
  transitionFinancialYearToClosedRepo,
  transitionFinancialYearToPreClosingRepo,
} from "./financialYears.repository.js";
import {
  mapFinancialYear,
  mapInitializationSummary,
} from "./financialYears.mapper.js";

function getUserRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getActingWorkspace(budgetAccess) {
  return budgetAccess?.workspaceType ?? budgetAccess?.role?.code ?? null;
}

function assertRequiredCategories(categories) {
  const activeCodes = new Set(categories.map((category) => category.category_code));
  const missingCodes = REQUIRED_CATEGORY_CODES.filter((code) => !activeCodes.has(code));

  if (missingCodes.length) {
    throw new ApiError(
      400,
      `Cannot open financial year. Missing active budget categories: ${missingCodes.join(", ")}`,
      "REQUIRED_BUDGET_CATEGORIES_MISSING",
      { missingCodes },
    );
  }

  return REQUIRED_CATEGORY_CODES.map((code) =>
    categories.find((category) => category.category_code === code),
  );
}

async function queueLifecycleNotification(notificationType, financialYear, actorUserId) {
  await queueNotification({
    notificationType,
    entityType: "FINANCIAL_YEAR",
    entityId: financialYear.id,
    payload: {
      financialYearId: financialYear.id,
      year: financialYear.year,
      actorUserId,
    },
  });
}

export async function getFinancialYearsService() {
  const years = await getFinancialYearsRepo();
  return years.map(mapFinancialYear);
}

export async function getOpenFinancialYearService() {
  const openYear = await findOpenFinancialYearRepo();

  if (!openYear) {
    throw new ApiError(
      404,
      "No open financial year found",
      "OPEN_FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  return mapFinancialYear(openYear);
}

export async function getCurrentFinancialYearService() {
  const financialYear = await findLatestFinancialYearRepo();

  if (!financialYear) {
    throw new ApiError(
      404,
      "No financial year found",
      "FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  return mapFinancialYear(financialYear);
}

export async function getFinancialYearByIdService(id) {
  const financialYear = await findFinancialYearByIdRepo(id);
  return mapFinancialYear(financialYear);
}

export async function createFinancialYearService({
  year,
  actorUserId,
  budgetAccess,
}) {
  const existingYear = await findFinancialYearByYearRepo(year);

  if (existingYear) {
    throw new ApiError(
      409,
      `Financial year ${year} already exists`,
      "FINANCIAL_YEAR_ALREADY_EXISTS",
    );
  }

  const latestYear = await findLatestFinancialYearRepo();

  if (latestYear && year !== Number(latestYear.year) + 1) {
    throw new ApiError(
      400,
      `Invalid financial year sequence. The next financial year must be ${Number(latestYear.year) + 1}.`,
      "INVALID_FINANCIAL_YEAR_SEQUENCE",
      {
        latestYear: latestYear.year,
        requiredNextYear: Number(latestYear.year) + 1,
        requestedYear: year,
      },
    );
  }

  const activeYear = await findActiveFinancialYearRepo();

  if (activeYear) {
    throw new ApiError(
      409,
      `Financial year ${activeYear.year} is still ${activeYear.status}. Close it first.`,
      "ACTIVE_FINANCIAL_YEAR_ALREADY_EXISTS",
    );
  }

  const result = await withTransaction(async (transaction) => {
    const departments = await listActiveDepartmentsRepo(transaction);

    if (!departments.length) {
      throw new ApiError(
        400,
        "Cannot open financial year. No active departments found.",
        "NO_ACTIVE_DEPARTMENTS",
      );
    }

    const categories = assertRequiredCategories(
      await listActiveBudgetCategoriesRepo(transaction),
    );

    const financialYear = await createFinancialYearRepo(transaction, {
      year,
      opened_by: actorUserId,
    });

    const summary = {
      departments: departments.length,
      categories: categories.length,
      departmentBudgets: 0,
      departmentCategoryBudgets: 0,
      submissionWindows: 0,
      categoryPackages: 0,
    };

    for (const department of departments) {
      const departmentBudget = await createDepartmentBudgetRepo(transaction, {
        financial_year_id: financialYear.id,
        department_id: department.id,
        created_by: actorUserId,
      });
      summary.departmentBudgets += 1;

      for (const category of categories) {
        await createDepartmentCategoryBudgetRepo(transaction, {
          department_budget_id: departmentBudget.id,
          budget_category_id: category.id,
          status: DEPARTMENT_CATEGORY_BUDGET_STATUS.DRAFT,
          created_by: actorUserId,
        });
        summary.departmentCategoryBudgets += 1;
      }
    }

    for (const category of categories) {
      await createSubmissionWindowRepo(transaction, {
        financial_year_id: financialYear.id,
        budget_category_id: category.id,
        status: CATEGORY_SUBMISSION_WINDOW_STATUS.OPEN,
      });
      summary.submissionWindows += 1;

      await createCategoryPackageRepo(transaction, {
        financial_year_id: financialYear.id,
        budget_category_id: category.id,
        status: CATEGORY_PACKAGE_STATUS.DRAFT,
        created_by: actorUserId,
      });
      summary.categoryPackages += 1;
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: financialYear.id,
      entity_type: "FINANCIAL_YEAR",
      entity_id: financialYear.id,
      action: WORKFLOW_ACTIONS.OPENED,
      old_status: null,
      new_status: FINANCIAL_YEAR_STATUS.OPEN,
      note: `Financial year ${year} opened and initialized`,
      new_values_json: JSON.stringify({ financialYear, summary }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return {
      financialYear,
      initializationSummary: summary,
    };
  });

  await queueLifecycleNotification(
    NOTIFICATION_TYPES.FINANCIAL_YEAR_OPENED,
    result.financialYear,
    actorUserId,
  );

  return {
    ...mapFinancialYear(result.financialYear),
    initialization_summary: mapInitializationSummary(result.initializationSummary),
  };
}

export async function preCloseFinancialYearService({
  id,
  actorUserId,
  budgetAccess,
}) {
  const financialYear = await findFinancialYearByIdRepo(id);

  if (!financialYear) {
    throw new ApiError(
      404,
      "Financial year not found",
      "FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  if (financialYear.status !== FINANCIAL_YEAR_STATUS.OPEN) {
    throw new ApiError(
      400,
      "Only OPEN financial years can be moved to pre-closing",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  const departmentBudgetCount = await countDepartmentBudgetsForYearRepo(id);

  if (departmentBudgetCount === 0) {
    throw new ApiError(
      400,
      "Cannot pre-close financial year. No department budgets exist for this financial year.",
      "FINANCIAL_YEAR_HAS_NO_DEPARTMENT_BUDGETS",
    );
  }

  const incompletePackages = await countIncompleteCategoryPackagesForYearRepo(id);

  if (incompletePackages > 0) {
    throw new ApiError(
      400,
      `Cannot pre-close financial year. There are ${incompletePackages} category package(s) not completed by CFO.`,
      "FINANCIAL_YEAR_HAS_INCOMPLETE_CATEGORY_PACKAGES",
      { incompletePackages },
    );
  }

  const openChangeRequests = await countOpenChangeRequestsForYearRepo(id);

  if (openChangeRequests > 0) {
    throw new ApiError(
      400,
      `Cannot pre-close financial year. There are ${openChangeRequests} open change request(s).`,
      "FINANCIAL_YEAR_HAS_OPEN_CHANGE_REQUESTS",
      { openChangeRequests },
    );
  }

  const preClosedYear = await withTransaction(async (transaction) => {
    const current = await findFinancialYearByIdRepo(id, transaction);

    if (!current || current.status !== FINANCIAL_YEAR_STATUS.OPEN) {
      throw new ApiError(
        409,
        "Financial year is no longer OPEN",
        "FINANCIAL_YEAR_STATUS_CONFLICT",
      );
    }

    const currentIncompletePackages =
      await countIncompleteCategoryPackagesForYearRepo(id, transaction);

    if (currentIncompletePackages > 0) {
      throw new ApiError(
        409,
        "Financial year package readiness changed before pre-closing",
        "FINANCIAL_YEAR_READINESS_CONFLICT",
        { incompletePackages: currentIncompletePackages },
      );
    }

    const currentOpenChangeRequests =
      await countOpenChangeRequestsForYearRepo(id, transaction);

    if (currentOpenChangeRequests > 0) {
      throw new ApiError(
        409,
        "Financial year change-request readiness changed before pre-closing",
        "FINANCIAL_YEAR_CHANGE_REQUEST_CONFLICT",
        { openChangeRequests: currentOpenChangeRequests },
      );
    }

    const updatedYear = await transitionFinancialYearToPreClosingRepo(
      transaction,
      {
        id,
        pre_closed_by: actorUserId,
      },
    );

    if (!updatedYear) {
      throw new ApiError(
        409,
        "Financial year could not be moved to pre-closing",
        "FINANCIAL_YEAR_PRE_CLOSE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: id,
      entity_type: "FINANCIAL_YEAR",
      entity_id: id,
      action: WORKFLOW_ACTIONS.PRE_CLOSED,
      old_status: FINANCIAL_YEAR_STATUS.OPEN,
      new_status: FINANCIAL_YEAR_STATUS.PRE_CLOSING,
      note: `Financial year ${current.year} moved to PRE_CLOSING`,
      old_values_json: JSON.stringify(current),
      new_values_json: JSON.stringify(updatedYear),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return updatedYear;
  });

  await queueLifecycleNotification(
    NOTIFICATION_TYPES.FINANCIAL_YEAR_PRE_CLOSING,
    preClosedYear,
    actorUserId,
  );

  return mapFinancialYear(preClosedYear);
}

export async function closeFinancialYearService({
  id,
  actorUserId,
  budgetAccess,
}) {
  const financialYear = await findFinancialYearByIdRepo(id);

  if (!financialYear) {
    throw new ApiError(
      404,
      "Financial year not found",
      "FINANCIAL_YEAR_NOT_FOUND",
    );
  }

  if (financialYear.status !== FINANCIAL_YEAR_STATUS.PRE_CLOSING) {
    throw new ApiError(
      400,
      "Only PRE_CLOSING financial years can be closed",
      "FINANCIAL_YEAR_NOT_PRE_CLOSING",
    );
  }

  const pendingTransfers = await countPendingTransfersForYearRepo(id);

  if (pendingTransfers > 0) {
    throw new ApiError(
      400,
      `Cannot close financial year. There are ${pendingTransfers} pending transfer request(s).`,
      "FINANCIAL_YEAR_HAS_PENDING_TRANSFERS",
      { pendingTransfers },
    );
  }

  const pendingPoLinks = await countPendingPoLinksForYearRepo(id);

  if (pendingPoLinks > 0) {
    throw new ApiError(
      400,
      `Cannot close financial year. There are ${pendingPoLinks} pending PO link request(s).`,
      "FINANCIAL_YEAR_HAS_PENDING_PO_LINKS",
      { pendingPoLinks },
    );
  }

  const closedYear = await withTransaction(async (transaction) => {
    const current = await findFinancialYearByIdRepo(id, transaction);

    if (!current || current.status !== FINANCIAL_YEAR_STATUS.PRE_CLOSING) {
      throw new ApiError(
        409,
        "Financial year is no longer PRE_CLOSING",
        "FINANCIAL_YEAR_STATUS_CONFLICT",
      );
    }

    const currentPendingTransfers = await countPendingTransfersForYearRepo(
      id,
      transaction,
    );

    if (currentPendingTransfers > 0) {
      throw new ApiError(
        409,
        "Financial year transfer readiness changed before closing",
        "FINANCIAL_YEAR_TRANSFER_CONFLICT",
        { pendingTransfers: currentPendingTransfers },
      );
    }

    const currentPendingPoLinks = await countPendingPoLinksForYearRepo(
      id,
      transaction,
    );

    if (currentPendingPoLinks > 0) {
      throw new ApiError(
        409,
        "Financial year PO-link readiness changed before closing",
        "FINANCIAL_YEAR_PO_LINK_CONFLICT",
        { pendingPoLinks: currentPendingPoLinks },
      );
    }

    const updatedYear = await transitionFinancialYearToClosedRepo(transaction, {
      id,
      closed_by: actorUserId,
    });

    if (!updatedYear) {
      throw new ApiError(
        409,
        "Financial year could not be closed",
        "FINANCIAL_YEAR_CLOSE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: id,
      entity_type: "FINANCIAL_YEAR",
      entity_id: id,
      action: WORKFLOW_ACTIONS.CLOSED,
      old_status: FINANCIAL_YEAR_STATUS.PRE_CLOSING,
      new_status: FINANCIAL_YEAR_STATUS.CLOSED,
      note: `Financial year ${current.year} closed`,
      old_values_json: JSON.stringify(current),
      new_values_json: JSON.stringify(updatedYear),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return updatedYear;
  });

  await queueLifecycleNotification(
    NOTIFICATION_TYPES.FINANCIAL_YEAR_CLOSED,
    closedYear,
    actorUserId,
  );

  return mapFinancialYear(closedYear);
}
