import {
  createAuditLogRepo,
  getAuditLogsRepo,
  getAuditLogUsersRepo,
} from "../repositories/audit.repository.js";

export async function createAuditLogService(log) {
  try {
    await createAuditLogRepo(log);
  } catch (error) {
    console.error("[audit] failed to write audit log:", error.message);
  }
}

export async function getAuditLogsService(filters) {
  return await getAuditLogsRepo(filters);
}
export async function getAuditLogUsersService() {
  return await getAuditLogUsersRepo();
}