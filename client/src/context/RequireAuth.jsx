import { Navigate } from "react-router-dom";

import PageLoader from "../components/PageLoader";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { loading, isAuthenticated, hasBudgetAccess } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login-required" replace />;
  }

  if (!hasBudgetAccess) {
    return <Navigate to="/budget-access-denied" replace />;
  }

  return children;
}