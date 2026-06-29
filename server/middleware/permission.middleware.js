export function requirePermission(permissionName) {
  return (req, res, next) => {
    const permissions =
      req.budgetAccess?.activeWorkspace?.permissions ||
      req.budgetAccess?.permissions ||
      {};
    const hasPermission = Boolean(
      permissions?.[permissionName],
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: missing permission ${permissionName}`,
      });
    }

    next();
  };
}
