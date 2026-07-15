import { createAuditLogService } from "../services/audit.service.js";

export function getRequestAuditMeta(req) {
  return {
    userId: req.user?.userId ?? null,
    userCode: req.user?.userCode ?? null,
    userName: req.user?.userName ?? null,
    departmentId: req.budgetAccess?.department?.id ?? null,
    roleName: req.budgetAccess?.role?.name ?? null,
    workspaceId: req.budgetAccess?.workspaceId
      ? String(req.budgetAccess.workspaceId)
      : null,
    workspaceType: req.budgetAccess?.workspaceType ?? null,
    workspaceLabel: req.budgetAccess?.workspaceLabel ?? null,
    actingAs: req.budgetAccess?.actingAs ?? null,
    workspaceCategory:
      req.budgetAccess?.budgetCategory?.code ??
      req.budgetAccess?.budgetCategory?.name ??
      null,
    workspaceDepartmentId: req.budgetAccess?.department?.id ?? null,
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
