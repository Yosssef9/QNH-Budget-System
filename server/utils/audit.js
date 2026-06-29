import { createAuditLogService } from "../services/audit.service.js";

function getActingAsLabel(activeWorkspace) {
  if (!activeWorkspace) return null;

  if (activeWorkspace.actingAs) return activeWorkspace.actingAs;

  if (activeWorkspace.type === "DEPARTMENT") {
    return `Department User - ${activeWorkspace.departmentName || "Department"}`;
  }

  if (activeWorkspace.type === "CATEGORY_BUDGET_MANAGEMENT") {
    return `${activeWorkspace.category || "Category"} Category Budget Manager`;
  }

  if (activeWorkspace.type === "CFO_REVIEW") {
    return "CFO Review";
  }

  if (activeWorkspace.type === "PO_LINK_APPROVAL") {
    return "PO Link Approver";
  }

  return activeWorkspace.title || activeWorkspace.label || activeWorkspace.type || null;
}

export function getRequestAuditMeta(req) {
  const activeWorkspace = req.budgetAccess?.activeWorkspace || null;

  return {
    userId: req.user?.userId ?? null,
    userCode: req.user?.userCode ?? null,
    userName: req.user?.userName ?? null,
    departmentId: req.budgetAccess?.department?.id ?? null,
    roleName: req.budgetAccess?.role?.name ?? null,
    workspaceId: activeWorkspace?.id ?? null,
    workspaceType: activeWorkspace?.type ?? null,
    workspaceLabel: activeWorkspace?.title ?? activeWorkspace?.label ?? null,
    actingAs: getActingAsLabel(activeWorkspace),
    workspaceCategory: activeWorkspace?.category ?? null,
    workspaceDepartmentId:
      activeWorkspace?.departmentId ?? activeWorkspace?.department?.id ?? null,
    ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
    userAgent: req.headers["user-agent"] || null,
  };
}

export async function auditLog(req, payload) {
  await createAuditLogService({
    ...payload,
    ...getRequestAuditMeta(req),
  });
}
