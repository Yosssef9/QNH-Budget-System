import { useQuery } from "@tanstack/react-query";

import { getPackageItemOverallAveragePriceIntelligence } from "../../api/po.api";

export default function usePackageItemOverallAveragePriceIntelligence(
  packageSubItemId,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "po-links",
      "package-item-overall-average-price-intelligence",
      packageSubItemId,
    ],
    queryFn: () =>
      getPackageItemOverallAveragePriceIntelligence(
        packageSubItemId,
      ),
    enabled: Boolean(enabled && packageSubItemId),
  });
}
