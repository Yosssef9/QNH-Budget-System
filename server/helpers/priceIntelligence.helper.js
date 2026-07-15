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

function toPositiveNumberOrNull(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : null;
}

function average(values, decimals = 4) {
  const validValues = values
    .map((value) => Number(value))
    .filter(Number.isFinite);

  if (!validValues.length) return null;

  return round(
    validValues.reduce((sum, value) => sum + value, 0) /
      validValues.length,
    decimals,
  );
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

export function buildPackageItemOverallAveragePriceIntelligence(
  packageItem,
  modelResults = [],
  evidence = {},
) {
  const models = modelResults.filter(
    (model) => model?.packageSubItem && model?.priceIntelligence,
  );

  const currentPricedModels = models.filter(
    (model) =>
      toPositiveNumberOrNull(model.packageSubItem.unit_price) !== null,
  );

  const benchmarkedModels = models.filter(
    (model) =>
      toPositiveNumberOrNull(
        model.priceIntelligence.historical_benchmark,
      ) !== null,
  );

  const comparableModels = benchmarkedModels.filter(
    (model) =>
      toPositiveNumberOrNull(model.packageSubItem.unit_price) !== null,
  );

  const averageCurrentUnitPrice = average(
    currentPricedModels.map((model) => model.packageSubItem.unit_price),
  );

  const overallAverageBenchmark = average(
    benchmarkedModels.map(
      (model) => model.priceIntelligence.historical_benchmark,
    ),
  );

  const comparableAverageCurrentUnitPrice = average(
    comparableModels.map((model) => model.packageSubItem.unit_price),
  );

  const comparableAverageBenchmark = average(
    comparableModels.map(
      (model) => model.priceIntelligence.historical_benchmark,
    ),
  );

  const hasComparableBenchmark =
    comparableAverageCurrentUnitPrice !== null &&
    comparableAverageBenchmark !== null &&
    comparableAverageBenchmark > 0;

  const varianceAmount = hasComparableBenchmark
    ? round(
        comparableAverageCurrentUnitPrice -
          comparableAverageBenchmark,
        4,
      )
    : null;

  const variancePercent = hasComparableBenchmark
    ? round((varianceAmount / comparableAverageBenchmark) * 100, 2)
    : null;

  const averageHistoricalUnitCost = average(
    benchmarkedModels
      .map((model) =>
        toPositiveNumberOrNull(
          model.priceIntelligence.average_unit_cost,
        ),
      )
      .filter((value) => value !== null),
  );

  const averageMinimumUnitCost = average(
    benchmarkedModels
      .map((model) =>
        toPositiveNumberOrNull(model.priceIntelligence.min_unit_cost),
      )
      .filter((value) => value !== null),
  );

  const averageMaximumUnitCost = average(
    benchmarkedModels
      .map((model) =>
        toPositiveNumberOrNull(model.priceIntelligence.max_unit_cost),
      )
      .filter((value) => value !== null),
  );

  const averageLastPurchaseUnitCost = average(
    benchmarkedModels
      .map((model) =>
        toPositiveNumberOrNull(
          model.priceIntelligence.last_purchase_unit_cost,
        ),
      )
      .filter((value) => value !== null),
  );

  const averageModelPotentialImpact = average(
    comparableModels
      .map((model) => model.priceIntelligence.potential_impact)
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          Number.isFinite(Number(value)),
      ),
  );

  const averageModelPotentialOverspend = average(
    comparableModels.map(
      (model) => model.priceIntelligence.potential_overspend || 0,
    ),
  );

  const modelCount = models.length;
  const currentPriceModelCount = currentPricedModels.length;
  const benchmarkedModelCount = benchmarkedModels.length;
  const comparableModelCount = comparableModels.length;
  const purchaseCount = toNumber(evidence.purchase_count);
  const supplierCount = toNumber(evidence.supplier_count);
  const lastPurchaseAt = evidence.last_purchase_at || null;
  const status = getPriceIntelligenceStatus(
    variancePercent,
    hasComparableBenchmark,
  );

  return {
    status,
    status_label: STATUS_METADATA[status].label,
    severity: STATUS_METADATA[status].severity,
    benchmark_method: "SIMPLE_AVERAGE_MODEL_MEDIAN_UNIT_COST",
    weighting_method: "EQUAL_WEIGHT_PER_MODEL",
    average_current_unit_price: averageCurrentUnitPrice,
    overall_average_benchmark: overallAverageBenchmark,
    comparable_average_current_unit_price:
      comparableAverageCurrentUnitPrice,
    comparable_average_benchmark: comparableAverageBenchmark,
    variance_amount: varianceAmount,
    variance_percent: variancePercent,
    average_historical_unit_cost: averageHistoricalUnitCost,
    average_minimum_unit_cost: averageMinimumUnitCost,
    average_maximum_unit_cost: averageMaximumUnitCost,
    average_last_purchase_unit_cost: averageLastPurchaseUnitCost,
    average_model_potential_impact: averageModelPotentialImpact,
    average_model_potential_overspend:
      averageModelPotentialOverspend,
    model_count: modelCount,
    current_price_model_count: currentPriceModelCount,
    benchmarked_model_count: benchmarkedModelCount,
    comparable_model_count: comparableModelCount,
    missing_current_price_count: Math.max(
      0,
      modelCount - currentPriceModelCount,
    ),
    missing_benchmark_count: Math.max(
      0,
      modelCount - benchmarkedModelCount,
    ),
    current_price_coverage_percent:
      modelCount > 0
        ? round((currentPriceModelCount / modelCount) * 100, 2)
        : 0,
    benchmark_coverage_percent:
      modelCount > 0
        ? round((benchmarkedModelCount / modelCount) * 100, 2)
        : 0,
    comparable_coverage_percent:
      modelCount > 0
        ? round((comparableModelCount / modelCount) * 100, 2)
        : 0,
    is_partial_coverage:
      benchmarkedModelCount > 0 &&
      benchmarkedModelCount < modelCount,
    evidence_strength: getEvidenceStrength({
      purchaseCount,
      supplierCount,
      lastPurchaseAt,
    }),
    evidence_window_months:
      PRICE_INTELLIGENCE_DEFAULTS.evidenceWindowMonths,
    evidence_window_used: evidence.evidence_window_used || null,
    purchase_count: purchaseCount,
    supplier_count: supplierCount,
    mapped_item_codes: evidence.mapped_item_codes || [],
    last_purchase_at: lastPurchaseAt,
    package_item_id: packageItem?.id || null,
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
