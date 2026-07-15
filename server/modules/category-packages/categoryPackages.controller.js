import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { auditLog } from "../../utils/audit.js";
import {
  createPackageSubItemService,
  deletePackageSubItemAttachmentService,
  downloadPackageSubItemAttachmentService,
  getCategoryPackageItemDetailService,
  getCategoryPackageReadinessService,
  getCurrentCategoryPackageService,
  listPackageSubItemAttachmentsService,
  removePackageSubItemService,
  replaceDepartmentItemAllocationsService,
  submitCategoryPackageToCfoService,
  updateDepartmentItemApprovedQuantityService,
  uploadPackageSubItemAttachmentService,
  updatePackageSubItemService,
  getCategoryPackageDepartmentsService,
} from "./categoryPackages.service.js";
import {
  validateAttachmentId,
  validateAllocationPayload,
  validateCreatePackageSubItemPayload,
  validateDeleteAttachmentPayload,
  validateDepartmentItemId,
  validateDepartmentApprovedQuantityPayload,
  validatePackageId,
  validatePackageItemId,
  validatePackageSubItemId,
  validateRowVersion,
  validateSubmitPackagePayload,
  validateUploadAttachmentPayload,
  validateUpdatePackageSubItemPayload,
} from "./categoryPackages.validators.js";
function buildContentDisposition(fileName) {
  const safeName = String(
    fileName || "attachment",
  ).replace(/[\r\n"]/g, "_");

  const encodedName =
    encodeURIComponent(safeName)
      .replace(/['()*]/g, (character) =>
        `%${character
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()}`,
      );

  const fallbackName = safeName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_");

  return (
    `attachment; ` +
    `filename="${fallbackName}"; ` +
    `filename*=UTF-8''${encodedName}`
  );
}
export const getCurrentCategoryPackage = asyncHandler(async (req, res) => {
  const data = await getCurrentCategoryPackageService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Category package fetched successfully",
      data,
    }),
  );
});
export const getCategoryPackageDepartments = asyncHandler(async (req, res) => {
  const data = await getCategoryPackageDepartmentsService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Category package departments fetched successfully",
      data,
    }),
  );
});
export const getCategoryPackageItemDetail = asyncHandler(async (req, res) => {
  const packageItemId = validatePackageItemId(req.params.packageItemId);

  const data = await getCategoryPackageItemDetailService({
    packageItemId,
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Category package item fetched successfully",
      data,
    }),
  );
});

export const createPackageSubItem = asyncHandler(async (req, res) => {
  const packageItemId = validatePackageItemId(req.params.packageItemId);
  const payload = validateCreatePackageSubItemPayload(req.body);

  const data = await createPackageSubItemService({
    packageItemId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "CREATE_CATEGORY_PACKAGE_SUB_ITEM",
    entityType: "CATEGORY_PACKAGE_ITEM",
    entityId: String(packageItemId),
    entityName: "Category Package Item",
    description: "Created category package sub-item",
    newValues: payload,
  });

  res.status(201).json(
    new ApiResponse({
      message: "Package sub-item created successfully",
      data,
    }),
  );
});

export const updatePackageSubItem = asyncHandler(async (req, res) => {
  const packageSubItemId = validatePackageSubItemId(
    req.params.packageSubItemId,
  );
  const payload = validateUpdatePackageSubItemPayload(req.body);

  const data = await updatePackageSubItemService({
    packageSubItemId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "UPDATE_CATEGORY_PACKAGE_SUB_ITEM",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM",
    entityId: String(packageSubItemId),
    entityName: "Category Package Sub-Item",
    description: "Updated category package sub-item shared details",
    newValues: payload,
  });

  res.json(
    new ApiResponse({
      message: "Package sub-item updated successfully",
      data,
    }),
  );
});

export const listPackageSubItemAttachments = asyncHandler(async (req, res) => {
  const packageSubItemId = validatePackageSubItemId(
    req.params.packageSubItemId,
  );

  const data = await listPackageSubItemAttachmentsService({
    packageSubItemId,
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Package sub-item attachments fetched successfully",
      data,
    }),
  );
});

export const uploadPackageSubItemAttachment = asyncHandler(async (req, res) => {
  const packageSubItemId = validatePackageSubItemId(
    req.params.packageSubItemId,
  );
  const payload = validateUploadAttachmentPayload(req.body);

  const data = await uploadPackageSubItemAttachmentService({
    packageSubItemId,
    file: req.file,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "UPLOAD_CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM",
    entityId: String(packageSubItemId),
    entityName: "Category Package Sub-Item",
    description: "Uploaded package sub-item attachment",
    newValues: {
      attachmentId: data.id,
      originalFileName: data.original_file_name,
      fileSizeBytes: data.file_size_bytes,
      mimeType: data.mime_type,
    },
  });

  res.status(201).json(
    new ApiResponse({
      message: "Attachment uploaded successfully",
      data,
    }),
  );
});

export const downloadPackageSubItemAttachment = asyncHandler(
  async (req, res, next) => {
    const packageSubItemId = validatePackageSubItemId(
      req.params.packageSubItemId,
    );
    const attachmentId = validateAttachmentId(req.params.attachmentId);

    const download = await downloadPackageSubItemAttachmentService({
      packageSubItemId,
      attachmentId,
      budgetAccess: req.budgetAccess,
    });

    await auditLog(req, {
      action: "DOWNLOAD_CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
      entityType: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
      entityId: String(attachmentId),
      entityName: "Category Package Sub-Item Attachment",
      description: "Downloaded package sub-item attachment",
      newValues: {
        packageSubItemId,
        fileName: download.fileName,
      },
    });

    res.setHeader("Content-Type", download.mimeType);
    res.setHeader("Content-Length", String(download.fileSizeBytes));
   res.setHeader(
  "Content-Disposition",
  buildContentDisposition(
    download.fileName,
  ),
);
    download.stream.on("error", next);
    download.stream.pipe(res);
  },
);

export const deletePackageSubItemAttachment = asyncHandler(async (req, res) => {
  const packageSubItemId = validatePackageSubItemId(
    req.params.packageSubItemId,
  );
  const attachmentId = validateAttachmentId(req.params.attachmentId);
  const payload = validateDeleteAttachmentPayload(req.body);

  const data = await deletePackageSubItemAttachmentService({
    packageSubItemId,
    attachmentId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "REMOVE_CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM_ATTACHMENT",
    entityId: String(attachmentId),
    entityName: "Category Package Sub-Item Attachment",
    description: "Removed package sub-item attachment",
    newValues: {
      packageSubItemId,
      reason: payload.reason,
    },
  });

  res.json(
    new ApiResponse({
      message: "Attachment removed successfully",
      data,
    }),
  );
});

export const removePackageSubItem = asyncHandler(async (req, res) => {
  const packageSubItemId = validatePackageSubItemId(
    req.params.packageSubItemId,
  );
  const payload = {
    row_version: validateRowVersion(
      req.body?.row_version ?? req.body?.rowVersion,
    ),
    confirm_allocations: Boolean(
      req.body?.confirm_allocations ?? req.body?.confirmAllocations,
    ),
  };

  const data = await removePackageSubItemService({
    packageSubItemId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "REMOVE_CATEGORY_PACKAGE_SUB_ITEM",
    entityType: "CATEGORY_PACKAGE_SUB_ITEM",
    entityId: String(packageSubItemId),
    entityName: "Category Package Sub-Item",
    description: "Removed category package sub-item",
    newValues: payload,
  });

  res.json(
    new ApiResponse({
      message: "Package sub-item removed successfully",
      data,
    }),
  );
});

export const replaceDepartmentItemAllocations = asyncHandler(
  async (req, res) => {
    const departmentItemId = validateDepartmentItemId(
      req.params.departmentItemId,
    );
    const payload = validateAllocationPayload(req.body);

    const data = await replaceDepartmentItemAllocationsService({
      departmentItemId,
      payload,
      actorUserId: req.user.userId,
      budgetAccess: req.budgetAccess,
    });

    await auditLog(req, {
      action: "REPLACE_CATEGORY_PACKAGE_ALLOCATIONS",
      entityType: "DEPARTMENT_CATEGORY_BUDGET_ITEM",
      entityId: String(departmentItemId),
      entityName: "Department Category Budget Item",
      description: "Updated package sub-item allocations for department item",
      newValues: payload,
    });

    res.json(
      new ApiResponse({
        message: "Department item allocations saved successfully",
        data,
      }),
    );
  },
);

export const updateDepartmentItemApprovedQuantity = asyncHandler(
  async (req, res) => {
    const departmentItemId = validateDepartmentItemId(
      req.params.departmentItemId,
    );
    const payload = validateDepartmentApprovedQuantityPayload(req.body);

    const data = await updateDepartmentItemApprovedQuantityService({
      departmentItemId,
      payload,
      actorUserId: req.user.userId,
      budgetAccess: req.budgetAccess,
    });

    await auditLog(req, {
      action: "UPDATE_CATEGORY_PACKAGE_DEPARTMENT_APPROVED_QUANTITY",
      entityType: "DEPARTMENT_CATEGORY_BUDGET_ITEM",
      entityId: String(departmentItemId),
      entityName: "Department Category Budget Item",
      description:
        "Updated department approved quantity for a CFO-returned package item",
      newValues: payload,
    });

    res.json(
      new ApiResponse({
        message: "Department approved quantity updated successfully",
        data,
      }),
    );
  },
);

export const getCategoryPackageReadiness = asyncHandler(async (req, res) => {
  const data = await getCategoryPackageReadinessService({
    budgetAccess: req.budgetAccess,
  });

  res.json(
    new ApiResponse({
      message: "Category package readiness fetched successfully",
      data,
    }),
  );
});

export const submitCategoryPackageToCfo = asyncHandler(async (req, res) => {
  const packageId = validatePackageId(req.params.packageId);
  const payload = validateSubmitPackagePayload(req.body);

  const data = await submitCategoryPackageToCfoService({
    packageId,
    payload,
    actorUserId: req.user.userId,
    budgetAccess: req.budgetAccess,
  });

  await auditLog(req, {
    action: "SUBMIT_CATEGORY_PACKAGE_TO_CFO",
    entityType: "CATEGORY_BUDGET_PACKAGE",
    entityId: String(packageId),
    entityName: "Category Budget Package",
    description: "Submitted category package to CFO",
    newValues: payload,
  });

  res.json(
    new ApiResponse({
      message: "Category package submitted to CFO successfully",
      data,
    }),
  );
});
