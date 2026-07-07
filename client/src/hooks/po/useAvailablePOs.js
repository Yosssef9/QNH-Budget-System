
import { useQuery } from "@tanstack/react-query";

import { getAvailablePOs } from "../../api/po.api";
import { AVAILABLE_POS_QUERY_KEY } from "./usePOQueryKeys";

export function useAvailablePOs(params = {}) {
  return useQuery({
    queryKey: [...AVAILABLE_POS_QUERY_KEY, params],

    queryFn: () => getAvailablePOs(params),

    placeholderData: (previousData) => previousData,
  });
}
