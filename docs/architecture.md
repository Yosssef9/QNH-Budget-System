# QNH Budget System Architecture

## Overview

QNH Budget System is a hospital budget management application with a Node.js/Express backend, MSSQL database, and React/Vite frontend.

The backend follows the source-defined request flow:

Route -> Controller -> Service -> Repository -> MSSQL

Business rules are implemented mainly in services. SQL access is implemented in repositories. Controllers are generally responsible for request handling, validation calls, audit logging, and API responses.

## Technology Stack

Backend:

- Node.js
- Express
- MSSQL using `mssql`
- JWT authentication
- Repository pattern
- Service layer
- Nodemailer-based email notifications
- Winston logging

Frontend:

- React
- Vite
- React Router
- React Query
- Axios
- Tailwind CSS
- React Hot Toast

## Backend Entry Point

Main file:

- `server/server.js`

Responsibilities:

- Loads environment config.
- Creates the Express app.
- Applies global middleware:
  - `helmet`
  - `compression`
  - `cors`
  - `express.json`
  - HTTP request logging
- Mounts feature routes under `/api`.
- Registers 404 handling.
- Registers global error handling.
- Starts the HTTP server.

Mounted route groups include:

- `/api/auth`
- `/api/admin/budget-access/assignments`
- `/api/admin/budget-access/users`
- `/api/admin/budget-access/departments`
- `/api/admin/budget-access/roles`
- `/api/financial-years`
- `/api/budgets`
- `/api/categories`
- `/api/budget-approval`
- `/api/item-requests`
- `/api/dashboard`
- `/api/audit-logs`
- `/api/transfers`
- `/api/budget-items`
- `/api/po-links`

## Backend Layering

### Routes

Route files live in:

- `server/routes`

Routes define URL structure and apply middleware such as:

- `verifyPortalJwt`
- `verifyBudgetAccess`
- `requirePermission`

Examples:

- `financialYears.routes.js`
- `budgets.routes.js`
- `budgetApproval.routes.js`
- `transfer.routes.js`
- `po.routes.js`

Most protected routes follow this pattern:

1. Verify portal JWT.
2. Load budget access.
3. Check permission when required.
4. Call controller.

### Controllers

Controller files live in:

- `server/controllers`

Controllers are thin request handlers. They usually:

- Read route params, query params, or body.
- Call validators where present.
- Call service functions.
- Write audit logs for state-changing actions.
- Return `ApiResponse`.
- Pass errors to middleware.

Examples:

- `financialYears.controller.js`
- `budgets.controller.js`
- `budgetApproval.controller.js`
- `transfer.controller.js`
- `po.controller.js`

### Services

Service files live in:

- `server/services`

Services contain business rules and workflow decisions.

Examples of service responsibilities:

- Financial year sequence validation.
- Financial year open, pre-close, and close rules.
- Budget creation and submission rules.
- Budget approval and return rules.
- Transfer amount and quantity validation.
- PO link quantity validation.
- Notification queueing.
- Transaction coordination.

Important service files:

- `financialYears.service.js`
- `budgets.service.js`
- `budgetApproval.service.js`
- `budgetBalance.service.js`
- `transfer.service.js`
- `po.service.js`
- `notification.service.js`

### Repositories

Repository files live in:

- `server/repositories`

Repositories own database access and SQL queries.

Examples:

- `financialYears.repository.js`
- `budgets.repository.js`
- `budgetApproval.repository.js`
- `budgetItems.repository.js`
- `transfer.repository.js`
- `po.repository.js`
- `notification.repository.js`
- `userRole.repository.js`

Repository functions use:

- `poolPromise`
- `sql`
- parameterized `.input(...)` calls

Some repositories accept an optional transaction and use `createRequest(pool, transaction)`.

## Database Access

Main database config:

- `server/config/db.js`

The app creates one MSSQL connection pool using `sql.ConnectionPool`.

The pool is exported as:

- `poolPromise`

Database queries are executed through repository functions.

## Transactions

Transaction helper:

- `server/database/transaction.js`

The `withTransaction(callback)` helper:

1. Creates an MSSQL transaction.
2. Begins the transaction.
3. Runs the callback.
4. Commits on success.
5. Rolls back on failure.

Request helper:

- `server/utils/createRequest.js`

`createRequest(pool, transaction)` returns:

- a transaction-bound request when a transaction is provided
- a normal pool request otherwise

Observed transaction usage:

- Financial year creation creates the year and department budgets together.
- Budget return updates budget status and inserts notes together.
- Transfer approval updates transfer status and may create a new budget item together.

## Authentication Flow

Backend authentication files:

- `server/middleware/verifyPortalJwt.middleware.js`
- `server/middleware/verifyBudgetAccess.middleware.js`
- `server/middleware/permission.middleware.js`
- `server/repositories/userRole.repository.js`
- `server/routes/auth.routes.js`

Flow:

1. Client sends `Authorization: Bearer <token>`.
2. `verifyPortalJwt` verifies the token using `PORTAL_JWT_SECRET`.
3. `verifyPortalJwt` stores user identity on `req.user`.
4. `verifyBudgetAccess` loads budget access using `getBudgetAccessByUserId`.
5. `verifyBudgetAccess` stores access details on `req.budgetAccess`.
6. `requirePermission(permissionName)` checks `req.budgetAccess.permissions`.

The `/api/auth/me` route returns:

- `user`
- `budgetAccess`

## Permission Model

Permission data is resolved in:

- `server/repositories/userRole.repository.js`

The repository reads from budget user role data and role permission data. It returns:

- user ID
- role ID and role name
- department ID and department name
- `isGlobalAdmin`
- permissions object

Permissions include:

- `can_view_budget`
- `can_edit_budget`
- `can_view_po_links`
- `can_request_po_links`
- `can_view_all_po_link_requests`
- `can_approve_po_links`
- `can_request_transfer`
- `can_approve_budget`
- `can_approve_transfer`
- `can_manage_users`
- `can_manage_categories`
- `can_view_reports`
- `can_manage_financial_years`

## Error and Response Handling

Shared utilities:

- `server/utils/apiError.js`
- `server/utils/apiResponse.js`
- `server/utils/asyncHandler.js`
- `server/middleware/error.middleware.js`

`ApiError` carries:

- status code
- message
- optional error code
- optional details

`ApiResponse` standardizes successful responses with:

- `success`
- `message`
- `data`

`asyncHandler` wraps async controller functions and forwards errors to Express error middleware.

## Audit Logging

Audit utility:

- `server/utils/audit.js`

Audit-related files:

- `server/controllers/audit.controller.js`
- `server/services/audit.service.js`
- `server/repositories/audit.repository.js`
- `server/routes/audit.routes.js`

State-changing controllers call `auditLog` after important actions such as:

- creating financial years
- closing financial years
- creating budgets
- submitting budgets
- approving or returning budgets
- creating transfers
- approving or rejecting transfers
- creating PO links
- approving or rejecting PO links

## Notification Architecture

Notification service:

- `server/services/notification.service.js`

Notification repository:

- `server/repositories/notification.repository.js`

Notification worker:

- `server/jobs/notification.worker.js`

Notification config and templates:

- `server/constants/notificationTypes.js`
- `server/notifications/notificationConfig.js`
- `server/notifications/recipientResolver.js`
- `server/notifications/templateResolver.js`
- `server/notifications/templates/*`
- `server/notifications/layouts/default.layout.js`

Flow:

1. Domain service calls `queueNotification`.
2. Recipients are resolved by notification type.
3. Payload is enriched.
4. Notification rows are inserted into `BS_Notifications`.
5. Worker claims pending notifications.
6. Worker resolves an email template.
7. Worker sends email.
8. Notification is marked sent or failed.

Recipient strategies:

- `PERMISSION`
- `OWNER`
- `BROADCAST`

## Frontend Entry Point

Main files:

- `client/src/main.jsx`
- `client/src/App.jsx`
- `client/src/routes/AppRouter.jsx`

Flow:

1. `main.jsx` renders React.
2. `AuthProvider` wraps the app.
3. `App.jsx` provides React Query through `QueryClientProvider`.
4. `AppRouter.jsx` defines application routes.

## Frontend Routing

Routing is defined in:

- `client/src/routes/AppRouter.jsx`

The root route is wrapped by:

- `RequireAuth`
- `UnsavedChangesProvider`
- `DashboardLayout`

Feature pages are lazy-loaded.

Routes use `RequirePermission` for permission-based access.

Examples:

- `budgets` requires `can_view_budget`
- `budgets/entry` requires `can_edit_budget`
- `financial-years` requires `can_manage_financial_years`
- `budget-approval` requires `can_approve_budget`
- `transfers/requests` requires `can_request_transfer`
- `transfers/approvals` requires `can_approve_transfer`
- `reports` requires `can_view_reports`

## Frontend Auth State

Auth files:

- `client/src/context/AuthContext.jsx`
- `client/src/context/RequireAuth.jsx`
- `client/src/context/RequirePermission.jsx`

`AuthContext` calls:

- `GET /auth/me`

It stores:

- `user`
- `budgetAccess`
- loading state
- authentication status
- budget access status

`RequireAuth` redirects users without authentication or budget access.

`RequirePermission` redirects users who do not have the required permission.

## Frontend API Layer

API client:

- `client/src/api/api.js`

The Axios client:

- reads `VITE_API_BASE_URL`
- uses it as `baseURL`
- attaches bearer token from `getToken()`

Feature API modules include:

- `auth.api.js`
- `budget.api.js`
- `financialYears.api.js`
- `transfer.api.js`
- `po.api.js`
- budget access API modules

## Frontend Data Fetching

React Query hooks live in:

- `client/src/hooks`

Examples:

- `hooks/financial-years/useFinancialYears.js`
- `hooks/budgets/useBudgetApproval.js`
- `hooks/budgets/useSubmitBudget.js`
- `hooks/po/*`
- `hooks/dashboard/useDashboardData.js`

Typical frontend dependency flow:

Page -> Hook -> API Module -> Axios Client -> Backend Route

Hooks invalidate query keys after mutations to refresh dependent UI state.

## Main Business Modules

The main backend modules are:

- Financial Years
- Budgets
- Budget Items
- Budget Approval
- Budget Transfers
- Purchase Order Links
- Notifications
- Audit Logs
- Access Management
- Dashboard
- Reports
- Categories and Types
- Item Requests

The frontend mirrors these through pages, API modules, hooks, and route guards.

## Architecture Observations

The following observations are based on inspected source code:

- `server/server.js` imports `budgetItemRoutes` twice with the same identifier.
- `/api/auth/me` is implemented inline in `auth.routes.js` instead of using `auth.controller.js`.
- `budgetApproval.repository.js` has a `returnBudgetRepo` implementation that assigns the query chain to `request` but returns `result`.
- `notificationRecipients.repository.js` defines `getPOLinkRequesterRepo` twice.
- Some backend controllers use `asyncHandler`, while others use explicit `try/catch`.
- The architecture generally follows the route-controller-service-repository pattern, with a few implementation inconsistencies noted above.
