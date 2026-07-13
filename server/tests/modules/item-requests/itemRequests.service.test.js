import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/notification.service.js", () => ({
  queueNotification: vi.fn(),
}));

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ id: "trx" })),
}));

vi.mock("../../../modules/item-requests/itemRequests.repository.js", () => ({
  approveItemRequestRepo: vi.fn(),
  createItemRequestRepo: vi.fn(),
  findItemRequestByIdRepo: vi.fn(),
  findSupportedCategoryByIdRepo: vi.fn(),
  getDashboardItemRequestsRepo: vi.fn(),
  getItemRequestsRepo: vi.fn(),
  rejectItemRequestRepo: vi.fn(),
}));

vi.mock("../../../modules/master-catalog/masterCatalog.repository.js", () => ({
  createCatalogItemRepo: vi.fn(),
  createSubItemRepo: vi.fn(),
  findCatalogItemByCodeRepo: vi.fn(),
  findCatalogItemByIdRepo: vi.fn(),
  findCatalogItemByNameInCategoryRepo: vi.fn(),
  findUnitByIdRepo: vi.fn(),
  getNextCatalogItemSortOrderRepo: vi.fn(),
}));

import { queueNotification } from "../../../services/notification.service.js";
import {
  approveItemRequestRepo,
  createItemRequestRepo,
  findItemRequestByIdRepo,
  findSupportedCategoryByIdRepo,
} from "../../../modules/item-requests/itemRequests.repository.js";
import {
  createCatalogItemRepo,
  createSubItemRepo,
  findCatalogItemByCodeRepo,
  findCatalogItemByIdRepo,
  findCatalogItemByNameInCategoryRepo,
  findUnitByIdRepo,
  getNextCatalogItemSortOrderRepo,
} from "../../../modules/master-catalog/masterCatalog.repository.js";
import {
  approveAndCreateItemRequestService,
  createItemRequestService,
} from "../../../modules/item-requests/itemRequests.service.js";
import { PERMISSION_CODES } from "../../../../shared/permissions/permissionCodes.js";

const departmentAccess = {
  workspaceType: "DEPARTMENT",
  role: { code: "DEPARTMENT_BUDGET_MANAGER" },
  department: { id: 10 },
  permissionCodes: [PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS],
};

describe("item request service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueNotification.mockResolvedValue(undefined);
    createItemRequestRepo.mockResolvedValue({
      id: 501,
      existing_category_id: 1,
      requested_type_name: "Printer Toner",
      requested_expense_type: "OPEX",
      status: "PENDING",
    });
    findUnitByIdRepo.mockResolvedValue({
      id: 2,
      name: "Each",
      unit_code: "EA",
      is_active: true,
    });
    findCatalogItemByNameInCategoryRepo.mockResolvedValue(null);
    findCatalogItemByCodeRepo.mockResolvedValue(null);
    getNextCatalogItemSortOrderRepo.mockResolvedValue(7);
    createCatalogItemRepo.mockResolvedValue({ id: 99 });
    createSubItemRepo.mockResolvedValue({ id: 199 });
    approveItemRequestRepo.mockResolvedValue({
      id: 501,
      requested_type_name: "Printer Toner",
      status: "APPROVED",
    });
    findCatalogItemByIdRepo.mockResolvedValue({
      id: 99,
      budget_category_id: 1,
      category_name: "IT",
      category_code: "IT",
      item_code: "PRINTER_TONER",
      name: "Printer Toner",
      description: "Approved",
      expense_type: "OPEX",
      unit_of_measure_id: 2,
      unit_name: "Each",
      unit_code: "EA",
      sort_order: 7,
      is_active: true,
      general_sub_item_id: 199,
    });
  });

  it("creates a request under an active fixed category", async () => {
    findSupportedCategoryByIdRepo.mockResolvedValue({
      id: 1,
      category_code: "IT",
      name: "IT",
      is_active: true,
    });

    const request = await createItemRequestService({
      requestedBy: 7,
      budgetAccess: departmentAccess,
      payload: {
        existingCategoryId: 1,
        requestedTypeName: "Printer Toner",
        expenseType: "OPEX",
      },
    });

    expect(createItemRequestRepo).toHaveBeenCalledWith({
      existingCategoryId: 1,
      requestedTypeName: "Printer Toner",
      requestedExpenseType: "OPEX",
      requestedBy: 7,
    });
    expect(request.existing_category_code).toBe("IT");
    expect(queueNotification).toHaveBeenCalled();
  });

  it("rejects unsupported categories", async () => {
    findSupportedCategoryByIdRepo.mockResolvedValue({
      id: 9,
      category_code: "OTHER",
      name: "Other",
      is_active: true,
    });

    await expect(
      createItemRequestService({
        requestedBy: 7,
        budgetAccess: departmentAccess,
        payload: {
          existingCategoryId: 9,
          requestedTypeName: "Printer Toner",
          expenseType: "OPEX",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "ITEM_REQUEST_CATEGORY_UNSUPPORTED",
    });

    expect(createItemRequestRepo).not.toHaveBeenCalled();
  });

  it("rejects non-department workspaces without catalog-management permission", async () => {
    await expect(
      createItemRequestService({
        requestedBy: 7,
        budgetAccess: {
          workspaceType: "GLOBAL",
          role: { code: "PO_LINK_MANAGER" },
          permissionCodes: [],
        },
        payload: {
          existingCategoryId: 1,
          requestedTypeName: "Printer Toner",
          expenseType: "OPEX",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "ITEM_REQUEST_DEPARTMENT_WORKSPACE_REQUIRED",
    });
  });

  it("approves and auto-creates a catalog item with a protected General sub-item", async () => {
    findItemRequestByIdRepo.mockResolvedValue({
      id: 501,
      existing_category_id: 1,
      existing_category_code: "IT",
      existing_category_name: "IT",
      existing_category_is_active: true,
      requested_type_name: "Printer Toner",
      requested_expense_type: "OPEX",
      status: "PENDING",
    });

    const result = await approveAndCreateItemRequestService({
      requestId: 501,
      adminNote: "Approved",
      unitOfMeasureId: 2,
      reviewedBy: 42,
    });

    expect(createCatalogItemRepo).toHaveBeenCalledWith(
      { id: "trx" },
      expect.objectContaining({
        budget_category_id: 1,
        item_code: "PRINTER_TONER",
        name: "Printer Toner",
        expense_type: "OPEX",
        unit_of_measure_id: 2,
      }),
    );
    expect(createSubItemRepo).toHaveBeenCalledWith(
      { id: "trx" },
      expect.objectContaining({
        catalog_item_id: 99,
        sub_item_code: "GENERAL",
        name: "General",
        is_default_general: true,
      }),
    );
    expect(approveItemRequestRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 501,
        reviewedBy: 42,
        transaction: { id: "trx" },
      }),
    );
    expect(result.catalogItem.name).toBe("Printer Toner");
    expect(result.catalogItem.general_sub_item_id).toBe(199);
  });

  it("does not approve when an active catalog item already exists", async () => {
    findItemRequestByIdRepo.mockResolvedValue({
      id: 501,
      existing_category_id: 1,
      existing_category_code: "IT",
      existing_category_name: "IT",
      existing_category_is_active: true,
      requested_type_name: "Printer Toner",
      requested_expense_type: "OPEX",
      status: "PENDING",
    });
    findCatalogItemByNameInCategoryRepo.mockResolvedValue({
      id: 99,
      name: "Printer Toner",
    });

    await expect(
      approveAndCreateItemRequestService({
        requestId: 501,
        adminNote: null,
        unitOfMeasureId: 2,
        reviewedBy: 42,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "ITEM_REQUEST_CATALOG_ITEM_NAME_EXISTS",
    });

    expect(createCatalogItemRepo).not.toHaveBeenCalled();
    expect(approveItemRequestRepo).not.toHaveBeenCalled();
  });
});
