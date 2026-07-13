import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

vi.mock("../../../services/notification.service.js", () => ({
  queueNotification: vi.fn(),
}));

vi.mock("../../../modules/financial-years/financialYears.repository.js", () => ({
  countDepartmentBudgetsForYearRepo: vi.fn(),
  countCfoAnnualPackageReviewFinalizedRepo: vi.fn(),
  countIncompleteCategoryPackagesForYearRepo: vi.fn(),
  countOpenChangeRequestsForYearRepo: vi.fn(),
  countPendingPoLinksForYearRepo: vi.fn(),
  countPendingTransfersForYearRepo: vi.fn(),
  createCategoryPackageRepo: vi.fn(),
  createDepartmentBudgetRepo: vi.fn(),
  createDepartmentCategoryBudgetRepo: vi.fn(),
  createFinancialYearRepo: vi.fn(),
  createSubmissionWindowRepo: vi.fn(),
  createWorkflowHistoryRepo: vi.fn(),
  findActiveFinancialYearRepo: vi.fn(),
  findFinancialYearByIdRepo: vi.fn(),
  findFinancialYearByYearRepo: vi.fn(),
  findLatestFinancialYearRepo: vi.fn(),
  findOpenFinancialYearRepo: vi.fn(),
  getFinancialYearsRepo: vi.fn(),
  listActiveBudgetCategoriesRepo: vi.fn(),
  listActiveDepartmentsRepo: vi.fn(),
  transitionFinancialYearToClosedRepo: vi.fn(),
  transitionFinancialYearToPreClosingRepo: vi.fn(),
}));

import { queueNotification } from "../../../services/notification.service.js";
import {
  countDepartmentBudgetsForYearRepo,
  countCfoAnnualPackageReviewFinalizedRepo,
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
  listActiveBudgetCategoriesRepo,
  listActiveDepartmentsRepo,
  transitionFinancialYearToClosedRepo,
  transitionFinancialYearToPreClosingRepo,
} from "../../../modules/financial-years/financialYears.repository.js";
import {
  closeFinancialYearService,
  createFinancialYearService,
  preCloseFinancialYearService,
} from "../../../modules/financial-years/financialYears.service.js";

const budgetAccess = {
  userRoleId: 44,
  workspaceType: "GLOBAL",
  permissions: { can_manage_financial_years: true },
};

const categories = [
  { id: 1, category_code: "IT", name: "IT" },
  { id: 2, category_code: "BIOMEDICAL", name: "Biomedical" },
  { id: 3, category_code: "GENERAL", name: "General" },
];

describe("financial years service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueNotification.mockResolvedValue(undefined);
  });

  it("opens a financial year by initializing departments, category budgets, windows, packages, and history", async () => {
    findFinancialYearByYearRepo.mockResolvedValue(null);
    findLatestFinancialYearRepo.mockResolvedValue({
      id: 9,
      year: 2026,
      status: "CLOSED",
    });
    findActiveFinancialYearRepo.mockResolvedValue(null);
    listActiveDepartmentsRepo.mockResolvedValue([
      { id: 10, name: "IT Department" },
      { id: 11, name: "Finance" },
    ]);
    listActiveBudgetCategoriesRepo.mockResolvedValue(categories);
    createFinancialYearRepo.mockResolvedValue({
      id: 20,
      year: 2027,
      status: "OPEN",
      opened_by: 7,
      opened_at: "2026-01-01T00:00:00.000Z",
    });
    createDepartmentBudgetRepo
      .mockResolvedValueOnce({ id: 100 })
      .mockResolvedValueOnce({ id: 101 });

    const result = await createFinancialYearService({
      year: 2027,
      actorUserId: 7,
      budgetAccess,
    });

    expect(createDepartmentBudgetRepo).toHaveBeenCalledTimes(2);
    expect(createDepartmentCategoryBudgetRepo).toHaveBeenCalledTimes(6);
    expect(createSubmissionWindowRepo).toHaveBeenCalledTimes(3);
    expect(createCategoryPackageRepo).toHaveBeenCalledTimes(3);
    expect(createWorkflowHistoryRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        action: "FINANCIAL_YEAR_OPENED",
        user_role_id: 44,
        new_status: "OPEN",
      }),
    );
    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "FINANCIAL_YEAR_OPENED",
        entityId: 20,
      }),
    );
    expect(result.initialization_summary).toEqual({
      departments: 2,
      categories: 3,
      department_budgets: 2,
      department_category_budgets: 6,
      category_submission_windows: 3,
      category_budget_packages: 3,
    });
  });

  it("rejects opening when there are no active departments", async () => {
    findFinancialYearByYearRepo.mockResolvedValue(null);
    findLatestFinancialYearRepo.mockResolvedValue(null);
    findActiveFinancialYearRepo.mockResolvedValue(null);
    listActiveDepartmentsRepo.mockResolvedValue([]);

    await expect(
      createFinancialYearService({
        year: 2027,
        actorUserId: 7,
        budgetAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "NO_ACTIVE_DEPARTMENTS",
    });
  });

  it("rejects opening when one of the three required categories is missing", async () => {
    findFinancialYearByYearRepo.mockResolvedValue(null);
    findLatestFinancialYearRepo.mockResolvedValue(null);
    findActiveFinancialYearRepo.mockResolvedValue(null);
    listActiveDepartmentsRepo.mockResolvedValue([{ id: 10 }]);
    listActiveBudgetCategoriesRepo.mockResolvedValue(categories.slice(0, 2));

    await expect(
      createFinancialYearService({
        year: 2027,
        actorUserId: 7,
        budgetAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "REQUIRED_BUDGET_CATEGORIES_MISSING",
    });
  });

  it("blocks pre-closing until every category package has completed CFO review", async () => {
    findFinancialYearByIdRepo.mockResolvedValue({
      id: 20,
      year: 2027,
      status: "OPEN",
    });
    countDepartmentBudgetsForYearRepo.mockResolvedValue(5);
    countIncompleteCategoryPackagesForYearRepo.mockResolvedValue(1);

    await expect(
      preCloseFinancialYearService({
        id: 20,
        actorUserId: 7,
        budgetAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "FINANCIAL_YEAR_HAS_INCOMPLETE_CATEGORY_PACKAGES",
    });
  });

  it("moves an OPEN financial year to PRE_CLOSING when readiness checks pass", async () => {
    findFinancialYearByIdRepo.mockResolvedValue({
      id: 20,
      year: 2027,
      status: "OPEN",
    });
    countDepartmentBudgetsForYearRepo.mockResolvedValue(5);
    countIncompleteCategoryPackagesForYearRepo.mockResolvedValue(0);
    countCfoAnnualPackageReviewFinalizedRepo.mockResolvedValue(1);
    countOpenChangeRequestsForYearRepo.mockResolvedValue(0);
    transitionFinancialYearToPreClosingRepo.mockResolvedValue({
      id: 20,
      year: 2027,
      status: "PRE_CLOSING",
      pre_closed_by: 7,
    });

    const result = await preCloseFinancialYearService({
      id: 20,
      actorUserId: 7,
      budgetAccess,
    });

    expect(transitionFinancialYearToPreClosingRepo).toHaveBeenCalledWith(
      { transaction: true },
      { id: 20, pre_closed_by: 7 },
    );
    expect(createWorkflowHistoryRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        action: "FINANCIAL_YEAR_PRE_CLOSED",
        old_status: "OPEN",
        new_status: "PRE_CLOSING",
      }),
    );
    expect(result.status).toBe("PRE_CLOSING");
  });

  it("blocks closing while redesigned transfer or PO-link obligations are pending", async () => {
    findFinancialYearByIdRepo.mockResolvedValue({
      id: 20,
      year: 2027,
      status: "PRE_CLOSING",
    });
    countPendingTransfersForYearRepo.mockResolvedValue(1);

    await expect(
      closeFinancialYearService({
        id: 20,
        actorUserId: 7,
        budgetAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "FINANCIAL_YEAR_HAS_PENDING_TRANSFERS",
    });

    countPendingTransfersForYearRepo.mockResolvedValue(0);
    countPendingPoLinksForYearRepo.mockResolvedValue(2);

    await expect(
      closeFinancialYearService({
        id: 20,
        actorUserId: 7,
        budgetAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "FINANCIAL_YEAR_HAS_PENDING_PO_LINKS",
    });
  });

  it("closes a PRE_CLOSING financial year when execution obligations are clear", async () => {
    findFinancialYearByIdRepo.mockResolvedValue({
      id: 20,
      year: 2027,
      status: "PRE_CLOSING",
    });
    countPendingTransfersForYearRepo.mockResolvedValue(0);
    countPendingPoLinksForYearRepo.mockResolvedValue(0);
    transitionFinancialYearToClosedRepo.mockResolvedValue({
      id: 20,
      year: 2027,
      status: "CLOSED",
      closed_by: 7,
    });

    const result = await closeFinancialYearService({
      id: 20,
      actorUserId: 7,
      budgetAccess,
    });

    expect(transitionFinancialYearToClosedRepo).toHaveBeenCalledWith(
      { transaction: true },
      { id: 20, closed_by: 7 },
    );
    expect(createWorkflowHistoryRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        action: "FINANCIAL_YEAR_CLOSED",
        old_status: "PRE_CLOSING",
        new_status: "CLOSED",
      }),
    );
    expect(result.status).toBe("CLOSED");
  });
});
