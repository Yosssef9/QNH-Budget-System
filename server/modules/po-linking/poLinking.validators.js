import { ApiError } from "../../utils/apiError.js";

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

function optionalTrimmed(value) {
  return value ? String(value).trim() : null;
}

export function validateCreatePOLink(body = {}) {
  const packageSubItemId =
    body.category_budget_package_sub_item_id ??
    body.package_sub_item_id ??
    body.budget_item_id;

  return {
    purchase_invoice_line_id: toPositiveInteger(
      body.purchase_invoice_line_id,
      "purchase_invoice_line_id",
    ),
    category_budget_package_sub_item_id: toPositiveInteger(
      packageSubItemId,
      "category_budget_package_sub_item_id",
    ),
    requested_qty: toPositiveNumber(body.requested_qty, "requested_qty"),
  };
}

export function validatePOLinkId(value) {
  return toPositiveInteger(value, "PO link id");
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

  return { reason };
}

export function validatePOFilters(query = {}) {
  return {
    search: optionalTrimmed(query.search),
    invoiceNumber: optionalTrimmed(query.invoiceNumber),
    orderId: optionalTrimmed(query.orderId),
    itemCode: optionalTrimmed(query.itemCode),
    itemDescription: optionalTrimmed(query.itemDescription),
    supplier: optionalTrimmed(query.supplier),
    year: query.year ? toPositiveInteger(query.year, "year") : null,
    store: optionalTrimmed(query.store),
  };
}

export function validatePOLinkStatus(value) {
  if (!value) return "ALL";

  const status = String(value).trim().toUpperCase();

  if (!["PENDING", "APPROVED", "REJECTED", "CANCELLED", "ALL"].includes(status)) {
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

export function validatePOSuggestionFilters(query = {}) {
  const packageSubItemId =
    query.categoryBudgetPackageSubItemId ??
    query.category_budget_package_sub_item_id ??
    query.packageSubItemId ??
    query.package_sub_item_id ??
    query.budgetItemId;

  return {
    packageSubItemId: toPositiveInteger(
      packageSubItemId,
      "category_budget_package_sub_item_id",
    ),
  };
}

export function validateMappingId(value) {
  return toPositiveInteger(value, "PO catalog mapping id");
}

export function validateCreatePOItemMapping(body = {}) {
  const catalogSubItemId = body.catalog_sub_item_id ?? body.budget_type_id;
  const poItemCode = String(body.po_item_code || "").trim();

  if (!poItemCode) {
    throw new ApiError(400, "PO item code is required", "VALIDATION_ERROR");
  }

  if (poItemCode.length > 100) {
    throw new ApiError(
      400,
      "PO item code cannot exceed 100 characters",
      "VALIDATION_ERROR",
    );
  }

  return {
    catalog_sub_item_id: toPositiveInteger(
      catalogSubItemId,
      "catalog_sub_item_id",
    ),
    po_item_code: poItemCode,
    po_item_description: body.po_item_description
      ? String(body.po_item_description).trim().slice(0, 500)
      : null,
  };
}

export function validatePOItemMappingStatus(body = {}) {
  if (typeof body.is_active !== "boolean") {
    throw new ApiError(400, "is_active must be boolean", "VALIDATION_ERROR");
  }

  return {
    is_active: body.is_active,
    disabled_reason: body.disabled_reason
      ? String(body.disabled_reason).trim().slice(0, 500)
      : null,
  };
}
