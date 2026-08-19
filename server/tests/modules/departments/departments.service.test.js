import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

vi.mock("../../../modules/financial-years/financialYears.repository.js", () => ({
  createDepartmentBudgetRepo: vi.fn(),
  createDepartmentCategoryBudgetRepo: vi.fn(),
  listActiveBudgetCategoriesRepo: vi.fn(),
}));

vi.mock("../../../modules/departments/departments.repository.js", () => ({
  countActiveDepartmentAssignmentsRepo: vi.fn(),
  createDepartmentRepo: vi.fn(),
  findActiveFinancialYearForDepartmentSetupRepo: vi.fn(),
  findDepartmentBudgetForYearRepo: vi.fn(),
  findDepartmentByIdRepo: vi.fn(),
  getOpenYearOnboardingReadinessRepo: vi.fn(),
  listDepartmentsRepo: vi.fn(),
  updateDepartmentDescriptionRepo: vi.fn(),
  updateDepartmentStatusRepo: vi.fn(),
}));

import {
  createDepartmentBudgetRepo,
  createDepartmentCategoryBudgetRepo,
  listActiveBudgetCategoriesRepo,
} from "../../../modules/financial-years/financialYears.repository.js";
import {
  countActiveDepartmentAssignmentsRepo,
  createDepartmentRepo,
  findActiveFinancialYearForDepartmentSetupRepo,
  findDepartmentBudgetForYearRepo,
  findDepartmentByIdRepo,
  getOpenYearOnboardingReadinessRepo,
  updateDepartmentStatusRepo,
} from "../../../modules/departments/departments.repository.js";
import {
  createDepartmentService,
  updateDepartmentStatusService,
} from "../../../modules/departments/departments.service.js";

const categories = [
  { id: 1, category_code: "IT" },
  { id: 2, category_code: "BIOMEDICAL" },
  { id: 3, category_code: "GENERAL" },
];

const activeDepartmentPayload = {
  name: "Clinical Engineering",
  department_code: "CLINICAL_ENGINEERING",
  description: null,
  is_active: true,
};

describe("departments service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an active department and provisions the open year", async () => {
    createDepartmentRepo.mockResolvedValue({
      id: 31,
      ...activeDepartmentPayload,
      created_by: 7,
    });
    findActiveFinancialYearForDepartmentSetupRepo.mockResolvedValue({
      id: 20,
      year: 2028,
      status: "OPEN",
    });
    findDepartmentBudgetForYearRepo.mockResolvedValue(null);
    getOpenYearOnboardingReadinessRepo.mockResolvedValue({
      submission_window_count: 3,
      open_submission_window_count: 3,
      category_package_count: 3,
      untouched_draft_package_count: 3,
    });
    listActiveBudgetCategoriesRepo.mockResolvedValue(categories);
    createDepartmentBudgetRepo.mockResolvedValue({ id: 400 });

    const result = await createDepartmentService({
      payload: activeDepartmentPayload,
      actorUserId: 7,
    });

    expect(createDepartmentCategoryBudgetRepo).toHaveBeenCalledTimes(3);
    expect(result.provisioning).toEqual({
      financial_year_id: 20,
      financial_year: 2028,
      department_budget_id: 400,
      category_budget_count: 3,
    });
  });

  it("creates an inactive department without current-year provisioning", async () => {
    createDepartmentRepo.mockResolvedValue({
      id: 31,
      ...activeDepartmentPayload,
      is_active: false,
      created_by: 7,
    });

    const result = await createDepartmentService({
      payload: { ...activeDepartmentPayload, is_active: false },
      actorUserId: 7,
    });

    expect(findActiveFinancialYearForDepartmentSetupRepo).not.toHaveBeenCalled();
    expect(createDepartmentBudgetRepo).not.toHaveBeenCalled();
    expect(result.provisioning).toBeNull();
  });

  it("blocks active creation after package processing has started", async () => {
    createDepartmentRepo.mockResolvedValue({
      id: 31,
      ...activeDepartmentPayload,
    });
    findActiveFinancialYearForDepartmentSetupRepo.mockResolvedValue({
      id: 20,
      year: 2028,
      status: "OPEN",
    });
    findDepartmentBudgetForYearRepo.mockResolvedValue(null);
    getOpenYearOnboardingReadinessRepo.mockResolvedValue({
      submission_window_count: 3,
      open_submission_window_count: 2,
      category_package_count: 3,
      untouched_draft_package_count: 3,
    });

    await expect(
      createDepartmentService({
        payload: activeDepartmentPayload,
        actorUserId: 7,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "DEPARTMENT_ONBOARDING_WINDOW_CLOSED",
    });
  });

  it("blocks activation after the financial year enters pre-closing", async () => {
    findDepartmentByIdRepo.mockResolvedValue({
      id: 31,
      ...activeDepartmentPayload,
      is_active: false,
    });
    findActiveFinancialYearForDepartmentSetupRepo.mockResolvedValue({
      id: 20,
      year: 2028,
      status: "PRE_CLOSING",
    });

    await expect(
      updateDepartmentStatusService({
        departmentId: 31,
        isActive: true,
        actorUserId: 7,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "DEPARTMENT_ACTIVE_YEAR_NOT_OPEN",
    });
    expect(updateDepartmentStatusRepo).not.toHaveBeenCalled();
  });

  it("blocks deactivation while active user assignments exist", async () => {
    findDepartmentByIdRepo.mockResolvedValue({
      id: 31,
      ...activeDepartmentPayload,
    });
    countActiveDepartmentAssignmentsRepo.mockResolvedValue(2);

    await expect(
      updateDepartmentStatusService({
        departmentId: 31,
        isActive: false,
        actorUserId: 7,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS",
    });
    expect(updateDepartmentStatusRepo).not.toHaveBeenCalled();
  });
});
