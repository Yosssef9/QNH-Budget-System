export function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.budgetAccess || req.budgetAccess[permissionName] !== true) {
      return res.status(403).json({
        success: false,
        message: "Permission denied",
      });
    }

    next();
  };
}