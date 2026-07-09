import { withTransaction } from "../../database/transaction.js";
import { ApiError } from "../../utils/apiError.js";
import { NOTIFICATION_TYPES } from "../../constants/notificationTypes.js";
import { queueNotification } from "../../services/notification.service.js";
import {
  createPackageAttachmentReadStream,
  removePackageAttachmentFile,
  savePackageAttachmentFile,
} from "../../shared/files/packageAttachmentStorage.js";
import { hasPermission } from "../../../shared/permissions/permissionCodes.js";
import {
  CATEGORY_PACKAGE_ATTACHMENT_ALLOWED_EXTENSIONS,
  CATEGORY_PACKAGE_ATTACHMENT_ALLOWED_MIME_TYPES,
  CATEGORY_PACKAGE_ATTACHMENT_MAX_BYTES,
  CATEGORY_PACKAGE_ITEM_CFO_STATUS,
  CATEGORY_PACKAGE_PERMISSIONS,
  CATEGORY_PACKAGE_ROLE_CODES,
  CATEGORY_PACKAGE_STATUS,
  CATEGORY_PACKAGE_WORKFLOW_ACTIONS,
  CATEGORY_SUBMISSION_WINDOW_STATUS,
  DEPARTMENT_REVIEW_STATUS,
  RECONCILIATION_STATUS,
} from "./categoryPackages.constants.js";
import {
  countAllocationsForSubItemRepo,
  createPackageSubItemAttachmentRepo,
  createPackageSubItemRepo,
  createWorkflowHistoryRepo,
  deactivatePackageSubItemAttachmentRepo,
  deactivatePackageSubItemRepo,
  deleteAllocationsForDepartmentItemRepo,
  deleteAllocationsForSubItemRepo,
  findCatalogSubItemForPackageRepo,
  findCurrentPackageForCategoryRepo,
  findDepartmentItemAllocationContextRepo,
  findDepartmentItemPackageEditContextRepo,
  findPackageAttachmentContextRepo,
  findPackageContextByItemRepo,
  findPackageContextBySubItemRepo,
  listAllocationsForPackageItemRepo,
  listDepartmentPackageViewRowsRepo,
  listPackageItemDetailRowsRepo,
  listPackageItemsRepo,
  listPackageSubItemAttachmentsRepo,
  listPackageSubItemsForDepartmentItemRepo,
  markPackageSubmittedToCfoRepo,
  recalculatePackageSubItemQuantitiesRepo,
 
  updateDepartmentApprovedQuantityForPackageRepo,
  updatePackageItemReconciliationRepo,
  updatePackageSubItemRepo,
  upsertAllocationRepo,
} from "./categoryPackages.repository.js";
import {
  mapDepartmentPackageView,
  mapPackage,
  mapPackageItem,
  mapPackageItemDetail,
  mapPackageSubItemAttachment,
} from "./categoryPackages.mapper.js";
import path from "path";

function getUserRoleId(budgetAccess) {
  return budgetAccess?.userRoleId ?? budgetAccess?.activeUserRoleId ?? null;
}

function getActingWorkspace(budgetAccess) {
  return budgetAccess?.workspaceType ?? budgetAccess?.type ?? null;
}

function getWorkspaceCategoryId(budgetAccess) {
  return (
    budgetAccess?.category?.id ??
    budgetAccess?.budgetCategory?.id ??
    budgetAccess?.budget_category_id ??
    null
  );
}

function assertCategoryWorkspace(budgetAccess) {
  const workspaceType = budgetAccess?.workspaceType ?? budgetAccess?.type;
  const roleCode = budgetAccess?.role?.code ?? budgetAccess?.role_code;
  const categoryId = getWorkspaceCategoryId(budgetAccess);

  if (workspaceType !== "CATEGORY") {
    throw new ApiError(
      403,
      "Select a category workspace to prepare the category package",
      "CATEGORY_WORKSPACE_REQUIRED",
    );
  }

  if (!CATEGORY_PACKAGE_ROLE_CODES.includes(roleCode) || !categoryId) {
    throw new ApiError(
      403,
      "The active workspace is not assigned to a budget category",
      "CATEGORY_SCOPE_REQUIRED",
    );
  }

  return Number(categoryId);
}

function assertPermission(budgetAccess, permission, errorCode, message) {
  if (!hasPermission(budgetAccess, permission)) {
    throw new ApiError(403, message, errorCode);
  }
}

function assertCategoryScope(record, budgetCategoryId) {
  if (!record) {
    throw new ApiError(
      404,
      "Category package record not found",
      "CATEGORY_PACKAGE_NOT_FOUND",
    );
  }

  if (Number(record.budget_category_id) !== Number(budgetCategoryId)) {
    throw new ApiError(
      403,
      "You cannot access another category package",
      "CATEGORY_PACKAGE_SCOPE_DENIED",
    );
  }
}

function assertPackageEditable(context) {
  if (context.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Category packages can only be edited while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (
    ![
      CATEGORY_PACKAGE_STATUS.DRAFT,
      CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO,
    ].includes(context.package_status)
  ) {
    throw new ApiError(
      400,
      "This category package is not editable in its current status",
      "CATEGORY_PACKAGE_NOT_EDITABLE",
    );
  }
}
function assertPackageItemEditable(context) {
  assertPackageEditable(context);

  if (
    context.package_status === CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO &&
    context.cfo_review_status !==
      CATEGORY_PACKAGE_ITEM_CFO_STATUS.NEEDS_MODIFICATION
  ) {
    throw new ApiError(
      400,
      "Only package items marked as needing modification by CFO can be edited after a CFO return",
      "CFO_RETURNED_PACKAGE_ITEM_LOCKED",
    );
  }
}

function assertReturnedPackageItemDecisionEditable(context) {
  if (context.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Category package corrections can only be made while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (context.package_status !== CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO) {
    throw new ApiError(
      400,
      "Department approved quantities can only be adjusted after CFO returns the package",
      "CATEGORY_PACKAGE_NOT_RETURNED_BY_CFO",
    );
  }

  if (
    context.cfo_review_status !==
    CATEGORY_PACKAGE_ITEM_CFO_STATUS.NEEDS_MODIFICATION
  ) {
    throw new ApiError(
      400,
      "Only package items marked as needing modification by CFO can have approved quantities adjusted",
      "CFO_RETURNED_PACKAGE_ITEM_LOCKED",
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
    throw new ApiError(
      400,
      "Attachment file is too large",
      "ATTACHMENT_FILE_TOO_LARGE",
    );
  }

  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!CATEGORY_PACKAGE_ATTACHMENT_ALLOWED_EXTENSIONS.includes(extension)) {
    throw new ApiError(
      400,
      "Attachment file type is not allowed",
      "ATTACHMENT_FILE_TYPE_BLOCKED",
    );
  }

  if (
    file.mimetype &&
    !CATEGORY_PACKAGE_ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.mimetype)
  ) {
    throw new ApiError(
      400,
      "Attachment MIME type is not allowed",
      "ATTACHMENT_MIME_TYPE_BLOCKED",
    );
  }
}

function safeDownloadName(fileName) {
  return String(fileName || "attachment").replace(/[\r\n"]/g, "_");
}

function assertPackageSubmissionAllowed(context) {
  if (context.financial_year_status !== "OPEN") {
    throw new ApiError(
      400,
      "Category packages can only be submitted while the financial year is OPEN",
      "FINANCIAL_YEAR_NOT_OPEN",
    );
  }

  if (
    ![
      CATEGORY_PACKAGE_STATUS.DRAFT,
      CATEGORY_PACKAGE_STATUS.RETURNED_BY_CFO,
    ].includes(context.status)
  ) {
    throw new ApiError(
      400,
      "This package cannot be submitted to CFO in its current status",
      "CATEGORY_PACKAGE_NOT_SUBMITTABLE",
    );
  }
}

function roundQuantity(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function hasQuantityMismatch(left, right) {
  return roundQuantity(left) !== roundQuantity(right);
}

function getAllocationTotal(allocations, packageSubItemId = null) {
  return allocations
    .filter(
      (allocation) =>
        packageSubItemId === null ||
        Number(allocation.category_budget_package_sub_item_id) ===
          Number(packageSubItemId),
    )
    .reduce(
      (sum, allocation) => sum + Number(allocation.allocated_quantity || 0),
      0,
    );
}

function buildReadiness(packageData, itemDetailsById = new Map()) {
  const blockers = [];

  if (!packageData) {
    return {
      ready: false,
      blockers: [
        { code: "PACKAGE_NOT_FOUND", message: "Package was not found" },
      ],
    };
  }

  if (packageData.financial_year_status !== "OPEN") {
    blockers.push({
      code: "FINANCIAL_YEAR_NOT_OPEN",
      message: "The financial year is not OPEN",
    });
  }

  if (
    packageData.submission_window?.status !==
    CATEGORY_SUBMISSION_WINDOW_STATUS.CLOSED
  ) {
    blockers.push({
      code: "SUBMISSION_WINDOW_OPEN",
      message: "The category submission window must be closed",
    });
  }

  for (const item of packageData.items || []) {
    const itemDetail = itemDetailsById.get(Number(item.id));

    if (
      Number(item.approved_quantity || 0) > 0 &&
      item.department_count === 0
    ) {
      blockers.push({
        code: "NO_REVIEWED_DEMAND",
        packageItemId: item.id,
        message: `${item.catalog_item_name} has no reviewed department demand`,
      });
    }

    if (
      Number(item.approved_quantity || 0) > 0 &&
      itemDetail &&
      itemDetail.subItems.length === 0
    ) {
      blockers.push({
        code: "PACKAGE_ITEM_HAS_NO_MODELS",
        packageItemId: item.id,
        message: `${item.catalog_item_name} has no package models`,
      });
    }

    if (item.reconciliation_status !== RECONCILIATION_STATUS.RECONCILED) {
      blockers.push({
        code: "ITEM_NOT_RECONCILED",
        packageItemId: item.id,
        message: `${item.catalog_item_name} is ${item.reconciliation_status}`,
      });
    }

    if (itemDetail) {
      for (const department of itemDetail.departments) {
        const departmentAllocations = itemDetail.allocations.filter(
          (allocation) =>
            Number(allocation.department_category_budget_item_id) ===
            Number(department.department_item_id),
        );
        const allocated = getAllocationTotal(departmentAllocations);
        const approved = Number(department.category_approved_quantity || 0);

        if (hasQuantityMismatch(approved, allocated)) {
          const difference = roundQuantity(approved - allocated);
          blockers.push({
            code:
              difference > 0
                ? "DEPARTMENT_ALLOCATION_SHORT"
                : "DEPARTMENT_ALLOCATION_EXCESS",
            packageItemId: item.id,
            departmentItemId: department.department_item_id,
            message:
              difference > 0
                ? `${department.department_name} has ${difference} unallocated ${item.catalog_item_name} units`
                : `${department.department_name} is overallocated by ${Math.abs(difference)} ${item.catalog_item_name} units`,
          });
        }
      }

      for (const subItem of itemDetail.subItems) {
        if (subItem.unit_price === null || Number(subItem.unit_price) <= 0) {
          blockers.push({
            code: "PACKAGE_SUB_ITEM_PRICE_REQUIRED",
            packageItemId: item.id,
            packageSubItemId: subItem.id,
            message: `${subItem.name} must have a valid shared unit price`,
          });
        }

        const allocated = getAllocationTotal(
          itemDetail.allocations,
          subItem.id,
        );
        if (hasQuantityMismatch(subItem.quantity, allocated)) {
          blockers.push({
            code: "PACKAGE_SUB_ITEM_QUANTITY_MISMATCH",
            packageItemId: item.id,
            packageSubItemId: subItem.id,
            message: `${subItem.name} quantity does not match its department allocations`,
          });
        }
      }
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

async function buildPackageReadiness(packageData, transaction = null) {
  const itemDetailsById = new Map();

  for (const item of packageData.items || []) {
    const detailRows = await listPackageItemDetailRowsRepo(
      { packageItemId: item.id },
      transaction,
    );
    const allocations = await listAllocationsForPackageItemRepo(
      { packageItemId: item.id },
      transaction,
    );

    itemDetailsById.set(Number(item.id), {
      subItems: detailRows.subItems,
      departments: detailRows.departments,
      allocations,
    });
  }

  return buildReadiness(packageData, itemDetailsById);
}

async function loadPackageForCategory(budgetCategoryId) {
  const packageRow = await findCurrentPackageForCategoryRepo({
    budgetCategoryId,
  });

  if (!packageRow) {
    throw new ApiError(
      404,
      "No active category package was found for this category",
      "CATEGORY_PACKAGE_NOT_FOUND",
    );
  }

  const packageItems = await listPackageItemsRepo({ packageId: packageRow.id });
  const mappedItems = packageItems.map((item) => mapPackageItem(item));
  const packageData = mapPackage(packageRow, mappedItems);
  packageData.readiness = await buildPackageReadiness(packageData);
  return packageData;
}

export async function getCurrentCategoryPackageService({ budgetAccess }) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.VIEW,
    "CATEGORY_PACKAGE_VIEW_DENIED",
    "You do not have permission to view category packages",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);
  return loadPackageForCategory(budgetCategoryId);
}
export async function getCategoryPackageDepartmentsService({ budgetAccess }) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.VIEW,
    "CATEGORY_PACKAGE_VIEW_DENIED",
    "You do not have permission to view category packages",
  );

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const packageRow = await findCurrentPackageForCategoryRepo({
    budgetCategoryId,
  });

  assertCategoryScope(packageRow, budgetCategoryId);

  const rows = await listDepartmentPackageViewRowsRepo({
    packageId: packageRow.id,
  });

  return mapDepartmentPackageView(rows);
}
export async function getCategoryPackageItemDetailService({
  packageItemId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.VIEW,
    "CATEGORY_PACKAGE_VIEW_DENIED",
    "You do not have permission to view category packages",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);
  const context = await findPackageContextByItemRepo({ packageItemId });
  assertCategoryScope(context, budgetCategoryId);

  const [detailRows, allocations] = await Promise.all([
    listPackageItemDetailRowsRepo({ packageItemId }),
    listAllocationsForPackageItemRepo({ packageItemId }),
  ]);
  const packageItems = await listPackageItemsRepo({
    packageId: context.package_id,
  });
  const packageItem = packageItems.find(
    (item) => Number(item.id) === Number(packageItemId),
  );

  return mapPackageItemDetail({
    packageItem,
    subItems: detailRows.subItems,
    departments: detailRows.departments,
    allocations,
  });
}

export async function createPackageSubItemService({
  packageItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.MANAGE_SUB_ITEMS,
    "CATEGORY_PACKAGE_SUB_ITEM_MANAGE_DENIED",
    "You do not have permission to manage category package sub-items",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const result = await withTransaction(async (transaction) => {
    const context = await findPackageContextByItemRepo(
      { packageItemId },
      transaction,
    );
    assertCategoryScope(context, budgetCategoryId);
  assertPackageItemEditable(context);

    const catalogSubItem = await findCatalogSubItemForPackageRepo(
      {
        packageItemId,
        catalogSubItemId: payload.catalog_sub_item_id,
      },
      transaction,
    );

    if (!catalogSubItem) {
      throw new ApiError(
        400,
        "The selected reusable sub-item does not belong to this catalog item",
        "CATALOG_SUB_ITEM_SCOPE_MISMATCH",
      );
    }

    const created = await createPackageSubItemRepo(transaction, {
      package_item_id: packageItemId,
      catalog_sub_item_id: catalogSubItem.id,
      name: catalogSubItem.name,
      specification:
        payload.specification ?? catalogSubItem.default_specification,
      unit_of_measure_id: catalogSubItem.default_unit_of_measure_id,
      unit_price: payload.unit_price,
      note: payload.note,
      actor_user_id: actorUserId,
    });

    await updatePackageItemReconciliationRepo(transaction, {
      packageItemId,
      actorUserId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: context.financial_year_id,
      entity_type: "CATEGORY_PACKAGE_SUB_ITEM",
      entity_id: created.id,
      action: CATEGORY_PACKAGE_WORKFLOW_ACTIONS.PACKAGE_SUB_ITEM_CREATED,
      new_values_json: JSON.stringify({
        packageItemId,
        catalogSubItemId: catalogSubItem.id,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return { packageItemId };
  });

  return getCategoryPackageItemDetailService({
    packageItemId: result.packageItemId,
    budgetAccess,
  });
}

export async function updatePackageSubItemService({
  packageSubItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.MANAGE_SUB_ITEMS,
    "CATEGORY_PACKAGE_SUB_ITEM_MANAGE_DENIED",
    "You do not have permission to manage category package sub-items",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const result = await withTransaction(async (transaction) => {
    const context = await findPackageContextBySubItemRepo(
      { packageSubItemId },
      transaction,
    );
    assertCategoryScope(context, budgetCategoryId);
  assertPackageItemEditable(context);

    const updated = await updatePackageSubItemRepo(transaction, {
      package_sub_item_id: packageSubItemId,
      unit_price: payload.unit_price,
      specification: payload.specification,
      note: payload.note,
      row_version: payload.row_version,
      actor_user_id: actorUserId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Package sub-item was changed by another user",
        "PACKAGE_SUB_ITEM_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: context.financial_year_id,
      entity_type: "CATEGORY_PACKAGE_SUB_ITEM",
      entity_id: packageSubItemId,
      action: CATEGORY_PACKAGE_WORKFLOW_ACTIONS.PACKAGE_SUB_ITEM_UPDATED,
      new_values_json: JSON.stringify(payload),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return { packageItemId: context.package_item_id };
  });

  return getCategoryPackageItemDetailService({
    packageItemId: result.packageItemId,
    budgetAccess,
  });
}

export async function listPackageSubItemAttachmentsService({
  packageSubItemId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.VIEW,
    "CATEGORY_PACKAGE_VIEW_DENIED",
    "You do not have permission to view category packages",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);
  const context = await findPackageContextBySubItemRepo({ packageSubItemId });
  assertCategoryScope(context, budgetCategoryId);

  const rows = await listPackageSubItemAttachmentsRepo({ packageSubItemId });
  return rows.map(mapPackageSubItemAttachment);
}

export async function uploadPackageSubItemAttachmentService({
  packageSubItemId,
  file,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.MANAGE_ATTACHMENTS,
    "CATEGORY_PACKAGE_ATTACHMENT_MANAGE_DENIED",
    "You do not have permission to manage category package attachments",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);
  assertAttachmentFile(file);

  const preflightContext = await findPackageContextBySubItemRepo({
    packageSubItemId,
  });
  assertCategoryScope(preflightContext, budgetCategoryId);
 assertPackageItemEditable(preflightContext);

  let storageKey = null;

  try {
    storageKey = await savePackageAttachmentFile({
      buffer: file.buffer,
      originalName: file.originalname,
    });

    const created = await withTransaction(async (transaction) => {
      const context = await findPackageContextBySubItemRepo(
        { packageSubItemId },
        transaction,
      );
      assertCategoryScope(context, budgetCategoryId);
   assertPackageItemEditable(context);

      const attachment = await createPackageSubItemAttachmentRepo(transaction, {
        package_sub_item_id: packageSubItemId,
        document_type: payload.document_type,
        original_file_name: file.originalname,
        storage_key: storageKey,
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        description: payload.description,
        actor_user_id: actorUserId,
      });

      await createWorkflowHistoryRepo(transaction, {
        financial_year_id: context.financial_year_id,
        entity_type: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
        entity_id: attachment.id,
        action:
          CATEGORY_PACKAGE_WORKFLOW_ACTIONS
            .PACKAGE_SUB_ITEM_ATTACHMENT_UPLOADED,
        new_values_json: JSON.stringify({
          packageSubItemId,
          originalFileName: file.originalname,
          fileSizeBytes: file.size,
          mimeType: file.mimetype,
        }),
        user_role_id: getUserRoleId(budgetAccess),
        acting_workspace: getActingWorkspace(budgetAccess),
        created_by: actorUserId,
      });

      return attachment;
    });

    return mapPackageSubItemAttachment(created);
  } catch (error) {
    if (storageKey) {
      await removePackageAttachmentFile(storageKey);
    }
    throw error;
  }
}

export async function downloadPackageSubItemAttachmentService({
  packageSubItemId,
  attachmentId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.VIEW,
    "CATEGORY_PACKAGE_VIEW_DENIED",
    "You do not have permission to view category packages",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const attachment = await findPackageAttachmentContextRepo({
    packageSubItemId,
    attachmentId,
  });

  if (!attachment) {
    throw new ApiError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  assertCategoryScope(attachment, budgetCategoryId);

  return {
    fileName: safeDownloadName(attachment.original_file_name),
    mimeType: attachment.mime_type || "application/octet-stream",
    fileSizeBytes: attachment.file_size_bytes,
    stream: createPackageAttachmentReadStream(attachment.storage_key),
  };
}

export async function deletePackageSubItemAttachmentService({
  packageSubItemId,
  attachmentId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.MANAGE_ATTACHMENTS,
    "CATEGORY_PACKAGE_ATTACHMENT_MANAGE_DENIED",
    "You do not have permission to manage category package attachments",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const result = await withTransaction(async (transaction) => {
    const attachment = await findPackageAttachmentContextRepo(
      { packageSubItemId, attachmentId },
      transaction,
    );

    if (!attachment) {
      throw new ApiError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
    }

    assertCategoryScope(attachment, budgetCategoryId);
   assertPackageItemEditable(attachment);

    const removed = await deactivatePackageSubItemAttachmentRepo(transaction, {
      package_sub_item_id: packageSubItemId,
      attachment_id: attachmentId,
      row_version: payload.row_version,
      reason: payload.reason || "Removed by Category Manager",
      actor_user_id: actorUserId,
    });

    if (!removed) {
      throw new ApiError(
        409,
        "Attachment was changed by another user",
        "ATTACHMENT_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: attachment.financial_year_id,
      entity_type: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
      entity_id: attachmentId,
      action:
        CATEGORY_PACKAGE_WORKFLOW_ACTIONS.PACKAGE_SUB_ITEM_ATTACHMENT_REMOVED,
      old_values_json: JSON.stringify({
        packageSubItemId,
        originalFileName: attachment.original_file_name,
      }),
      note: payload.reason || "Removed by Category Manager",
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return attachment;
  });

  return mapPackageSubItemAttachment(result);
}

export async function removePackageSubItemService({
  packageSubItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.MANAGE_SUB_ITEMS,
    "CATEGORY_PACKAGE_SUB_ITEM_MANAGE_DENIED",
    "You do not have permission to manage category package sub-items",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const result = await withTransaction(async (transaction) => {
    const context = await findPackageContextBySubItemRepo(
      { packageSubItemId },
      transaction,
    );
    assertCategoryScope(context, budgetCategoryId);
  assertPackageItemEditable(context);

    const allocationSummary = await countAllocationsForSubItemRepo(
      { packageSubItemId },
      transaction,
    );

    if (
      Number(allocationSummary.allocation_count || 0) > 0 &&
      !payload.confirm_allocations
    ) {
      throw new ApiError(
        400,
        "This package sub-item has department allocations. Confirm removal to continue.",
        "PACKAGE_SUB_ITEM_HAS_ALLOCATIONS",
        allocationSummary,
      );
    }

    await deleteAllocationsForSubItemRepo(transaction, {
      packageSubItemId,
    });

    const removed = await deactivatePackageSubItemRepo(transaction, {
      package_sub_item_id: packageSubItemId,
      row_version: payload.row_version,
      actor_user_id: actorUserId,
    });

    if (!removed) {
      throw new ApiError(
        409,
        "Package sub-item was changed by another user",
        "PACKAGE_SUB_ITEM_CONFLICT",
      );
    }

    await recalculatePackageSubItemQuantitiesRepo(transaction, {
      packageItemId: context.package_item_id,
      actorUserId,
    });
    await updatePackageItemReconciliationRepo(transaction, {
      packageItemId: context.package_item_id,
      actorUserId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: context.financial_year_id,
      entity_type: "CATEGORY_PACKAGE_SUB_ITEM",
      entity_id: packageSubItemId,
      action: CATEGORY_PACKAGE_WORKFLOW_ACTIONS.PACKAGE_SUB_ITEM_REMOVED,
      old_values_json: JSON.stringify({
        allocationCount: allocationSummary.allocation_count,
        allocatedQuantity: allocationSummary.allocated_quantity,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    return { packageItemId: context.package_item_id };
  });

  return getCategoryPackageItemDetailService({
    packageItemId: result.packageItemId,
    budgetAccess,
  });
}

export async function replaceDepartmentItemAllocationsService({
  departmentItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.MANAGE_SUB_ITEMS,
    "CATEGORY_PACKAGE_ALLOCATION_DENIED",
    "You do not have permission to allocate category package quantities",
  );

  const budgetCategoryId =
    assertCategoryWorkspace(budgetAccess);

  const result = await withTransaction(
    async (transaction) => {
      const departmentItem =
        await findDepartmentItemAllocationContextRepo(
          { departmentItemId },
          transaction,
        );

      if (!departmentItem) {
        throw new ApiError(
          404,
          "Department budget item not found",
          "DEPARTMENT_BUDGET_ITEM_NOT_FOUND",
        );
      }

      assertCategoryScope(
        departmentItem,
        budgetCategoryId,
      );

      if (
        departmentItem.review_status !==
        DEPARTMENT_REVIEW_STATUS
          .CATEGORY_REVIEW_COMPLETED
      ) {
        throw new ApiError(
          400,
          "Only reviewed department items can be allocated",
          "DEPARTMENT_ITEM_NOT_REVIEWED",
        );
      }

      const subItems =
        await listPackageSubItemsForDepartmentItemRepo(
          { departmentItemId },
          transaction,
        );

      const subItemById = new Map(
        subItems.map((subItem) => [
          Number(subItem.package_sub_item_id),
          subItem,
        ]),
      );

      const packageItemId =
        subItems[0]?.package_item_id;

      if (!packageItemId) {
        throw new ApiError(
          400,
          "At least one package sub-item is required before allocation",
          "PACKAGE_SUB_ITEM_REQUIRED",
        );
      }

      const packageContext =
        await findPackageContextByItemRepo(
          { packageItemId },
          transaction,
        );

      assertCategoryScope(
        packageContext,
        budgetCategoryId,
      );

   assertPackageItemEditable(packageContext);

      const allocationBySubItem = new Map();

      for (const allocation of payload.allocations) {
        const packageSubItemId = Number(
          allocation.package_sub_item_id,
        );

        const packageSubItem =
          subItemById.get(packageSubItemId);

        if (!packageSubItem) {
          throw new ApiError(
            400,
            "Allocation package sub-item does not belong to this department item catalog item",
            "ALLOCATION_SUB_ITEM_SCOPE_MISMATCH",
          );
        }

        const quantity = roundQuantity(
          allocation.allocated_quantity,
        );

        if (quantity <= 0) {
          continue;
        }

        const unitPrice = Number(
          packageSubItem.unit_price,
        );

        const hasValidUnitPrice =
          packageSubItem.unit_price !== null &&
          packageSubItem.unit_price !== undefined &&
          Number.isFinite(unitPrice) &&
          unitPrice > 0;

        if (!hasValidUnitPrice) {
          throw new ApiError(
            400,
            `${packageSubItem.package_sub_item_name || "The selected model"} requires a valid shared unit price before allocation`,
            "PACKAGE_SUB_ITEM_UNIT_PRICE_REQUIRED",
            {
              packageSubItemId,
              packageSubItemName:
                packageSubItem.package_sub_item_name ||
                null,
            },
          );
        }

        allocationBySubItem.set(
          packageSubItemId,
          roundQuantity(
            (allocationBySubItem.get(
              packageSubItemId,
            ) || 0) + quantity,
          ),
        );
      }

      const sanitizedAllocations =
        Array.from(
          allocationBySubItem,
          ([packageSubItemId, quantity]) => ({
            package_sub_item_id:
              packageSubItemId,

            allocated_quantity:
              quantity,
          }),
        );

      const totalAllocated =
        sanitizedAllocations.reduce(
          (sum, allocation) =>
            sum +
            allocation.allocated_quantity,
          0,
        );

      if (
        roundQuantity(totalAllocated) >
        roundQuantity(
          departmentItem
            .category_approved_quantity,
        )
      ) {
        throw new ApiError(
          400,
          "Department allocation cannot exceed the approved quantity",
          "DEPARTMENT_ITEM_OVERALLOCATED",
          {
            approvedQuantity:
              departmentItem
                .category_approved_quantity,

            allocatedQuantity:
              totalAllocated,
          },
        );
      }

      await deleteAllocationsForDepartmentItemRepo(
        transaction,
        {
          departmentItemId,
          packageItemId,
        },
      );

      for (
        const allocation of sanitizedAllocations
      ) {
        await upsertAllocationRepo(
          transaction,
          {
            department_item_id:
              departmentItemId,

            package_sub_item_id:
              allocation.package_sub_item_id,

            allocated_quantity:
              allocation.allocated_quantity,

            actor_user_id:
              actorUserId,
          },
        );
      }

      await recalculatePackageSubItemQuantitiesRepo(
        transaction,
        {
          packageItemId,
          actorUserId,
        },
      );

      await updatePackageItemReconciliationRepo(
        transaction,
        {
          packageItemId,
          actorUserId,
        },
      );

      await createWorkflowHistoryRepo(
        transaction,
        {
          financial_year_id:
            departmentItem.financial_year_id,

          entity_type:
            "DEPARTMENT_CATEGORY_BUDGET_ITEM",

          entity_id:
            departmentItemId,

          action:
            CATEGORY_PACKAGE_WORKFLOW_ACTIONS
              .DEPARTMENT_ALLOCATIONS_UPDATED,

          new_values_json:
            JSON.stringify({
              allocations:
                sanitizedAllocations,

              totalAllocated,
            }),

          user_role_id:
            getUserRoleId(budgetAccess),

          acting_workspace:
            getActingWorkspace(budgetAccess),

          created_by:
            actorUserId,
        },
      );

      return {
        packageItemId,
      };
    },
  );

  return getCategoryPackageItemDetailService({
    packageItemId: result.packageItemId,
    budgetAccess,
  });
}

export async function getCategoryPackageReadinessService({ budgetAccess }) {
  const packageData = await getCurrentCategoryPackageService({ budgetAccess });
  return packageData.readiness;
}

export async function submitCategoryPackageToCfoService({
  packageId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.SUBMIT_TO_CFO,
    "CATEGORY_PACKAGE_SUBMIT_DENIED",
    "You do not have permission to submit category packages to CFO",
  );
  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);

  const submitted = await withTransaction(async (transaction) => {
    const packageRow = await findCurrentPackageForCategoryRepo(
      { budgetCategoryId },
      transaction,
    );

    if (!packageRow || Number(packageRow.id) !== Number(packageId)) {
      throw new ApiError(
        404,
        "Category package not found",
        "CATEGORY_PACKAGE_NOT_FOUND",
      );
    }

    assertPackageSubmissionAllowed(packageRow);

    const packageItems = await listPackageItemsRepo({ packageId }, transaction);
    const packageData = mapPackage(
      packageRow,
      packageItems.map((item) => mapPackageItem(item)),
    );
    packageData.readiness = await buildPackageReadiness(
      packageData,
      transaction,
    );

    if (!packageData.readiness.ready) {
      throw new ApiError(
        400,
        "Category package is not ready for CFO submission",
        "CATEGORY_PACKAGE_NOT_READY",
        packageData.readiness,
      );
    }

    const updated = await markPackageSubmittedToCfoRepo(transaction, {
      package_id: packageId,
      row_version: payload.row_version,
      actor_user_id: actorUserId,
    });

    if (!updated) {
      throw new ApiError(
        409,
        "Category package was changed by another user",
        "CATEGORY_PACKAGE_CONFLICT",
      );
    }

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: packageRow.financial_year_id,
      entity_type: "CATEGORY_BUDGET_PACKAGE",
      entity_id: packageId,
      action: CATEGORY_PACKAGE_WORKFLOW_ACTIONS.PACKAGE_SUBMITTED_TO_CFO,
      old_status: packageRow.status,
      new_status: CATEGORY_PACKAGE_STATUS.IN_CFO_REVIEW,
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
      actorUserId,
    };
  });

 await queueNotification({
  notificationType: NOTIFICATION_TYPES.CATEGORY_BUDGET_PACKAGE_SUBMITTED,
  entityType: "CATEGORY_BUDGET_PACKAGE",
  entityId: submitted.packageId,
  payload: {
    packageId: submitted.packageId,
    categoryId: submitted.categoryId,
    categoryName: submitted.categoryName,
    financialYear: submitted.financialYear,
    submittedBy: actorUserId,
    actorUserId,
  },
});

  return getCurrentCategoryPackageService({ budgetAccess });
}
export async function updateDepartmentItemApprovedQuantityService({
  departmentItemId,
  payload,
  actorUserId,
  budgetAccess,
}) {
  assertPermission(
    budgetAccess,
    CATEGORY_PACKAGE_PERMISSIONS.MANAGE_PACKAGE,
    "CATEGORY_PACKAGE_MANAGE_DENIED",
    "You do not have permission to update category package approved quantities",
  );

  const budgetCategoryId = assertCategoryWorkspace(budgetAccess);
  let approvalUpdateNotification = null;

  const result = await withTransaction(async (transaction) => {
    const context = await findDepartmentItemPackageEditContextRepo(
      { departmentItemId },
      transaction,
    );

    if (!context) {
      throw new ApiError(
        404,
        "Department budget item not found",
        "DEPARTMENT_BUDGET_ITEM_NOT_FOUND",
      );
    }

    // Keep this security check before updating.
    assertCategoryScope(context, budgetCategoryId);

    // Keep the returned-CFO package and item checks.
    assertReturnedPackageItemDecisionEditable(context);

    if (
      context.review_status !==
      DEPARTMENT_REVIEW_STATUS.CATEGORY_REVIEW_COMPLETED
    ) {
      throw new ApiError(
        400,
        "Only completed department review items can be adjusted from a CFO return",
        "DEPARTMENT_ITEM_NOT_REVIEWED",
      );
    }

    const updated = await updateDepartmentApprovedQuantityForPackageRepo(
      transaction,
      {
        department_item_id: departmentItemId,
        category_approved_quantity: payload.category_approved_quantity,
        row_version: payload.row_version,
        actor_user_id: actorUserId,
      },
    );

    if (!updated) {
      throw new ApiError(
        409,
        "Department approved quantity was changed by another user",
        "DEPARTMENT_APPROVED_QUANTITY_CONFLICT",
      );
    }

    await updatePackageItemReconciliationRepo(transaction, {
      packageItemId: context.package_item_id,
      actorUserId,
    });

    await createWorkflowHistoryRepo(transaction, {
      financial_year_id: context.financial_year_id,
      entity_type: "DEPARTMENT_CATEGORY_BUDGET_ITEM",
      entity_id: departmentItemId,
      action:
        CATEGORY_PACKAGE_WORKFLOW_ACTIONS.DEPARTMENT_APPROVED_QUANTITY_UPDATED,
      note:
        context.cfo_review_note ||
        "Category Manager updated approved quantity after CFO return",
      old_values_json: JSON.stringify({
        categoryApprovedQuantity: updated.old_approved_quantity,
        cfoReviewStatus: context.cfo_review_status,
      }),
      new_values_json: JSON.stringify({
        categoryApprovedQuantity: updated.new_approved_quantity,
        packageItemId: context.package_item_id,
      }),
      user_role_id: getUserRoleId(budgetAccess),
      acting_workspace: getActingWorkspace(budgetAccess),
      created_by: actorUserId,
    });

    if (
      roundQuantity(updated.old_approved_quantity) !==
      roundQuantity(updated.new_approved_quantity)
    ) {
      approvalUpdateNotification = {
        notificationType:
          NOTIFICATION_TYPES.DEPARTMENT_BUDGET_APPROVAL_UPDATED,
        entityType: "DEPARTMENT_CATEGORY_BUDGET_ITEM",
        entityId: departmentItemId,
        payload: {
          departmentBudgetItemId: departmentItemId,
          departmentCategoryBudgetId:
            context.department_category_budget_id,
          departmentId: context.department_id,
          departmentName: context.department_name,
          categoryId: context.budget_category_id,
          categoryName: context.category_name,
          itemName: context.catalog_item_name,
          financialYear: context.financial_year,
          previousApprovedQuantity: updated.old_approved_quantity,
          newApprovedQuantity: updated.new_approved_quantity,
          reviewNote: context.cfo_review_note,
          actorUserId,
          reason: "CFO returned the package item for modification",
        },
      };
    }

    // Return only the result needed by this update endpoint.
    return {
      departmentItemId: Number(departmentItemId),
      departmentCategoryBudgetId: Number(
        context.department_category_budget_id,
      ),
      packageItemId: Number(context.package_item_id),
      oldApprovedQuantity: updated.old_approved_quantity,
      newApprovedQuantity: updated.new_approved_quantity,
    };
  });

  if (approvalUpdateNotification) {
    await queueNotification(approvalUpdateNotification);
  }

  // Do not load the complete package-workbench item again.
  return result;
}