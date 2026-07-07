import {
  DISTRIBUTION_METHODS,
  DISTRIBUTION_PERIOD_TYPES,
} from "./departmentBudgets.constants.js";

function toPositiveInteger(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    const error = new Error(`${fieldName} must be a positive integer`);
    error.statusCode = 400;
    error.errorCode = "INVALID_IDENTIFIER";
    throw error;
  }

  return numberValue;
}

function toPositiveDecimal(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    const error = new Error(`${fieldName} must be greater than 0`);
    error.statusCode = 400;
    error.errorCode = "INVALID_DECIMAL";
    throw error;
  }

  return numberValue;
}

function toNonNegativeDecimal(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    const error = new Error(`${fieldName} must be 0 or greater`);
    error.statusCode = 400;
    error.errorCode = "INVALID_DECIMAL";
    throw error;
  }

  return numberValue;
}

function normalizeDistributionMethod(value) {
  const method = String(value || "").trim().toUpperCase();

  if (!Object.values(DISTRIBUTION_METHODS).includes(method)) {
    const error = new Error("distribution_method is invalid");
    error.statusCode = 400;
    error.errorCode = "INVALID_DISTRIBUTION_METHOD";
    throw error;
  }

  return method;
}

function normalizeDistributionPeriod(row, index) {
  const periodType = String(row?.period_type || "").trim().toUpperCase();

  if (!Object.values(DISTRIBUTION_PERIOD_TYPES).includes(periodType)) {
    const error = new Error(`distribution[${index}].period_type is invalid`);
    error.statusCode = 400;
    error.errorCode = "INVALID_DISTRIBUTION_PERIOD";
    throw error;
  }

  const periodNo = toPositiveInteger(
    row?.period_no,
    `distribution[${index}].period_no`,
  );

  if (periodType === DISTRIBUTION_PERIOD_TYPES.YEAR && periodNo !== 1) {
    const error = new Error("YEAR distribution period_no must be 1");
    error.statusCode = 400;
    error.errorCode = "INVALID_DISTRIBUTION_PERIOD";
    throw error;
  }

  if (
    periodType === DISTRIBUTION_PERIOD_TYPES.MONTH &&
    (periodNo < 1 || periodNo > 12)
  ) {
    const error = new Error("MONTH distribution period_no must be 1 to 12");
    error.statusCode = 400;
    error.errorCode = "INVALID_DISTRIBUTION_PERIOD";
    throw error;
  }

  if (
    periodType === DISTRIBUTION_PERIOD_TYPES.QUARTER &&
    (periodNo < 1 || periodNo > 4)
  ) {
    const error = new Error("QUARTER distribution period_no must be 1 to 4");
    error.statusCode = 400;
    error.errorCode = "INVALID_DISTRIBUTION_PERIOD";
    throw error;
  }

  return {
    period_type: periodType,
    period_no: periodNo,
    quantity: toNonNegativeDecimal(
      row?.quantity,
      `distribution[${index}].quantity`,
    ),
  };
}

export function validateDepartmentBudgetId(value) {
  return toPositiveInteger(value, "departmentBudgetId");
}

export function validateDepartmentCategoryBudgetId(value) {
  return toPositiveInteger(value, "departmentCategoryBudgetId");
}

export function validateSaveCategoryItemsPayload(body = {}) {
  const rawItems = Array.isArray(body.items) ? body.items : [];

  return {
    items: rawItems.map((item, index) => {
      const id =
        item.id === undefined || item.id === null || item.id === ""
          ? null
          : toPositiveInteger(item.id, `items[${index}].id`);
      const catalogItemId =
        item.catalog_item_id ?? item.catalogItemId ?? item.type_id;

      return {
        id,
        catalog_item_id: toPositiveInteger(
          catalogItemId,
          `items[${index}].catalog_item_id`,
        ),
        requested_quantity: toPositiveDecimal(
          item.requested_quantity ?? item.quantity,
          `items[${index}].requested_quantity`,
        ),
        distribution_method: normalizeDistributionMethod(
          item.distribution_method ?? item.method,
        ),
        distribution: Array.isArray(item.distribution)
          ? item.distribution.map(normalizeDistributionPeriod)
          : [],
      };
    }),
  };
}
