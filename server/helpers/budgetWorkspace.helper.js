const PERMISSION_FIELDS = [
  "can_view_budget",
  "can_edit_budget",
  "can_view_po_links",
  "can_request_po_links",
  "can_view_all_po_link_requests",
  "can_approve_po_links",
  "can_request_transfer",
  "can_approve_budget",
  "can_approve_transfer",
  "can_manage_users",
  "can_manage_categories",
  "can_view_reports",
  "can_manage_financial_years",
  "can_manage_po_item_mappings",
];

function normalizeRoleName(roleName) {
  return String(roleName || "")
    .trim()
    .toUpperCase();
}

function isCategoryBudgetManagerRole(roleName) {
  return normalizeRoleName(roleName) === "CATEGORY BUDGET MANAGER";
}

export function buildPermissions(row) {
  return PERMISSION_FIELDS.reduce((permissions, field) => {
    permissions[field] = Boolean(row?.[field]);
    return permissions;
  }, {});
}

export function mergePermissions(assignments) {
  return PERMISSION_FIELDS.reduce((permissions, field) => {
    permissions[field] = assignments.some(
      (assignment) => assignment.permissions?.[field] === true,
    );
    return permissions;
  }, {});
}

export function deriveBudgetWorkspaces(assignments) {
  const workspaces = [];

  assignments.forEach((assignment) => {
    const { permissions, role, department, category } = assignment;
    const isGlobalAdmin =
      normalizeRoleName(role?.name) === "ADMIN" && !department && !category;

    if (isGlobalAdmin) {
      workspaces.push({
        id: `admin-${assignment.id}`,
        type: "ADMINISTRATION",
        title: "Administration Workspace",
        actingAs: "System Administrator",
        assignmentId: assignment.id,
        role,
        department: null,
        category: null,
        permissions,
      });
    }

    if (
      department &&
      (permissions.can_view_budget || permissions.can_edit_budget)
    ) {
      workspaces.push({
        id: `department-${assignment.id}`,
        type: "DEPARTMENT",
        title: `${department.name} Department Workspace`,
        actingAs: "Department User",
        assignmentId: assignment.id,
        role,
        department,
        category: null,
        permissions,
      });
    }

    if (category && isCategoryBudgetManagerRole(role?.name)) {
      workspaces.push({
        id: `category-${category.id}-${assignment.id}`,
        type: "CATEGORY_BUDGET_MANAGEMENT",
        title: `${category.name} Category Budget Management Workspace`,
        actingAs: `${category.name} Category Budget Manager`,
        assignmentId: assignment.id,
        role,
        department: null,
        category: category.name,
        categoryId: category.id,
        categoryCode: category.code || null,
        categoryScope: category,
        permissions,
      });
    }

    if (permissions.can_approve_budget) {
      workspaces.push({
        id: `cfo-review-${assignment.id}`,
        type: "CFO_REVIEW",
        title: "CFO / Budget Approval Workspace",
        actingAs: "Budget Approver",
        assignmentId: assignment.id,
        role,
        department,
        category: null,
        permissions,
      });
    }

    if (permissions.can_approve_po_links) {
      workspaces.push({
        id: `po-approval-${assignment.id}`,
        type: "PO_LINK_APPROVAL",
        title: "PO Link Approval Workspace",
        actingAs: "PO Link Approver",
        assignmentId: assignment.id,
        role,
        department,
        category: null,
        permissions,
      });
    }
  });

  return workspaces;
}

export function selectActiveWorkspace(workspaces, requestedWorkspaceId) {
  if (!workspaces.length) {
    return {
      activeWorkspace: null,
      invalidRequestedWorkspace: Boolean(requestedWorkspaceId),
    };
  }

  if (!requestedWorkspaceId) {
    return {
      activeWorkspace: workspaces[0],
      invalidRequestedWorkspace: false,
    };
  }

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === requestedWorkspaceId,
  );

  return {
    activeWorkspace: activeWorkspace || workspaces[0],
    invalidRequestedWorkspace: !activeWorkspace,
  };
}

export function isAdminRole(roleName) {
  return normalizeRoleName(roleName) === "ADMIN";
}
