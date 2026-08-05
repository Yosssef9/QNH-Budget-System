import { ApiError } from "../../utils/apiError.js";
import { TRANSFER_MODE } from "./transfers.constants.js";

function positiveId(value, fieldName) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new ApiError(400, `${fieldName} is invalid`, "INVALID_ID");
  }
  return numeric;
}

function positiveDecimal(value, fieldName, required = true) {
  if ((value === undefined || value === null || value === "") && !required) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ApiError(400, `${fieldName} must be greater than zero`, "INVALID_DECIMAL");
  }
  return numeric;
}

function requiredText(value, maxLength, fieldName) {
  const text = String(value || "").trim();
  if (!text) {
    throw new ApiError(400, `${fieldName} is required`, "TEXT_REQUIRED");
  }
  if (text.length > maxLength) {
    throw new ApiError(400, `${fieldName} is too long`, "TEXT_TOO_LONG");
  }
  return text;
}

export function validateTransferId(value) {
  return positiveId(value, "Transfer id");
}

export function validateListTransfersQuery(query = {}) {
  return {
    status: query.status && query.status !== "ALL" ? String(query.status) : null,
    financialYearId:
      query.financialYearId || query.financial_year_id
        ? positiveId(query.financialYearId ?? query.financial_year_id, "Financial year id")
        : null,
  };
}

export function validateTransferItemsQuery(query = {}) {
  return {
    financialYearId:
      query.financialYearId || query.financial_year_id
        ? positiveId(
            query.financialYearId ?? query.financial_year_id,
            "Financial year id",
          )
        : null,
  };
}

export function validateCreateTransferPayload(body = {}) {
  const mode = String(body.transfer_mode || body.transferMode || TRANSFER_MODE.AMOUNT);
  if (!Object.values(TRANSFER_MODE).includes(mode)) {
    throw new ApiError(400, "Transfer mode is invalid", "INVALID_TRANSFER_MODE");
  }

  const isNewItem = Boolean(body.is_new_item ?? body.isNewItem);
  const sourceSubItemId = positiveId(
    body.from_package_sub_item_id ?? body.fromPackageSubItemId ?? body.from_budget_item_id,
    "Source package sub-item",
  );
  const quantity =
    mode === TRANSFER_MODE.QUANTITY
      ? positiveDecimal(body.transfer_quantity ?? body.source_quantity, "Transfer quantity")
      : positiveDecimal(body.source_quantity ?? body.transfer_quantity, "Source quantity", false);
  const amount =
    mode === TRANSFER_MODE.AMOUNT
      ? positiveDecimal(body.amount ?? body.transfer_amount, "Transfer amount")
      : positiveDecimal(body.transfer_amount ?? body.amount, "Transfer amount", false);

  return {
    from_package_sub_item_id: sourceSubItemId,
    to_package_sub_item_id: isNewItem
      ? null
      : positiveId(
          body.to_package_sub_item_id ?? body.toPackageSubItemId ?? body.to_budget_item_id,
          "Destination package sub-item",
        ),
    is_new_item: isNewItem,
    destination_catalog_item_id: isNewItem
      ? positiveId(body.destination_catalog_item_id ?? body.new_item_type_id, "Destination catalog item")
      : null,
    destination_catalog_sub_item_id: isNewItem
      ? positiveId(body.destination_catalog_sub_item_id ?? body.catalog_sub_item_id, "Destination model")
      : null,
    destination_unit_price: isNewItem
      ? positiveDecimal(body.destination_unit_price ?? body.new_item_unit_price, "Destination unit price")
      : null,
    destination_quantity: isNewItem
      ? positiveDecimal(body.destination_quantity ?? body.new_item_quantity, "Destination quantity")
      : positiveDecimal(body.destination_quantity, "Destination quantity", false),
    transfer_mode: mode,
    source_quantity: quantity,
    transfer_amount: amount,
    adjustment_request_id:
      body.adjustment_request_id || body.adjustmentRequestId
        ? positiveId(body.adjustment_request_id ?? body.adjustmentRequestId, "Adjustment request")
        : null,
    reason: requiredText(body.reason, 2000, "Business reason"),
  };
}

export function validateRejectTransferPayload(body = {}) {
  return {
    note: requiredText(body.note ?? body.reason, 1000, "Rejection reason"),
  };
}
