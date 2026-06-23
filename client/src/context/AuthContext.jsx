import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [budgetAccess, setBudgetAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  async function bootstrapAuth() {
    try {
      const response = await api.get("/auth/me");
      console.log("response data", response.data);
      console.log(
        "import.meta.env.VITE_API_BASE_URL",
        import.meta.env.VITE_API_BASE_URL,
      );
      setUser(response.data.user);
      setBudgetAccess(response.data.budgetAccess);
    } catch {
      setUser(null);
      setBudgetAccess(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrapAuth();
  }, []);

  function logout() {
    // localStorage.removeItem("token");
    // sessionStorage.removeItem("token");
    // Configure VITE_AUTH_LOGOUT_URL with the external auth/portal logout URL when available.
    const logoutUrl = import.meta.env.VITE_AUTH_LOGOUT_URL || "/login-required";
    window.location.href = logoutUrl;
  }

  const value = useMemo(
    () => ({
      user,
      budgetAccess,
      loading,
      isAuthenticated: !!user,
      hasBudgetAccess: !!budgetAccess,
      logout,
      refreshAuth: bootstrapAuth,
    }),
    [user, budgetAccess, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
