import { useQuery } from "@tanstack/react-query";
import { getBudgetReviewFeedback } from "../../api/budget.api";

export function useBudgetReviewFeedback(budgetId, enabled = true) {
  return useQuery({
    queryKey: ["budget-review-feedback", budgetId],
    queryFn: () => getBudgetReviewFeedback(budgetId),
    enabled: Boolean(budgetId) && enabled,
  });
}
