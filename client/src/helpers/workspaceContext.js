export const ACTIVE_WORKSPACE_STORAGE_KEY = "qnh.activeBudgetWorkspaceId";

export function getStoredWorkspaceId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

export function setStoredWorkspaceId(workspaceId) {
  if (typeof window === "undefined") return;

  if (workspaceId) {
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId);
  } else {
    window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  }
}

export function applyWorkspaceToBudgetAccess(budgetAccess, workspace) {
  if (!budgetAccess || !workspace) return budgetAccess;

  return {
    ...budgetAccess,
    activeWorkspace: workspace,
    role: workspace.role || budgetAccess.role,
    department:
      workspace.department !== undefined
        ? workspace.department
        : budgetAccess.department,
    permissions: workspace.permissions || budgetAccess.permissions,
  };
}

export function resolveActiveWorkspace(budgetAccess) {
  const workspaces = budgetAccess?.workspaces || [];
  const storedWorkspaceId = getStoredWorkspaceId();

  if (!workspaces.length) return null;

  return (
    workspaces.find((workspace) => workspace.id === storedWorkspaceId) ||
    budgetAccess?.activeWorkspace ||
    workspaces[0]
  );
}

