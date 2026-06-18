import { useQuery } from "@tanstack/react-query";

import { getPOSuggestions } from "../../api/po.api";
import { PO_SUGGESTIONS_QUERY_KEY } from "./usePOQueryKeys";

export function usePOSuggestions(budgetItemId) {
  return useQuery({
    queryKey: [...PO_SUGGESTIONS_QUERY_KEY, budgetItemId],
    queryFn: () => getPOSuggestions(budgetItemId),
    enabled: Boolean(budgetItemId),
    placeholderData: (previousData) => previousData,
  });
}
