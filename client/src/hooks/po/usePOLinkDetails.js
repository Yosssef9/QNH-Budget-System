import { useQuery } from "@tanstack/react-query";

import { getPOLinkById } from "../../api/po.api";
import { PO_LINK_DETAILS_QUERY_KEY } from "./usePOQueryKeys";

export function usePOLinkDetails(id) {
  return useQuery({
    queryKey: [...PO_LINK_DETAILS_QUERY_KEY, id],

    queryFn: () => getPOLinkById(id),

    enabled: Boolean(id),
  });
}
