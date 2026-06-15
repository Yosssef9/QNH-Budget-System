import { useQuery } from "@tanstack/react-query";

import { getPOLinksForApproval } from "../../api/po.api";
import { PO_APPROVAL_LINKS_QUERY_KEY } from "./usePOQueryKeys";

export function usePOLinksForApproval(params = {}) {
  return useQuery({
    queryKey: [...PO_APPROVAL_LINKS_QUERY_KEY, params],

    queryFn: () => getPOLinksForApproval(params),

    placeholderData: (previousData) => previousData,
  });
}

export function usePendingPOLinks(params = {}) {
  return usePOLinksForApproval({
    status: "PENDING",
    ...params,
  });
}
