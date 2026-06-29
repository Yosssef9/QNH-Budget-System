# Phase 2 - Security, Roles, and Workspace Context

This document is the Phase 2 planning deliverable for the new QNH Budget workflow refactor.

Phase 2 is architecture and planning only.

No frontend code, backend code, database scripts, schema changes, or implementation work are included in this phase.

Primary source of truth:

```text
docs/codexContext/new-budget-workflow-specification.md
```

Phase 1 foundation:

```text
docs/codexContext/phase-1-foundation-architecture-review.md
```

## 1. Phase 2 Objective

Phase 2 defines the security, role, permission, and workspace model required by the new workflow.

The main problem Phase 2 must solve is:

```text
One user may legitimately have multiple business responsibilities.
The system must know which responsibility the user is acting under at any moment.
```

Example:

```text
John is:
- Department User for IT Department
- IT Category Budget Manager
```

These responsibilities must remain separate.

John must not simply see a blended list of all permissions with no context.

The system must support:

- multiple workspaces per user
- active workspace selection
- workspace-scoped menus
- workspace-scoped data access
- workspace-scoped actions
- audit entries with acting context

## 2. Current Access Model Baseline

The current access model is permission-based but not workspace-based.

Current backend flow:

```text
verifyPortalJwt
-> verifyBudgetAccess
-> requirePermission
-> controller
```

Current `verifyBudgetAccess` loads one access object for the user.

Current access object includes:

- user ID
- one role
- one optional department
- one permission set
- `isGlobalAdmin`

Current repository behavior:

```text
getBudgetAccessByUserId(userId)
```

The query selects:

```text
TOP 1 active role assignment
ORDER BY assignment id DESC
```

This means if a user has multiple active assignments, only one is returned as the current access context.

That is not sufficient for the new workflow.

## 3. Current Model Limitations

### Limitation 1: Only One Active Assignment Is Resolved

The current access resolver does not return all roles or all workspaces for a user.

Problem:

```text
John has Department User and IT Category Budget Manager assignments.
Only one assignment is returned.
```

Result:

The system cannot reliably show both workspaces.

### Limitation 2: Permissions Are Not Scoped by Workspace

Current permissions are simple booleans.

Example:

```text
can_edit_budget: true
can_approve_budget: true
```

The system does not know whether the user is editing:

- own department budget
- another department budget
- a category review package
- CFO review package

The new workflow requires context.

### Limitation 3: `can_approve_budget` Is Too Broad

Current `can_approve_budget` is used for:

- budget approval routes
- global budget access behavior in services
- frontend navigation decisions
- budget analytics access

In the new workflow, these responsibilities must be separated:

- Category Budget Manager review
- CFO approval
- global administration
- reporting/analytics access

Using one permission for all of these would create governance confusion.

### Limitation 4: No Acting Context in Audit

Current audit can identify the user, action, and entity.

It does not formally identify:

- active workspace
- acting role
- responsibility context

Problem:

```text
John returned a Laboratory laptop request.
```

The audit must clarify:

```text
John returned a Laboratory laptop request while acting as IT Category Budget Manager.
```

### Limitation 5: Frontend Navigation Is Permission-Only

Current navigation shows pages based on permissions.

Problem:

If a user has both department and category responsibilities, permission-only navigation can blend unrelated work.

The new workflow requires workspace-specific navigation.

## 4. Target Security Model

The target model separates four concepts:

```text
User
Role Assignment
Workspace
Permission
```

### User

The person authenticated by the portal.

Example:

```text
John Smith
```

### Role Assignment

A business responsibility assigned to the user.

Examples:

```text
Department User for IT Department
IT Category Budget Manager
CFO
Finance PO Link Approver
```

### Workspace

The active working context generated from role assignments.

Examples:

```text
Department Budget - IT Department
IT Category Budget Management
CFO Review
PO Link Approval
```

### Permission

The allowed action or capability.

Examples:

```text
view department budget
submit category budget
review IT category budget
approve CFO category package
approve PO link
manage financial years
```

Permissions remain the enforcement mechanism.

Workspace defines the business context.

## 5. Workspace Types

Phase 2 should define these workspace types.

### Department Workspace

Used when a user acts on behalf of a department.

Example:

```text
Workspace:
Department Budget - IT Department

Acting As:
Department User for IT Department
```

Allowed business purpose:

- create department budget requests
- submit department category budgets
- respond to returned items
- submit change requests before `PRE_CLOSING`

Data scope:

```text
Only the assigned department.
```

### Category Budget Management Workspace

Used when a user acts as hospital-wide Category Budget Manager.

Examples:

```text
IT Category Budget Management
Biomedical Category Budget Management
General Category Budget Management
```

Allowed business purpose:

- review category submissions from all departments
- use department view
- use consolidated item view
- approve requested quantity as category recommendation
- create sub-items
- enter pricing
- attach supporting documents
- submit to CFO
- create same-category transfers after `PRE_CLOSING`

Data scope:

```text
All departments within the assigned responsibility category.
```

### CFO Workspace

Used when a user acts as final financial approver.

Allowed business purpose:

- review submitted category packages
- approve category budgets
- return category budgets to Category Budget Managers
- manage financial year `PRE_CLOSING`
- close financial year after pending execution activities are resolved
- approve transfers

Data scope:

```text
All category budget packages requiring CFO authority.
```

### PO Link Approval Workspace

Used when a user has PO Link Approval permission.

For Version 1, this permission is normally assigned to Finance Department role.

Allowed business purpose:

- review pending PO links
- approve PO links
- reject PO links

Data scope:

```text
Pending PO links visible according to configured PO approval permissions.
```

Important:

PO Link approval is permission-based, not role-name based.

## 6. Official Role Names

The official category role family is:

```text
Category Budget Manager
```

Standard role names:

```text
IT Category Budget Manager
Biomedical Category Budget Manager
General Category Budget Manager
```

These are hospital-wide review roles.

They are not department manager roles.

Example:

```text
Head of IT Department
```

This is a department responsibility.

Example:

```text
IT Category Budget Manager
```

This is a hospital-wide category responsibility.

The same user may hold both, but they must produce separate workspaces.

## 7. Recommended Permission Groups

Phase 2 should define permission groups at business level before implementation naming is finalized.

### Department Budget Permissions

Purpose:

Allow Department Users to manage their own department category budgets.

Capabilities:

- view own department budgets
- edit draft category budget requests
- submit category budget
- edit returned unchecked items
- submit change requests before `PRE_CLOSING`

### Category Budget Management Permissions

Purpose:

Allow Category Budget Managers to manage one responsibility category across departments.

Capabilities:

- view submitted category budgets for assigned category
- review category items
- update approved quantity
- mark items reviewed
- return items to department
- create sub-items
- enter pricing
- attach supporting documents
- submit category package to CFO
- create same-category transfers after `PRE_CLOSING`

### CFO Permissions

Purpose:

Allow final financial governance.

Capabilities:

- view category packages submitted to CFO
- approve category budget
- return category budget to Category Budget Manager
- approve/reject transfers
- move financial year to `PRE_CLOSING`
- close financial year

### PO Link Permissions

Purpose:

Allow PO Linking execution and approval.

Capabilities:

- request PO link
- view PO link details
- view own PO links
- view pending PO links
- approve PO links
- reject PO links

PO Link approval must remain permission-based.

### Administration Permissions

Purpose:

Allow system administrators to manage setup and assignments.

Capabilities:

- manage users
- manage roles
- assign role/workspace access
- manage item master
- manage responsibility category assignment
- manage financial year configuration

## 8. Recommended Active Workspace Behavior

### Login Behavior

If a user has one workspace:

```text
Open that workspace directly.
```

If a user has multiple workspaces:

```text
Open the last selected workspace or show workspace selector.
```

The active workspace must always be visible.

### Workspace Switcher

The user should be able to switch between assigned workspaces.

Example:

```text
Current Workspace:
Department Budget - IT Department

Switch to:
- IT Category Budget Management
- PO Link Approval
```

### Workspace-Scoped Navigation

Menus must be scoped to the active workspace.

Department Workspace example:

```text
Dashboard
Department Budget
Returned Items
Change Requests
My PO Links
```

Category Budget Management Workspace example:

```text
Dashboard
Department Submissions
Consolidated Item Review
Sub Items and Pricing
Supporting Documents
Transfers
```

CFO Workspace example:

```text
Dashboard
CFO Review
Returned Packages
Financial Years
Transfer Approvals
```

PO Link Approval Workspace example:

```text
Dashboard
Pending PO Links
PO Link History
```

## 9. Audit Context Requirements

Every workflow-critical mutating action must record acting context.

Minimum audit context:

- user ID
- user name where available
- active workspace ID or key
- active workspace label
- acting role name
- department scope, if applicable
- responsibility category scope, if applicable
- permission used, where relevant
- entity type
- entity ID
- action
- old value, where relevant
- new value, where relevant
- timestamp

Example:

```text
User: John
Workspace: IT Category Budget Management
Acting As: IT Category Budget Manager
Action: Updated approved quantity
Item: Laptop
Old Value: 5
New Value: 7
```

Different example:

```text
User: John
Workspace: Department Budget - IT Department
Acting As: Department User for IT Department
Action: Submitted IT Department IT Budget
```

This is mandatory for governance.

## 10. Backend Architecture Impact

Phase 2 backend planning affects these existing areas:

- `verifyBudgetAccess`
- `requirePermission`
- `userRole.repository.js`
- budget access assignment service/repository
- audit helper
- notification recipient resolution
- any service that currently treats `can_approve_budget` as global access

Recommended backend direction:

```text
Auth identifies the user.
Access resolver returns all available workspaces.
Client selects active workspace.
Requests include active workspace context.
Backend validates that the workspace belongs to the user.
Backend checks permissions within that workspace.
Services enforce business scope using workspace context.
Audit records workspace context.
```

The backend must remain authoritative.

Frontend workspace selection improves UX but cannot be trusted alone.

## 11. Frontend Architecture Impact

Phase 2 frontend planning affects these existing areas:

- `AuthContext`
- `RequirePermission`
- `DashboardLayout`
- route definitions
- navigation configuration
- dashboard cards
- permission helper labels

Recommended frontend direction:

```text
AuthContext stores user, access, available workspaces, and active workspace.
DashboardLayout shows active workspace.
Navigation is generated from active workspace.
Route guards check permissions in active workspace.
Workspace switcher changes current context.
```

Current role label logic such as:

```text
Budget Approver
Budget Editor
Budget Viewer
```

is insufficient for the new workflow.

Future labels should use workspace context:

```text
Department User - IT Department
IT Category Budget Manager
CFO
PO Link Approver
```

## 12. Data Model Impact for Phase 2

No database implementation is included in Phase 2 planning.

However, Phase 2 requires conceptual support for:

- multiple active assignments per user
- role assignment scoped by department or category
- generated workspaces from assignments
- active workspace context on requests
- acting context stored in audit logs

Current model concern:

```text
getBudgetAccessByUserId selects only TOP 1 assignment.
```

New model requires:

```text
return all active assignments
derive available workspaces
allow one selected active workspace
```

This should be resolved in Phase 3 database design and Phase 4+ implementation planning.

## 13. Security Rules

### Rule 1: Backend Must Validate Workspace Ownership

A user must not be able to submit an arbitrary workspace identifier and gain access.

Backend must confirm:

```text
The active workspace belongs to the authenticated user.
```

### Rule 2: Workspace Scope Must Limit Data

Department Workspace:

```text
only assigned department data
```

Category Budget Management Workspace:

```text
only assigned responsibility category across departments
```

CFO Workspace:

```text
CFO review scope
```

PO Link Approval Workspace:

```text
PO links allowed by approval permission
```

### Rule 3: Permissions Must Not Replace Business Rules

Permission grants access to an action.

Business rules still decide whether the action is valid.

Example:

```text
User has Category Budget Manager permission.
But category budget is already CFO approved.
User cannot edit approved package unless a valid Change Request reopens the affected item.
```

### Rule 4: Self-Review Must Be Visible

Version 1 allows a user to submit a department budget and review the same category if they hold both roles.

The system must audit this clearly.

The CFO should see a warning when submitter and reviewer are the same person.

### Rule 5: PO Link Approval Is Permission-Based

The system must not hardcode PO Link approval to Finance, Procurement, CFO, or Category Budget Manager.

Version 1 normally assigns PO Link Approval permission to Finance Department role.

## 14. Notification Impact

Notifications must become workspace-aware.

Current notification recipient resolution is mostly permission-based or owner-based.

New workflow needs category-aware recipient resolution.

Examples:

Department category submitted:

```text
Notify IT Category Budget Manager for IT submissions.
Notify Biomedical Category Budget Manager for Biomedical submissions.
Notify General Category Budget Manager for General submissions.
```

CFO return:

```text
Notify the relevant Category Budget Manager workspace.
```

Category return to department:

```text
Notify Department Workspace for the submitting department.
```

PO Link submitted:

```text
Notify users with PO Link Approval permission.
```

Notifications should include enough context for the user to open the correct workspace.

## 15. Risks

### Risk: Permission Explosion

Creating too many low-level permissions can make administration difficult.

Mitigation:

Group permissions by workspace responsibility and expose simple role templates in the UI.

### Risk: Role and Workspace Confusion

Users may not understand why they see multiple workspaces.

Mitigation:

Use clear labels:

```text
Department Budget - IT Department
IT Category Budget Management
```

### Risk: Weak Backend Enforcement

If workspace context is enforced only in frontend, users could bypass UI restrictions.

Mitigation:

Backend validates workspace ownership and scope on every protected workflow action.

### Risk: Old `can_approve_budget` Leakage

Existing services treat `can_approve_budget` as global access.

Mitigation:

Identify and refactor those service-level checks before new workflow actions depend on them.

### Risk: Audit Context Missing

If audit does not include acting context from the beginning, later investigation will be weak.

Mitigation:

Make acting context part of the Phase 2 architecture contract.

## 16. Phase 2 Deliverables

Phase 2 should produce:

- approved workspace model
- approved role family and role templates
- approved permission grouping
- active workspace behavior
- backend access-resolution approach
- frontend workspace behavior
- audit context requirements
- notification recipient impact
- security risks and mitigations
- readiness criteria for Phase 3

## 17. Open Architecture Questions

### Question 1: Workspace Persistence

Should the active workspace be remembered per user?

Recommendation:

```text
Yes.
Remember last selected workspace for convenience.
Always allow switching.
```

### Question 2: Workspace Selection Source

Should the active workspace be stored server-side, client-side, or sent per request?

Recommendation:

```text
Send active workspace with requests.
Backend validates it against the user's assignments.
Client may remember last selected workspace locally for UX.
```

### Question 3: Role Templates vs Raw Permissions

Should administrators assign raw permissions directly or use role templates?

Recommendation:

```text
Use role templates for normal administration.
Allow permission overrides only for admin-level exceptions.
```

### Question 4: CFO Role

Should CFO be a role, a workspace, permissions, or all three?

Recommendation:

```text
All three.
CFO role assignment creates CFO Workspace and grants CFO permissions.
```

### Question 5: Category Role Scope

Should IT/Biomedical/General Category Budget Manager roles be separate role names or one role with category scope?

Recommendation:

```text
Use one role family with category scope conceptually.
Expose the three approved names to users:
- IT Category Budget Manager
- Biomedical Category Budget Manager
- General Category Budget Manager
```

This scales better if future responsibility categories are added.

## 18. Phase 2 Acceptance Criteria

Phase 2 is complete when:

1. The workspace model is approved.
2. The available workspace types are approved.
3. The official role names are confirmed.
4. The permission groups are approved.
5. The backend access-resolution approach is approved.
6. The frontend workspace behavior is approved.
7. The acting-context audit requirement is approved.
8. Notification routing impact is understood.
9. Security risks are documented with mitigations.
10. No blocking access-model questions remain before Phase 3 database design.

## 19. Phase 2 Recommendation

The recommended Phase 2 decision is:

```text
Adopt Workspace Context Switching as a first-class access model.
Treat permissions as capabilities inside a selected workspace.
Require backend validation of active workspace on protected workflow actions.
Require audit context for all workflow-critical actions.
```

This approach preserves the current permission infrastructure where useful while solving the new workflow requirement that one user may act under multiple independent business responsibilities.

## 20. Next Phase Dependency

Phase 3 Database Refactor Design depends on Phase 2 approval.

Phase 3 should not begin until these Phase 2 decisions are approved:

- how multiple assignments become workspaces
- how active workspace is selected and validated
- how department scope and category scope are represented conceptually
- how CFO and PO approval workspaces are represented
- how acting context is stored for audit

