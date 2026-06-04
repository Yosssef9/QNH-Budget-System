import { useQuery } from "@tanstack/react-query";

import { getBudgetBalanceSummary } from "../../api/budget.api";

export default function useBudgetBalanceSummary(budgetId) {
  return useQuery({
    queryKey: ["budget-balance-summary", budgetId],

    queryFn: () => getBudgetBalanceSummary(budgetId),

    enabled: !!budgetId,
  });
}
