import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/notification.service.js", () => ({
  queueNotification: vi.fn(),
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

import { queueNotification } from "../../../services/notification.service.js";
import {
  createItemRequestRepo,
  findSupportedCategoryByIdRepo,
} from "../../../modules/item-requests/itemRequests.repository.js";
import { createItemRequestService } from "../../../modules/item-requests/itemRequests.service.js";
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
});
