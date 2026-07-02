import { describe, expect, it } from "vitest";
import {
  buildPermissionMap,
  hasPermission,
} from "../../../modules/access-management/access.constants.js";

describe("access-management permission compatibility", () => {
  it("builds normalized permission entries and temporary legacy aliases", () => {
    const access = {
      permissions: buildPermissionMap([
        "can_manage_budget_access",
        "can_approve_category_po_links",
      ]),
    };

    expect(access.permissions.can_manage_budget_access).toBe(true);
    expect(access.permissions.can_manage_users).toBe(true);
    expect(access.permissions.can_approve_po_links).toBe(true);
    expect(hasPermission(access, "can_manage_users")).toBe(true);
  });

  it("does not grant unrelated legacy aliases", () => {
    const access = {
      permissions: buildPermissionMap(["can_view_budget_reports"]),
    };

    expect(access.permissions.can_view_budget).toBe(true);
    expect(access.permissions.can_edit_budget).toBe(false);
    expect(hasPermission(access, "can_edit_budget")).toBe(false);
  });
});
