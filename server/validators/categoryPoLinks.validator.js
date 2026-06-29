import { ApiError } from "../utils/apiError.js";

function positiveInteger(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a positive integer`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function positiveNumber(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be greater than zero`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function optionalText(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === "") return null;

  const normalized = String(value).trim();

  if (normalized.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer`,
      "VALIDATION_ERROR",
    );
  }

  return normalized || null;
}

function requiredText(value, fieldName, maxLength) {
  const normalized = optionalText(value, fieldName, maxLength);

  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR");
  }

  return normalized;
}

export function validateCategoryPoLinkId(value) {
  return positiveInteger(value, "poLinkId");
}

export function validateReviewSubItemLineId(value) {
  return positiveInteger(value, "lineId");
}

export function validateCreateCategoryPoLink(body = {}) {
  return {
    purchaseInvoiceLineId: positiveInteger(
      body.purchaseInvoiceLineId,
      "purchaseInvoiceLineId",
    ),
    categoryTypeReviewSubItemId: positiveInteger(
      body.categoryTypeReviewSubItemId,
      "categoryTypeReviewSubItemId",
    ),
    requestedQty: positiveNumber(body.requestedQty, "requestedQty"),
  };
}

export function validateRejectCategoryPoLink(body = {}) {
  return {
    reason: requiredText(body.reason, "reason", 1000),
  };
}

export function validateCategoryPoLinkStatus(value) {
  if (!value) return "ALL";

  const status = String(value).trim().toUpperCase();
  const allowed = ["ALL", "PENDING", "APPROVED", "REJECTED"];

  if (!allowed.includes(status)) {
    throw new ApiError(400, "Invalid PO link status", "VALIDATION_ERROR");
  }

  return status;
}

export function validateAvailablePOFilters(query = {}) {
  return {
    search: optionalText(query.search, "search", 200),
    invoiceNumber: optionalText(query.invoiceNumber, "invoiceNumber", 100),
    orderId: optionalText(query.orderId, "orderId", 100),
    itemCode: optionalText(query.itemCode, "itemCode", 100),
    itemDescription: optionalText(query.itemDescription, "itemDescription", 300),
    supplier: optionalText(query.supplier, "supplier", 300),
    year: query.year ? positiveInteger(query.year, "year") : null,
    store: optionalText(query.store, "store", 100),
  };
}
