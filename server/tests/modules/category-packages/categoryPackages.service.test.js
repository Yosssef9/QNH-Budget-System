import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

vi.mock("../../../services/notification.service.js", () => ({
  queueNotification: vi.fn(),
}));

vi.mock("../../../shared/files/packageAttachmentStorage.js", () => ({
  createPackageAttachmentReadStream: vi.fn(),
  removePackageAttachmentFile: vi.fn(),
  savePackageAttachmentFile: vi.fn(async () => "2027/01/test-file.pdf"),
}));

vi.mock(
  "../../../modules/category-packages/categoryPackages.repository.js",
  () => ({
    countAllocationsForSubItemRepo: vi.fn(),
    createPackageSubItemAttachmentRepo: vi.fn(),
    createPackageSubItemRepo: vi.fn(),
    createWorkflowHistoryRepo: vi.fn(),
    deactivatePackageSubItemAttachmentRepo: vi.fn(),
    deleteAllocationsForSubItemRepo: vi.fn(),
    deactivatePackageSubItemRepo: vi.fn(),
    deleteAllocationsForDepartmentItemRepo: vi.fn(),
    findPackageAttachmentContextRepo: vi.fn(),
    findCatalogSubItemForPackageRepo: vi.fn(),
    findCurrentPackageForCategoryRepo: vi.fn(),
    findDepartmentItemAllocationContextRepo: vi.fn(),
    findDepartmentItemPackageEditContextRepo: vi.fn(),
    findPackageContextByItemRepo: vi.fn(),
    findPackageContextBySubItemRepo: vi.fn(),
    listPackageSubItemAttachmentsRepo: vi.fn(),
    listPackageSubItemPriceHistoryRepo: vi.fn(),
    listAllocationsForPackageItemRepo: vi.fn(),
    listPackageItemDetailRowsRepo: vi.fn(),
    listPackageDistributionRowsRepo: vi.fn(),
    listPackageItemsRepo: vi.fn(),
    listPackageSubItemsForDepartmentItemRepo: vi.fn(),
    listCurrentAllocationsForDepartmentItemRepo: vi.fn(),
    listApprovedDistributionForDepartmentItemRepo: vi.fn(),
    markPackageSubmittedToPurchasingRepo: vi.fn(),
    recalculatePackageSubItemQuantitiesRepo: vi.fn(),
    updateDepartmentApprovedQuantityForPackageRepo: vi.fn(),
    replaceApprovedDistributionForDepartmentItemRepo: vi.fn(),
    updatePackageItemReconciliationRepo: vi.fn(),
    updatePackageSubItemRepo: vi.fn(),
    upsertAllocationRepo: vi.fn(),
  }),
);

import { PERMISSION_CODES } from "../../../../shared/permissions/permissionCodes.js";
import {
  createPackageSubItemAttachmentRepo,
  createWorkflowHistoryRepo,
  deactivatePackageSubItemAttachmentRepo,
  deleteAllocationsForDepartmentItemRepo,
  deleteAllocationsForSubItemRepo,
  findPackageAttachmentContextRepo,
  findCurrentPackageForCategoryRepo,
  findDepartmentItemAllocationContextRepo,
  findDepartmentItemPackageEditContextRepo,
  findPackageContextByItemRepo,
  findPackageContextBySubItemRepo,
  listAllocationsForPackageItemRepo,
  listPackageItemDetailRowsRepo,
  listPackageDistributionRowsRepo,
  listPackageItemsRepo,
  listPackageSubItemPriceHistoryRepo,
  listPackageSubItemsForDepartmentItemRepo,
  listCurrentAllocationsForDepartmentItemRepo,
  listApprovedDistributionForDepartmentItemRepo,
  markPackageSubmittedToPurchasingRepo,
  recalculatePackageSubItemQuantitiesRepo,
  updateDepartmentApprovedQuantityForPackageRepo,
  replaceApprovedDistributionForDepartmentItemRepo,
  updatePackageItemReconciliationRepo,
  updatePackageSubItemRepo,
  upsertAllocationRepo,
} from "../../../modules/category-packages/categoryPackages.repository.js";
import {
  deletePackageSubItemAttachmentService,
  buildPackageDistributionAnalysis,
  getCategoryPackageDistributionService,
  getPackageSubItemPriceHistoryService,
  replaceDepartmentItemAllocationsService,
  submitCategoryPackageToPurchasingService,
  updateDepartmentItemApprovedQuantityService,
  updatePackageSubItemService,
  uploadPackageSubItemAttachmentService,
} from "../../../modules/category-packages/categoryPackages.service.js";

const categoryAccess = {
  userRoleId: 52,
  workspaceType: "CATEGORY",
  role: { code: "CATEGORY_BUDGET_MANAGER" },
  category: { id: 1, name: "IT" },
  permissionCodes: [
    PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_PACKAGES,
    PERMISSION_CODES.MANAGE_CATEGORY_BUDGET_SUB_ITEMS,
    PERMISSION_CODES.MANAGE_CATEGORY_SUPPORTING_DOCUMENTS,
    PERMISSION_CODES.SUBMIT_CATEGORY_BUDGET_PACKAGES_TO_PURCHASING,
  ],
};

const packageContext = {
  package_id: 300,
  package_item_id: 400,
  budget_category_id: 1,
  financial_year_id: 9,
  financial_year_status: "OPEN",
  package_status: "DRAFT",
  status: "DRAFT",
};

const departmentItem = {
  id: 200,
  budget_category_id: 1,
  financial_year_id: 9,
  financial_year_status: "OPEN",
  review_status: "CATEGORY_REVIEW_COMPLETED",
  category_approved_quantity: 15,
};

describe("category package service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDepartmentItemAllocationContextRepo.mockResolvedValue(departmentItem);
    listPackageSubItemsForDepartmentItemRepo.mockResolvedValue([
      {
        package_sub_item_id: 10,
        package_item_id: 400,
        package_sub_item_name: "General",
        category_manager_unit_price: 1000,
      },
      {
        package_sub_item_id: 11,
        package_item_id: 400,
        package_sub_item_name: "Dell Latitude 5450",
        category_manager_unit_price: 2000,
      },
    ]);
    listCurrentAllocationsForDepartmentItemRepo.mockResolvedValue([]);
    listApprovedDistributionForDepartmentItemRepo.mockResolvedValue([]);
    replaceApprovedDistributionForDepartmentItemRepo.mockResolvedValue(undefined);
    findDepartmentItemPackageEditContextRepo.mockResolvedValue(null);
    updateDepartmentApprovedQuantityForPackageRepo.mockResolvedValue(null);
    updatePackageSubItemRepo.mockResolvedValue({ id: 10 });
    findPackageContextByItemRepo.mockResolvedValue(packageContext);
    findPackageContextBySubItemRepo.mockResolvedValue({
      ...packageContext,
      budget_category_id: 1,
      package_sub_item_id: 10,
      package_item_id: 400,
      financial_year_status: "OPEN",
      package_status: "DRAFT",
    });
    createPackageSubItemAttachmentRepo.mockResolvedValue({
      id: 900,
      category_budget_package_sub_item_id: 10,
      original_file_name: "quote.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 128,
      uploaded_by: 7,
      uploaded_by_name: "Category Manager",
      uploaded_at: new Date("2026-07-06T10:00:00Z"),
      row_version: "abc",
    });
    findPackageAttachmentContextRepo.mockResolvedValue({
      id: 900,
      category_budget_package_sub_item_id: 10,
      original_file_name: "quote.pdf",
      storage_key: "2027/01/test-file.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 128,
      budget_category_id: 1,
      financial_year_id: 9,
      financial_year_status: "OPEN",
      package_status: "DRAFT",
      row_version: "YWJjZGVmZ2g=",
    });
    deactivatePackageSubItemAttachmentRepo.mockResolvedValue({ id: 900 });
    listPackageItemsRepo.mockResolvedValue([
      {
        id: 400,
        category_budget_package_id: 300,
        catalog_item_id: 30,
        catalog_item_name: "Computers & Laptops",
        needs_reconciliation: false,
        department_count: 1,
        requested_quantity: 20,
        approved_quantity: 15,
        allocated_quantity: 15,
      },
    ]);
    listPackageItemDetailRowsRepo.mockResolvedValue({
      subItems: [
        {
          id: 10,
          name: "Dell Latitude 5450",
          quantity: 15,
          category_manager_unit_price: 2000,
        },
      ],
      departments: [
        {
          department_item_id: 200,
          department_name: "Laboratory",
          category_approved_quantity: 15,
        },
      ],
    });
    listAllocationsForPackageItemRepo.mockResolvedValue([
      {
        category_budget_package_sub_item_id: 10,
        department_category_budget_item_id: 200,
        allocated_quantity: 15,
      },
    ]);
    createWorkflowHistoryRepo.mockResolvedValue({});
    recalculatePackageSubItemQuantitiesRepo.mockResolvedValue({});
    updatePackageItemReconciliationRepo.mockResolvedValue({});
  });

  it("auto-reconciles every reviewed department to General when its price changes and it is the only active sub-item", async () => {
    findPackageContextBySubItemRepo.mockResolvedValue({
      ...packageContext,
      budget_category_id: 1,
      package_sub_item_id: 10,
      package_item_id: 400,
      category_manager_unit_price: null,
      quantity: 0,
      specification: null,
      note: null,
      financial_year_status: "OPEN",
      package_status: "DRAFT",
    });

    listPackageItemDetailRowsRepo.mockResolvedValue({
      subItems: [
        {
          id: 10,
          name: "General",
          sub_item_code: "GENERAL",
          is_default_general: true,
          quantity: 0,
          category_manager_unit_price: 1250,
        },
      ],
      departments: [
        {
          department_item_id: 200,
          department_name: "Laboratory",
          category_approved_quantity: 8,
        },
        {
          department_item_id: 201,
          department_name: "Finance",
          category_approved_quantity: 0,
        },
        {
          department_item_id: 202,
          department_name: "Nursing",
          category_approved_quantity: 4,
        },
      ],
    });

    await updatePackageSubItemService({
      packageSubItemId: 10,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        category_manager_unit_price: 1250,
        specification: null,
        note: null,
        row_version: Buffer.from("abcdefgh"),
      },
    });

    expect(deleteAllocationsForSubItemRepo).toHaveBeenCalledWith(
      { transaction: true },
      { packageSubItemId: 10 },
    );
    expect(upsertAllocationRepo).toHaveBeenCalledTimes(2);
    expect(upsertAllocationRepo).toHaveBeenNthCalledWith(
      1,
      { transaction: true },
      expect.objectContaining({
        department_item_id: 200,
        package_sub_item_id: 10,
        allocated_quantity: 8,
      }),
    );
    expect(upsertAllocationRepo).toHaveBeenNthCalledWith(
      2,
      { transaction: true },
      expect.objectContaining({
        department_item_id: 202,
        package_sub_item_id: 10,
        allocated_quantity: 4,
      }),
    );
    expect(recalculatePackageSubItemQuantitiesRepo).toHaveBeenCalledWith(
      { transaction: true },
      { packageItemId: 400, actorUserId: 7 },
    );
    expect(updatePackageItemReconciliationRepo).toHaveBeenCalledWith(
      { transaction: true },
      { packageItemId: 400, actorUserId: 7 },
    );
    expect(createWorkflowHistoryRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        new_values_json: expect.stringContaining(
          '"auto_reconciled_to_general":true',
        ),
      }),
    );
  });

  it("does not auto-reconcile a price change when the package item has multiple active sub-items", async () => {
    findPackageContextBySubItemRepo.mockResolvedValue({
      ...packageContext,
      budget_category_id: 1,
      package_sub_item_id: 10,
      package_item_id: 400,
      category_manager_unit_price: 1000,
      quantity: 15,
      financial_year_status: "OPEN",
      package_status: "DRAFT",
    });
    listPackageItemDetailRowsRepo.mockResolvedValue({
      subItems: [
        {
          id: 10,
          name: "General",
          sub_item_code: "GENERAL",
          is_default_general: true,
        },
        {
          id: 11,
          name: "Dell Latitude 5450",
          sub_item_code: "DELL_LATITUDE_5450",
          is_default_general: false,
        },
      ],
      departments: [
        { department_item_id: 200, category_approved_quantity: 15 },
      ],
    });

    await updatePackageSubItemService({
      packageSubItemId: 10,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        category_manager_unit_price: 1250,
        specification: null,
        note: null,
        row_version: Buffer.from("abcdefgh"),
      },
    });

    expect(deleteAllocationsForSubItemRepo).not.toHaveBeenCalled();
    expect(upsertAllocationRepo).not.toHaveBeenCalled();
    expect(recalculatePackageSubItemQuantitiesRepo).not.toHaveBeenCalled();
    expect(updatePackageItemReconciliationRepo).not.toHaveBeenCalled();
  });

  it("does not auto-reconcile a single non-General sub-item", async () => {
    findPackageContextBySubItemRepo.mockResolvedValue({
      ...packageContext,
      budget_category_id: 1,
      package_sub_item_id: 11,
      package_item_id: 400,
      category_manager_unit_price: 1000,
      quantity: 15,
      financial_year_status: "OPEN",
      package_status: "DRAFT",
    });
    listPackageItemDetailRowsRepo.mockResolvedValue({
      subItems: [
        {
          id: 11,
          name: "Dell Latitude 5450",
          sub_item_code: "DELL_LATITUDE_5450",
          is_default_general: false,
        },
      ],
      departments: [
        { department_item_id: 200, category_approved_quantity: 15 },
      ],
    });

    await updatePackageSubItemService({
      packageSubItemId: 11,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        category_manager_unit_price: 1250,
        specification: null,
        note: null,
        row_version: Buffer.from("abcdefgh"),
      },
    });

    expect(deleteAllocationsForSubItemRepo).not.toHaveBeenCalled();
    expect(upsertAllocationRepo).not.toHaveBeenCalled();
  });

  it("does not auto-reconcile General when the price value did not change", async () => {
    findPackageContextBySubItemRepo.mockResolvedValue({
      ...packageContext,
      budget_category_id: 1,
      package_sub_item_id: 10,
      package_item_id: 400,
      category_manager_unit_price: 1250,
      quantity: 15,
      financial_year_status: "OPEN",
      package_status: "DRAFT",
    });
    listPackageItemDetailRowsRepo.mockResolvedValue({
      subItems: [
        {
          id: 10,
          name: "General",
          sub_item_code: "GENERAL",
          is_default_general: true,
        },
      ],
      departments: [
        { department_item_id: 200, category_approved_quantity: 15 },
      ],
    });

    await updatePackageSubItemService({
      packageSubItemId: 10,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        category_manager_unit_price: 1250,
        specification: "Updated specification only",
        note: null,
        row_version: Buffer.from("abcdefgh"),
      },
    });

    expect(deleteAllocationsForSubItemRepo).not.toHaveBeenCalled();
    expect(upsertAllocationRepo).not.toHaveBeenCalled();
  });

  it("rejects department allocation greater than the approved quantity", async () => {
    await expect(
      replaceDepartmentItemAllocationsService({
        departmentItemId: 200,
        actorUserId: 7,
        budgetAccess: categoryAccess,
        payload: {
          allocations: [
            { package_sub_item_id: 10, allocated_quantity: 5 },
            { package_sub_item_id: 11, allocated_quantity: 11 },
          ],
        },
      }),
    ).rejects.toMatchObject({ errorCode: "DEPARTMENT_ITEM_OVERALLOCATED" });

    expect(upsertAllocationRepo).not.toHaveBeenCalled();
  });
  it("rejects allocation to a model without a Category Manager price", async () => {
    listPackageSubItemsForDepartmentItemRepo.mockResolvedValue([
      {
        package_sub_item_id: 10,
        package_item_id: 400,
        package_sub_item_name: "General",
        category_manager_unit_price: null,
      },
    ]);

    await expect(
      replaceDepartmentItemAllocationsService({
        departmentItemId: 200,
        actorUserId: 7,
        budgetAccess: categoryAccess,

        payload: {
          allocations: [
            {
              package_sub_item_id: 10,
              allocated_quantity: 5,
            },
          ],
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "PACKAGE_SUB_ITEM_CATEGORY_MANAGER_PRICE_REQUIRED",
    });

    expect(deleteAllocationsForDepartmentItemRepo).not.toHaveBeenCalled();

    expect(upsertAllocationRepo).not.toHaveBeenCalled();
  });
  it("saves valid allocations and omits zero allocation rows", async () => {
    await replaceDepartmentItemAllocationsService({
      departmentItemId: 200,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        allocations: [
          { package_sub_item_id: 10, allocated_quantity: 5 },
          { package_sub_item_id: 11, allocated_quantity: 0 },
        ],
      },
    });

    expect(deleteAllocationsForDepartmentItemRepo).toHaveBeenCalled();
    expect(upsertAllocationRepo).toHaveBeenCalledTimes(1);
    expect(upsertAllocationRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        package_sub_item_id: 10,
        allocated_quantity: 5,
      }),
    );
    expect(recalculatePackageSubItemQuantitiesRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({ packageItemId: 400 }),
    );
    expect(updatePackageItemReconciliationRepo).toHaveBeenCalled();
  });

  it("blocks Purchasing submission when a department item is not fully allocated", async () => {
    findCurrentPackageForCategoryRepo.mockResolvedValue({
      id: 300,
      financial_year_id: 9,
      financial_year: 2027,
      financial_year_status: "OPEN",
      budget_category_id: 1,
      category_name: "IT",
      status: "DRAFT",
      submission_window_status: "CLOSED",
      row_version: "abc",
    });
    listPackageItemDetailRowsRepo.mockResolvedValue({
      subItems: [
        {
          id: 10,
          name: "Dell Latitude 5450",
          quantity: 12,
          category_manager_unit_price: 2000,
        },
      ],
      departments: [
        {
          department_item_id: 200,
          department_name: "Laboratory",
          category_approved_quantity: 15,
        },
      ],
    });
    listAllocationsForPackageItemRepo.mockResolvedValue([
      {
        category_budget_package_sub_item_id: 10,
        department_category_budget_item_id: 200,
        allocated_quantity: 12,
      },
    ]);

    await expect(
      submitCategoryPackageToPurchasingService({
        packageId: 300,
        actorUserId: 7,
        budgetAccess: categoryAccess,
        payload: { row_version: "abc" },
      }),
    ).rejects.toMatchObject({ errorCode: "CATEGORY_PACKAGE_NOT_READY" });

    expect(markPackageSubmittedToPurchasingRepo).not.toHaveBeenCalled();
  });

  it("uploads package sub-item attachment metadata after validating package scope", async () => {
    const result = await uploadPackageSubItemAttachmentService({
      packageSubItemId: 10,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      file: {
        originalname: "quote.pdf",
        mimetype: "application/pdf",
        size: 128,
        buffer: Buffer.from("pdf"),
      },
      payload: {
        document_type: "Quotation",
        description: "Supplier quotation",
      },
    });

    expect(createPackageSubItemAttachmentRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        package_sub_item_id: 10,
        original_file_name: "quote.pdf",
        storage_key: "2027/01/test-file.pdf",
      }),
    );
    expect(createWorkflowHistoryRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        action: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT_UPLOADED",
      }),
    );
    expect(result).toMatchObject({
      id: 900,
      original_file_name: "quote.pdf",
    });
  });

  it("blocks attachment upload when package is not editable", async () => {
    findPackageContextBySubItemRepo.mockResolvedValue({
      ...packageContext,
      budget_category_id: 1,
      financial_year_status: "OPEN",
      package_status: "IN_CFO_REVIEW",
    });

    await expect(
      uploadPackageSubItemAttachmentService({
        packageSubItemId: 10,
        actorUserId: 7,
        budgetAccess: categoryAccess,
        file: {
          originalname: "quote.pdf",
          mimetype: "application/pdf",
          size: 128,
          buffer: Buffer.from("pdf"),
        },
        payload: {},
      }),
    ).rejects.toMatchObject({ errorCode: "CATEGORY_PACKAGE_NOT_EDITABLE" });

    expect(createPackageSubItemAttachmentRepo).not.toHaveBeenCalled();
  });

  it("soft-deletes package sub-item attachment with row-version protection", async () => {
    await deletePackageSubItemAttachmentService({
      packageSubItemId: 10,
      attachmentId: 900,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        row_version: Buffer.from("abcdefgh"),
        reason: "Wrong quote",
      },
    });

    expect(deactivatePackageSubItemAttachmentRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        package_sub_item_id: 10,
        attachment_id: 900,
        reason: "Wrong quote",
      }),
    );
    expect(createWorkflowHistoryRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        action: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT_REMOVED",
      }),
    );
  });

  it("returns package model price history within the active category scope", async () => {
    listPackageSubItemPriceHistoryRepo.mockResolvedValue([
      {
        id: 902,
        review_round: 2,
        catalog_sub_item_id_snapshot: 20,
        catalog_sub_item_name: "Dell Latitude 5450",
        quantity_snapshot: 5,
        category_manager_unit_price_snapshot: 600,
        previous_purchasing_unit_price: 1000,
        purchasing_unit_price: 600,
        status: "PENDING",
        decision_source: "MANUAL",
        reviewed_by: null,
        reviewed_by_name: null,
        reviewed_at: null,
        manager_submitted_by: 7,
        manager_submitted_by_name: "Category Manager",
        manager_submitted_at: new Date("2026-08-10T09:00:00Z"),
      },
      {
        id: 901,
        review_round: 1,
        catalog_sub_item_id_snapshot: 20,
        catalog_sub_item_name: "Dell Latitude 5450",
        quantity_snapshot: 5,
        category_manager_unit_price_snapshot: 500,
        previous_purchasing_unit_price: null,
        purchasing_unit_price: 1000,
        status: "ACCEPTED",
        decision_source: "MANUAL",
        reviewed_by: 8,
        reviewed_by_name: "Purchasing Reviewer",
        reviewed_at: new Date("2026-08-09T10:00:00Z"),
        manager_submitted_by: 7,
        manager_submitted_by_name: "Category Manager",
        manager_submitted_at: new Date("2026-08-09T09:00:00Z"),
      },
    ]);

    const result = await getPackageSubItemPriceHistoryService({
      packageSubItemId: 10,
      budgetAccess: categoryAccess,
    });

    expect(listPackageSubItemPriceHistoryRepo).toHaveBeenCalledWith({
      packageId: 300,
      packageSubItemId: 10,
    });
    expect(result[0]).toMatchObject({
      review_round: 2,
      manager_submitted_by_name: "Category Manager",
      reviewed_by_name: null,
      category_manager_price: { before: 1000, after: 600 },
      purchasing_price: { before: 600, after: 600 },
    });
  });
  it("uses a persisted custom approved distribution in package distribution analysis", () => {
    const rows = [
      {
        package_id: 300,
        financial_year_id: 9,
        financial_year: 2027,
        budget_category_id: 1,
        category_name: "IT",
        category_code: "IT",
        package_item_id: 400,
        catalog_item_id: 30,
        catalog_item_name: "Laptop",
        catalog_item_code: "LAPTOP",
        department_id: 10,
        department_name: "Information Technology",
        department_code: "IT",
        department_item_id: 200,
        requested_quantity: 12,
        category_approved_quantity: 10,
        item_unit_name: "Unit",
        item_unit_code: "UNIT",
        distribution_id: 1,
        period_type: "MONTH",
        period_no: 1,
        distribution_quantity: 12,
        allocation_id: 50,
        allocated_quantity: 10,
        package_sub_item_id: 10,
        package_sub_item_name: "General",
        unit_price: 100,
        approved_distribution: [
          { period_type: "MONTH", period_no: 1, quantity: 3 },
          { period_type: "MONTH", period_no: 3, quantity: 2 },
          { period_type: "MONTH", period_no: 5, quantity: 1 },
          { period_type: "MONTH", period_no: 9, quantity: 2 },
          { period_type: "MONTH", period_no: 12, quantity: 2 },
        ],
      },
    ];

    const result = buildPackageDistributionAnalysis({
      rows,
      scope: { label: "IT package" },
    });

    expect(result.totals.approved_quantity).toBe(10);
    expect(result.totals.periods.monthly["1"]).toBe(300);
    expect(result.totals.periods.monthly["3"]).toBe(200);
    expect(result.totals.periods.monthly["5"]).toBe(100);
    expect(result.totals.periods.monthly["9"]).toBe(200);
    expect(result.totals.periods.monthly["12"]).toBe(200);
    expect(result.totals.periods.monthly["2"]).toBe(0);
    expect(result.totals.estimated_total).toBe(1000);
  });

  const distributionRow = {
    package_id: 300,
    financial_year_id: 9,
    financial_year: 2027,
    budget_category_id: 1,
    category_name: "IT",
    category_code: "IT",
    package_item_id: 400,
    catalog_item_id: 30,
    catalog_item_name: "Laptop",
    department_id: 10,
    department_name: "Information Technology",
    department_item_id: 200,
    requested_quantity: 4,
    category_approved_quantity: 4,
    item_unit_code: "UNIT",
    period_type: "MONTH",
    period_no: 3,
    distribution_id: 1,
    distribution_quantity: 4,
    allocation_id: 50,
    allocated_quantity: 4,
    package_sub_item_id: 10,
    package_sub_item_name: "General",
    // In production the manager price exists while effective unit_price is NULL.
    unit_price: null,
    category_manager_unit_price: 250,
  };

  it("prices Category Manager distribution from proposed price even when effective price is NULL", () => {
    const result = buildPackageDistributionAnalysis({
      rows: [distributionRow],
      scope: { label: "IT package" },
      priceBasis: "CATEGORY_MANAGER",
    });

    expect(result.totals.approved_quantity).toBe(4);
    expect(result.totals.allocated_quantity).toBe(4);
    expect(result.totals.periods.monthly["3"]).toBe(1000);
    expect(result.totals.periods.quarterly["1"]).toBe(1000);
    expect(result.totals.estimated_total).toBe(1000);
    expect(result.rows.byModel[0].meta.unitPrice).toBe(250);
  });

  it("keeps existing effective-price reporting unchanged by default", () => {
    const rows = [{ ...distributionRow, unit_price: 100 }];
    const result = buildPackageDistributionAnalysis({
      rows,
      scope: { label: "IT package" },
    });

    expect(result.totals.estimated_total).toBe(400);
    expect(result.rows.byModel[0].meta.unitPrice).toBe(100);
  });

  it("does not substitute effective prices for missing manager prices", () => {
    const rows = [{ ...distributionRow, unit_price: 100, category_manager_unit_price: null }];
    const result = buildPackageDistributionAnalysis({
      rows,
      scope: { label: "IT package" },
      priceBasis: "CATEGORY_MANAGER",
    });

    expect(result.totals.estimated_total).toBe(0);
    expect(result.rows.byModel[0].meta.unitPrice).toBe(0);
  });

  it("uses manager prices for a package containing multiple models", () => {
    const rows = [
      { ...distributionRow, allocated_quantity: 1, allocation_id: 50, package_sub_item_id: 10 },
      { ...distributionRow, allocated_quantity: 3, allocation_id: 51,
        package_sub_item_id: 11, package_sub_item_name: "Premium",
        unit_price: 80, category_manager_unit_price: 400 },
    ];
    const result = buildPackageDistributionAnalysis({
      rows,
      scope: { label: "IT package" },
      priceBasis: "CATEGORY_MANAGER",
    });

    expect(result.totals.approved_quantity).toBe(4); // not doubled across models
    expect(result.totals.allocated_quantity).toBe(4);
    expect(result.totals.estimated_total).toBe(1450);
    expect(result.rows.byModel.map((row) => row.meta.unitPrice)).toEqual([250, 400]);
  });

  it("wires the Category Manager distribution endpoint to manager pricing before submission", async () => {
    findCurrentPackageForCategoryRepo.mockResolvedValue({
      id: 300,
      financial_year_id: 9,
      financial_year: 2027,
      budget_category_id: 1,
      category_name: "IT",
      category_code: "IT",
      status: "DRAFT",
    });
    listPackageDistributionRowsRepo.mockResolvedValue([distributionRow]);

    const result = await getCategoryPackageDistributionService({
      budgetAccess: categoryAccess,
    });

    expect(result.totals.estimated_total).toBe(1000);
    expect(result.rows.byModel[0].meta.unitPrice).toBe(250);
    expect(listPackageDistributionRowsRepo).toHaveBeenCalledWith({
      packageId: 300,
      packageItemId: null,
      expenseType: "ALL",
    });
  });

  it("rebalances a saved custom distribution when CFO return changes only approved quantity", async () => {
    findDepartmentItemPackageEditContextRepo.mockResolvedValue({
      department_item_id: 200,
      department_category_budget_id: 100,
      department_id: 10,
      department_name: "Information Technology",
      catalog_item_name: "Laptop",
      unit_name: "Unit",
      unit_code: "UNIT",
      budget_category_id: 1,
      category_name: "IT",
      financial_year_id: 9,
      financial_year: 2027,
      financial_year_status: "OPEN",
      review_status: "CATEGORY_REVIEW_COMPLETED",
      package_item_id: 400,
      package_status: "RETURNED_BY_CFO",
      cfo_review_status: "NEEDS_MODIFICATION",
      cfo_review_note: "Reduce quantity",
    });
    listApprovedDistributionForDepartmentItemRepo.mockResolvedValue(
      Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        period_type: "MONTH",
        period_no: index + 1,
        quantity: index < 10 ? 1 : 0,
      })),
    );
    updateDepartmentApprovedQuantityForPackageRepo.mockResolvedValue({
      id: 200,
      old_approved_quantity: 10,
      new_approved_quantity: 8,
    });

    await updateDepartmentItemApprovedQuantityService({
      departmentItemId: 200,
      actorUserId: 7,
      budgetAccess: categoryAccess,
      payload: {
        category_approved_quantity: 8,
        row_version: Buffer.from("abcdefgh"),
      },
    });

    expect(replaceApprovedDistributionForDepartmentItemRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        departmentItemId: 200,
        actorUserId: 7,
        distributions: expect.any(Array),
      }),
    );

    const saved =
      replaceApprovedDistributionForDepartmentItemRepo.mock.calls[0][1]
        .distributions;
    expect(saved.reduce((sum, row) => sum + row.quantity, 0)).toBe(8);
    expect(saved.every((row) => Number.isInteger(row.quantity))).toBe(true);
  });

});


