let selectedBudgetWorkspaceId = null;

export function setSelectedBudgetWorkspaceId(workspaceId) {
  selectedBudgetWorkspaceId = workspaceId ? String(workspaceId) : null;
}

export function getSelectedBudgetWorkspaceId() {
  return selectedBudgetWorkspaceId;
}

export function clearSelectedBudgetWorkspaceId() {
  selectedBudgetWorkspaceId = null;
}
