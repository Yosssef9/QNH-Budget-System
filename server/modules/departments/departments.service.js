import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";
import {
  createDepartmentBudgetRepo,
  createDepartmentCategoryBudgetRepo,
  listActiveBudgetCategoriesRepo,
} from "../financial-years/financialYears.repository.js";
import {
  DEPARTMENT_CATEGORY_BUDGET_STATUS,
  REQUIRED_DEPARTMENT_CATEGORY_CODES,
} from "./departments.constants.js";
import { mapDepartment, mapDepartmentProvisioning } from "./departments.mapper.js";
import {
  countActiveDepartmentAssignmentsRepo,
  createDepartmentRepo,
  findActiveFinancialYearForDepartmentSetupRepo,
  findDepartmentBudgetForYearRepo,
  findDepartmentByIdRepo,
  getOpenYearOnboardingReadinessRepo,
  listDepartmentsRepo,
  updateDepartmentDescriptionRepo,
  updateDepartmentStatusRepo,
} from "./departments.repository.js";

function isUniqueConstraintError(error) {
  return error?.number === 2601 || error?.number === 2627;
}

function assertDepartmentExists(department) {
  if (!department) {
    throw new ApiError(404, "Department not found", "DEPARTMENT_NOT_FOUND");
  }

  return department;
}

function requiredCategories(categories) {
  const byCode = new Map(
    categories.map((category) => [category.category_code, category]),
  );
  const missingCodes = REQUIRED_DEPARTMENT_CATEGORY_CODES.filter(
    (code) => !byCode.has(code),
  );

  if (missingCodes.length) {
    throw new ApiError(
      409,
      `Cannot initialize the department. Missing active budget categories: ${missingCodes.join(", ")}`,
      "DEPARTMENT_REQUIRED_CATEGORIES_MISSING",
      { missingCodes },
    );
  }

  return REQUIRED_DEPARTMENT_CATEGORY_CODES.map((code) => byCode.get(code));
}

function assertOpenYearCanAcceptDepartment(readiness) {
  const ready =
    Number(readiness?.submission_window_count) === 3 &&
    Number(readiness?.open_submission_window_count) === 3 &&
    Number(readiness?.category_package_count) === 3 &&
    Number(readiness?.untouched_draft_package_count) === 3;

  if (!ready) {
    throw new ApiError(
      409,
      "The active financial year has progressed beyond department onboarding. Add the department as inactive for a future year.",
      "DEPARTMENT_ONBOARDING_WINDOW_CLOSED",
      {
        submissionWindowCount: Number(readiness?.submission_window_count || 0),
        openSubmissionWindowCount: Number(
          readiness?.open_submission_window_count || 0,
        ),
        categoryPackageCount: Number(readiness?.category_package_count || 0),
        untouchedDraftPackageCount: Number(
          readiness?.untouched_draft_package_count || 0,
        ),
      },
    );
  }
}

async function provisionDepartmentForActiveYear({
  transaction,
  departmentId,
  actorUserId,
}) {
  const financialYear =
    await findActiveFinancialYearForDepartmentSetupRepo(transaction);

  if (!financialYear) return null;

  if (financialYear.status !== "OPEN") {
    throw new ApiError(
      409,
      "A department cannot be activated after the financial year enters pre-closing. Add it as inactive for a future year.",
      "DEPARTMENT_ACTIVE_YEAR_NOT_OPEN",
    );
  }

  const existingBudget = await findDepartmentBudgetForYearRepo(
    transaction,
    financialYear.id,
    departmentId,
  );

  if (existingBudget) {
    if (Number(existingBudget.category_budget_count) !== 3) {
      throw new ApiError(
        409,
        "The department's existing financial-year budget is incomplete and must be repaired before activation",
        "DEPARTMENT_ACTIVE_YEAR_BUDGET_INCOMPLETE",
        {
          departmentBudgetId: existingBudget.id,
          categoryBudgetCount: Number(existingBudget.category_budget_count || 0),
        },
      );
    }

    return {
      financialYearId: financialYear.id,
      financialYear: financialYear.year,
      departmentBudgetId: existingBudget.id,
      categoryBudgetCount: Number(existingBudget.category_budget_count),
    };
  }

  assertOpenYearCanAcceptDepartment(
    await getOpenYearOnboardingReadinessRepo(transaction, financialYear.id),
  );

  const categories = requiredCategories(
    await listActiveBudgetCategoriesRepo(transaction),
  );
  const departmentBudget = await createDepartmentBudgetRepo(transaction, {
    financial_year_id: financialYear.id,
    department_id: departmentId,
    created_by: actorUserId,
  });

  for (const category of categories) {
    await createDepartmentCategoryBudgetRepo(transaction, {
      department_budget_id: departmentBudget.id,
      budget_category_id: category.id,
      status: DEPARTMENT_CATEGORY_BUDGET_STATUS.DRAFT,
      created_by: actorUserId,
    });
  }

  return {
    financialYearId: financialYear.id,
    financialYear: financialYear.year,
    departmentBudgetId: departmentBudget.id,
    categoryBudgetCount: categories.length,
  };
}

export async function listDepartmentsService(filters) {
  const departments = await listDepartmentsRepo(filters);
  return departments.map(mapDepartment);
}

export async function createDepartmentService({ payload, actorUserId }) {
  try {
    const result = await withTransaction(async (transaction) => {
      const department = await createDepartmentRepo(transaction, {
        ...payload,
        created_by: actorUserId,
      });
      const provisioning = payload.is_active
        ? await provisionDepartmentForActiveYear({
            transaction,
            departmentId: department.id,
            actorUserId,
          })
        : null;

      return { department, provisioning };
    });

    return {
      ...mapDepartment(result.department),
      provisioning: mapDepartmentProvisioning(result.provisioning),
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(
        409,
        "A department with this name or code already exists",
        "DEPARTMENT_ALREADY_EXISTS",
      );
    }

    throw error;
  }
}

export async function updateDepartmentDescriptionService({
  departmentId,
  description,
  actorUserId,
}) {
  return withTransaction(async (transaction) => {
    assertDepartmentExists(
      await findDepartmentByIdRepo(departmentId, transaction, true),
    );
    const department = await updateDepartmentDescriptionRepo(transaction, {
      id: departmentId,
      description,
      updated_by: actorUserId,
    });

    return mapDepartment(department);
  });
}

export async function updateDepartmentStatusService({
  departmentId,
  isActive,
  actorUserId,
}) {
  return withTransaction(async (transaction) => {
    const existing = assertDepartmentExists(
      await findDepartmentByIdRepo(departmentId, transaction, true),
    );

    if (Boolean(existing.is_active) === isActive) {
      return {
        ...mapDepartment(existing),
        provisioning: null,
      };
    }

    let provisioning = null;

    if (isActive) {
      provisioning = await provisionDepartmentForActiveYear({
        transaction,
        departmentId,
        actorUserId,
      });
    } else {
      const activeAssignments = await countActiveDepartmentAssignmentsRepo(
        transaction,
        departmentId,
      );

      if (activeAssignments > 0) {
        throw new ApiError(
          409,
          "Deactivate this department's active user-role assignments first",
          "DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS",
          { activeAssignmentCount: activeAssignments },
        );
      }

      const activeYear =
        await findActiveFinancialYearForDepartmentSetupRepo(transaction);
      const activeYearBudget = activeYear
        ? await findDepartmentBudgetForYearRepo(
            transaction,
            activeYear.id,
            departmentId,
          )
        : null;

      if (activeYearBudget) {
        throw new ApiError(
          409,
          `This department already has a budget in financial year ${activeYear.year} and cannot be deactivated while that year is ${activeYear.status}`,
          "DEPARTMENT_HAS_ACTIVE_YEAR_BUDGET",
        );
      }
    }

    const department = await updateDepartmentStatusRepo(transaction, {
      id: departmentId,
      is_active: isActive,
      updated_by: actorUserId,
    });

    return {
      ...mapDepartment(department),
      provisioning: mapDepartmentProvisioning(provisioning),
    };
  });
}
