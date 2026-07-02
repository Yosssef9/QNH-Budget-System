import { hasPermission } from "../modules/access-management/access.constants.js";

export function requirePermission(permissionName) {
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
