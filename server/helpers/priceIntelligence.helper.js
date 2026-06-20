export const PRICE_INTELLIGENCE_STATUS = Object.freeze({
  WITHIN_BENCHMARK: "WITHIN_BENCHMARK",
  REVIEW_PRICE: "REVIEW_PRICE",
  SIGNIFICANT_VARIANCE: "SIGNIFICANT_VARIANCE",
  HIGH_OVERSPEND_RISK: "HIGH_OVERSPEND_RISK",
  NO_BENCHMARK_AVAILABLE: "NO_BENCHMARK_AVAILABLE",
});

export const EVIDENCE_STRENGTH = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  NONE: "NONE",
});

const STATUS_METADATA = Object.freeze({
  [PRICE_INTELLIGENCE_STATUS.WITHIN_BENCHMARK]: {
    label: "Within Benchmark",
    severity: "GREEN",
  },
  [PRICE_INTELLIGENCE_STATUS.REVIEW_PRICE]: {
    label: "Review Price",
    severity: "YELLOW",
  },
  [PRICE_INTELLIGENCE_STATUS.SIGNIFICANT_VARIANCE]: {
    label: "Significant Variance",
    severity: "ORANGE",
  },
  [PRICE_INTELLIGENCE_STATUS.HIGH_OVERSPEND_RISK]: {
    label: "High Overspend Risk",
    severity: "RED",
  },
  [PRICE_INTELLIGENCE_STATUS.NO_BENCHMARK_AVAILABLE]: {
    label: "No Benchmark Available",
    severity: "GRAY",
  },
});

export const PRICE_INTELLIGENCE_DEFAULTS = Object.freeze({
  evidenceWindowMonths: 24,
  mediumEvidenceWindowMonths: 36,
});

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function monthsBetween(startDate, endDate = new Date()) {
  if (!startDate) return null;

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;

  return (
    (endDate.getFullYear() - start.getFullYear()) * 12 +
    (endDate.getMonth() - start.getMonth())
  );
}

export function getPriceIntelligenceStatus(variancePercent, hasBenchmark) {
  if (!hasBenchmark || variancePercent === null) {
    return PRICE_INTELLIGENCE_STATUS.NO_BENCHMARK_AVAILABLE;
  }

  if (variancePercent > 30) {
    return PRICE_INTELLIGENCE_STATUS.HIGH_OVERSPEND_RISK;
  }

  if (variancePercent > 15) {
    return PRICE_INTELLIGENCE_STATUS.SIGNIFICANT_VARIANCE;
  }

  if (variancePercent > 5) {
    return PRICE_INTELLIGENCE_STATUS.REVIEW_PRICE;
  }

  return PRICE_INTELLIGENCE_STATUS.WITHIN_BENCHMARK;
}

export function getEvidenceStrength({
  purchaseCount,
  supplierCount,
  lastPurchaseAt,
  now = new Date(),
}) {
  const purchases = toNumber(purchaseCount);
  const suppliers = toNumber(supplierCount);
  const ageMonths = monthsBetween(lastPurchaseAt, now);

  if (purchases <= 0) {
    return EVIDENCE_STRENGTH.NONE;
  }

  if (
    purchases >= 10 &&
    suppliers >= 2 &&
    ageMonths !== null &&
    ageMonths <= PRICE_INTELLIGENCE_DEFAULTS.evidenceWindowMonths
  ) {
    return EVIDENCE_STRENGTH.HIGH;
  }

  if (
    purchases >= 3 &&
    ageMonths !== null &&
    ageMonths <= PRICE_INTELLIGENCE_DEFAULTS.mediumEvidenceWindowMonths
  ) {
    return EVIDENCE_STRENGTH.MEDIUM;
  }

  return EVIDENCE_STRENGTH.LOW;
}

export function buildPriceIntelligence(item, benchmark = {}) {
  const quantity = toNumber(item?.quantity);
  const budgetUnitPrice = toNumber(item?.unit_price);
  const historicalBenchmark =
    benchmark?.historical_benchmark === null ||
    benchmark?.historical_benchmark === undefined
      ? null
      : toNumber(benchmark.historical_benchmark);
  const purchaseCount = toNumber(benchmark?.purchase_count);
  const supplierCount = toNumber(benchmark?.supplier_count);
  const hasBenchmark = Boolean(historicalBenchmark && purchaseCount > 0);

  if (!hasBenchmark) {
    const status = PRICE_INTELLIGENCE_STATUS.NO_BENCHMARK_AVAILABLE;

    return {
      status,
      status_label: STATUS_METADATA[status].label,
      severity: STATUS_METADATA[status].severity,
      historical_benchmark: null,
      benchmark_method: "MEDIAN_HISTORICAL_UNIT_COST",
      variance_amount: null,
      variance_percent: null,
      potential_impact: null,
      potential_overspend: 0,
      evidence_strength: EVIDENCE_STRENGTH.NONE,
      evidence_window_months: PRICE_INTELLIGENCE_DEFAULTS.evidenceWindowMonths,
      evidence_window_used: benchmark?.evidence_window_used || null,
      purchase_count: purchaseCount,
      supplier_count: supplierCount,
      mapped_item_codes: benchmark?.mapped_item_codes || [],
      average_unit_cost: benchmark?.average_unit_cost ?? null,
      min_unit_cost: benchmark?.min_unit_cost ?? null,
      max_unit_cost: benchmark?.max_unit_cost ?? null,
      last_purchase_unit_cost: benchmark?.last_purchase_unit_cost ?? null,
      last_purchase_at: benchmark?.last_purchase_at ?? null,
    };
  }

  const varianceAmount = budgetUnitPrice - historicalBenchmark;
  const variancePercent = (varianceAmount / historicalBenchmark) * 100;
  const potentialImpact = varianceAmount * quantity;
  const status = getPriceIntelligenceStatus(variancePercent, hasBenchmark);

  return {
    status,
    status_label: STATUS_METADATA[status].label,
    severity: STATUS_METADATA[status].severity,
    historical_benchmark: round(historicalBenchmark, 4),
    benchmark_method: "MEDIAN_HISTORICAL_UNIT_COST",
    variance_amount: round(varianceAmount, 4),
    variance_percent: round(variancePercent, 2),
    potential_impact: round(potentialImpact, 4),
    potential_overspend: round(Math.max(0, potentialImpact), 4),
    evidence_strength: getEvidenceStrength({
      purchaseCount,
      supplierCount,
      lastPurchaseAt: benchmark?.last_purchase_at,
    }),
    evidence_window_months: PRICE_INTELLIGENCE_DEFAULTS.evidenceWindowMonths,
    evidence_window_used: benchmark?.evidence_window_used || null,
    purchase_count: purchaseCount,
    supplier_count: supplierCount,
    mapped_item_codes: benchmark?.mapped_item_codes || [],
    average_unit_cost: benchmark?.average_unit_cost ?? null,
    min_unit_cost: benchmark?.min_unit_cost ?? null,
    max_unit_cost: benchmark?.max_unit_cost ?? null,
    last_purchase_unit_cost: benchmark?.last_purchase_unit_cost ?? null,
    last_purchase_at: benchmark?.last_purchase_at ?? null,
  };
}

export function summarizePriceIntelligence(items = []) {
  return items.reduce(
    (summary, item) => {
      const intelligence = item.price_intelligence;

      if (!intelligence) {
        return summary;
      }

      if (
        intelligence.status ===
        PRICE_INTELLIGENCE_STATUS.NO_BENCHMARK_AVAILABLE
      ) {
        summary.missing_benchmarks += 1;
        return summary;
      }

      summary.items_analyzed += 1;
      summary.potential_overspend = round(
        summary.potential_overspend +
          toNumber(intelligence.potential_overspend),
        4,
      );

      if (
        intelligence.status ===
        PRICE_INTELLIGENCE_STATUS.HIGH_OVERSPEND_RISK
      ) {
        summary.high_risk_items += 1;
      }

      return summary;
    },
    {
      items_analyzed: 0,
      high_risk_items: 0,
      potential_overspend: 0,
      missing_benchmarks: 0,
    },
  );
}
