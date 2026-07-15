import { describe, expect, it } from "vitest";
import {
  PERMISSION_CODES,
  hasAnyPermission,
  hasPermission,
} from "../../../../shared/permissions/permissionCodes.js";
import { normalizePermissionCodes } from "../../../modules/access-management/access.constants.js";

describe("canonical budget permission helpers", () => {
  it("checks canonical permission codes from permissionCodes", () => {
    const access = {
      permissionCodes: [
        PERMISSION_CODES.MANAGE_BUDGET_ACCESS,
        PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS,
      ],
    };

    expect(hasPermission(access, PERMISSION_CODES.MANAGE_BUDGET_ACCESS)).toBe(
      true,
    );
    expect(
      hasAnyPermission(access, [
        PERMISSION_CODES.MANAGE_BUDGET_CATALOG,
        PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS,
      ]),
    ).toBe(true);
    expect(hasPermission(access, PERMISSION_CODES.MANAGE_BUDGET_CATALOG)).toBe(
      false,
    );
  });

  it("rejects legacy permission aliases", () => {
    const access = {
      permissionCodes: [PERMISSION_CODES.MANAGE_BUDGET_ACCESS],
    };

    expect(() => hasPermission(access, "can_manage_users")).toThrow(
      "Unknown budget permission code",
    );
  });

  it("normalizes duplicate permission code rows from the database", () => {
    expect(
      normalizePermissionCodes([
        PERMISSION_CODES.MANAGE_BUDGET_ACCESS,
        PERMISSION_CODES.MANAGE_BUDGET_ACCESS,
        "",
        null,
      ]),
    ).toEqual([PERMISSION_CODES.MANAGE_BUDGET_ACCESS]);
  });
});
