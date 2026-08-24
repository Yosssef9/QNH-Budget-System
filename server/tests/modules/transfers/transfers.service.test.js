import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

vi.mock("../../../services/notification.service.js", () => ({
  queueNotification: vi.fn(),
}));

vi.mock("../../../modules/transfers/transfers.repository.js", () => ({
  approveTransferRepo: vi.fn(),
  createCategoryTransferRepo: vi.fn(),
  ensureDestinationPackageSubItemRepo: vi.fn(),
  findSubItemContextRepo: vi.fn(),
  getTransferByIdRepo: vi.fn(),
  listReusableSubItemsForCatalogItemRepo: vi.fn(),
  listTransferDestinationCatalogRepo: vi.fn(),
  listTransfersRepo: vi.fn(),
  listTransferSubItemsRepo: vi.fn(),
  rejectTransferRepo: vi.fn(),
}));

vi.mock(
  "../../../modules/category-packages/categoryPackages.repository.js",
  () => ({
    createWorkflowHistoryRepo: vi.fn(),
  }),
);

import { queueNotification } from "../../../services/notification.service.js";
import {
  approveTransferRepo,
  getTransferByIdRepo,
} from "../../../modules/transfers/transfers.repository.js";
import { createWorkflowHistoryRepo } from "../../../modules/category-packages/categoryPackages.repository.js";
import { approveTransferService } from "../../../modules/transfers/transfers.service.js";

describe("transfers service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueNotification.mockResolvedValue(undefined);
  });

  it("allows a requester with approval permission to approve their own transfer", async () => {
    getTransferByIdRepo
      .mockResolvedValueOnce({
        id: 81,
        financial_year_id: 12,
        status: "PENDING_APPROVAL",
        requested_by: 7,
      })
      .mockResolvedValueOnce({
        id: 81,
        financial_year_id: 12,
        status: "APPROVED",
        requested_by: 7,
        approved_by: 7,
      });
    approveTransferRepo.mockResolvedValue(1);

    const result = await approveTransferService({
      transferId: 81,
      actorUserId: 7,
      budgetAccess: {
        permissionCodes: ["can_approve_category_transfers"],
        userRoleId: 44,
        workspaceType: "GLOBAL",
      },
    });

    expect(approveTransferRepo).toHaveBeenCalledWith(
      { transaction: true },
      {
        transfer_id: 81,
        actor_user_id: 7,
        actor_user_role_id: 44,
      },
    );
    expect(createWorkflowHistoryRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        entity_id: 81,
        action: "CATEGORY_TRANSFER_APPROVED",
        created_by: 7,
      }),
    );
    expect(result.status).toBe("APPROVED");
  });
});
