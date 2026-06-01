import { useMemo } from "react";
import { toNumber } from "../../utils/number";

export default function useBudgetTotals(items = []) {
  return useMemo(() => {
    const totalQuantity = items.reduce(
      (sum, item) => sum + toNumber(item.quantity),
      0,
    );

    const totalAmount = items.reduce(
      (sum, item) =>
        sum +
        toNumber(
          item.total_amount ??
            toNumber(item.quantity) * toNumber(item.unitPrice),
        ),
      0,
    );

    return {
      totalQuantity,
      totalAmount,
    };
  }, [items]);
}
