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
  const permissionCodes = budgetAccess?.permissionCodes || [];
  const hasDepartmentBudgetAccess = [
    PERMISSION_CODES.VIEW_DEPARTMENT_BUDGET_REQUESTS,
    PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS,
    PERMISSION_CODES.SUBMIT_DEPARTMENT_CATEGORY_BUDGETS,
  ].some((permission) => permissionCodes.includes(permission));
  const canSubmitAdjustments = permissionCodes.includes(
    PERMISSION_CODES.SUBMIT_DEPARTMENT_BUDGET_CHANGE_REQUESTS,
  );
  const canReviewAdjustments = permissionCodes.includes(
    PERMISSION_CODES.REVIEW_CATEGORY_BUDGET_CHANGE_REQUESTS,
  );
  const shouldLoadCurrentBudget = Boolean(
    budgetAccess?.department?.id &&
      hasDepartmentBudgetAccess &&
      !permissionCodes.includes(PERMISSION_CODES.VIEW_BUDGET_REPORTS),
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
    queryKey: [
      "dashboard",
      "stats",
      budgetAccess?.userRoleId || budgetAccess?.activeUserRoleId || null,
      activeYear?.id || null,
    ],
    queryFn: () => getDashboardStats(activeYear?.id),
    enabled: Boolean(activeYear?.id),
    refetchOnWindowFocus: true,
  });

  const totalRequestedQuantity = useMemo(() => {
    return budgetItems.reduce(
      (sum, item) => sum + toNumber(item.quantity),
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
    totalRequestedQuantity,
    dashboardStats,
    dashboardItemRequests,
    dashboardTransfers,
    dashboardPOLinks,
    dashboardAdjustmentRequests,
    dashboardAdjustmentMode: canReviewAdjustments ? "CATEGORY" : "MY",
    isLoading: loadingBudget || loadingItems,
  };
}
