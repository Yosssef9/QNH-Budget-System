import { ApiError } from "../../utils/apiError.js";
import {
  validateOptionalText,
  validatePositiveId,
  validateRowVersion,
} from "../category-packages/categoryPackages.validators.js";

export function validateFinancialYearId(value) {
  return validatePositiveId(value, "Financial year id");
}

export function validatePackageId(value) {
  return validatePositiveId(value, "Package id");
}

export function validatePackageSubItemId(value) {
  return validatePositiveId(value, "Package sub-item id");
}

export function validatePriceReviewPayload(body = {}) {
  const rawPrice = body.purchasing_unit_price ?? body.purchasingUnitPrice;
  const purchasingUnitPrice = Number(rawPrice);
  if (!Number.isFinite(purchasingUnitPrice) || purchasingUnitPrice < 1) {
    throw new ApiError(
      400,
      "purchasing_unit_price must be at least 1",
      "INVALID_PURCHASING_PRICE",
    );
  }
  return {
    purchasing_unit_price: purchasingUnitPrice,
    row_version: validateRowVersion(body.row_version ?? body.rowVersion),
  };
}

export function validateAcceptPricePayload(body = {}) {
  return {
    row_version: validateRowVersion(body.row_version ?? body.rowVersion),
  };
}

export function validateBulkPriceReviewPayload(body = {}) {
  const prices = Array.isArray(body.prices) ? body.prices : [];
  if (prices.length === 0) {
    throw new ApiError(
      400,
      "At least one changed Purchasing price is required",
      "PURCHASING_PRICES_REQUIRED",
    );
  }

  const seen = new Set();
  const normalizedPrices = prices.map((price) => {
    const packageSubItemId = validatePackageSubItemId(
      price.package_sub_item_id ?? price.packageSubItemId,
    );
    if (seen.has(packageSubItemId)) {
      throw new ApiError(
        400,
        "A package model cannot appear more than once",
        "DUPLICATE_PURCHASING_PRICE",
      );
    }
    seen.add(packageSubItemId);

    return {
      package_sub_item_id: packageSubItemId,
      ...validatePriceReviewPayload(price),
    };
  });

  return {
    row_version: validateRowVersion(body.row_version ?? body.rowVersion),
    prices: normalizedPrices.sort(
      (left, right) =>
        left.package_sub_item_id - right.package_sub_item_id,
    ),
  };
}

export function validateRejectModelsPayload(body = {}) {
  const rawModels = body.models;
  if (!Array.isArray(rawModels) || rawModels.length < 1 || rawModels.length > 100) {
    throw new ApiError(400, "Choose one or more models to reject", "PURCHASING_REJECT_MODELS_REQUIRED");
  }
  const seen = new Set();
  const models = rawModels.map((model) => {
    const packageSubItemId = validatePackageSubItemId(model.package_sub_item_id);
    if (seen.has(packageSubItemId)) {
      throw new ApiError(400, "Duplicate model in rejection", "PURCHASING_REJECT_DUPLICATE_MODEL");
    }
    seen.add(packageSubItemId);
    return {
      package_sub_item_id: packageSubItemId,
      row_version: validateRowVersion(model.row_version),
    };
  });
  const reason = String(body.reason || "").trim();
  if (!reason || reason.length > 1000) {
    throw new ApiError(400, "A rejection reason (maximum 1000 characters) is required", "PURCHASING_REJECTION_REASON_REQUIRED");
  }
  return {
    models: models.sort((a, b) => a.package_sub_item_id - b.package_sub_item_id),
    reason,
    row_version: validateRowVersion(body.row_version),
  };
}

export function validateReinstateModelPayload(body = {}) {
  const reason = String(body.reason || "").trim();
  if (!reason || reason.length > 1000) {
    throw new ApiError(400, "A reinstatement reason (maximum 1000 characters) is required", "PURCHASING_REINSTATEMENT_REASON_REQUIRED");
  }
  return { row_version: validateRowVersion(body.row_version ?? body.rowVersion), reason };
}

export function validatePackageCommandPayload(body = {}) {
  return {
    row_version: validateRowVersion(body.row_version ?? body.rowVersion),
    note: validateOptionalText(body.note, 1000, "note"),
  };
}

export function validateOptionalStatus(value) {
  if (value === undefined || value === null || value === "") return null;
  const status = String(value).trim().toUpperCase();
  if (!['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
    throw new ApiError(400, "Invalid Purchasing price status", "INVALID_STATUS");
  }
  return status;
}

