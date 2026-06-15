import { can } from "../../helpers/permissions";

import { getHodCards } from "./hodCards";
import { getAdminCards } from "./adminCards";

export function getDashboardStatsCards(
  budgetAccess,
  dashboardData
) {
  const isApprover =
    can(
      budgetAccess,
      "can_approve_budget"
    ) ||
    can(
      budgetAccess,
      "can_manage_users"
    ) ||
    can(
      budgetAccess,
      "can_approve_po_links"
    );

  const isHod =
    can(
      budgetAccess,
      "can_edit_budget"
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
