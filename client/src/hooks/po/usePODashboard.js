import { useQuery } from "@tanstack/react-query";

import { getPODashboard } from "../../api/po.api";
import { PO_DASHBOARD_QUERY_KEY } from "./usePOQueryKeys";

export function usePODashboard() {
  return useQuery({
    queryKey: PO_DASHBOARD_QUERY_KEY,
    queryFn: getPODashboard,
    placeholderData: (previousData) => previousData,
  });
}
