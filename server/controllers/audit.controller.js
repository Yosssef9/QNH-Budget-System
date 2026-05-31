import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  getAuditLogsService,
  getAuditLogUsersService,
} from "../services/audit.service.js";
export const getAuditLogs = asyncHandler(async (req, res) => {
  const data = await getAuditLogsService({
    page: req.query.page,
    pageSize: req.query.pageSize,
    search: req.query.search,
    action: req.query.action,
    entityType: req.query.entityType,
    user: req.query.user,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });

  res.json(
    new ApiResponse({
      message: "Audit logs fetched successfully",
      data,
    }),
  );
});
export const getAuditLogUsers = asyncHandler(async (req, res) => {
  const users = await getAuditLogUsersService();

  res.json(
    new ApiResponse({
      message: "Audit log users fetched successfully",
      data: users,
    }),
  );
});