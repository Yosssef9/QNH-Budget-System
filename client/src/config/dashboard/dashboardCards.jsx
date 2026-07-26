import { can } from "../../helpers/permissions";
import { PERMISSION_CODES } from "@qnh/permissions";

import { getHodCards } from "./hodCards";
import { getAdminCards } from "./adminCards";
import { getCategoryManagerCards } from "./categoryManagerCards";

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

  const isCategoryManager =
    can(
      budgetAccess,
      PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS,
    ) && !isApprover && !isHod;

  if (isHod) {
    return getHodCards(
      budgetAccess,
      dashboardData
    );
  }

  if (isCategoryManager) {
    return getCategoryManagerCards(
      budgetAccess,
      dashboardData,
    );
  }

  return getAdminCards(
    budgetAccess,
    dashboardData
  );
}
