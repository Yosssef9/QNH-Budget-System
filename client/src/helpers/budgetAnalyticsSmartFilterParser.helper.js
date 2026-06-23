const STATUS_ALIASES = [
  { pattern: /\bapproved\b/i, value: "APPROVED", label: "Approved" },
  { pattern: /\breturned\b/i, value: "RETURNED", label: "Returned" },
  {
    pattern: /\b(pending|waiting for finance review|waiting for approval)\b/i,
    value: "PENDING_APPROVAL",
    label: "Pending Approval",
  },
  { pattern: /\bdraft\b/i, value: "DRAFT", label: "Draft" },
];

const PRICE_INTELLIGENCE_PATTERN =
  /\b(variance|overspend|benchmark|risk)\b|benchmark:|risk:/i;

const STATUS_DSL_ALIASES = {
  approved: { value: "APPROVED", label: "Approved" },
  returned: { value: "RETURNED", label: "Returned" },
  pending: { value: "PENDING_APPROVAL", label: "Pending Approval" },
  pending_approval: { value: "PENDING_APPROVAL", label: "Pending Approval" },
  draft: { value: "DRAFT", label: "Draft" },
};

function normalizeText(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseNumberToken(value = "") {
  const match = String(value)
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .match(/^(\d+(?:\.\d+)?)(k|m)?$/);

  if (!match) return null;

  const number = Number(match[1]);
  const suffix = match[2];

  if (!Number.isFinite(number)) return null;
  if (suffix === "k") return number * 1000;
  if (suffix === "m") return number * 1000000;

  return number;
}

function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function findOptionByLabel(options = [], text = "") {
  const query = text.toLowerCase();

  return options.find((option) => {
    const label = String(option.label || "").toLowerCase();

    return label && query.includes(label);
  });
}

function findMentionedOption(options = [], text = "") {
  const query = text.toLowerCase();

  return options.find((option) => {
    const label = String(option.label || "").toLowerCase();
    if (!label) return false;

    return new RegExp(`\\b${escapeRegExp(label)}\\b`, "i").test(query);
  });
}

function extractAmountMin(text = "") {
  const patterns = [
    /\b(?:amount|total)\s*>=?\s*(\d[\d,.]*(?:k|m)?)/i,
    /\b(?:amount|total|budget|budgets)\s*(?:>|>=|above|over|more than|greater than)\s*(\d[\d,.]*(?:k|m)?)/i,
    /\b(?:above|over|more than|greater than)\s*(\d[\d,.]*(?:k|m)?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const parsed = match ? parseNumberToken(match[1]) : null;

    if (parsed !== null) return parsed;
  }

  return null;
}

function extractMetricMin(text = "", metricPattern) {
  const patterns = [
    new RegExp(`\\b${metricPattern}\\s*>=?\\s*(\\d[\\d,.]*(?:k|m)?%?)`, "i"),
    new RegExp(`\\b${metricPattern}\\s*(?:>|>=|above|over|more than|greater than)\\s*(\\d[\\d,.]*(?:k|m)?%?)`, "i"),
    new RegExp(`\\b(?:above|over|more than|greater than)\\s*(\\d[\\d,.]*(?:k|m)?%?)\\s+${metricPattern}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const token = match ? String(match[1]).replace(/%$/, "") : "";
    const parsed = token ? parseNumberToken(token) : null;

    if (parsed !== null) return parsed;
  }

  return null;
}

function extractSearchText(text = "") {
  const match = text.match(/\b(?:with|containing)\s+(.+)$/i);
  if (!match) return "";

  return normalizeText(
    match[1]
      .replace(/\b(budgets?|items?|above|over|more than|greater than)\b/gi, "")
      .replace(/\b\d[\d,.]*(?:k|m)?\b/gi, ""),
  );
}

function normalizeDslValue(value = "") {
  return String(value).trim().replace(/^["']|["']$/g, "");
}

function findDslToken(text = "", keys = []) {
  for (const key of keys) {
    const match = text.match(
      new RegExp(`\\b${key}\\s*:\\s*("[^"]+"|'[^']+'|[^\\s]+)`, "i"),
    );

    if (match) return normalizeDslValue(match[1]);
  }

  return "";
}

function findDslOption(options = [], value = "") {
  if (!value) return null;

  const normalized = value.toLowerCase();

  return (
    options.find(
      (option) => String(option.label || "").toLowerCase() === normalized,
    ) ||
    options.find((option) =>
      String(option.label || "").toLowerCase().includes(normalized),
    )
  );
}

function pushUniqueChip(chips, chip) {
  const exists = chips.some((item) => item.key === chip.key);
  if (!exists) chips.push(chip);
}

function extractRiskStatus(text = "") {
  const riskMatch = text.match(/\brisk\s*:\s*(red|yellow|orange|green|gray|grey)\b/i);
  const riskValue = riskMatch?.[1]?.toLowerCase();

  if (riskValue === "red" || /\bhigh risk\b/i.test(text)) {
    return {
      status: "HIGH_OVERSPEND_RISK",
      label: "High Overspend Risk",
    };
  }

  if (riskValue === "orange" || /\bsignificant variance\b/i.test(text)) {
    return {
      status: "SIGNIFICANT_VARIANCE",
      label: "Significant Variance",
    };
  }

  if (riskValue === "yellow" || /\breview price\b/i.test(text)) {
    return {
      status: "REVIEW_PRICE",
      label: "Review Price",
    };
  }

  if (riskValue === "green" || /\bwithin benchmark\b/i.test(text)) {
    return {
      status: "WITHIN_BENCHMARK",
      label: "Within Benchmark",
    };
  }

  if (
    riskValue === "gray" ||
    riskValue === "grey" ||
    /\b(no|missing)\s+benchmark\b/i.test(text) ||
    /\bbenchmark\s*:\s*missing\b/i.test(text)
  ) {
    return {
      status: "NO_BENCHMARK_AVAILABLE",
      label: "No Benchmark Available",
    };
  }

  return null;
}

export function parseBudgetAnalyticsSmartFilter(query, options = {}) {
  const text = normalizeText(query);
  const lowerText = text.toLowerCase();
  const chips = [];
  const warnings = [];
  const filterPatch = {};

  if (!text) {
    return {
      filterPatch,
      chips,
      warnings,
    };
  }

  const statusDsl = findDslToken(text, ["status"]);
  const normalizedStatusDsl = statusDsl.toLowerCase().replace(/-/g, "_");
  const status =
    STATUS_DSL_ALIASES[normalizedStatusDsl] ||
    STATUS_ALIASES.find((item) => item.pattern.test(text));
  if (status) {
    filterPatch.statuses = [status.value];
    pushUniqueChip(chips, {
      key: `statuses:${status.value}`,
      field: "statuses",
      value: status.value,
      label: `Status: ${status.label}`,
    });
  }

  const yearDsl = findDslToken(text, ["year", "financial_year"]);
  const year =
    findDslOption(options.years, yearDsl) || findMentionedOption(options.years, text);
  if (year) {
    filterPatch.financialYear = String(year.value);
    pushUniqueChip(chips, {
      key: `financialYear:${year.value}`,
      field: "financialYear",
      value: String(year.value),
      label: `Year: ${year.label}`,
    });
  }

  const departmentDsl = findDslToken(text, ["department", "dept"]);
  const department =
    findDslOption(options.departments, departmentDsl) ||
    findMentionedOption(options.departments, text);
  if (department) {
    filterPatch.departmentIds = [String(department.value)];
    pushUniqueChip(chips, {
      key: `departmentIds:${department.value}`,
      field: "departmentIds",
      value: String(department.value),
      label: `Department: ${department.label}`,
    });
  }

  const categoryDsl = findDslToken(text, ["category"]);
  const category =
    findDslOption(options.categories, categoryDsl) ||
    findMentionedOption(options.categories, text);
  if (category) {
    filterPatch.categoryIds = [String(category.value)];
    pushUniqueChip(chips, {
      key: `categoryIds:${category.value}`,
      field: "categoryIds",
      value: String(category.value),
      label: `Category: ${category.label}`,
    });
  }

  const typeDsl = findDslToken(text, ["item", "type"]);
  const type =
    findDslOption(options.types, typeDsl) || findMentionedOption(options.types, text);
  if (type) {
    filterPatch.typeIds = [String(type.value)];
    pushUniqueChip(chips, {
      key: `typeIds:${type.value}`,
      field: "typeIds",
      value: String(type.value),
      label: `Item: ${type.label}`,
    });
  } else if (typeDsl) {
    filterPatch.search = typeDsl;
    pushUniqueChip(chips, {
      key: `search:${typeDsl}`,
      field: "search",
      value: typeDsl,
      label: `Search: ${typeDsl}`,
    });
  }

  const expenseDsl = findDslToken(text, ["expense", "expense_type"]);
  const expenseType =
    findDslOption(options.expenseTypes, expenseDsl) ||
    findOptionByLabel(options.expenseTypes, text);
  if (expenseType) {
    filterPatch.expenseTypes = [String(expenseType.value)];
    pushUniqueChip(chips, {
      key: `expenseTypes:${expenseType.value}`,
      field: "expenseTypes",
      value: String(expenseType.value),
      label: `Expense: ${expenseType.label}`,
    });
  }

  const amountMin = extractAmountMin(text);
  if (amountMin !== null) {
    filterPatch.amountMin = amountMin;
    pushUniqueChip(chips, {
      key: "amountMin",
      field: "amountMin",
      value: amountMin,
      label: `Amount >= SAR ${amountMin.toLocaleString()}`,
    });
  }

  const benchmarkVarianceMin = extractMetricMin(
    text,
    "(?:benchmark\\s+)?variance",
  );
  if (benchmarkVarianceMin !== null) {
    filterPatch.benchmarkVarianceMin = benchmarkVarianceMin;
    pushUniqueChip(chips, {
      key: "benchmarkVarianceMin",
      field: "benchmarkVarianceMin",
      value: benchmarkVarianceMin,
      label: `Benchmark Variance > ${benchmarkVarianceMin}%`,
    });
  }

  const potentialOverspendMin = extractMetricMin(
    text,
    "(?:potential\\s+)?overspend",
  );
  if (potentialOverspendMin !== null) {
    filterPatch.potentialOverspendMin = potentialOverspendMin;
    pushUniqueChip(chips, {
      key: "potentialOverspendMin",
      field: "potentialOverspendMin",
      value: potentialOverspendMin,
      label: `Potential Overspend > SAR ${potentialOverspendMin.toLocaleString()}`,
    });
  }

  const riskStatus = extractRiskStatus(text);
  if (riskStatus) {
    filterPatch.priceIntelligenceStatuses = [riskStatus.status];
    pushUniqueChip(chips, {
      key: `priceIntelligenceStatuses:${riskStatus.status}`,
      field: "priceIntelligenceStatuses",
      value: riskStatus.status,
      label:
        riskStatus.status === "NO_BENCHMARK_AVAILABLE"
          ? "Benchmark: Missing"
          : `Risk: ${riskStatus.label}`,
    });
  }

  if (/\b(returned|submitted)\b/i.test(text) && /\bthis month\b/i.test(text)) {
    const range = getCurrentMonthRange();
    const field = /\breturned\b/i.test(text) ? "returned" : "submitted";

    filterPatch[`${field}From`] = range.from;
    filterPatch[`${field}To`] = range.to;
    pushUniqueChip(chips, {
      key: `${field}:this-month`,
      field,
      value: "this_month",
      label: `${field === "returned" ? "Returned" : "Submitted"}: This Month`,
    });
  }

  const explicitSearch = extractSearchText(text);
  if (
    explicitSearch &&
    !department &&
    !category &&
    !type &&
    !typeDsl &&
    !expenseType &&
    !PRICE_INTELLIGENCE_PATTERN.test(explicitSearch)
  ) {
    filterPatch.search = explicitSearch;
    pushUniqueChip(chips, {
      key: `search:${explicitSearch}`,
      field: "search",
      value: explicitSearch,
      label: `Search: ${explicitSearch}`,
    });
  }

  if (chips.length === 0 && warnings.length === 0) {
    warnings.push("No supported smart filters were detected.");
  }

  return {
    filterPatch,
    chips,
    warnings,
  };
}
