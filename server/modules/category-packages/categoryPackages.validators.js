import { ApiError } from "../../utils/apiError.js";

export function validatePositiveId(value, fieldName) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new ApiError(400, `${fieldName} must be a positive integer`, "INVALID_ID");
  }
  return numeric;
}

export function validateOptionalText(value, maxLength, fieldName) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} cannot exceed ${maxLength} characters`,
      "TEXT_TOO_LONG",
    );
  }
  return text;
}

export function validateNonNegativeDecimal(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new ApiError(
      400,
      `${fieldName} must be a non-negative number`,
      "INVALID_DECIMAL",
    );
  }
  return numeric;
}

export function validatePositiveDecimal(value, fieldName) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ApiError(
      400,
      `${fieldName} must be greater than zero`,
      "INVALID_DECIMAL",
    );
  }
  return numeric;
}

export function validateRowVersion(value, fieldName = "row_version") {
  const rowVersion = String(value ?? "").trim();
  if (!rowVersion) {
    throw new ApiError(400, `${fieldName} is required`, "ROW_VERSION_REQUIRED");
  }

  let buffer;
  try {
    buffer = Buffer.from(rowVersion, "base64");
  } catch {
    throw new ApiError(400, `${fieldName} is invalid`, "INVALID_ROW_VERSION");
  }

  if (buffer.length !== 8) {
    throw new ApiError(400, `${fieldName} is invalid`, "INVALID_ROW_VERSION");
  }

  return buffer;
}

export function validatePackageId(value) {
  return validatePositiveId(value, "Package id");
}

export function validatePackageItemId(value) {
  return validatePositiveId(value, "Package item id");
}

export function validatePackageSubItemId(value) {
  return validatePositiveId(value, "Package sub-item id");
}

export function validateDepartmentItemId(value) {
  return validatePositiveId(value, "Department budget item id");
}

export function validateAttachmentId(value) {
  return validatePositiveId(value, "Attachment id");
}

export function validateCreatePackageSubItemPayload(body = {}) {
  return {
    catalog_sub_item_id: validatePositiveId(
      body.catalog_sub_item_id ?? body.catalogSubItemId,
      "catalog_sub_item_id",
    ),
    category_manager_unit_price: validateNonNegativeDecimal(
      body.category_manager_unit_price ??
        body.categoryManagerUnitPrice ??
        body.unit_price ??
        body.unitPrice,
      "category_manager_unit_price",
    ),
    specification: validateOptionalText(body.specification, 2000, "specification"),
    note: validateOptionalText(body.note, 1000, "note"),
    row_version: body.row_version ? validateRowVersion(body.row_version) : null,
  };
}

export function validateUpdatePackageSubItemPayload(body = {}) {
  return {
    category_manager_unit_price: validateNonNegativeDecimal(
      body.category_manager_unit_price ??
        body.categoryManagerUnitPrice ??
        body.unit_price ??
        body.unitPrice,
      "category_manager_unit_price",
    ),
    specification: validateOptionalText(body.specification, 2000, "specification"),
    note: validateOptionalText(body.note, 1000, "note"),
    row_version: validateRowVersion(body.row_version ?? body.rowVersion),
  };
}

export function validateAllocationPayload(body = {}) {
  const allocations = Array.isArray(body.allocations) ? body.allocations : [];

  return {
    row_version: body.row_version ? validateRowVersion(body.row_version) : null,
    allocations: allocations.map((allocation, index) => ({
      package_sub_item_id: validatePositiveId(
        allocation.package_sub_item_id ?? allocation.packageSubItemId,
        `allocations[${index}].package_sub_item_id`,
      ),
      allocated_quantity:
        allocation.allocated_quantity === 0 ||
        allocation.allocated_quantity === "0" ||
        allocation.allocatedQuantity === 0 ||
        allocation.allocatedQuantity === "0"
          ? 0
          : validatePositiveDecimal(
              allocation.allocated_quantity ?? allocation.allocatedQuantity,
              `allocations[${index}].allocated_quantity`,
            ),
    })),
  };
}

export function validateDepartmentApprovedQuantityPayload(body = {}) {
  return {
    category_approved_quantity: validateNonNegativeDecimal(
      body.category_approved_quantity ?? body.categoryApprovedQuantity,
      "category_approved_quantity",
    ),
    row_version: validateRowVersion(body.row_version ?? body.rowVersion),
    approved_distribution_mode: (() => {
      const mode = body.approved_distribution_mode ?? body.approvedDistributionMode;
      if (mode === undefined || mode === null) return null; // legacy quantity-only correction
      if (mode !== "AUTO" && mode !== "CUSTOM") {
        throw new ApiError(400, "Invalid approved distribution mode", "INVALID_APPROVED_DISTRIBUTION_MODE");
      }
      return mode;
    })(),
    approved_distribution: (() => {
      const rows = body.approved_distribution ?? body.approvedDistribution ?? [];
      if (!Array.isArray(rows) || rows.length > 12) {
        throw new ApiError(400, "Invalid approved distribution", "INVALID_APPROVED_DISTRIBUTION");
      }
      return rows.map((row, index) => {
        if (row?.quantity === undefined || row?.quantity === null || row?.quantity === "") {
          throw new ApiError(400, `approved_distribution[${index}].quantity is required`, "INVALID_APPROVED_DISTRIBUTION_QUANTITY");
        }
        return {
          period_type: String(row?.period_type ?? row?.periodType ?? "").toUpperCase(),
          period_no: Number(row?.period_no ?? row?.periodNo),
          quantity: validateNonNegativeDecimal(row.quantity, `approved_distribution[${index}].quantity`),
        };
      });
    })(),
  };
}

export function validateSubmitPackagePayload(body = {}) {
  return {
    row_version: validateRowVersion(body.row_version ?? body.rowVersion),
    note: validateOptionalText(body.note, 1000, "note"),
  };
}

export function validateUploadAttachmentPayload(body = {}) {
  return {
    document_type: validateOptionalText(
      body.document_type ?? body.documentType,
      50,
      "document_type",
    ),
    description: validateOptionalText(body.description, 500, "description"),
  };
}

export function validateDeleteAttachmentPayload(body = {}) {
  return {
    row_version: validateRowVersion(body.row_version ?? body.rowVersion),
    reason: validateOptionalText(body.reason, 500, "reason"),
  };
}
