import { resolveBudgetAccessForUser } from "../../modules/access-management/access.service.js";

function readRequestedUserRoleId(req) {
  const rawHeader =
    req.headers["x-budget-user-role-id"] ||
    req.headers["x-budget-workspace-id"];

  if (!rawHeader) return null;

  const requestedUserRoleId = Number(rawHeader);

  if (!Number.isInteger(requestedUserRoleId) || requestedUserRoleId <= 0) {
    return NaN;
  }

  return requestedUserRoleId;
}

export async function resolveBudgetWorkspace(req, res, next) {
  try {
    const requestedUserRoleId = readRequestedUserRoleId(req);

    if (Number.isNaN(requestedUserRoleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget workspace header",
      });
    }

    const access = await resolveBudgetAccessForUser({
      userId: req.user.userId,
      requestedUserRoleId,
    });

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to Budget System",
      });
    }

    req.budgetAccess = access;
    next();
  } catch (error) {
    next(error);
  }
}
