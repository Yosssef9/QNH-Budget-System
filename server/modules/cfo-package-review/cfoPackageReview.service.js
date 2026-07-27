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
  listPackageDistributionRowsRepo,
  listPackageItemDetailRowsRepo,
  listPackageItemsRepo,
  listPackageSubItemAttachmentsRepo,
  createWorkflowHistoryRepo,
} from "../category-packages/categoryPackages.repository.js";
import { buildPackageDistributionAnalysis } from "../category-packages/categoryPackages.service.js";
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
  createCfoPackageItemReturnSnapshotsRepo,
  findCfoPackageByIdRepo,
  findAnnualCfoReviewFinalizationRepo,
  findPackageItemForCfoRepo,
  getFinancialYearPackageCompletionSummaryRepo,
  listCfoPackageTimelineRepo,
  getCfoPackageItemComparisonRepo,
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

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getChangeDirection(before, after) {
  const previous = toNumber(before);
  const current = toNumber(after);
  if (current > previous) return "INCREASED";
  if (current < previous) return "DECREASED";
  return "SAME";
}

function parseSnapshotJson(value) {
  if (!value) return { subItems: [] };
  const parsed = JSON.parse(value);
  return {
    ...parsed,
    subItems: Array.isArray(parsed?.subItems) ? parsed.subItems : [],
  };
}

function getSubItemComparisonKey(item) {
  const catalogSubItemId = Number(item.catalog_sub_item_id);
  if (catalogSubItemId) return `catalog:${catalogSubItemId}`;
  return `package:${Number(item.package_sub_item_id) || 0}`;
}

function normalizeSnapshotSubItem(item) {
  const quantity = toNumber(item.quantity);
  const unitPrice = toNumber(item.unit_price);
  return {
    package_sub_item_id: item.package_sub_item_id
      ? Number(item.package_sub_item_id)
      : null,
    catalog_sub_item_id: item.catalog_sub_item_id
      ? Number(item.catalog_sub_item_id)
      : null,
    name: item.name || "Package model",
    quantity,
    unit_price: unitPrice,
    total_amount:
      item.total_amount === undefined
        ? quantity * unitPrice
        : toNumber(item.total_amount),
  };
}

function normalizeCurrentSubItem(item) {
  const quantity = toNumber(item.quantity);
  const unitPrice = toNumber(item.unit_price);
  return {
    package_sub_item_id: item.package_sub_item_id
      ? Number(item.package_sub_item_id)
      : null,
    catalog_sub_item_id: item.catalog_sub_item_id
      ? Number(item.catalog_sub_item_id)
      : null,
    name: item.package_sub_item_name || item.name || "Package model",
    quantity,
    unit_price: unitPrice,
    total_amount:
      item.total_amount === undefined
        ? quantity * unitPrice
        : toNumber(item.total_amount),
  };
}

function getSubItemChangeStatus(beforeItem, afterItem) {
  if (beforeItem && !afterItem) return "REMOVED";
  if (!beforeItem && afterItem) return "NEW";
  if (!beforeItem && !afterItem) return "UNCHANGED";

  const quantityChanged =
    getChangeDirection(beforeItem.quantity, afterItem.quantity) !== "SAME";
  const priceChanged =
    getChangeDirection(beforeItem.unit_price, afterItem.unit_price) !== "SAME";
  const totalChanged =
    getChangeDirection(beforeItem.total_amount, afterItem.total_amount) !==
    "SAME";

  return quantityChanged || priceChanged || totalChanged
    ? "CHANGED"
    : "UNCHANGED";
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

export async function getCfoPackageDistributionService({
  packageId,
  packageItemId = null,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  const packageRow = await findCfoPackageByIdRepo({ packageId });
  assertPackageExists(packageRow);

  if (packageItemId) {
    const packageItem = await findPackageItemForCfoRepo({
      packageId,
      packageItemId,
    });
    assertPackageItemExists(packageItem);
  }

  const rows = await listPackageDistributionRowsRepo({
    packageId,
    packageItemId,
  });

  return buildPackageDistributionAnalysis({
    rows,
    scope: {
      type: packageItemId ? "PACKAGE_ITEM" : "CATEGORY_PACKAGE",
      packageId,
      packageItemId,
      financialYearId: packageRow.financial_year_id,
      financialYear: packageRow.financial_year,
      categoryId: packageRow.budget_category_id,
      categoryName: packageRow.category_name,
      categoryCode: packageRow.category_code,
      label: packageItemId
        ? rows[0]?.catalog_item_name || "Package item distribution"
        : `${packageRow.category_name} package distribution`,
    },
  });
}

export async function getCfoFinancialYearDistributionService({
  financialYearId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  const rows = await listPackageDistributionRowsRepo({ financialYearId });

  return buildPackageDistributionAnalysis({
    rows,
    scope: {
      type: "FINANCIAL_YEAR",
      financialYearId,
      financialYear: rows[0]?.financial_year || null,
      label: rows[0]?.financial_year
        ? `FY ${rows[0].financial_year} distribution`
        : "Financial year distribution",
    },
  });
}

export async function getCfoPackageTimelineService({ packageId, budgetAccess }) {
  assertPermission(
    budgetAccess,
    CFO_PACKAGE_REVIEW_PERMISSIONS.VIEW,
    "CFO_PACKAGE_VIEW_DENIED",
    "You do not have permission to view CFO package reviews",
  );

  const packageRow = await findCfoPackageByIdRepo({ packageId });
  assertPackageExists(packageRow);

  const rows = await listCfoPackageTimelineRepo({ packageId });
  return rows.map((row) => {
    const context =
      row.entity_type === "CATEGORY_BUDGET_PACKAGE_ITEM" && row.package_item_name
        ? `Package item: ${row.package_item_name}`
        : row.context_name
          ? `Package: ${row.context_name}`
          : null;
    const note = row.note || null;

    return {
      id: row.id,
      financial_year_id: row.financial_year_id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      package_item_id: row.package_item_id,
      package_item_name: row.package_item_name,
      action: row.action,
      old_status: row.old_status,
      new_status: row.new_status,
      note,
      description: [context, note].filter(Boolean).join("\n\n"),
      old_values_json: row.old_values_json,
      new_values_json: row.new_values_json,
      created_by: row.created_by,
      user_name: row.user_name,
      user_code: row.user_code,
      created_at: row.created_at,
    };
  });
}

export async function getCfoPackageItemComparisonService({
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

  const comparisonData = await getCfoPackageItemComparisonRepo({
    packageId,
    packageItemId,
  });
  const context = comparisonData.context || packageItem;
  const snapshot = comparisonData.snapshot;

  if (!snapshot) {
    return {
      comparison_available: false,
      reason: "NO_RETURN_SNAPSHOT",
      summary: {
        package_id: Number(packageId),
        package_item_id: Number(packageItemId),
        package_item_name:
          context.package_item_name || packageItem.catalog_item_name,
        package_item_code:
          context.package_item_code || packageItem.catalog_item_code,
        financial_year_id:
          context.financial_year_id || packageItem.financial_year_id,
        financial_year: context.financial_year || null,
        category_name:
          context.package_category_name || packageItem.category_name,
        category_code:
          context.package_category_code || packageItem.category_code,
        package_status: context.package_status || packageItem.package_status,
        package_return_reason: context.package_return_reason || null,
        package_returned_at: context.package_returned_at || null,
        cfo_review_status:
          context.cfo_review_status || packageItem.cfo_review_status,
        cfo_review_note:
          context.cfo_review_note || packageItem.cfo_review_note,
        cfo_reviewed_at:
          context.cfo_reviewed_at || packageItem.cfo_reviewed_at || null,
        cfo_reviewed_by_name: context.cfo_reviewed_by_name || null,
        comparison_marker_at: null,
        snapshot_id: null,
      },
      item: null,
      sub_items: [],
    };
  }

  const snapshotData = parseSnapshotJson(snapshot.snapshot_json);
  const beforeSubItems = snapshotData.subItems.map(normalizeSnapshotSubItem);
  const afterSubItems = comparisonData.currentSubItems.map(
    normalizeCurrentSubItem,
  );
  const beforeByKey = new Map(
    beforeSubItems.map((item) => [getSubItemComparisonKey(item), item]),
  );
  const afterByKey = new Map(
    afterSubItems.map((item) => [getSubItemComparisonKey(item), item]),
  );
  const comparisonKeys = new Set([
    ...beforeByKey.keys(),
    ...afterByKey.keys(),
  ]);

  const subItems = Array.from(comparisonKeys)
    .map((key) => {
      const beforeItem = beforeByKey.get(key) || null;
      const afterItem = afterByKey.get(key) || null;
      const displayItem = afterItem || beforeItem;
      const quantityBefore = toNumber(beforeItem?.quantity);
      const quantityAfter = toNumber(afterItem?.quantity);
      const unitPriceBefore = toNumber(beforeItem?.unit_price);
      const unitPriceAfter = toNumber(afterItem?.unit_price);
      const totalBefore = toNumber(beforeItem?.total_amount);
      const totalAfter = toNumber(afterItem?.total_amount);

      return {
        package_sub_item_id: displayItem.package_sub_item_id,
        catalog_sub_item_id: displayItem.catalog_sub_item_id,
        name: displayItem.name,
        change_status: getSubItemChangeStatus(beforeItem, afterItem),
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        quantity_change: quantityAfter - quantityBefore,
        quantity_direction: getChangeDirection(quantityBefore, quantityAfter),
        unit_price_before: unitPriceBefore,
        unit_price_after: unitPriceAfter,
        unit_price_change: unitPriceAfter - unitPriceBefore,
        unit_price_direction: getChangeDirection(
          unitPriceBefore,
          unitPriceAfter,
        ),
        total_before: totalBefore,
        total_after: totalAfter,
        total_change: totalAfter - totalBefore,
        total_direction: getChangeDirection(totalBefore, totalAfter),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const approvedAfter = toNumber(context.approved_quantity);
  const approvedBefore = toNumber(snapshot.approved_quantity);
  const totalAfter = toNumber(context.estimated_total);
  const totalBefore = toNumber(snapshot.item_total_amount);

  return {
    comparison_available: true,
    reason: null,
    summary: {
      package_id: Number(packageId),
      package_item_id: Number(packageItemId),
      package_item_name:
        context.package_item_name || packageItem.catalog_item_name,
      package_item_code:
        context.package_item_code || packageItem.catalog_item_code,
      financial_year_id:
        context.financial_year_id || packageItem.financial_year_id,
      financial_year: context.financial_year || null,
      category_name: context.package_category_name || packageItem.category_name,
      category_code: context.package_category_code || packageItem.category_code,
      package_status: context.package_status || packageItem.package_status,
      package_return_reason: context.package_return_reason || null,
      package_returned_at: context.package_returned_at || null,
      cfo_review_status:
        context.cfo_review_status || packageItem.cfo_review_status,
      cfo_review_note: context.cfo_review_note || packageItem.cfo_review_note,
      cfo_reviewed_at:
        context.cfo_reviewed_at || packageItem.cfo_reviewed_at || null,
      cfo_reviewed_by_name: context.cfo_reviewed_by_name || null,
      comparison_marker_at: snapshot.created_at || null,
      snapshot_id: Number(snapshot.id),
    },
    item: {
      approved_quantity_before: approvedBefore,
      approved_quantity_after: approvedAfter,
      approved_quantity_change: approvedAfter - approvedBefore,
      approved_quantity_direction: getChangeDirection(
        approvedBefore,
        approvedAfter,
      ),
      total_amount_before: totalBefore,
      total_amount_after: totalAfter,
      total_amount_change: totalAfter - totalBefore,
      total_amount_direction: getChangeDirection(totalBefore, totalAfter),
    },
    sub_items: subItems,
  };
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

    const snapshotCount = await createCfoPackageItemReturnSnapshotsRepo(
      transaction,
      {
        package_id: packageId,
        reason: payload.reason,
        actor_user_id: actorUserId,
      },
    );

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
      needsModificationCount: counts.needs_modification_count,
      snapshotCount,
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
      needsModificationCount: returned.needsModificationCount,
      returnedBy: actorUserId,
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
      acceptedItemCount: counts.accepted_count,
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
      acceptedItemCount: completed.acceptedItemCount,
      completedBy: actorUserId,
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

  const finalizedSummary = await withTransaction(async (transaction) => {
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

    return summary;
  });

  await queueNotification({
    notificationType: NOTIFICATION_TYPES.CFO_ANNUAL_PACKAGE_REVIEW_FINALIZED,
    entityType: "FINANCIAL_YEAR",
    entityId: financialYearId,
    payload: {
      financialYearId,
      financialYear: finalizedSummary.financial_year,
      totalPackageCount: finalizedSummary.package_count,
      completedPackageCount:
        finalizedSummary.package_count - finalizedSummary.incomplete_count,
      finalizedBy: actorUserId,
      actorUserId,
    },
  });

  const rows = await listCfoPackagesRepo({ financialYearId });
  return rows.map(mapCfoPackageQueueRow);
}
