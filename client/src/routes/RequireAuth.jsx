import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children }) {
  const { loading, isAuthenticated, hasBudgetAccess } = useAuth();

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAuthenticated || !hasBudgetAccess) {
    return <Navigate to="/login-required" replace />;
  }

  return children;
}