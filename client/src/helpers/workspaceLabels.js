export function getWorkspaceRoleLabel(workspace) {
  return workspace?.role?.name || workspace?.role?.code || "Budget Role";
}

export function getWorkspaceScopeLabel(workspace) {
  if (workspace?.department?.name) {
    return workspace.department.name;
  }

  if (workspace?.budgetCategory?.name) {
    return `${workspace.budgetCategory.name} Category`;
  }

  if (workspace?.category?.name) {
    return `${workspace.category.name} Category`;
  }

  return "Global Workspace";
}

export function formatWorkspaceSummary(workspace) {
  return `${getWorkspaceRoleLabel(workspace)} - ${getWorkspaceScopeLabel(
    workspace,
  )}`;
}
