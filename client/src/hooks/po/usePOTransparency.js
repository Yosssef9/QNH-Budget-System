import { useQuery } from "@tanstack/react-query";

import { getPOTransparency } from "../../api/po.api";
import { PO_TRANSPARENCY_QUERY_KEY } from "./usePOQueryKeys";

export function usePOTransparency(poRecordId) {
  return useQuery({
    queryKey: [...PO_TRANSPARENCY_QUERY_KEY, poRecordId],

    queryFn: () => getPOTransparency(poRecordId),

    enabled: Boolean(poRecordId),
  });
}
