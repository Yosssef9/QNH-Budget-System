export function requirePermission(permissionName) {
  return (req, res, next) => {
    const hasPermission = Boolean(
      req.budgetAccess?.permissions?.[permissionName],
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
