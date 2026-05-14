import { toNumber } from "../utils/number";

export function normalizeArray(arr, length) {
  return Array.from({ length }, (_, index) => toNumber(arr?.[index]));
}
export function distributeWholeNumber(total, periods) {
  const qty = Math.max(0, Math.floor(toNumber(total)));
  const base = Math.floor(qty / periods);
  const remainder = qty % periods;

  return Array.from({ length: periods }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}
export function getMonthlyDistribution(row) {
  if (row.method === "MONTHLY") return distributeWholeNumber(row.quantity, 12);
  if (row.method === "CUSTOM_MONTHLY") return normalizeArray(row.monthly, 12);
  return [];
}
export function getQuarterlyDistribution(row) {
  if (row.method === "QUARTERLY") return distributeWholeNumber(row.quantity, 4);
  if (row.method === "CUSTOM_QUARTERLY")
    return normalizeArray(row.quarterly, 4);
  return [];
}
export function getDistributedQuantity(row) {
  if (row.method === "ANNUAL") return toNumber(row.quantity);

  if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
    return getMonthlyDistribution(row).reduce(
      (sum, value) => sum + toNumber(value),
      0,
    );
  }

  return getQuarterlyDistribution(row).reduce(
    (sum, value) => sum + toNumber(value),
    0,
  );
}
export function getQuarterAmount(row, quarterIndex) {
  const unitPrice = toNumber(row.unitPrice);

  if (row.method === "ANNUAL") {
    return quarterIndex === 0 ? toNumber(row.quantity) * unitPrice : 0;
  }

  if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
    const monthly = getMonthlyDistribution(row);
    const start = quarterIndex * 3;
    return monthly
      .slice(start, start + 3)
      .reduce((sum, qty) => sum + qty * unitPrice, 0);
  }

  const quarterly = getQuarterlyDistribution(row);
  return toNumber(quarterly[quarterIndex]) * unitPrice;
}
