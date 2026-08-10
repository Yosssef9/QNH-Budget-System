import { useQuery } from "@tanstack/react-query";
import { getPackageSubItemPriceHistory } from "../../api/categoryPackages.api";

export function usePackageSubItemPriceHistory(packageSubItemId, enabled) {
  return useQuery({
    queryKey: [
      "category-packages",
      "sub-items",
      packageSubItemId,
      "price-history",
    ],
    queryFn: () => getPackageSubItemPriceHistory(packageSubItemId),
    enabled: Boolean(enabled && packageSubItemId),
  });
}
