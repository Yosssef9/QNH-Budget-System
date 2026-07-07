import { useMemo } from "react";
import { toNumber } from "../../utils/number";

export default function useBudgetTotals(items = []) {
  return useMemo(() => {
    const totalQuantity = items.reduce(
      (sum, item) => sum + toNumber(item.quantity),
      0,
    );

    return {
      totalQuantity,
      totalAmount: 0,
    };
  }, [items]);
}
