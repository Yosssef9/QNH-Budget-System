# QNH Budget System Permissions

## Overview

QNH Budget System uses portal JWT authentication plus a budget-access permission model.

The backend permission flow is:

1. Verify portal JWT.
2. Load budget access for the authenticated user.
3. Check route-level permission when the route requires one.
4. Apply additional service-level ownership or department rules where implemented.

The frontend also uses the returned budget access object to guard routes and show or hide navigation/dashboard actions.

This document is based only on verified source code.

## Key Source Files

Backend:

- `server/middleware/verifyPortalJwt.middleware.js`
- `server/middleware/verifyBudgetAccess.middleware.js`
- `server/middleware/permission.middleware.js`
- `server/repositories/userRole.repository.js`
- `server/routes/*.routes.js`
- `server/services/budgets.service.js`
- `server/services/budgetItems.service.js`
- `server/helpers/validateBudgetModifyPermission.js`

Frontend:

- `client/src/context/AuthContext.jsx`
- `client/src/context/RequireAuth.jsx`
- `client/src/context/RequirePermission.jsx`
- `client/src/routes/AppRouter.jsx`
- `client/src/helpers/permissions.js`
- `client/src/layouts/DashboardLayout.jsx`
- `client/src/config/dashboard/*`
- `client/src/pages/BudgetAccessManagementPage.jsx`

## Backend Authentication Flow

### JWT Middleware

File:

- `server/middleware/verifyPortalJwt.middleware.js`

Behavior:

- Reads `Authorization` header.
- Requires the header to start with `Bearer `.
- Verifies the token using `process.env.PORTAL_JWT_SECRET`.
- On success, writes `req.user`.
- On missing token, returns HTTP `401` with message `Unauthorized`.
- On invalid or expired token, returns HTTP `401` with message `Invalid or expired token`.

`req.user` contains:

- `userId`
- `userCode`
- `userName`
- `isAdmin`

### Budget Access Middleware

File:

- `server/middleware/verifyBudgetAccess.middleware.js`

Behavior:

- Calls `getBudgetAccessByUserId(req.user.userId)`.
- If no access record is found, returns HTTP `403` with message `You do not have access to Budget System`.
- On success, writes `req.budgetAccess`.

### Permission Middleware

File:

- `server/middleware/permission.middleware.js`

Behavior:

- `requirePermission(permissionName)` checks `Boolean(req.budgetAccess?.permissions?.[permissionName])`.
- If the permission is missing or false, returns HTTP `403`.
- Response message format is `Forbidden: missing permission ${permissionName}`.
- This middleware does not check `isGlobalAdmin` directly.

## Budget Access Resolution

File:

- `server/repositories/userRole.repository.js`

Function:

- `getBudgetAccessByUserId(userId)`

Source tables used by the query:

- `BS_budget_user_roles`
- `BS_departments`
- `BS_budget_roles`
- `BS_budget_role_permissions`

The query selects the latest active budget user role:

- `WHERE bur.user_id = @userId`
- `AND bur.is_active = 1`
- `ORDER BY bur.id DESC`

The returned access object contains:

- `hasAccess`
- `userId`
- `role.id`
- `role.name`
- `department.id`
- `department.name`
- `isGlobalAdmin`
- `permissions`

Permission values are resolved using `COALESCE(user_role_permission, role_permission, 0)`.

## Resolved Permissions

The active budget access resolver returns these permissions:

| Permission | Source-backed meaning |
|---|---|
| `can_view_budget` | Allows access to budget viewing features where routes or frontend guards require it. |
| `can_edit_budget` | Allows access to budget editing/submission routes and frontend pages. |
| `can_view_po_links` | Allows access to PO link detail and transparency routes. |
| `can_request_po_links` | Allows access to PO availability, own PO links, and PO link creation routes. |
| `can_view_all_po_link_requests` | Returned by backend access resolver; no direct route-level `requirePermission` usage found in inspected routes. |
| `can_approve_po_links` | Allows access to pending PO links and PO approval/rejection routes. |
| `can_request_transfer` | Allows access to transfer item, own transfer, and transfer creation routes. |
| `can_approve_budget` | Allows access to budget approval routes and is also used in services as global budget access. |
| `can_approve_transfer` | Allows access to transfer approval/rejection routes and approver transfer listing. |
| `can_manage_users` | Allows access to budget access administration and audit log routes. |
| `can_manage_categories` | Allows category/type management and item request approval/rejection routes. |
| `can_view_reports` | Allows frontend access to the reports route. |
| `can_manage_financial_years` | Allows financial year listing, creation, pre-close, and close routes. |

## Assignment Management Permissions

File:

- `server/repositories/budgetAccessAssignments.repository.js`

The assignment management repository reads and writes these fields on `BS_budget_user_roles`:

- `can_view_budget`
- `can_edit_budget`
- `can_link_po`
- `can_request_transfer`
- `can_approve_budget`
- `can_approve_transfer`
- `can_manage_users`
- `can_manage_categories`
- `can_view_reports`
- `can_manage_financial_years`

The frontend access management page also uses `can_link_po`.

Files:

- `client/src/pages/BudgetAccessManagementPage.jsx`
- `client/src/config/dashboard/quickActions.js`
- `client/src/config/dashboard/workPanels.js`

Verified source observation:

- `can_link_po` appears in assignment management and frontend dashboard visibility code.
- The active backend access resolver returns PO permissions as `can_view_po_links`, `can_request_po_links`, `can_view_all_po_link_requests`, and `can_approve_po_links`.
- The active backend access resolver does not return `can_link_po`.

## Global Admin Behavior

File:

- `server/repositories/userRole.repository.js`

`isGlobalAdmin` is set to true only when:

```js
row.role_name === "ADMIN" && row.department_id === null
```

The returned access object includes `isGlobalAdmin`.

Verified backend usage:

- `requirePermission` does not automatically allow access for `isGlobalAdmin`.
- Budget services treat `isGlobalAdmin === true` as global budget access in specific service-level rules.
- `can_approve_budget === true` is also treated as global budget access in those same budget service checks.
- `validateBudgetModifyPermission` treats `isGlobalAdmin === true` or `can_approve_budget === true` as global access for budget modification checks.

Observed service-level global access usage:

- `server/services/budgets.service.js`
- `server/services/budgetItems.service.js`
- `server/helpers/validateBudgetModifyPermission.js`

Verified behavior from source:

- Global budget access can see or act across departments in budget service checks where `isGlobalAdmin` or `can_approve_budget` is used.
- `getCurrentBudgetService` rejects global users with `DEPARTMENT_REQUIRED` because global users must select a department for that flow.
- Route-level permission still depends on the named permission boolean.

## Backend Permission Enforcement Matrix

All routes listed below are mounted in `server/server.js`, except empty route files noted later.

### Auth

| Method | Path | Auth | Budget access | Permission |
|---|---|---:|---:|---|
| GET | `/api/auth/me` | Yes | Yes | None |

### Budget Access Administration

Base paths:

- `/api/admin/budget-access/assignments`
- `/api/admin/budget-access/users`
- `/api/admin/budget-access/departments`
- `/api/admin/budget-access/roles`

All use:

- `verifyPortalJwt`
- `verifyBudgetAccess`
- `requirePermission("can_manage_users")`

| Method | Path | Permission |
|---|---|---|
| GET | `/api/admin/budget-access/assignments` | `can_manage_users` |
| POST | `/api/admin/budget-access/assignments` | `can_manage_users` |
| PUT | `/api/admin/budget-access/assignments/:id` | `can_manage_users` |
| PATCH | `/api/admin/budget-access/assignments/:id/status` | `can_manage_users` |
| GET | `/api/admin/budget-access/users` | `can_manage_users` |
| GET | `/api/admin/budget-access/departments` | `can_manage_users` |
| GET | `/api/admin/budget-access/roles` | `can_manage_users` |

### Financial Years

Base path:

- `/api/financial-years`

| Method | Path | Auth | Budget access | Permission |
|---|---|---:|---:|---|
| GET | `/api/financial-years` | Yes | Yes | `can_manage_financial_years` |
| GET | `/api/financial-years/current` | Yes | Yes | None |
| GET | `/api/financial-years/open` | Yes | Yes | None |
| POST | `/api/financial-years` | Yes | Yes | `can_manage_financial_years` |
| PATCH | `/api/financial-years/:id/pre-close` | Yes | Yes | `can_manage_financial_years` |
| PATCH | `/api/financial-years/:id/close` | Yes | Yes | `can_manage_financial_years` |

### Budgets

Base path:

- `/api/budgets`

| Method | Path | Auth | Budget access | Permission |
|---|---|---:|---:|---|
| GET | `/api/budgets/current` | Yes | Yes | `can_edit_budget` |
| POST | `/api/budgets` | Yes | Yes | `can_edit_budget` |
| GET | `/api/budgets/my` | Yes | Yes | None |
| GET | `/api/budgets/history/approved` | Yes | Yes | `can_edit_budget` |
| GET | `/api/budgets/history/:budgetId/items` | Yes | Yes | `can_edit_budget` |
| GET | `/api/budgets/:budgetId/review-feedback` | Yes | Yes | `can_view_budget` |
| GET | `/api/budgets/:budgetId/items` | Yes | Yes | `can_view_budget` |
| DELETE | `/api/budgets/:budgetId/items/:itemId` | Yes | Yes | `can_edit_budget` |
| PUT | `/api/budgets/:budgetId/items` | Yes | Yes | `can_edit_budget` |
| PATCH | `/api/budgets/:budgetId/submit` | Yes | Yes | `can_edit_budget` |
| GET | `/api/budgets/:budgetId/timeline` | Yes | Yes | `can_view_budget` |
| GET | `/api/budgets/:budgetId` | Yes | Yes | `can_view_budget` |
| GET | `/api/budgets/:budgetId/balance-summary` | Yes | Yes | None |
| POST | `/api/budgets/:budgetId/items` | Yes | Yes | `can_edit_budget` |

### Budget Approval

Base path:

- `/api/budget-approval`

All routes use:

- `verifyPortalJwt`
- `verifyBudgetAccess`
- `requirePermission("can_approve_budget")`

| Method | Path | Permission |
|---|---|---|
| GET | `/api/budget-approval/pending` | `can_approve_budget` |
| GET | `/api/budget-approval/comparison` | `can_approve_budget` |
| GET | `/api/budget-approval/approved` | `can_approve_budget` |
| GET | `/api/budget-approval/:budgetId` | `can_approve_budget` |
| PATCH | `/api/budget-approval/:budgetId/approve` | `can_approve_budget` |
| PATCH | `/api/budget-approval/:budgetId/return` | `can_approve_budget` |

### Budget Items

Base path:

- `/api/budget-items`

| Method | Path | Auth | Budget access | Permission |
|---|---|---:|---:|---|
| GET | `/api/budget-items/transfer-items` | Yes | Yes | `can_edit_budget` |
| GET | `/api/budget-items/available-transfer-types` | Yes | Yes | `can_edit_budget` |

### Categories and Types

Base path:

- `/api/categories`

| Method | Path | Auth | Budget access | Permission |
|---|---|---:|---:|---|
| GET | `/api/categories` | Yes | Yes | None |
| POST | `/api/categories` | Yes | Yes | `can_manage_categories` |
| PATCH | `/api/categories/:categoryId` | Yes | Yes | `can_manage_categories` |
| GET | `/api/categories/types/all` | Yes | Yes | None |
| GET | `/api/categories/:categoryId/types` | Yes | Yes | None |
| POST | `/api/categories/:categoryId/types` | Yes | Yes | `can_manage_categories` |
| PATCH | `/api/categories/:categoryId/types/:typeId` | Yes | Yes | `can_manage_categories` |
| GET | `/api/categories/:categoryId/usage` | Yes | Yes | `can_manage_categories` |
| DELETE | `/api/categories/:categoryId` | Yes | Yes | `can_manage_categories` |
| GET | `/api/categories/:categoryId/types/:typeId/usage` | Yes | Yes | `can_manage_categories` |
| DELETE | `/api/categories/:categoryId/types/:typeId` | Yes | Yes | `can_manage_categories` |

### Item Requests

Base path:

- `/api/item-requests`

All routes use:

- `verifyPortalJwt`
- `verifyBudgetAccess`

| Method | Path | Permission |
|---|---|---|
| GET | `/api/item-requests/dashboard` | None |
| GET | `/api/item-requests` | `can_manage_categories` |
| POST | `/api/item-requests` | None |
| POST | `/api/item-requests/:requestId/approve` | `can_manage_categories` |
| POST | `/api/item-requests/:requestId/reject` | `can_manage_categories` |
| POST | `/api/item-requests/:requestId/approve-manual` | `can_manage_categories` |

### Dashboard

Base path:

- `/api/dashboard`

| Method | Path | Auth | Budget access | Permission |
|---|---|---:|---:|---|
| GET | `/api/dashboard/stats` | Yes | Yes | None |

### Audit Logs

Base path:

- `/api/audit-logs`

All routes use:

- `verifyPortalJwt`
- `verifyBudgetAccess`
- `requirePermission("can_manage_users")`

| Method | Path | Permission |
|---|---|---|
| GET | `/api/audit-logs/users` | `can_manage_users` |
| GET | `/api/audit-logs` | `can_manage_users` |

### Transfers

Base path:

- `/api/transfers`

All routes use:

- `verifyPortalJwt`
- `verifyBudgetAccess`

| Method | Path | Permission |
|---|---|---|
| GET | `/api/transfers` | `can_approve_transfer` |
| GET | `/api/transfers/items` | `can_request_transfer` |
| GET | `/api/transfers/dashboard` | None |
| GET | `/api/transfers/my` | `can_request_transfer` |
| GET | `/api/transfers/:id` | None |
| POST | `/api/transfers` | `can_request_transfer` |
| POST | `/api/transfers/:id/approve` | `can_approve_transfer` |
| POST | `/api/transfers/:id/reject` | `can_approve_transfer` |

### PO Links

Base path:

- `/api/po-links`

All routes use:

- `verifyPortalJwt`
- `verifyBudgetAccess`

| Method | Path | Permission |
|---|---|---|
| GET | `/api/po-links/available-pos` | `can_request_po_links` |
| GET | `/api/po-links/my` | `can_request_po_links` |
| GET | `/api/po-links/pending` | `can_approve_po_links` |
| POST | `/api/po-links` | `can_request_po_links` |
| GET | `/api/po-links/po/:id/transparency` | `can_view_po_links` |
| GET | `/api/po-links/:id` | `can_view_po_links` |
| POST | `/api/po-links/:id/approve` | `can_approve_po_links` |
| POST | `/api/po-links/:id/reject` | `can_approve_po_links` |

### Test Route

Base path:

- `/api/test`

| Method | Path | Auth | Budget access | Permission |
|---|---|---:|---:|---|
| GET | `/api/test/balance/:id` | No | No | None |

## Empty Route Files

The following route files exist but have length `0` in the inspected source:

- `server/routes/report.routes.js`
- `server/routes/userRole.routes.js`
- `server/routes/budgetDistribution.routes.js`

The inspected `server/server.js` does not mount `report.routes.js`, `userRole.routes.js`, or `budgetDistribution.routes.js`.

## Frontend Authentication Enforcement

### Auth Context

File:

- `client/src/context/AuthContext.jsx`

Behavior:

- Calls `GET /auth/me`.
- Stores `user`.
- Stores `budgetAccess`.
- Sets `isAuthenticated` to `!!user`.
- Sets `hasBudgetAccess` to `!!budgetAccess`.

Logout behavior:

- Removes `token` from `localStorage`.
- Removes `token` from `sessionStorage`.
- Redirects to `/login.html`.

### RequireAuth

File:

- `client/src/context/RequireAuth.jsx`

Behavior:

- Shows `PageLoader` while auth is loading.
- Redirects to `/login-required` if `isAuthenticated` is false.
- Redirects to `/login-required` if `hasBudgetAccess` is false.
- Otherwise renders children.

### RequirePermission

File:

- `client/src/context/RequirePermission.jsx`

Behavior:

- Shows `PageLoader` while auth is loading.
- Checks `Boolean(budgetAccess?.permissions?.[permission])`.
- Redirects to `/` if the permission is missing or false.
- Otherwise renders children.

## Frontend Route Permission Matrix

File:

- `client/src/routes/AppRouter.jsx`

Root route `/` is wrapped with `RequireAuth`.

| Frontend path | Component | Frontend permission |
|---|---|---|
| `/` | `DashboardPage` | Auth only |
| `/admin/users` | `BudgetAccessManagementPage` | `can_manage_users` |
| `/budgets` | `BudgetsPage` | `can_view_budget` |
| `/budgets/entry` | `BudgetEnteryPage` | `can_edit_budget` |
| `/budgets/my` | `MyBudgetsPage` | `can_edit_budget` |
| `/budgets/view/:budgetId` | `BudgetViewPage` | `can_view_budget` |
| `/financial-years` | `FinancialYearsPage` | `can_manage_financial_years` |
| `/budget-approval` | `BudgetApprovalPage` | `can_approve_budget` |
| `/admin/budget-setup` | `BudgetSetupPage` | `can_manage_categories` |
| `/admin/audit-logs` | `AuditLogsPage` | `can_manage_users` |
| `/transfers/requests` | `TransferPage` | `can_request_transfer` |
| `/transfers/approvals` | `TransferApprovalPage` | `can_approve_transfer` |
| `/budget-analytics` | `BudgetAnalyticsPage` | `can_approve_budget` |
| `/reports` | `ReportsPage` | `can_view_reports` |
| `/login-required` | `LoginRequiredPage` | None |

## Frontend Navigation and Visibility Checks

### Dashboard Layout

File:

- `client/src/layouts/DashboardLayout.jsx`

Visible navigation uses permission checks including:

- `can_manage_financial_years`
- `can_view_budget`
- `can_approve_budget`
- `can_approve_transfer`
- `can_request_transfer`
- `can_view_reports`
- `can_manage_users`
- `can_manage_categories`

Observed route selection behavior:

- Budget navigation path uses `can_approve_budget` to choose between approval and budget pages.
- Transfer navigation path uses `can_approve_transfer` to choose between approval and request pages.
- Transfers menu is visible if `can_request_transfer` or `can_approve_transfer` is true.

### Dashboard Config

Files:

- `client/src/config/dashboard/adminCards.jsx`
- `client/src/config/dashboard/dashboardCards.jsx`
- `client/src/config/dashboard/quickActions.js`
- `client/src/config/dashboard/workPanels.js`

Observed permission checks include:

- `can_approve_budget`
- `can_manage_categories`
- `can_approve_transfer`
- `can_manage_users`
- `can_manage_financial_years`
- `can_view_budget`
- `can_edit_budget`
- `can_link_po`
- `can_request_transfer`
- `can_view_reports`

### Permission Helper

File:

- `client/src/helpers/permissions.js`

Functions:

- `can(access, permission)` returns `Boolean(access?.permissions?.[permission])`.
- `isAdmin(access)` returns true when `access?.isGlobalAdmin === true` or `access?.permissions?.can_manage_users === true`.
- `getUserRoleLabel(access)` returns labels based on `isGlobalAdmin`, `can_approve_budget`, `can_edit_budget`, or `can_view_budget`.

## Access Management UI Permission Fields

File:

- `client/src/pages/BudgetAccessManagementPage.jsx`

The access management page defines these editable permission fields:

| Field | Label |
|---|---|
| `can_view_budget` | View Budget |
| `can_edit_budget` | Edit Budget |
| `can_link_po` | Link PO |
| `can_request_transfer` | Request Transfer |
| `can_approve_budget` | Approve Budget |
| `can_approve_transfer` | Approve Transfer |
| `can_manage_users` | Manage Users |
| `can_manage_categories` | Manage Categories |
| `can_view_reports` | View Reports |

Verified source observation:

- `can_manage_financial_years` is written by the backend assignment repository.
- `can_manage_financial_years` is returned by the active access resolver.
- `can_manage_financial_years` is used by frontend routing and navigation.
- The inspected access management page permission field list does not include `can_manage_financial_years`.

## Service-Level Permission and Access Rules

Route permissions are not the only access checks. Some services also enforce department or global access.

Verified service-level patterns:

- Budget services treat `isGlobalAdmin === true` or `can_approve_budget === true` as global budget access.
- Non-global budget users are checked against their assigned department.
- `validateBudgetModifyPermission` blocks modification when the budget department does not match the user's department and the user is not global by `isGlobalAdmin` or `can_approve_budget`.
- Transfer dashboard passes `can_approve_transfer === true` into dashboard service logic.
- Budget access assignment service enforces one active HOD per department and requires a department for HOD role.

## Backend and Frontend Enforcement Relationship

Backend enforcement is authoritative for API access:

- JWT is verified on protected backend routes.
- Budget access is loaded on protected backend routes.
- `requirePermission` blocks protected backend actions.

Frontend enforcement controls user experience:

- `RequireAuth` blocks unauthenticated users from the main app route.
- `RequirePermission` blocks protected frontend routes.
- Layout and dashboard configs hide or show navigation/actions based on permissions.

Frontend checks do not replace backend checks.

## Source-Verified Observations

- `requirePermission` only checks `req.budgetAccess.permissions[permissionName]`.
- `requirePermission` does not check `req.user.isAdmin`.
- `requirePermission` does not check `req.budgetAccess.isGlobalAdmin`.
- `isGlobalAdmin` is computed from budget role name and missing department, not from JWT `isAdmin`.
- `can_link_po` appears in the access management UI and dashboard visibility checks.
- Active backend access resolution returns PO permissions using `can_view_po_links`, `can_request_po_links`, `can_view_all_po_link_requests`, and `can_approve_po_links`.
- `can_view_all_po_link_requests` is returned in `budgetAccess.permissions`, but no route-level `requirePermission("can_view_all_po_link_requests")` usage was found in inspected route files.
- `/api/test/balance/:id` is mounted and does not use JWT, budget access, or named permission middleware.
