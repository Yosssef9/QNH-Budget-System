import { ApiError } from "../utils/apiError.js";

export function calculateTotalAmount(quantity, unitPrice) {
  return Number(quantity) * Number(unitPrice);
}

export function validateDistribution({
  quantity,
  distribution_method,
  distribution_level,
  distribution,
}) {
  if (distribution_method === "ANNUAL") {
    if (distribution_level !== "YEAR") {
      throw new ApiError(
        400,
        "Annual distribution must use YEAR level",
        "INVALID_DISTRIBUTION",
      );
    }

    if (distribution?.length) {
      throw new ApiError(
        400,
        "Annual distribution must not have distribution rows",
        "INVALID_DISTRIBUTION",
      );
    }

    return [];
  }

  if (distribution_method === "MONTHLY" && distribution_level !== "MONTH") {
    throw new ApiError(
      400,
      "Monthly distribution must use MONTH level",
      "INVALID_DISTRIBUTION",
    );
  }

  if (distribution_method === "QUARTERLY" && distribution_level !== "QUARTER") {
    throw new ApiError(
      400,
      "Quarterly distribution must use QUARTER level",
      "INVALID_DISTRIBUTION",
    );
  }

  if (
    distribution_method === "CUSTOM" &&
    !["MONTH", "QUARTER"].includes(distribution_level)
  ) {
    throw new ApiError(
      400,
      "Custom distribution must use MONTH or QUARTER level",
      "INVALID_DISTRIBUTION",
    );
  }

  const rows =
    distribution_method === "MONTHLY"
      ? generateAutoDistribution(quantity, "MONTH", 12)
      : distribution_method === "QUARTERLY"
        ? generateAutoDistribution(quantity, "QUARTER", 4)
        : normalizeCustomDistribution(distribution_level, distribution);

  const totalDistributed = rows.reduce(
    (sum, row) => sum + Number(row.quantity),
    0,
  );

  if (Number(totalDistributed) !== Number(quantity)) {
    throw new ApiError(
      400,
      "Distribution total quantity must equal item quantity",
      "INVALID_DISTRIBUTION_TOTAL",
    );
  }

  return rows;
}

function generateAutoDistribution(quantity, periodType, periods) {
  const total = Number(quantity);
  const base = Math.floor(total / periods);
  const remainder = total % periods;

  return Array.from({ length: periods }, (_, index) => ({
    period_type: periodType,
    period_no: index + 1,
    quantity: index < remainder ? base + 1 : base,
  })).filter((row) => row.quantity > 0);
}

function normalizeCustomDistribution(distributionLevel, distribution = []) {
  const periodType = distributionLevel === "MONTH" ? "MONTH" : "QUARTER";
  const maxPeriod = periodType === "MONTH" ? 12 : 4;

  return distribution.map((row) => {
    if (row.period_no < 1 || row.period_no > maxPeriod) {
      throw new ApiError(
        400,
        "Invalid distribution period number",
        "INVALID_PERIOD",
      );
    }

    if (Number(row.quantity) < 0) {
      throw new ApiError(
        400,
        "Distribution quantity cannot be negative",
        "INVALID_QUANTITY",
      );
    }

    return {
      period_type: periodType,
      period_no: Number(row.period_no),
      quantity: Number(row.quantity),
    };
  });
}
