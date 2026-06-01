import { useMemo } from "react";

import { MONTHS as months } from "../../constants/months.constants";
import { toNumber } from "../../utils/number";

import {
  getQuarterAmount,
  getDistributedQuantity,
} from "../../helpers/budgetCalculations.helper";

export default function useBudgetSummary(rows, getMonthlyAmountForSummary) {
  return useMemo(() => {
    const totalQuantity = rows.reduce(
      (sum, row) => sum + toNumber(row.quantity),
      0,
    );

    const totalAmount = rows.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitPrice),
      0,
    );

    const quarterTotals = [0, 1, 2, 3].map((quarterIndex) =>
      rows.reduce((sum, row) => sum + getQuarterAmount(row, quarterIndex), 0),
    );

    const monthTotals = months.map((_, monthIndex) =>
      rows.reduce(
        (sum, row) => sum + getMonthlyAmountForSummary(row, monthIndex),
        0,
      ),
    );

    const isValid = rows.every((row) => {
      const hasValidNumbers =
        toNumber(row.quantity) > 0 && toNumber(row.unitPrice) > 0;

      if (!row.category || !row.item || !hasValidNumbers) {
        return false;
      }

      if (row.method === "ANNUAL") {
        return true;
      }

      return getDistributedQuantity(row) === toNumber(row.quantity);
    });

    return {
      totalQuantity,
      totalAmount,
      quarterTotals,
      monthTotals,
      isValid,
    };
  }, [rows, getMonthlyAmountForSummary]);
}
