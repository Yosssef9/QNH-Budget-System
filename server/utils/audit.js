import { createAuditLogService } from "../services/audit.service.js";

export function getRequestAuditMeta(req) {
  return {
    userId: req.user?.userId ?? null,
    userCode: req.user?.userCode ?? null,
    userName: req.user?.userName ?? null,
    departmentId: req.budgetAccess?.department?.id ?? null,
    roleName: req.budgetAccess?.role?.name ?? null,
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
