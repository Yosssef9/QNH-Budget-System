import { ApiError } from "../../utils/apiError.js";
import { isCountableUnit } from "../../utils/approvedDistribution.js";

const roundQuantity = (value) => Math.round(Number(value) * 10000) / 10000;

/** Validate timing changes for a CFO-returned department item. */
export function validateReturnedCustomDistribution({ context, requestedRows, rows, approvedQuantity }) {
  const method = String(context.distribution_method || "").toUpperCase();
  let periodType;
  if (method === "MONTHLY") periodType = "MONTH";
  else if (method === "QUARTERLY") periodType = "QUARTER";
  else if (method === "CUSTOM") {
    const types = [...new Set(requestedRows.map(row => String(row.period_type || "").toUpperCase()))];
    if (types.length === 1 && ["MONTH", "QUARTER"].includes(types[0])) periodType = types[0];
  }
  if (!periodType) throw new ApiError(400,
    "This item has no editable monthly or quarterly distribution",
    "APPROVED_DISTRIBUTION_NOT_CUSTOMIZABLE");
  const totalPeriods = periodType === "MONTH" ? 12 : 4;
  const map = new Map();
  const countable = isCountableUnit({ unitCode: context.unit_code, unitName: context.unit_name });
  for (const row of rows) {
    const periodNo = Number(row.period_no);
    const value = Number(row.quantity);
    if (row.period_type !== periodType || !Number.isInteger(periodNo) ||
      periodNo < 1 || periodNo > totalPeriods || map.has(periodNo)) {
      throw new ApiError(400, "Invalid or duplicate distribution period", "INVALID_APPROVED_DISTRIBUTION_PERIOD");
    }
    if (!Number.isFinite(value) || value < 0 || (countable && !Number.isInteger(value))) {
      throw new ApiError(400, "Invalid approved distribution quantity", "INVALID_APPROVED_DISTRIBUTION_QUANTITY");
    }
    map.set(periodNo, roundQuantity(value));
  }
  const normalized = Array.from({ length: totalPeriods }, (_, index) => ({
    period_type: periodType, period_no: index + 1, quantity: map.get(index + 1) ?? 0,
  }));
  const total = roundQuantity(normalized.reduce((sum, row) => sum + row.quantity, 0));
  if (total !== roundQuantity(approvedQuantity)) {
    throw new ApiError(400, "Approved distribution total must equal approved quantity", "APPROVED_DISTRIBUTION_TOTAL_MISMATCH");
  }
  return normalized;
}
