import { useMemo } from "react";
import { toNumber } from "../../utils/number";

export default function useBudgetTotals(items = []) {
  return useMemo(() => {
    const totalQuantity = items.reduce(
      (sum, item) => sum + toNumber(item.quantity),
      0,
    );
    const totalApprovedQuantity = items.reduce(
      (sum, item) => sum + toNumber(item.category_approved_quantity),
      0,
    );
    const totalApprovedAmount = items.reduce(
      (sum, item) => sum + toNumber(item.approved_amount),
      0,
    );

    return {
      totalQuantity,
      totalApprovedQuantity,
      totalApprovedAmount,
      totalAmount: totalApprovedAmount,
    };
  }, [items]);
}
