import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBudgetDetails } from "../../api/budget.api";

export function useBudgetView() {
  const { budgetId } = useParams();

  return useQuery({
    queryKey: ["budget-view", budgetId],
    queryFn: () => getBudgetDetails(budgetId),
    enabled: !!budgetId,
  });
}
