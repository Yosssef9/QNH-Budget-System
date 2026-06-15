import { useQuery } from "@tanstack/react-query";

import { getMyPOLinks } from "../../api/po.api";
import { MY_PO_LINKS_QUERY_KEY } from "./usePOQueryKeys";

export function useMyPOLinks() {
  return useQuery({
    queryKey: MY_PO_LINKS_QUERY_KEY,

    queryFn: getMyPOLinks,

    placeholderData: (previousData) => previousData,
  });
}
