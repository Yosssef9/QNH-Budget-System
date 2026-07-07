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
    findPackageContextByItemRepo: vi.fn(),
    findPackageContextBySubItemRepo: vi.fn(),
    listPackageSubItemAttachmentsRepo: vi.fn(),
    listAllocationsForPackageItemRepo: vi.fn(),
    listPackageItemDetailRowsRepo: vi.fn(),
    listPackageItemsRepo: vi.fn(),
    listPackageSubItemsForDepartmentItemRepo: vi.fn(),
    markPackageSubmittedToCfoRepo: vi.fn(),
    recalculatePackageSubItemQuantitiesRepo: vi.fn(),
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
  findPackageAttachmentContextRepo,
  findCurrentPackageForCategoryRepo,
  findDepartmentItemAllocationContextRepo,
  findPackageContextByItemRepo,
  findPackageContextBySubItemRepo,
  listAllocationsForPackageItemRepo,
  listPackageItemDetailRowsRepo,
  listPackageItemsRepo,
  listPackageSubItemsForDepartmentItemRepo,
  markPackageSubmittedToCfoRepo,
  recalculatePackageSubItemQuantitiesRepo,
  updatePackageItemReconciliationRepo,
  upsertAllocationRepo,
} from "../../../modules/category-packages/categoryPackages.repository.js";
import {
  deletePackageSubItemAttachmentService,
  replaceDepartmentItemAllocationsService,
  submitCategoryPackageToCfoService,
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
    PERMISSION_CODES.SUBMIT_CATEGORY_BUDGET_PACKAGES_TO_CFO,
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
        unit_price: 1000,
      },
      {
        package_sub_item_id: 11,
        package_item_id: 400,
        package_sub_item_name: "Dell Latitude 5450",
        unit_price: 2000,
      },
    ]);
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
          unit_price: 2000,
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
  it("rejects allocation to a model without a unit price", async () => {
    listPackageSubItemsForDepartmentItemRepo.mockResolvedValue([
      {
        package_sub_item_id: 10,
        package_item_id: 400,
        package_sub_item_name: "General",
        unit_price: null,
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
      errorCode: "PACKAGE_SUB_ITEM_UNIT_PRICE_REQUIRED",
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

  it("blocks CFO submission when a department item is not fully allocated", async () => {
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
          unit_price: 2000,
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
      submitCategoryPackageToCfoService({
        packageId: 300,
        actorUserId: 7,
        budgetAccess: categoryAccess,
        payload: { row_version: "abc" },
      }),
    ).rejects.toMatchObject({ errorCode: "CATEGORY_PACKAGE_NOT_READY" });

    expect(markPackageSubmittedToCfoRepo).not.toHaveBeenCalled();
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
});
