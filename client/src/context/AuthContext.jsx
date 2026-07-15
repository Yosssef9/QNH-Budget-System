/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";
import {
  clearSelectedBudgetWorkspaceId,
  setSelectedBudgetWorkspaceId,
} from "../api/workspaceHeader";

const AuthContext = createContext(null);

function getUserId(user) {
  return user?.userId || user?.USER_ID || user?.id || null;
}

function getWorkspaceStorageKey(userId) {
  return userId ? `budgetWorkspaceId:${userId}` : null;
}

function readStoredWorkspaceId(userId) {
  const key = getWorkspaceStorageKey(userId);
  if (!key) return null;
  return localStorage.getItem(key);
}

function persistWorkspaceId(userId, workspaceId) {
  const key = getWorkspaceStorageKey(userId);
  if (!key || !workspaceId) return;
  localStorage.setItem(key, String(workspaceId));
}

function removeStoredWorkspaceId(userId) {
  const key = getWorkspaceStorageKey(userId);
  if (!key) return;
  localStorage.removeItem(key);
}

function getWorkspaces(access) {
  return Array.isArray(access?.workspaces) ? access.workspaces : [];
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [budgetAccess, setBudgetAccess] = useState(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [workspaceSelectionRequired, setWorkspaceSelectionRequired] =
    useState(false);
  const [workspaceSwitching, setWorkspaceSwitching] = useState(false);
  const [loading, setLoading] = useState(true);

  function applyAuthenticatedAccess(nextUser, nextAccess, { persist = true } = {}) {
    const userId = getUserId(nextUser);
    const workspaceId =
      nextAccess?.userRoleId || nextAccess?.activeUserRoleId || null;

    setUser(nextUser);
    setBudgetAccess(nextAccess);
    setSelectedWorkspaceId(workspaceId);
    setSelectedBudgetWorkspaceId(workspaceId);

    if (persist && userId && workspaceId) {
      persistWorkspaceId(userId, workspaceId);
    }
  }

  async function bootstrapAuth() {
    try {
      clearSelectedBudgetWorkspaceId();
      setWorkspaceSelectionRequired(false);

      const response = await api.get("/auth/me");
      const nextUser = response.data.user;
      const nextAccess = response.data.budgetAccess;
      const userId = getUserId(nextUser);
      const workspaces = getWorkspaces(nextAccess);
      const storedWorkspaceId = readStoredWorkspaceId(userId);

      if (storedWorkspaceId) {
        try {
          setSelectedBudgetWorkspaceId(storedWorkspaceId);
          const selectedResponse = await api.get("/auth/me", {
            headers: {
              "x-budget-user-role-id": storedWorkspaceId,
            },
          });
          applyAuthenticatedAccess(
            selectedResponse.data.user,
            selectedResponse.data.budgetAccess,
          );
          setWorkspaceSelectionRequired(false);
          return;
        } catch {
          removeStoredWorkspaceId(userId);
          clearSelectedBudgetWorkspaceId();
        }
      }

      if (workspaces.length === 1) {
        applyAuthenticatedAccess(nextUser, nextAccess);
        setWorkspaceSelectionRequired(false);
        return;
      }

      applyAuthenticatedAccess(nextUser, nextAccess, { persist: false });
      setWorkspaceSelectionRequired(workspaces.length > 1);
    } catch {
      setUser(null);
      setBudgetAccess(null);
      setSelectedWorkspaceId(null);
      clearSelectedBudgetWorkspaceId();
      setWorkspaceSelectionRequired(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    // localStorage.removeItem("token");
    // sessionStorage.removeItem("token");
    // Configure VITE_AUTH_LOGOUT_URL with the external auth/portal logout URL when available.
    const logoutUrl = import.meta.env.VITE_AUTH_LOGOUT_URL || "/login-required";
    window.location.href = logoutUrl;
  }

  async function switchWorkspace(userRoleId) {
    const previousWorkspaceId = selectedWorkspaceId;
    const previousUser = user;
    const previousAccess = budgetAccess;

    setWorkspaceSwitching(true);

    try {
      const requestedWorkspaceId = String(userRoleId);
      setSelectedBudgetWorkspaceId(requestedWorkspaceId);
      const response = await api.get("/auth/me", {
        headers: {
          "x-budget-user-role-id": requestedWorkspaceId,
        },
      });

      applyAuthenticatedAccess(response.data.user, response.data.budgetAccess);
      setWorkspaceSelectionRequired(false);
      return response.data.budgetAccess;
    } catch (error) {
      setUser(previousUser);
      setBudgetAccess(previousAccess);
      setSelectedWorkspaceId(previousWorkspaceId);
      setSelectedBudgetWorkspaceId(previousWorkspaceId);
      throw error;
    } finally {
      setWorkspaceSwitching(false);
    }
  }

  function dismissWorkspaceSelection() {
    setWorkspaceSelectionRequired(false);
  }

  const value = {
    user,
    budgetAccess,
    availableWorkspaces: getWorkspaces(budgetAccess),
    selectedWorkspaceId,
    workspaceSelectionRequired,
    workspaceSwitching,
    loading,
    isAuthenticated: !!user,
    hasBudgetAccess: !!budgetAccess,
    logout,
    refreshAuth: bootstrapAuth,
    switchWorkspace,
    dismissWorkspaceSelection,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
