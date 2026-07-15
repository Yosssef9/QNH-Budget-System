import { resolveBudgetAccessForUser } from "../../modules/access-management/access.service.js";

function readRequestedUserRoleId(req) {
  const rawHeader =
    req.headers["x-budget-user-role-id"] ||
    req.headers["x-budget-workspace-id"];

  if (!rawHeader) {
    return null;
  }

  const requestedUserRoleId = Number(rawHeader);

  if (
    !Number.isInteger(requestedUserRoleId) ||
    requestedUserRoleId <= 0
  ) {
    return Number.NaN;
  }

  return requestedUserRoleId;
}

async function resolveWorkspace({
  req,
  res,
  next,
  accessRequired,
}) {
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

    /*
      Protected Budget System routes require an active workspace.

      These routes must continue returning HTTP 403 when the
      authenticated portal user has no Budget System assignment.
    */
    if (!access && accessRequired) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to Budget System",
      });
    }

    /*
      The optional resolver is used by /auth/me.

      A portal-authenticated user may legitimately have no Budget
      System workspace. Preserve the authenticated user and expose
      that condition as budgetAccess: null.
    */
    req.budgetAccess = access || null;

    return next();
  } catch (error) {
    return next(error);
  }
}

/*
  Use this middleware on protected Budget System routes.
*/
export function resolveBudgetWorkspace(req, res, next) {
  return resolveWorkspace({
    req,
    res,
    next,
    accessRequired: true,
  });
}

/*
  Use this middleware only when authentication should succeed even
  when the user has no active Budget System role or workspace.

  The /auth/me endpoint is the intended consumer.
*/
export function resolveOptionalBudgetWorkspace(req, res, next) {
  return resolveWorkspace({
    req,
    res,
    next,
    accessRequired: false,
  });
}