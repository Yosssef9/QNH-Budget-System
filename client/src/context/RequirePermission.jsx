import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import PageLoader from "../components/PageLoader";
import { can } from "../helpers/permissions";

export default function RequirePermission({ children, permission }) {
  const { loading, budgetAccess } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  const requiredPermissions = Array.isArray(permission)
    ? permission
    : [permission];

  const hasPermission = requiredPermissions.some((permissionName) =>
    can(budgetAccess, permissionName),
  );

  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  return children;
}
