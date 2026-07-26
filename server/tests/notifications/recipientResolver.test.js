import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { PERMISSION_CODES } from "../../../shared/permissions/permissionCodes.js";

vi.mock("../../modules/access-management/access.service.js", () => ({
  getUsersByEffectivePermission: vi.fn(),
}));

vi.mock("../../repositories/notificationRecipients.repository.js", () => ({
  getActiveBudgetUsersExceptRepo: vi.fn(),
  getTransferRequesterRepo: vi.fn(),
  getBudgetOwnerRepo: vi.fn(),
  getItemRequestOwnerRepo: vi.fn(),
  getPOLinkRequesterRepo: vi.fn(),
}));

import { getUsersByEffectivePermission } from "../../modules/access-management/access.service.js";
import { getActiveBudgetUsersExceptRepo } from "../../repositories/notificationRecipients.repository.js";
import { resolveRecipients } from "../../notifications/recipientResolver.js";

describe("notification recipient permission resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUsersByEffectivePermission.mockResolvedValue([]);
  });

  it("routes item request notifications through the catalog management permission", async () => {
    await resolveRecipients(NOTIFICATION_TYPES.ITEM_REQUEST_CREATED, {
      requestId: 10,
      categoryId: 1,
    });

    expect(getUsersByEffectivePermission).toHaveBeenCalledWith({
      permissionCode: PERMISSION_CODES.MANAGE_BUDGET_CATALOG,
      scope: { type: "GLOBAL" },
    });
  });

  it("scopes department category submission notifications to the submitted category", async () => {
    await resolveRecipients(
      NOTIFICATION_TYPES.DEPARTMENT_CATEGORY_BUDGET_SUBMITTED,
      {
        categoryBudgetId: 44,
        categoryId: 2,
      },
    );

    expect(getUsersByEffectivePermission).toHaveBeenCalledWith({
      permissionCode: PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS,
      scope: { type: "CATEGORY", categoryId: 2 },
    });
  });

  it("routes category package submissions to CFO approvers", async () => {
    await resolveRecipients(NOTIFICATION_TYPES.CATEGORY_BUDGET_PACKAGE_SUBMITTED, {
      packageId: 12,
      categoryId: 2,
    });

    expect(getUsersByEffectivePermission).toHaveBeenCalledWith({
      permissionCode: PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES,
      scope: { type: "GLOBAL" },
    });
  });

  it("routes completed category review notifications to the owning department", async () => {
    await resolveRecipients(
      NOTIFICATION_TYPES.DEPARTMENT_CATEGORY_REVIEW_COMPLETED,
      {
        departmentCategoryBudgetId: 44,
        departmentId: 8,
      },
    );

    expect(getUsersByEffectivePermission).toHaveBeenCalledWith({
      permissionCode: PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
      scope: { type: "DEPARTMENT", departmentId: 8 },
    });
  });

  it("routes adjustment request submissions to the assigned category manager", async () => {
    await resolveRecipients(NOTIFICATION_TYPES.ADJUSTMENT_REQUEST_SUBMITTED, {
      adjustmentRequestId: 22,
      categoryId: 3,
    });

    expect(getUsersByEffectivePermission).toHaveBeenCalledWith({
      permissionCode: PERMISSION_CODES.REVIEW_CATEGORY_BUDGET_CHANGE_REQUESTS,
      scope: { type: "CATEGORY", categoryId: 3 },
    });
  });

  it("routes financial-year broadcasts only through active budget users", async () => {
    getActiveBudgetUsersExceptRepo.mockResolvedValue([]);

    await resolveRecipients(NOTIFICATION_TYPES.FINANCIAL_YEAR_OPENED, {
      actorUserId: 1080,
    });

    expect(getActiveBudgetUsersExceptRepo).toHaveBeenCalledWith(1080);
  });
});
