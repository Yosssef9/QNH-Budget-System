import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBudgetItems,
  getCurrentBudget,
  getDashboardStats,
  getDashboardItemRequests,
} from "../../api/budget.api";
import { getTransferDashboard } from "../../api/transfer.api";
import { useActiveFinancialYear } from "../financial-years/useFinancialYears";
import { toNumber } from "../../utils/number";

export function useDashboardData() {
  const { data: activeYear } = useActiveFinancialYear();

  const { data: currentBudget, isLoading: loadingBudget } = useQuery({
    queryKey: ["dashboard", "current-budget"],
    queryFn: getCurrentBudget,
    retry: false,
  });

  const { data: budgetItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["dashboard", "current-budget-items", currentBudget?.id],
    queryFn: () => getBudgetItems(currentBudget?.id),
    enabled: Boolean(currentBudget?.id),
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
  return {
    activeYear,
    currentBudget,
    budgetItems,
    totalAmount,
    dashboardStats,
    dashboardItemRequests,
    dashboardTransfers,
    isLoading: loadingBudget || loadingItems,
  };
}
