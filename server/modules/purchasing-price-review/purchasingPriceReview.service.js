import { hasPermission } from "../../../shared/permissions/permissionCodes.js";
import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";
import path from "path";
import {
  createPackageAttachmentReadStream,
  removePackageAttachmentFile,
  savePackageAttachmentFile,
} from "../../shared/files/packageAttachmentStorage.js";
import {
  CATEGORY_PACKAGE_ATTACHMENT_ALLOWED_EXTENSIONS,
  CATEGORY_PACKAGE_ATTACHMENT_ALLOWED_MIME_TYPES,
  CATEGORY_PACKAGE_ATTACHMENT_MAX_BYTES,
  CATEGORY_PACKAGE_ITEM_CFO_STATUS,
  CATEGORY_PACKAGE_STATUS,
} from "../category-packages/categoryPackages.constants.js";
import {
  createPackageSubItemAttachmentRepo,
  createWorkflowHistoryRepo,
  deactivatePackageSubItemAttachmentRepo,
  findPackageAttachmentContextRepo,
  findPackageContextBySubItemRepo,
  listPackageSubItemPriceHistoryRepo,
  listPackageSubItemAttachmentsRepo,
} from "../category-packages/categoryPackages.repository.js";
import {
  mapPackageSubItemAttachment,
  mapPackageSubItemPriceHistory,
} from "../category-packages/categoryPackages.mapper.js";
import {
  PURCHASING_PRICE_REVIEW_PERMISSIONS,
  PURCHASING_PRICE_REVIEW_STATUS,
  PURCHASING_PRICE_WORKFLOW_ACTIONS,
} from "./purchasingPriceReview.constants.js";
import {
  mapPurchasingFinancialYear,
  mapPurchasingPackageDetail,
  mapPurchasingPackageQueueRow,
} from "./purchasingPriceReview.mapper.js";
import {
  acceptAllPurchasingPricesRepo,
  acceptPurchasingPriceRepo,
  findCurrentPriceReviewRepo,
  findPurchasingPackageRepo,
  getPurchasingSubmissionReadinessRepo,
  listPurchasingFinancialYearsRepo,
  listPurchasingPackageDetailRowsRepo,
  listPurchasingPackagesRepo,
  reopenPurchasingPriceRepo,
  submitPurchasingPackageToCfoRepo,
  touchPurchasingPackageRepo,
  updatePurchasingPriceRepo,
} from "./purchasingPriceReview.repository.js";

function getUserRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getActingWorkspace(budgetAccess) {
  return budgetAccess?.workspaceType ?? budgetAccess?.type ?? null;
}

function assertPermission(budgetAccess, permission, code, message) {
  if (!hasPermission(budgetAccess, permission)) {
    throw new ApiError(403, message, code);
  }
}

function assertPackage(packageRow) {
  if (!packageRow) {
    throw new ApiError(
      404,
      "Purchasing price-review package not found",
      "PURCHASING_PACKAGE_NOT_FOUND",
    );
  }
}

function assertEditablePackage(packageRow) {
  assertPackage(packageRow);
  if (packageRow.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Purchasing price review is available only while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }
  if (packageRow.status !== CATEGORY_PACKAGE_STATUS.IN_PURCHASING_REVIEW) {
    throw new ApiError(
      409,
      "This package is not currently in Purchasing price review",
      "PACKAGE_NOT_IN_PURCHASING_REVIEW",
    );
  }
}

function assertReviewExistsAndPackageEditable(review) {
  if (!review) {
    throw new ApiError(
      404,
      "Current Purchasing price review was not found for this model",
      "PURCHASING_PRICE_REVIEW_NOT_FOUND",
    );
  }
  if (review.package_status !== CATEGORY_PACKAGE_STATUS.IN_PURCHASING_REVIEW) {
    throw new ApiError(
      409,
      "This package is not currently editable by Purchasing",
      "PACKAGE_NOT_IN_PURCHASING_REVIEW",
    );
  }
}

function assertPriceEditable(review) {
  assertReviewExistsAndPackageEditable(review);
  const isPending = review.status === PURCHASING_PRICE_REVIEW_STATUS.PENDING;
  const isReturnedCarriedPrice =
    review.status === PURCHASING_PRICE_REVIEW_STATUS.ACCEPTED &&
    review.decision_source === "CARRIED_FORWARD" &&
    review.cfo_review_status ===
      CATEGORY_PACKAGE_ITEM_CFO_STATUS.NEEDS_MODIFICATION;
  if (!isPending && !isReturnedCarriedPrice) {
    throw new ApiError(
      409,
      "This accepted Purchasing price is locked",
      "PURCHASING_PRICE_LOCKED",
    );
  }
}

function assertPendingReview(review) {
  assertReviewExistsAndPackageEditable(review);
  if (review.status !== PURCHASING_PRICE_REVIEW_STATUS.PENDING) {
    throw new ApiError(
      409,
      "This Purchasing price is already accepted",
      "PURCHASING_PRICE_ALREADY_ACCEPTED",
    );
  }
}

function assertAcceptedReview(review) {
  assertReviewExistsAndPackageEditable(review);
  if (review.status !== PURCHASING_PRICE_REVIEW_STATUS.ACCEPTED) {
    throw new ApiError(
      409,
      "This Purchasing price is already pending",
      "PURCHASING_PRICE_ALREADY_PENDING",
    );
  }
}

function assertMatchingRowVersion(packageRow, rowVersion) {
  const current = Buffer.from(packageRow.row_version, "base64");
  if (!current.equals(rowVersion)) {
    throw new ApiError(
      409,
      "Package was changed by another user",
      "PURCHASING_PACKAGE_CONFLICT",
    );
  }
}

async function loadPackageDetail(packageId) {
  const packageRow = await findPurchasingPackageRepo({ packageId });
  assertPackage(packageRow);
  const rows = await listPurchasingPackageDetailRowsRepo({
    packageId,
    reviewRound: packageRow.purchasing_review_round,
  });
  return mapPurchasingPackageDetail(packageRow, rows);
}

function assertPackageSubItemContext(context, packageId) {
  if (!context || Number(context.package_id) !== Number(packageId)) {
    throw new ApiError(
      404,
      "Purchasing package model not found",
      "PURCHASING_PACKAGE_SUB_ITEM_NOT_FOUND",
    );
  }
}

function assertAttachmentEditable(context) {
  if (context.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Purchasing attachments can only be changed while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }
  if (context.package_status !== CATEGORY_PACKAGE_STATUS.IN_PURCHASING_REVIEW) {
    throw new ApiError(
      409,
      "Purchasing attachments are locked in the current package status",
      "PACKAGE_NOT_IN_PURCHASING_REVIEW",
    );
  }
  if (
    context.cfo_review_status ===
    CATEGORY_PACKAGE_ITEM_CFO_STATUS.CFO_ACCEPTED
  ) {
    throw new ApiError(
      409,
      "CFO-accepted package items are locked",
      "CFO_ACCEPTED_PACKAGE_ITEM_LOCKED",
    );
  }
}

function assertAttachmentFile(file) {
  if (!file) {
    throw new ApiError(400, "Attachment file is required", "ATTACHMENT_FILE_REQUIRED");
  }
  if (!file.size || file.size <= 0) {
    throw new ApiError(400, "Attachment file cannot be empty", "ATTACHMENT_FILE_EMPTY");
  }
  if (file.size > CATEGORY_PACKAGE_ATTACHMENT_MAX_BYTES) {
    throw new ApiError(400, "Attachment file is too large", "ATTACHMENT_FILE_TOO_LARGE");
  }
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!CATEGORY_PACKAGE_ATTACHMENT_ALLOWED_EXTENSIONS.includes(extension)) {
    throw new ApiError(400, "Attachment file type is not allowed", "ATTACHMENT_FILE_TYPE_BLOCKED");
  }
  if (
    file.mimetype &&
    !CATEGORY_PACKAGE_ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.mimetype)
  ) {
    throw new ApiError(400, "Attachment MIME type is not allowed", "ATTACHMENT_MIME_TYPE_BLOCKED");
  }
}

function normalizeUploadedFileName(fileName) {
  return path.basename(String(fileName || "attachment")).replace(/[\r\n]/g, "");
}

function safeDownloadName(fileName) {
  return normalizeUploadedFileName(fileName);
}

export async function listPurchasingFinancialYearsService({ budgetAccess }) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW,
    "PURCHASING_PRICE_VIEW_DENIED",
    "You do not have permission to view Purchasing price reviews",
  );
  const rows = await listPurchasingFinancialYearsRepo();
  return rows.map(mapPurchasingFinancialYear);
}

export async function listPurchasingPackagesService({
  financialYearId,
  status,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW,
    "PURCHASING_PRICE_VIEW_DENIED",
    "You do not have permission to view Purchasing price reviews",
  );
  const rows = await listPurchasingPackagesRepo({ financialYearId, status });
  return rows.map(mapPurchasingPackageQueueRow);
}

export async function getPurchasingPackageService({ packageId, budgetAccess }) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW,
    "PURCHASING_PRICE_VIEW_DENIED",
    "You do not have permission to view Purchasing price reviews",
  );
  return loadPackageDetail(packageId);
}

export async function savePurchasingPriceService({
  packageId,
  packageSubItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW,
    "PURCHASING_PRICE_REVIEW_DENIED",
    "You do not have permission to review Purchasing prices",
  );

  await withTransaction(async (transaction) => {
    const packageRow = await findPurchasingPackageRepo(
      { packageId },
      transaction,
    );
    assertEditablePackage(packageRow);
    const review = await findCurrentPriceReviewRepo(
      { packageId, packageSubItemId },
      transaction,
    );
    assertPriceEditable(review);

    const updated = await updatePurchasingPriceRepo(transaction, {
      review_id: review.id,
      purchasing_unit_price: payload.purchasing_unit_price,
      row_version: payload.row_version,
    });
    if (!updated) {
      throw new ApiError(
        409,
        "Purchasing price was changed by another user",
        "PURCHASING_PRICE_CONFLICT",
      );
    }
    await touchPurchasingPackageRepo(transaction, {
      package_id: packageId,
      actor_user_id: actorUserId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: review.financial_year_id,
      entity_type: "CATEGORY_PACKAGE_SUB_ITEM",
      entity_id: packageSubItemId,
      action: PURCHASING_PRICE_WORKFLOW_ACTIONS.DRAFT_SAVED,
      old_values_json: JSON.stringify({
        purchasingUnitPrice: review.purchasing_unit_price,
      }),
      new_values_json: JSON.stringify({
        purchasingUnitPrice: payload.purchasing_unit_price,
        reviewRound: review.review_round,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  return loadPackageDetail(packageId);
}

export async function savePurchasingPricesService({
  packageId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW,
    "PURCHASING_PRICE_REVIEW_DENIED",
    "You do not have permission to review Purchasing prices",
  );

  await withTransaction(async (transaction) => {
    const packageRow = await findPurchasingPackageRepo(
      { packageId },
      transaction,
    );
    assertEditablePackage(packageRow);
    assertMatchingRowVersion(packageRow, payload.row_version);

    const changes = [];
    for (const price of payload.prices) {
      const review = await findCurrentPriceReviewRepo(
        {
          packageId,
          packageSubItemId: price.package_sub_item_id,
        },
        transaction,
      );
      assertPriceEditable(review);

      const updated = await updatePurchasingPriceRepo(transaction, {
        review_id: review.id,
        purchasing_unit_price: price.purchasing_unit_price,
        row_version: price.row_version,
      });
      if (!updated) {
        throw new ApiError(
          409,
          "A Purchasing price was changed by another user",
          "PURCHASING_PRICE_CONFLICT",
        );
      }
      changes.push({ review, updated });
    }

    await touchPurchasingPackageRepo(transaction, {
      package_id: packageId,
      actor_user_id: actorUserId,
    });

    for (const { review, updated } of changes) {
      await createWorkflowHistoryRepo(transaction, {
        financial_year_id: review.financial_year_id,
        entity_type: "CATEGORY_PACKAGE_SUB_ITEM",
        entity_id: review.category_budget_package_sub_item_id,
        action: PURCHASING_PRICE_WORKFLOW_ACTIONS.DRAFTS_SAVED,
        old_values_json: JSON.stringify({
          purchasingUnitPrice: review.purchasing_unit_price,
        }),
        new_values_json: JSON.stringify({
          purchasingUnitPrice: updated.purchasing_unit_price,
          reviewRound: review.review_round,
        }),
        user_role_id: getUserRoleId(budgetAccess),
        acting_workspace: getActingWorkspace(budgetAccess),
        created_by: actorUserId,
      });
    }
  });

  return loadPackageDetail(packageId);
}

export async function reopenPurchasingPriceService({
  packageId,
  packageSubItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW,
    "PURCHASING_PRICE_REVIEW_DENIED",
    "You do not have permission to reopen Purchasing prices",
  );

  await withTransaction(async (transaction) => {
    const packageRow = await findPurchasingPackageRepo(
      { packageId },
      transaction,
    );
    assertEditablePackage(packageRow);
    const review = await findCurrentPriceReviewRepo(
      { packageId, packageSubItemId },
      transaction,
    );
    assertAcceptedReview(review);

    const reopened = await reopenPurchasingPriceRepo(transaction, {
      review_id: review.id,
      row_version: payload.row_version,
    });
    if (!reopened) {
      throw new ApiError(
        409,
        "Purchasing price was changed by another user",
        "PURCHASING_PRICE_CONFLICT",
      );
    }
    await touchPurchasingPackageRepo(transaction, {
      package_id: packageId,
      actor_user_id: actorUserId,
    });
    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: review.financial_year_id,
      entity_type: "CATEGORY_PACKAGE_SUB_ITEM",
      entity_id: packageSubItemId,
      action: PURCHASING_PRICE_WORKFLOW_ACTIONS.PRICE_REOPENED,
      old_values_json: JSON.stringify({ status: review.status }),
      new_values_json: JSON.stringify({
        status: PURCHASING_PRICE_REVIEW_STATUS.PENDING,
        purchasingUnitPrice: review.purchasing_unit_price,
        reviewRound: review.review_round,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  return loadPackageDetail(packageId);
}

export async function getPurchasingPriceHistoryService({
  packageId,
  packageSubItemId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW,
    "PURCHASING_PRICE_VIEW_DENIED",
    "You do not have permission to view Purchasing price history",
  );
  const packageRow = await findPurchasingPackageRepo({ packageId });
  assertPackage(packageRow);
  const rows = await listPackageSubItemPriceHistoryRepo({
    packageId,
    packageSubItemId,
  });
  return mapPackageSubItemPriceHistory(rows);
}

export async function listPurchasingAttachmentsService({
  packageId,
  packageSubItemId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW,
    "PURCHASING_PRICE_VIEW_DENIED",
    "You do not have permission to view Purchasing package attachments",
  );
  const context = await findPackageContextBySubItemRepo({ packageSubItemId });
  assertPackageSubItemContext(context, packageId);
  const rows = await listPackageSubItemAttachmentsRepo({ packageSubItemId });
  return rows.map(mapPackageSubItemAttachment);
}

export async function uploadPurchasingAttachmentService({
  packageId,
  packageSubItemId,
  file,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.MANAGE_ATTACHMENTS,
    "PURCHASING_ATTACHMENT_MANAGE_DENIED",
    "You do not have permission to manage Purchasing attachments",
  );
  assertAttachmentFile(file);
  const context = await findPackageContextBySubItemRepo({ packageSubItemId });
  assertPackageSubItemContext(context, packageId);
  assertAttachmentEditable(context);

  const originalFileName = normalizeUploadedFileName(file.originalname);
  let storageKey = null;
  try {
    storageKey = await savePackageAttachmentFile({
      buffer: file.buffer,
      originalName: originalFileName,
    });
    const attachment = await withTransaction(async (transaction) => {
      const lockedContext = await findPackageContextBySubItemRepo(
        { packageSubItemId },
        transaction,
      );
      assertPackageSubItemContext(lockedContext, packageId);
      assertAttachmentEditable(lockedContext);

      const created = await createPackageSubItemAttachmentRepo(transaction, {
        package_sub_item_id: packageSubItemId,
        document_type: payload.document_type,
        original_file_name: originalFileName,
        storage_key: storageKey,
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        description: payload.description,
        attachment_source: "PURCHASING",
        actor_user_id: actorUserId,
        uploaded_user_role_id: getUserRoleId(budgetAccess),
      });
      await createWorkflowHistoryRepo(transaction, {
        financial_year_id: lockedContext.financial_year_id,
        entity_type: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
        entity_id: created.id,
        action: PURCHASING_PRICE_WORKFLOW_ACTIONS.ATTACHMENT_UPLOADED,
        new_values_json: JSON.stringify({
          packageSubItemId,
          originalFileName,
          fileSizeBytes: file.size,
        }),
        user_role_id: getUserRoleId(budgetAccess),
        acting_workspace: getActingWorkspace(budgetAccess),
        created_by: actorUserId,
      });
      return created;
    });
    return mapPackageSubItemAttachment(attachment);
  } catch (error) {
    if (storageKey) await removePackageAttachmentFile(storageKey);
    throw error;
  }
}

export async function downloadPurchasingAttachmentService({
  packageId,
  packageSubItemId,
  attachmentId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.VIEW,
    "PURCHASING_PRICE_VIEW_DENIED",
    "You do not have permission to download Purchasing package attachments",
  );
  const attachment = await findPackageAttachmentContextRepo({
    packageSubItemId,
    attachmentId,
  });
  assertPackageSubItemContext(attachment, packageId);
  return {
    fileName: safeDownloadName(attachment.original_file_name),
    mimeType: attachment.mime_type || "application/octet-stream",
    fileSizeBytes: attachment.file_size_bytes,
    stream: createPackageAttachmentReadStream(attachment.storage_key),
  };
}

export async function deletePurchasingAttachmentService({
  packageId,
  packageSubItemId,
  attachmentId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.MANAGE_ATTACHMENTS,
    "PURCHASING_ATTACHMENT_MANAGE_DENIED",
    "You do not have permission to manage Purchasing attachments",
  );
  await withTransaction(async (transaction) => {
    const attachment = await findPackageAttachmentContextRepo(
      { packageSubItemId, attachmentId },
      transaction,
    );
    assertPackageSubItemContext(attachment, packageId);
    assertAttachmentEditable(attachment);
    if (attachment.attachment_source !== "PURCHASING") {
      throw new ApiError(
        403,
        "Purchasing can only remove Purchasing attachments",
        "PURCHASING_ATTACHMENT_OWNER_DENIED",
      );
    }
    const removed = await deactivatePackageSubItemAttachmentRepo(transaction, {
      package_sub_item_id: packageSubItemId,
      attachment_id: attachmentId,
      row_version: payload.row_version,
      reason: payload.reason || "Removed by Purchasing",
      attachment_source: "PURCHASING",
      actor_user_id: actorUserId,
    });
    if (!removed) {
      throw new ApiError(
        409,
        "Attachment was changed by another user",
        "PURCHASING_ATTACHMENT_CONFLICT",
      );
    }
    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: attachment.financial_year_id,
      entity_type: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
      entity_id: attachmentId,
      action: PURCHASING_PRICE_WORKFLOW_ACTIONS.ATTACHMENT_REMOVED,
      old_values_json: JSON.stringify({
        packageSubItemId,
        originalFileName: attachment.original_file_name,
      }),
      note: payload.reason,
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });
  return listPurchasingAttachmentsService({
    packageId,
    packageSubItemId,
    budgetAccess,
  });
}

export async function acceptPurchasingPriceService({
  packageId,
  packageSubItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW,
    "PURCHASING_PRICE_REVIEW_DENIED",
    "You do not have permission to accept Purchasing prices",
  );

  await withTransaction(async (transaction) => {
    const packageRow = await findPurchasingPackageRepo(
      { packageId },
      transaction,
    );
    assertEditablePackage(packageRow);
    const review = await findCurrentPriceReviewRepo(
      { packageId, packageSubItemId },
      transaction,
    );
    assertPendingReview(review);

    const accepted = await acceptPurchasingPriceRepo(transaction, {
      review_id: review.id,
      row_version: payload.row_version,
      actor_user_id: actorUserId,
      actor_user_role_id: getUserRoleId(budgetAccess),
    });
    if (!accepted) {
      throw new ApiError(
        409,
        "Purchasing price was changed by another user",
        "PURCHASING_PRICE_CONFLICT",
      );
    }
    await touchPurchasingPackageRepo(transaction, {
      package_id: packageId,
      actor_user_id: actorUserId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: review.financial_year_id,
      entity_type: "CATEGORY_PACKAGE_SUB_ITEM",
      entity_id: packageSubItemId,
      action: PURCHASING_PRICE_WORKFLOW_ACTIONS.PRICE_ACCEPTED,
      new_values_json: JSON.stringify({
        purchasingUnitPrice: accepted.purchasing_unit_price,
        reviewRound: review.review_round,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  return loadPackageDetail(packageId);
}

export async function acceptAllPurchasingPricesService({
  packageId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.REVIEW,
    "PURCHASING_PRICE_REVIEW_DENIED",
    "You do not have permission to accept Purchasing prices",
  );

  await withTransaction(async (transaction) => {
    const packageRow = await findPurchasingPackageRepo(
      { packageId },
      transaction,
    );
    assertEditablePackage(packageRow);
    assertMatchingRowVersion(packageRow, payload.row_version);

    const updated = await acceptAllPurchasingPricesRepo(transaction, {
      package_id: packageId,
      review_round: packageRow.purchasing_review_round,
      actor_user_id: actorUserId,
      actor_user_role_id: getUserRoleId(budgetAccess),
    });
    await touchPurchasingPackageRepo(transaction, {
      package_id: packageId,
      actor_user_id: actorUserId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: packageRow.financial_year_id,
      entity_type: "CATEGORY_BUDGET_PACKAGE",
      entity_id: packageId,
      action: PURCHASING_PRICE_WORKFLOW_ACTIONS.PRICES_ACCEPTED_ALL,
      new_values_json: JSON.stringify({
        acceptedCount: updated.length,
        reviewRound: packageRow.purchasing_review_round,
      }),
      note: payload.note,
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  return loadPackageDetail(packageId);
}

export async function submitPurchasingPackageToCfoService({
  packageId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    PURCHASING_PRICE_REVIEW_PERMISSIONS.SUBMIT,
    "PURCHASING_PRICE_SUBMIT_DENIED",
    "You do not have permission to submit priced packages to CFO",
  );

  await withTransaction(async (transaction) => {
    const packageRow = await findPurchasingPackageRepo(
      { packageId },
      transaction,
    );
    assertEditablePackage(packageRow);

    const readiness = await getPurchasingSubmissionReadinessRepo(
      {
        packageId,
        reviewRound: packageRow.purchasing_review_round,
      },
      transaction,
    );
    const total = Number(readiness.total_price_count || 0);
    const pending = Number(readiness.pending_price_count || 0);
    const invalid = Number(readiness.invalid_price_count || 0);
    if (total === 0 || pending > 0 || invalid > 0) {
      throw new ApiError(
        400,
        "Package prices are not ready for CFO submission",
        "PURCHASING_PRICES_NOT_READY",
        {
          totalPriceCount: total,
          pendingPriceCount: pending,
          invalidPriceCount: invalid,
        },
      );
    }

    const submitted = await submitPurchasingPackageToCfoRepo(transaction, {
      package_id: packageId,
      review_round: packageRow.purchasing_review_round,
      row_version: payload.row_version,
      actor_user_id: actorUserId,
    });
    if (!submitted) {
      throw new ApiError(
        409,
        "Package was changed by another user",
        "PURCHASING_PACKAGE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: packageRow.financial_year_id,
      entity_type: "CATEGORY_BUDGET_PACKAGE",
      entity_id: packageId,
      action: PURCHASING_PRICE_WORKFLOW_ACTIONS.PACKAGE_SUBMITTED_TO_CFO,
      old_status: CATEGORY_PACKAGE_STATUS.IN_PURCHASING_REVIEW,
      new_status: CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW,
      note: payload.note,
      new_values_json: JSON.stringify({
        reviewRound: packageRow.purchasing_review_round,
        acceptedPriceCount: total,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  return loadPackageDetail(packageId);
}
