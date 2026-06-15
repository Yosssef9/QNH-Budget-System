import { useQuery } from "@tanstack/react-query";

import { getBudgetItemPOLinks } from "../../api/budget.api";

export default function useBudgetItemPOLinks(budgetItemId) {
  return useQuery({
    queryKey: ["budget-item-po-links", budgetItemId],

    queryFn: () => getBudgetItemPOLinks(budgetItemId),

    enabled: Boolean(budgetItemId),
  });
}
