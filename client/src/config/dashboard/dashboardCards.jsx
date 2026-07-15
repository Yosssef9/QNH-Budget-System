import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";

import { getHodCards } from "./hodCards";
import { getAdminCards } from "./adminCards";

export function getDashboardStatsCards(
  budgetAccess,
  dashboardData
) {
  const isApprover =
    can(
      budgetAccess,
      PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES
    ) ||
    can(
      budgetAccess,
      PERMISSION_CODES.MANAGE_BUDGET_ACCESS
    ) ||
    can(
      budgetAccess,
      PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS
    );

  const isHod =
    can(
      budgetAccess,
      PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS
    ) && !isApprover;

  if (isHod) {
    return getHodCards(
      budgetAccess,
      dashboardData
    );
  }

  return getAdminCards(
    budgetAccess,
    dashboardData
  );
}
