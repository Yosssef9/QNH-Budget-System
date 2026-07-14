import { useQuery } from "@tanstack/react-query";

import { getPOLinkById } from "../../api/po.api";
import { PO_LINK_DETAILS_QUERY_KEY } from "./usePOQueryKeys";

export function usePOLinkDetails(id) {
  const numericId = Number(id);
  const validId = Number.isInteger(numericId) && numericId > 0;

  return useQuery({
    queryKey: [...PO_LINK_DETAILS_QUERY_KEY, validId ? numericId : null],

    queryFn: () => getPOLinkById(numericId),

    enabled: validId,
  });
}
