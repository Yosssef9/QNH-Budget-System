import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import PageLoader from "../components/PageLoader";

export default function RequirePermission({ children, permission }) {
  const { loading, budgetAccess } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  const hasPermission = Boolean(budgetAccess?.permissions?.[permission]);

  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  return children;
}
