import { withTransaction } from "../../database/transaction.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import { ApiError } from "../../utils/apiError.js";
import { createPackageAttachmentReadStream } from "../../shared/files/packageAttachmentStorage.js";
import { hasPermission } from "../../../shared/permissions/permissionCodes.js";
import {
  findPackageAttachmentContextRepo,
  listAllocationsForPackageItemRepo,
  listDepartmentPackageViewRowsRepo,
  listPackageItemDetailRowsRepo,
  listPackageItemsRepo,
  listPackageSubItemAttachmentsRepo,
  createWorkflowHistoryRepo,
} from "../category-packages/categoryPackages.repository.js";
import {
  mapDepartmentPackageView,
  mapPackage,
  mapPackageItem,
  mapPackageItemDetail,
  mapPackageSubItemAttachment,
} from "../category-packages/categoryPackages.mapper.js";
import {
  CATEGORY_PACKAGE_ITEM_CFO_STATUS,
  CATEGORY_PACKAGE_STATUS,
  CFO_PACKAGE_REVIEW_DECISIONS,
  CFO_PACKAGE_REVIEW_PERMISSIONS,
  CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS,
} from "./cfoPackageReview.constants.js";
import {
  completeCfoPackageReviewRepo,
  countPackageCfoReviewStatusesRepo,
  findCfoPackageByIdRepo,
  findAnnualCfoReviewFinalizationRepo,
  findPackageItemForCfoRepo,
  getFinancialYearPackageCompletionSummaryRepo,
  listCfoFinancialYearsRepo,
  listCfoPackagesRepo,
  markAllPackageItemsNeedModificationRepo,
  reopenCfoPackageReviewRepo,
  returnPackageToCategoryManagerRepo,
  updatePackageItemCfoDecisionRepo,
} from "./cfoPackageReview.repository.js";
import {
  mapCfoFinancialYearOption,
  mapCfoPackageQueueRow,
} from "./cfoPackageReview.mapper.js";

function getUserRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getActingWorkspace(budgetAccess) {
  return budgetAccess?.workspaceType ?? budgetAccess?.type ?? null;
}

function assertPermission(budgetAccess, permission, errorCode, message) {
  if (!hasPermission(budgetAccess, permission)) {
    throw new ApiError(403, message, errorCode);
  }
}

function assertPackageExists(packageRow) {
  if (!packageRow) {
    throw new ApiError(404, "CFO package not found", "CFO_PACKAGE_NOT_FOUND");
  }
}

function assertPackageInCfoReview(packageRow) {
  if (packageRow.status !== CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW) {
    throw new ApiError(
      400,
      "This package is not currently in CFO review",
      "CFO_PACKAGE_NOT_IN_REVIEW",
    );
  }
}

function assertFinancialYearOpen(packageRow) {
  if (packageRow.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "CFO package review changes are allowed only while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }
}

function assertPackageItemExists(packageItem) {
  if (!packageItem) {
    throw new ApiError(
      404,
      "CFO package item not found",
      "CFO_PACKAGE_ITEM_NOT_FOUND",
    );
  }
}

function safeDownloadName(fileName) {
  return String(fileName || "attachment").replace(/[\r\n"]/g, "_");
}

async function loadPackageDetail(packageId) {
  const packageRow = await findCfoPackageByIdRepo({ packageId });
  assertPackageExists(packageRow);

  const [itemRows, departmentRows] = await Promise.all([
    listPackageItemsRepo({ packageId }),
    listDepartmentPackageViewRowsRepo({ packageId }),
  ]);

  const items = itemRows.map((item) => mapPackageItem(item));
  return {
    package: mapPackage(packageRow, items),
    departmentView: mapDepartmentPackageView(departmentRows),
  };
}

export async function listCfoFinancialYearsService({ budgetAccess }) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  const rows = await listCfoFinancialYearsRepo();
  return rows.map(mapCfoFinancialYearOption);
}

export async function listCfoPackagesService({ financialYearId, budgetAccess }) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  const rows = await listCfoPackagesRepo({ financialYearId });
  return rows.map(mapCfoPackageQueueRow);
}

export async function getCfoPackageService({ packageId, budgetAccess }) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  return loadPackageDetail(packageId);
}

export async function getCfoPackageItemDetailService({
  packageId,
  packageItemId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  const packageItem = await findPackageItemForCfoRepo({
    packageId,
    packageItemId,
  });
  assertPackageItemExists(packageItem);

  const [detailRows, allocations, packageItems] = await Promise.all([
    listPackageItemDetailRowsRepo({ packageItemId }),
    listAllocationsForPackageItemRepo({ packageItemId }),
    listPackageItemsRepo({ packageId }),
  ]);
  const mappedPackageItem = packageItems
    .map((item) => mapPackageItem(item))
    .find((item) => Number(item.id) === Number(packageItemId));

  return mapPackageItemDetail({
    packageItem: mappedPackageItem,
    subItems: detailRows.subItems,
    departments: detailRows.departments,
    allocations,
  });
}

export async function listCfoPackageSubItemAttachmentsService({
  packageSubItemId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  const rows = await listPackageSubItemAttachmentsRepo({ packageSubItemId });
  return rows.map(mapPackageSubItemAttachment);
}

export async function downloadCfoPackageSubItemAttachmentService({
  packageSubItemId,
  attachmentId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  const attachment = await findPackageAttachmentContextRepo({
    packageSubItemId,
    attachmentId,
  });

  if (!attachment) {
    throw new ApiError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  return {
    fileName: safeDownloadName(attachment.original_file_name),
    mimeType: attachment.mime_type || "application/octet-stream",
    fileSizeBytes: attachment.file_size_bytes,
    stream: createPackageAttachmentReadStream(attachment.storage_key),
  };
}

export async function setCfoPackageItemDecisionService({
  packageId,
  packageItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE,
    "CFO_PACKAGE_APPROVE_DENIED",
    "You do not have permission to review CFO package items",
  );

  await withTransaction(async (transaction) => {
    const packageItem = await findPackageItemForCfoRepo(
      { packageId, packageItemId },
      transaction,
    );
    assertPackageItemExists(packageItem);
    assertPackageInCfoReview({ status: packageItem.package_status });
    assertFinancialYearOpen({
      financial_year_status: packageItem.financial_year_status,
    });

    const updated = await updatePackageItemCfoDecisionRepo(transaction, {
      package_item_id: packageItemId,
      row_version: payload.row_version,
      decision: payload.decision,
      note: payload.note,
      actor_user_id: actorUserId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Package item was changed by another user",
        "CFO_PACKAGE_ITEM_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: packageItem.financial_year_id,
      entity_type: "CATEGORY_BUDGET_PACKAGE_ITEM",
      entity_id: packageItemId,
      action:
        payload.decision === CFO_PACKAGE_REVIEW_DECISIONS.ACCEPT
          ? CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.ITEM_ACCEPTED
          : CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.ITEM_NEEDS_MODIFICATION,
      old_status: packageItem.cfo_review_status,
      new_status: payload.decision,
      note: payload.note,
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  return getCfoPackageItemDetailService({
    packageId,
    packageItemId,
    budgetAccess,
  });
}

export async function markAllCfoPackageItemsNeedModificationService({
  packageId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE,
    "CFO_PACKAGE_APPROVE_DENIED",
    "You do not have permission to review CFO packages",
  );

  await withTransaction(async (transaction) => {
    const packageRow = await findCfoPackageByIdRepo({ packageId }, transaction);
    assertPackageExists(packageRow);
    assertPackageInCfoReview(packageRow);
    assertFinancialYearOpen(packageRow);

    if (packageRow.row_version !== Buffer.from(payload.row_version).toString("base64")) {
      throw new ApiError(
        409,
        "Package was changed by another user",
        "CFO_PACKAGE_CONFLICT",
      );
    }

    const affectedCount = await markAllPackageItemsNeedModificationRepo(
      transaction,
      {
        package_id: packageId,
        note: payload.note,
        actor_user_id: actorUserId,
      },
    );

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: packageRow.financial_year_id,
      entity_type: "CATEGORY_BUDGET_PACKAGE",
      entity_id: packageId,
      action: CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.ALL_ITEMS_NEED_MODIFICATION,
      new_values_json: JSON.stringify({ affectedCount }),
      note: payload.note,
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  return loadPackageDetail(packageId);
}

export async function returnCfoPackageToCategoryManagerService({
  packageId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE,
    "CFO_PACKAGE_APPROVE_DENIED",
    "You do not have permission to return CFO packages",
  );

  const returned = await withTransaction(async (transaction) => {
    const packageRow = await findCfoPackageByIdRepo({ packageId }, transaction);
    assertPackageExists(packageRow);
    assertPackageInCfoReview(packageRow);
    assertFinancialYearOpen(packageRow);

    const counts = await countPackageCfoReviewStatusesRepo(
      { packageId },
      transaction,
    );

    if (counts.total_count === 0) {
      throw new ApiError(
        400,
        "Package has no active items to review",
        "CFO_PACKAGE_HAS_NO_ITEMS",
      );
    }

    if (counts.pending_count > 0) {
      throw new ApiError(
        400,
        "Every package item must be accepted or marked as needing modification before returning the package",
        "CFO_PACKAGE_HAS_PENDING_ITEMS",
        counts,
      );
    }

    if (counts.needs_modification_count === 0) {
      throw new ApiError(
        400,
        "At least one package item must be marked as needing modification before returning the package",
        "CFO_PACKAGE_RETURN_REQUIRES_MODIFICATION_ITEM",
        counts,
      );
    }

    const updated = await returnPackageToCategoryManagerRepo(transaction, {
      package_id: packageId,
      row_version: payload.row_version,
      reason: payload.reason,
      actor_user_id: actorUserId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Package was changed by another user",
        "CFO_PACKAGE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: packageRow.financial_year_id,
      entity_type: "CATEGORY_BUDGET_PACKAGE",
      entity_id: packageId,
      action: CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.PACKAGE_RETURNED,
      old_status: CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW,
      new_status: CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO,
      note: payload.reason,
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return {
      packageId,
      categoryId: packageRow.budget_category_id,
      categoryName: packageRow.category_name,
      financialYear: packageRow.financial_year,
      reason: payload.reason,
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_BUDGET_PACKAGE_RETURNED,
    entityType: "CATEGORY_BUDGET_PACKAGE",
    entityId: packageId,
    payload: {
      packageId,
      categoryId: returned.categoryId,
      categoryName: returned.categoryName,
      financialYear: returned.financialYear,
      reason: returned.reason,
      actorUserId,
    },
  });

  return loadPackageDetail(packageId);
}

export async function completeCfoPackageReviewService({
  packageId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE,
    "CFO_PACKAGE_APPROVE_DENIED",
    "You do not have permission to complete CFO package reviews",
  );

  const completed = await withTransaction(async (transaction) => {
    const packageRow = await findCfoPackageByIdRepo({ packageId }, transaction);
    assertPackageExists(packageRow);
    assertPackageInCfoReview(packageRow);
    assertFinancialYearOpen(packageRow);

    const counts = await countPackageCfoReviewStatusesRepo(
      { packageId },
      transaction,
    );

    if (counts.total_count === 0 || counts.accepted_count !== counts.total_count) {
      throw new ApiError(
        400,
        "Every active package item must be accepted before CFO review can be completed",
        "CFO_PACKAGE_ITEMS_NOT_ACCEPTED",
        counts,
      );
    }

    const updated = await completeCfoPackageReviewRepo(transaction, {
      package_id: packageId,
      row_version: payload.row_version,
      actor_user_id: actorUserId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Package was changed by another user",
        "CFO_PACKAGE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: packageRow.financial_year_id,
      entity_type: "CATEGORY_BUDGET_PACKAGE",
      entity_id: packageId,
      action: CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.PACKAGE_COMPLETED,
      old_status: CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW,
      new_status: CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED,
      note: payload.note,
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return {
      packageId,
      categoryId: packageRow.budget_category_id,
      categoryName: packageRow.category_name,
      financialYear: packageRow.financial_year,
    };
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CATEGORY_BUDGET_PACKAGE_COMPLETED,
    entityType: "CATEGORY_BUDGET_PACKAGE",
    entityId: packageId,
    payload: {
      packageId,
      categoryId: completed.categoryId,
      categoryName: completed.categoryName,
      financialYear: completed.financialYear,
      actorUserId,
    },
  });

  return loadPackageDetail(packageId);
}

export async function reopenCfoPackageReviewService({
  packageId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE,
    "CFO_PACKAGE_APPROVE_DENIED",
    "You do not have permission to reopen CFO package reviews",
  );

  await withTransaction(async (transaction) => {
    const packageRow = await findCfoPackageByIdRepo({ packageId }, transaction);
    assertPackageExists(packageRow);
    assertFinancialYearOpen(packageRow);

    if (packageRow.status !== CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED) {
      throw new ApiError(
        400,
        "Only completed CFO package reviews can be reopened",
        "CFO_PACKAGE_REOPEN_STATUS_INVALID",
      );
    }

    const finalized = await findAnnualCfoReviewFinalizationRepo(
      { financialYearId: packageRow.financial_year_id },
      transaction,
    );

    if (finalized) {
      throw new ApiError(
        409,
        "This financial year's CFO package review has already been finalized",
        "CFO_ANNUAL_REVIEW_ALREADY_FINALIZED",
      );
    }

    const reopened = await reopenCfoPackageReviewRepo(transaction, {
      package_id: packageId,
      row_version: payload.row_version,
      actor_user_id: actorUserId,
    });

    if (!reopened) {
      throw new ApiError(
        409,
        "Package was changed by another user",
        "CFO_PACKAGE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: packageRow.financial_year_id,
      entity_type: "CATEGORY_BUDGET_PACKAGE",
      entity_id: packageId,
      action: CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.PACKAGE_REOPENED,
      old_status: CATEGORY_PACKAGE_STATUS.CFO_REVIEW_COMPLETED,
      new_status: CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW,
      note: payload.reason,
      old_values_json: JSON.stringify(packageRow),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  return loadPackageDetail(packageId);
}

export async function finalizeAnnualCfoPackageReviewService({
  financialYearId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.APPROVE,
    "CFO_PACKAGE_APPROVE_DENIED",
    "You do not have permission to finalize CFO package review",
  );

  await withTransaction(async (transaction) => {
    const summary = await getFinancialYearPackageCompletionSummaryRepo(
      { financialYearId },
      transaction,
    );

    if (summary.financial_year_status !== "OPEN") {
      throw new ApiError(
        400,
        "CFO Package Review can only be finalized while the financial year is OPEN",
        "FINANCIAL_YEAR_NOT_OPEN",
      );
    }

    if (summary.package_count < 3) {
      throw new ApiError(
        400,
        "Cannot finalize CFO package review. All three category packages must exist.",
        "CFO_ANNUAL_REVIEW_MISSING_PACKAGES",
        summary,
      );
    }

    if (summary.incomplete_count > 0) {
      throw new ApiError(
        400,
        `Cannot finalize CFO package review. ${summary.incomplete_count} category package(s) are not completed.`,
        "CFO_ANNUAL_REVIEW_HAS_INCOMPLETE_PACKAGES",
        summary,
      );
    }

    const finalized = await findAnnualCfoReviewFinalizationRepo(
      { financialYearId },
      transaction,
    );

    if (finalized) {
      throw new ApiError(
        409,
        "This financial year's CFO package review has already been finalized",
        "CFO_ANNUAL_REVIEW_ALREADY_FINALIZED",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: financialYearId,
      entity_type: "FINANCIAL_YEAR",
      entity_id: financialYearId,
      action: CFO_PACKAGE_REVIEW_WORKFLOW_ACTIONS.ANNUAL_REVIEW_FINALIZED,
      old_status: "OPEN",
      new_status: "OPEN",
      note:
        payload.note ||
        "CFO finalized all category package reviews for the financial year",
      new_values_json: JSON.stringify(summary),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });
  });

  const rows = await listCfoPackagesRepo({ financialYearId });
  return rows.map(mapCfoPackageQueueRow);
}
