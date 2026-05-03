import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

import PageLoader from "../components/PageLoader";

export default function RequireAuth({ children }) {
  const { loading, isAuthenticated, hasBudgetAccess } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated || !hasBudgetAccess) {
    return <Navigate to="/login-required" replace />;
  }

  return children;
}
