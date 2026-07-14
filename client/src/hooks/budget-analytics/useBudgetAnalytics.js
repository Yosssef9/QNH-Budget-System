import { useQuery } from "@tanstack/react-query";

import { getBudgetAnalyticsOverview } from "../../api/budgetAnalytics.api";

export function useBudgetAnalyticsOverview(filters = {}) {
  return useQuery({
    queryKey: ["budget-analytics", "overview", filters],
    queryFn: () => getBudgetAnalyticsOverview(filters),
    keepPreviousData: true,
  });
}
