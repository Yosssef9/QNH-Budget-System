import { usePurchasingPriceHistory } from "../../hooks/purchasing-price-review/usePurchasingPriceReview";
import PackageSubItemPriceHistoryDrawer from "../category-packages/PackageSubItemPriceHistoryDrawer";

export default function PurchasingPriceHistoryDrawer({ open, onClose, packageId, subItem }) {
  const query = usePurchasingPriceHistory(packageId, subItem?.id, open);
  return (
    <PackageSubItemPriceHistoryDrawer
      open={open}
      onClose={onClose}
      subItem={subItem}
      query={query}
    />
  );
}
