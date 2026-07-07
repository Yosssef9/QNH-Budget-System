import { describe, expect, it, vi } from "vitest";
import { ROLE_CODES } from "../../../modules/access-management/access.constants.js";

vi.mock("../../../modules/access-management/access.repository.js", () => ({
  createBudgetAccessAssignmentRepo: vi.fn(),
  deleteBudgetAccessAssignmentRepo: vi.fn(),
  findBudgetAccessAssignmentByIdRepo: vi.fn(),
  findBudgetRoleByIdRepo: vi.fn(),
  findDuplicateBudgetAccessAssignmentRepo: vi.fn(),
  getActiveAssignmentsByUserIdRepo: vi.fn(),
  getAssignmentPermissionMatrixRepo: vi.fn(),
  getBudgetAccessDepartmentsRepo: vi.fn(),
  getBudgetAccessAssignmentsRepo: vi.fn(),
  getBudgetAccessUsersRepo: vi.fn(),
  getBudgetRolesRepo: vi.fn(),
  getEffectivePermissionCodesByUserRoleIdRepo: vi.fn(),
  findActivePermissionIdsRepo: vi.fn(),
  replaceAssignmentPermissionOverridesRepo: vi.fn(),
  updateBudgetAccessAssignmentRepo: vi.fn(),
  updateBudgetAccessAssignmentStatusRepo: vi.fn(),
}));

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

import {
  findActivePermissionIdsRepo,
  findBudgetAccessAssignmentByIdRepo,
  getActiveAssignmentsByUserIdRepo,
  getAssignmentPermissionMatrixRepo,
  getEffectivePermissionCodesByUserRoleIdRepo,
  replaceAssignmentPermissionOverridesRepo,
} from "../../../modules/access-management/access.repository.js";
import {
  replaceAssignmentPermissionOverridesService,
  resolveBudgetAccessForUser,
  validateRoleScope,
} from "../../../modules/access-management/access.service.js";

describe("validateRoleScope", () => {
  it("requires department scope for department roles", () => {
    expect(() =>
      validateRoleScope({
        role: { role_code: ROLE_CODES.DEPARTMENT_BUDGET_MANAGER },
        department_id: null,
        budget_category_id: null,
      }),
    ).toThrow("Department is required");
  });

  it("requires category scope for category manager role", () => {
    expect(() =>
      validateRoleScope({
        role: { role_code: ROLE_CODES.CATEGORY_BUDGET_MANAGER },
        department_id: null,
        budget_category_id: null,
      }),
    ).toThrow("Budget category is required");
  });

  it("rejects department scope for global roles", () => {
    expect(() =>
      validateRoleScope({
        role: { role_code: ROLE_CODES.BUDGET_APPROVER },
        department_id: 10,
        budget_category_id: null,
      }),
    ).toThrow("Department scope is not allowed");
  });

  it("accepts valid department, category, and global scope assignments", () => {
    expect(() =>
      validateRoleScope({
        role: { role_code: ROLE_CODES.DEPARTMENT_USER },
        department_id: 10,
        budget_category_id: null,
      }),
    ).not.toThrow();

    expect(() =>
      validateRoleScope({
        role: { role_code: ROLE_CODES.CATEGORY_BUDGET_MANAGER },
        department_id: null,
        budget_category_id: 1,
      }),
    ).not.toThrow();

    expect(() =>
      validateRoleScope({
        role: { role_code: ROLE_CODES.BUDGET_SYSTEM_ADMIN },
        department_id: null,
        budget_category_id: null,
      }),
    ).not.toThrow();
  });
});

describe("replaceAssignmentPermissionOverridesService", () => {
  it("replaces assignment overrides transactionally and returns effective permissions", async () => {
    findBudgetAccessAssignmentByIdRepo.mockResolvedValue({
      id: 99,
      user_id: 100,
      user_code: "U100",
      user_name: "Budget Admin",
      role_id: 1,
      role_name: "Budget System Admin",
      role_code: ROLE_CODES.BUDGET_SYSTEM_ADMIN,
      department_id: null,
      budget_category_id: null,
      is_active: true,
    });
    findActivePermissionIdsRepo.mockResolvedValue([30]);
    getAssignmentPermissionMatrixRepo
      .mockResolvedValueOnce([
        {
          permission_id: 30,
          permission_code: "can_manage_budget_access",
          name: "Manage Budget Access",
          description: "Manage access",
          permission_group: "ADMIN_REPORTING",
          sort_order: 1,
          role_default: false,
          override_action: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          permission_id: 30,
          permission_code: "can_manage_budget_access",
          name: "Manage Budget Access",
          description: "Manage access",
          permission_group: "ADMIN_REPORTING",
          sort_order: 1,
          role_default: false,
          override_action: "GRANT",
        },
      ]);

    const result = await replaceAssignmentPermissionOverridesService(99, {
      overrides: [{ permission_id: 30, action: "GRANT" }],
      updated_by: 7,
    });

    expect(replaceAssignmentPermissionOverridesRepo).toHaveBeenCalledWith(
      { transaction: true },
      99,
      [{ permission_id: 30, action: "GRANT" }],
      7,
    );
    expect(result.after.overrides).toEqual([
      {
        permission_id: 30,
        permission_code: "can_manage_budget_access",
        action: "GRANT",
      },
    ]);
    expect(result.after.permissions[0].effective_allowed).toBe(true);
  });
});

describe("resolveBudgetAccessForUser", () => {
  it("returns multiple workspaces and selects requested assignment permissions", async () => {
    getActiveAssignmentsByUserIdRepo.mockResolvedValue([
      {
        user_role_id: 10,
        user_id: 100,
        role_id: 1,
        role_name: "Department User",
        role_code: ROLE_CODES.DEPARTMENT_USER,
        department_id: 5,
        department_name: "Nursing",
        department_code: "NUR",
        budget_category_id: null,
      },
      {
        user_role_id: 20,
        user_id: 100,
        role_id: 2,
        role_name: "Category Manager",
        role_code: ROLE_CODES.CATEGORY_BUDGET_MANAGER,
        department_id: null,
        budget_category_id: 1,
        budget_category_name: "IT",
        category_code: "IT",
      },
    ]);
    getEffectivePermissionCodesByUserRoleIdRepo.mockImplementation(
      async (userRoleId) =>
        userRoleId === 20
          ? ["can_review_department_category_requests"]
          : ["can_view_department_budget_requests"],
    );

    const access = await resolveBudgetAccessForUser({
      userId: 100,
      requestedUserRoleId: "20",
    });

    expect(access.userRoleId).toBe(20);
    expect(access.workspaces).toHaveLength(2);
    expect(access.workspaceType).toBe("CATEGORY");
    expect(access.budgetCategory).toEqual({
      id: 1,
      name: "IT",
      code: "IT",
    });
    expect(access.permissionCodes).toContain(
      "can_review_department_category_requests",
    );
    expect(access.permissionCodes).not.toContain(
      "can_view_department_budget_requests",
    );
  });
});
