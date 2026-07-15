import { useQuery } from "@tanstack/react-query";

import { getPackageSubItemPOLinks } from "../../api/po.api";

export default function usePackageSubItemPOLinks(packageSubItemId) {
  const numericId = Number(packageSubItemId);
  const validId = Number.isInteger(numericId) && numericId > 0;

  return useQuery({
    queryKey: ["package-sub-item-po-links", validId ? numericId : null],
    queryFn: () => getPackageSubItemPOLinks(numericId),
    enabled: validId,
  });
}
