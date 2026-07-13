import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBudgetItems,
  getCurrentBudget,
  getDashboardStats,
  getDashboardItemRequests,
} from "../../api/budget.api";
import { getTransferDashboard } from "../../api/transfer.api";
import { getPODashboard } from "../../api/po.api";
import {
  getCategoryAdjustmentRequests,
  getMyAdjustmentRequests,
} from "../../api/adjustmentRequests.api";
import { useAuth } from "../../context/AuthContext";
import { useActiveFinancialYear } from "../financial-years/useFinancialYears";
import { toNumber } from "../../utils/number";
import { PERMISSION_CODES } from "@qnh/permissions";


export function useDashboardData() {
  const { budgetAccess } = useAuth();
  const { data: activeYear } = useActiveFinancialYear();
  const permissions = budgetAccess?.permissions || {};
  const permissionCodes = budgetAccess?.permissionCodes || [];
  const canSubmitAdjustments = permissionCodes.includes(
    PERMISSION_CODES.SUBMIT_DEPARTMENT_BUDGET_CHANGE_REQUESTS,
  );
  const canReviewAdjustments = permissionCodes.includes(
    PERMISSION_CODES.REVIEW_CATEGORY_BUDGET_CHANGE_REQUESTS,
  );
  const shouldLoadCurrentBudget = Boolean(
    budgetAccess?.department?.id &&
      (permissions.can_view_budget || permissions.can_edit_budget) &&
      !permissions.can_approve_budget,
  );

  const { data: currentBudget, isLoading: loadingBudget } = useQuery({
    queryKey: ["dashboard", "current-budget", budgetAccess?.department?.id],
    queryFn: getCurrentBudget,
    enabled: shouldLoadCurrentBudget,
    retry: false,
  });

  const { data: budgetItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["dashboard", "current-budget-items", currentBudget?.id],
    queryFn: () => getBudgetItems(currentBudget?.id),
    enabled: shouldLoadCurrentBudget && Boolean(currentBudget?.id),
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
    refetchOnWindowFocus: true,
  });

  const totalAmount = useMemo(() => {
    return budgetItems.reduce(
      (sum, item) => sum + toNumber(item.total_amount),
      0,
    );
  }, [budgetItems]);
  const { data: dashboardItemRequests } = useQuery({
    queryKey: ["dashboard", "item-requests"],
    queryFn: getDashboardItemRequests,
    refetchOnWindowFocus: true,
  });
  const { data: dashboardTransfers = null } = useQuery({
    queryKey: ["dashboard", "transfer-requests"],
    queryFn: getTransferDashboard,
  });
  const { data: dashboardPOLinks = null } = useQuery({
    queryKey: ["dashboard", "po-links"],
    queryFn: getPODashboard,
    refetchOnWindowFocus: true,
  });
  const { data: dashboardAdjustmentRequests = [] } = useQuery({
    queryKey: [
      "dashboard",
      "adjustment-requests",
      canReviewAdjustments ? "category" : "my",
    ],
    queryFn: () =>
      canReviewAdjustments
        ? getCategoryAdjustmentRequests("ALL")
        : getMyAdjustmentRequests("ALL"),
    enabled: canSubmitAdjustments || canReviewAdjustments,
    refetchOnWindowFocus: true,
  });
  return {
    activeYear,
    currentBudget,
    budgetItems,
    totalAmount,
    dashboardStats,
    dashboardItemRequests,
    dashboardTransfers,
    dashboardPOLinks,
    dashboardAdjustmentRequests,
    dashboardAdjustmentMode: canReviewAdjustments ? "CATEGORY" : "MY",
    isLoading: loadingBudget || loadingItems,
  };
}
