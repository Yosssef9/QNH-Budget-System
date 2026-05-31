import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBudgetItems,
  getCurrentBudget,
  getDashboardStats,
  getDashboardItemRequests,
} from "../../api/budget.api";
import { useOpenFinancialYear } from "../financial-years/useFinancialYears";
import { toNumber } from "../../utils/number";

export function useDashboardData() {
  const { data: openYear } = useOpenFinancialYear();

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
  return {
    openYear,
    currentBudget,
    budgetItems,
    totalAmount,
    dashboardStats,
    dashboardItemRequests,
    isLoading: loadingBudget || loadingItems,
  };
}
