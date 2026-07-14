import { useQuery } from "@tanstack/react-query";

import { getPackageSubItemPriceIntelligence } from "../../api/po.api";

export default function usePackageSubItemPriceIntelligence(
  packageSubItemId,
  enabled = true,
) {
  return useQuery({
    queryKey: ["po-links", "package-sub-item-price-intelligence", packageSubItemId],
    queryFn: () => getPackageSubItemPriceIntelligence(packageSubItemId),
    enabled: Boolean(enabled && packageSubItemId),
  });
}
