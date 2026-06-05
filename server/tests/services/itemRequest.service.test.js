import { describe, it, expect, vi } from "vitest";

vi.mock("../../repositories/itemRequest.repository.js", () => ({
  findItemRequestByIdRepo: vi.fn(),
}));

import { findItemRequestByIdRepo } from "../../repositories/itemRequest.repository.js";

import { approveItemRequestService } from "../../services/itemRequest.service.js";

describe("approveItemRequestService", () => {
  it("should throw when request does not exist", async () => {
    findItemRequestByIdRepo.mockResolvedValue(null);

    await expect(
      approveItemRequestService({
        requestId: 1,
        adminNote: "",
        reviewedBy: 1080,
      }),
    ).rejects.toThrow("Item request not found");
  });
});
