import { hasPermission } from "../../../shared/permissions/permissionCodes.js";

export function requireBudgetPermission(permissionName) {
  return (req, res, next) => {
    const hasRequiredPermission = hasPermission(req.budgetAccess, permissionName);

    if (!hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: missing permission ${permissionName}`,
      });
    }

    next();
  };
}
