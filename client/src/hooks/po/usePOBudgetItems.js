import { useQuery } from "@tanstack/react-query";

import { getPOBudgetItems } from "../../api/po.api";
import { PO_BUDGET_ITEMS_QUERY_KEY } from "./usePOQueryKeys";

export function usePOBudgetItems() {
  return useQuery({
    queryKey: PO_BUDGET_ITEMS_QUERY_KEY,
    queryFn: getPOBudgetItems,
  });
}
