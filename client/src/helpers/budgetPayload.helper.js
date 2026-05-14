import { toNumber } from "../utils/number";
import {
  getMonthlyDistribution,
  getQuarterlyDistribution,
} from "./budgetCalculations.helper";

export function getApiDistributionMethod(method) {
  if (method === "CUSTOM_MONTHLY" || method === "CUSTOM_QUARTERLY") {
    return "CUSTOM";
  }

  return method;
}
export function getApiDistributionLevel(method) {
  if (method === "MONTHLY" || method === "CUSTOM_MONTHLY") return "MONTH";
  if (method === "QUARTERLY" || method === "CUSTOM_QUARTERLY") return "QUARTER";
  return "YEAR";
}
export function getApiDistributionRows(row) {
  if (row.method === "ANNUAL") return [];

  if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
    return getMonthlyDistribution(row)
      .map((quantity, index) => ({
        period_type: "MONTH",
        period_no: index + 1,
        quantity,
      }))
      .filter((period) => toNumber(period.quantity) > 0);
  }

  return getQuarterlyDistribution(row)
    .map((quantity, index) => ({
      period_type: "QUARTER",
      period_no: index + 1,
      quantity,
    }))
    .filter((period) => toNumber(period.quantity) > 0);
}
