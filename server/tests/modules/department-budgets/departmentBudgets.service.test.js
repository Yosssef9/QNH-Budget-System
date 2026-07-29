import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

vi.mock("../../../services/notification.service.js", () => ({
  queueNotification: vi.fn(),
}));

vi.mock("../../../modules/department-budgets/departmentBudgets.repository.js", () => ({
  countActiveItemsForCategoryBudgetRepo: vi.fn(),
  createWorkflowHistoryRepo: vi.fn(),
  deactivateCategoryBudgetItemsNotInListRepo: vi.fn(),
  ensureGeneralPackageSubItemRepo: vi.fn(),
  ensurePackageItemRepo: vi.fn(),
  findCategoryPackageRepo: vi.fn(),
  findCurrentDepartmentBudgetRepo: vi.fn(),
  findDepartmentBudgetByIdRepo: vi.fn(),
  findDepartmentCategoryBudgetRepo: vi.fn(),
  findGeneralCatalogSubItemRepo: vi.fn(),
  findLatestFinancialYearRepo: vi.fn(),
  findSubmissionWindowRepo: vi.fn(),
  listCategoryBudgetsForDepartmentBudgetRepo: vi.fn(),
  listCopyableCategoryBudgetHistoryRepo: vi.fn(),
  listDepartmentBudgetsRepo: vi.fn(),
  listHistoryItemsForCategoryBudgetRepo: vi.fn(),
  listItemsForCategoryBudgetRepo: vi.fn(),
  listItemsForDepartmentBudgetRepo: vi.fn(),
  markCategoryBudgetSubmittedRepo: vi.fn(),
  markItemsPendingCategoryReviewRepo: vi.fn(),
  replaceItemDistributionsRepo: vi.fn(),
  touchDepartmentCategoryBudgetRepo: vi.fn(),
  upsertDepartmentCategoryBudgetItemRepo: vi.fn(),
  validateActiveCatalogItemForCategoryRepo: vi.fn(),
}));

import { queueNotification } from "../../../services/notification.service.js";
import {
  countActiveItemsForCategoryBudgetRepo,
  createWorkflowHistoryRepo,
  deactivateCategoryBudgetItemsNotInListRepo,
  ensureGeneralPackageSubItemRepo,
  ensurePackageItemRepo,
  findCategoryPackageRepo,
  findDepartmentBudgetByIdRepo,
  findDepartmentCategoryBudgetRepo,
  findGeneralCatalogSubItemRepo,
  findSubmissionWindowRepo,
  listCategoryBudgetsForDepartmentBudgetRepo,
  listItemsForCategoryBudgetRepo,
  listItemsForDepartmentBudgetRepo,
  markCategoryBudgetSubmittedRepo,
  markItemsPendingCategoryReviewRepo,
  replaceItemDistributionsRepo,
  touchDepartmentCategoryBudgetRepo,
  upsertDepartmentCategoryBudgetItemRepo,
  validateActiveCatalogItemForCategoryRepo,
} from "../../../modules/department-budgets/departmentBudgets.repository.js";
import {
  saveDepartmentCategoryItemsService,
  submitDepartmentCategoryBudgetService,
} from "../../../modules/department-budgets/departmentBudgets.service.js";
import { PERMISSION_CODES } from "../../../../shared/permissions/permissionCodes.js";

const budgetAccess = {
  userRoleId: 41,
  workspaceType: "DEPARTMENT",
  role: { code: "DEPARTMENT_BUDGET_MANAGER" },
  department: { id: 10, name: "Information Technology" },
  permissionCodes: [
    PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
    PERMISSION_CODES.SUBMIT_DEPARTMENT_CATEGORY_BUDGETS,
  ],
};

const categoryBudget = {
  id: 100,
  department_budget_id: 50,
  budget_category_id: 1,
  status: "DRAFT",
  financial_year_id: 9,
  financial_year: 2027,
  financial_year_status: "OPEN",
  department_id: 10,
  department_name: "Information Technology",
  category_name: "IT",
};

const submittedCategoryBudget = {
  ...categoryBudget,
  status: "IN_CATEGORY_REVIEW",
};

function annualItem(overrides = {}) {
  return {
    id: 200,
    catalog_item_id: 20,
    requested_quantity: 12,
    distribution_method: "ANNUAL",
    distribution: [{ period_type: "YEAR", period_no: 1, quantity: 12 }],
    ...overrides,
  };
}

function existingItemRows({
  itemId = 200,
  catalogItemId = 20,
  quantity = 12,
  method = "ANNUAL",
  reviewStatus = "CATEGORY_REVIEW_COMPLETED",
  distributionQuantity = 12,
} = {}) {
  return [
    {
      item_id: itemId,
      catalog_item_id: catalogItemId,
      requested_quantity: quantity,
      distribution_method: method,
      review_status: reviewStatus,
      distribution_id: 1,
      period_type: "YEAR",
      period_no: 1,
      distribution_quantity: distributionQuantity,
    },
  ];
}

describe("department budgets service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDepartmentCategoryBudgetRepo.mockResolvedValue(categoryBudget);
    listItemsForCategoryBudgetRepo.mockResolvedValue([]);
    validateActiveCatalogItemForCategoryRepo.mockResolvedValue(true);
    upsertDepartmentCategoryBudgetItemRepo.mockResolvedValue({ id: 200 });
    queueNotification.mockResolvedValue(undefined);
  });

  it("rejects duplicate catalog items in one category budget", async () => {
    await expect(
      saveDepartmentCategoryItemsService({
        departmentCategoryBudgetId: 100,
        actorUserId: 7,
        budgetAccess,
        items: [
          {
            catalog_item_id: 20,
            requested_quantity: 1,
            distribution_method: "ANNUAL",
            distribution: [],
          },
          {
            catalog_item_id: 20,
            requested_quantity: 2,
            distribution_method: "ANNUAL",
            distribution: [],
          },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "DUPLICATE_CATALOG_ITEM",
    });
  });

  it("rejects distribution totals that do not match requested quantity", async () => {
    await expect(
      saveDepartmentCategoryItemsService({
        departmentCategoryBudgetId: 100,
        actorUserId: 7,
        budgetAccess,
        items: [
          {
            catalog_item_id: 20,
            requested_quantity: 12,
            distribution_method: "MONTHLY",
            distribution: [
              { period_type: "MONTH", period_no: 1, quantity: 4 },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "DISTRIBUTION_TOTAL_MISMATCH",
    });
  });

  it("saves draft category items against the new department category budget tables", async () => {
    await saveDepartmentCategoryItemsService({
      departmentCategoryBudgetId: 100,
      actorUserId: 7,
      budgetAccess,
      items: [
        {
          catalog_item_id: 20,
          requested_quantity: 12,
          distribution_method: "ANNUAL",
          distribution: [],
        },
      ],
    });

    expect(upsertDepartmentCategoryBudgetItemRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        department_category_budget_id: 100,
        catalog_item_id: 20,
        requested_quantity: 12,
        is_project: false,
      }),
    );
    expect(replaceItemDistributionsRepo).toHaveBeenCalledWith(
      { transaction: true },
      {
        itemId: 200,
        distributions: [{ period_type: "YEAR", period_no: 1, quantity: 12 }],
      },
    );
    expect(touchDepartmentCategoryBudgetRepo).toHaveBeenCalled();
    expect(createWorkflowHistoryRepo).toHaveBeenCalled();
  });

  it("soft-deactivates omitted existing rows for draft category budgets", async () => {
    listItemsForCategoryBudgetRepo.mockResolvedValue(
      existingItemRows({ reviewStatus: "DRAFT" }),
    );

    await saveDepartmentCategoryItemsService({
      departmentCategoryBudgetId: 100,
      actorUserId: 7,
      budgetAccess,
      items: [],
    });

    expect(deactivateCategoryBudgetItemsNotInListRepo).toHaveBeenCalledWith(
      { transaction: true },
      {
        departmentCategoryBudgetId: 100,
        keepItemIds: [],
        actorUserId: 7,
      },
    );
  });

  it("rejects edits after a category budget has been submitted", async () => {
    findDepartmentCategoryBudgetRepo.mockResolvedValue(submittedCategoryBudget);

    await expect(
      saveDepartmentCategoryItemsService({
        departmentCategoryBudgetId: 100,
        actorUserId: 7,
        budgetAccess,
        items: [annualItem({ requested_quantity: 14 })],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "DEPARTMENT_CATEGORY_BUDGET_READ_ONLY",
    });

    expect(upsertDepartmentCategoryBudgetItemRepo).not.toHaveBeenCalled();
    expect(deactivateCategoryBudgetItemsNotInListRepo).not.toHaveBeenCalled();
  });

  it("rejects resubmission after a category budget has been submitted", async () => {
    findDepartmentCategoryBudgetRepo.mockResolvedValue(submittedCategoryBudget);

    await expect(
      submitDepartmentCategoryBudgetService({
        departmentCategoryBudgetId: 100,
        actorUserId: 7,
        budgetAccess,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_DEPARTMENT_CATEGORY_BUDGET_STATUS",
    });
  });

  it("submits a category budget and initializes package parent and General sub-item records", async () => {
    findSubmissionWindowRepo.mockResolvedValue({ status: "OPEN" });
    countActiveItemsForCategoryBudgetRepo.mockResolvedValue(1);
    listItemsForCategoryBudgetRepo.mockResolvedValue([
      {
        item_id: 200,
        catalog_item_id: 20,
        requested_quantity: 12,
        distribution_method: "ANNUAL",
        review_status: "DRAFT",
        distribution_id: 1,
        period_type: "YEAR",
        period_no: 1,
        distribution_quantity: 12,
      },
    ]);
    findCategoryPackageRepo.mockResolvedValue({ id: 300 });
    ensurePackageItemRepo.mockResolvedValue({ id: 400 });
    findGeneralCatalogSubItemRepo.mockResolvedValue({
      id: 500,
      name: "General",
      default_specification: null,
      default_unit_of_measure_id: 2,
    });
    markCategoryBudgetSubmittedRepo.mockResolvedValue({ id: 100 });

    await submitDepartmentCategoryBudgetService({
      departmentCategoryBudgetId: 100,
      actorUserId: 7,
      budgetAccess,
    });

    expect(ensurePackageItemRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        category_budget_package_id: 300,
        catalog_item_id: 20,
      }),
    );
    expect(ensureGeneralPackageSubItemRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        category_budget_package_item_id: 400,
        catalog_sub_item_id: 500,
        unit_of_measure_id: 2,
      }),
    );
    expect(markItemsPendingCategoryReviewRepo).toHaveBeenCalled();
    expect(markCategoryBudgetSubmittedRepo).toHaveBeenCalled();
    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: "DEPARTMENT_CATEGORY_BUDGET_SUBMITTED",
        entityType: "DEPARTMENT_CATEGORY_BUDGET",
      }),
    );
  });
});
