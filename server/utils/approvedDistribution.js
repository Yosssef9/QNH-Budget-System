const COUNTABLE_UNIT_TOKENS = new Set([
  "UNIT",
  "UNITS",
  "EA",
  "EACH",
  "PC",
  "PCS",
  "PIECE",
  "PIECES",
  "SET",
  "SETS",
  "DEVICE",
  "DEVICES",
  "LICENSE",
  "LICENSES",
  "LICENCE",
  "LICENCES",
]);

function normalizeUnitToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

export function isCountableUnit({ unitCode, unitName } = {}) {
  const values = [normalizeUnitToken(unitCode), normalizeUnitToken(unitName)].filter(Boolean);
  return values.some((value) => {
    if (COUNTABLE_UNIT_TOKENS.has(value)) return true;
    return value.split(" ").some((token) => COUNTABLE_UNIT_TOKENS.has(token));
  });
}

export function buildApprovedDistribution({
  distribution = [],
  requestedQuantity = 0,
  approvedQuantity = 0,
  unitCode = null,
  unitName = null,
} = {}) {
  const rows = Array.isArray(distribution) ? distribution : [];
  if (!rows.length) return [];

  const target = Number(approvedQuantity || 0);
  const requested = Number(requestedQuantity || 0);
  const weights = rows.map((row) => Math.max(0, Number(row.quantity || 0)));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const denominator = weightTotal > 0 ? weightTotal : requested;
  const countable = isCountableUnit({ unitCode, unitName });

  if (!Number.isFinite(target) || target <= 0) {
    return rows.map((row) => ({ ...row, quantity: 0 }));
  }

  if (!Number.isFinite(denominator) || denominator <= 0) {
    return rows.map((row, index) => ({
      ...row,
      quantity: index === 0 ? (countable ? Math.round(target) : roundQuantity(target)) : 0,
    }));
  }

  if (countable) {
    const integerTarget = Math.round(target);
    let cumulativeWeight = 0;
    let previousAllocated = 0;

    return rows.map((row, index) => {
      cumulativeWeight += weights[index];
      const cumulativeAllocated =
        index === rows.length - 1
          ? integerTarget
          : Math.round((integerTarget * cumulativeWeight) / denominator);
      const quantity = Math.max(0, cumulativeAllocated - previousAllocated);
      previousAllocated = cumulativeAllocated;
      return { ...row, quantity };
    });
  }

  let cumulativeWeight = 0;
  let previousAllocated = 0;

  return rows.map((row, index) => {
    cumulativeWeight += weights[index];
    const cumulativeAllocated =
      index === rows.length - 1
        ? roundQuantity(target)
        : roundQuantity((target * cumulativeWeight) / denominator);
    const quantity = roundQuantity(cumulativeAllocated - previousAllocated);
    previousAllocated = cumulativeAllocated;
    return { ...row, quantity };
  });
}
