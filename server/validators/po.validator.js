import { ApiError } from "../utils/apiError.js";

function toPositiveNumber(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a positive number`,
      "VALIDATION_ERROR",
    );
  }

  return numberValue;
}

function toPositiveInteger(value, fieldName) {
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

export function validateCreatePOLink(body = {}) {
  return {
    purchase_invoice_line_id: toPositiveInteger(
      body.purchase_invoice_line_id,
      "purchase_invoice_line_id",
    ),

    budget_item_id: toPositiveInteger(body.budget_item_id, "budget_item_id"),

    requested_qty: toPositiveNumber(body.requested_qty, "requested_qty"),
  };
}

export function validatePOLinkId(value) {
  return toPositiveInteger(value, "PO Link id");
}

export function validateRejectPOLink(body = {}) {
  const reason = String(body.reason || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!reason) {
    throw new ApiError(400, "Rejection reason is required", "VALIDATION_ERROR");
  }

  if (reason.length > 1000) {
    throw new ApiError(
      400,
      "Rejection reason cannot exceed 1000 characters",
      "VALIDATION_ERROR",
    );
  }

  return {
    reason,
  };
}

export function validatePOFilters(query = {}) {
  return {
    search: query.search ? String(query.search).trim() : null,

    invoiceNumber: query.invoiceNumber
      ? String(query.invoiceNumber).trim()
      : null,

    orderId: query.orderId ? String(query.orderId).trim() : null,

    itemCode: query.itemCode ? String(query.itemCode).trim() : null,

    itemDescription: query.itemDescription
      ? String(query.itemDescription).trim()
      : null,

    supplier: query.supplier ? String(query.supplier).trim() : null,

    year: query.year ? toPositiveInteger(query.year, "year") : null,

    store: query.store ? String(query.store).trim() : null,
  };
}

export function validatePOLinkStatus(value) {
  if (!value) return "ALL";

  const status = String(value).trim().toUpperCase();

  if (!["PENDING", "APPROVED", "REJECTED", "ALL"].includes(status)) {
    throw new ApiError(400, "Invalid PO link status", "VALIDATION_ERROR");
  }

  return status;
}

export function validatePOApprovalFilters(query = {}) {
  return {
    status: validatePOLinkStatus(query.status || "PENDING"),
    financialYearId: query.financialYearId
      ? toPositiveInteger(query.financialYearId, "financialYearId")
      : null,
  };
}
