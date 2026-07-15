# QNH Backend Modular Architecture Target

Date created: 2026-07-01
Last updated: 2026-07-02

## Purpose

This document defines the final backend application-source architecture for the QNH Budget System migration. It complements the database and workflow documents; it does not replace the database scope.

## Final Backend Structure

```text
server/
  modules/
    access-management/
    master-catalog/
    financial-years/
    department-budgets/
    category-review/
    category-submission-windows/
    category-packages/
    change-requests/
    transfers/
    po-linking/
    reports/
    dashboard/
    other approved business modules/
  shared/
    auth/
    database/
    middleware/
    errors/
    validation/
    audit/
    workflow-history/
    notifications/
    files/
    utilities/
  server.js
  app.js, if introduced
  package.json
  package-lock.json
  necessary configuration/bootstrap files
```

Exact module names must follow approved module boundaries from the migration plan.

## File Ownership Rules

Business-specific behavior belongs in `server/modules/<feature>`.

Examples:

- Routes for a business feature.
- Controllers for a business feature.
- Services and transition rules.
- Repositories, SQL, query builders, and DTO mappers.
- Validators and schemas.
- Domain constants and statuses.
- Module-specific tests and fixtures.

Cross-module reusable infrastructure belongs in `server/shared/<concern>`.

Examples:

- JWT/auth primitives used by many modules.
- Database connection and transaction helpers.
- Generic workspace and permission middleware.
- Generic error classes and response helpers.
- Generic audit writer infrastructure.
- Notification queue infrastructure.
- File upload/storage infrastructure.
- Generic validation and utility helpers.

Application composition belongs in `server.js`, optional `app.js`, and bootstrap/configuration files.

## Prohibited Final Folders

The following old global business-code folders must not remain permanently:

```text
server/routes
server/controllers
server/services
server/repositories
server/middleware
server/utils
server/validators
```

They may exist during migration only while they contain not-yet-migrated modules or explicitly documented temporary wrappers. Empty old folders must be removed.

## Temporary Wrapper Rules

A temporary wrapper is allowed only when all of the following are documented:

- Why it is required.
- Which files still import it.
- Which module/shared area owns its replacement.
- The exact phase when it will be removed.
- The validation proving it can be removed safely.

Wrappers that only forward from an old path to a new module path must be removed as soon as all importers are migrated.

## Development Migration Isolation Policy

This refactor is allowed to happen while the system is still under development. Unmigrated modules are not required to remain fully functional after every phase.

Current-module-only scope:

- Each phase completes one vertical business module.
- The current module must match the redesigned workflow, own its final backend architecture, connect to its existing frontend, pass targeted validation, and remove its own legacy implementation.
- Future modules may remain in old folders, may still use old middleware, and may remain temporarily nonfunctional because their old database workflow is obsolete.

No cross-module compatibility patching:

- Do not patch unrelated routes, controllers, services, repositories, or authorization code merely to keep future modules compatible with a new shared primitive.
- Do not partially migrate modules such as transfers, PO linking, PO mappings, projects, department budgets, category review, CFO packages, change requests, or reports during another module's phase.
- When a future module phase begins, it must be migrated as a complete vertical slice and its legacy files removed after validation.

Shared-infrastructure exception:

- Shared code may be created or changed only when the current module genuinely requires it and the code is final, reusable infrastructure.
- Valid shared examples include JWT verification, database pool and transaction helpers, generic error classes, generic workspace and permission primitives, generic audit infrastructure, and generic notification queue infrastructure.
- Creating a shared primitive does not mean every old route must immediately be changed to use it.

Server-startup containment exception:

- The server must be able to start so the current module can be tested.
- If an unrelated legacy route blocks startup because of removed imports or startup-time side effects, use the smallest containment necessary.
- Allowed containment includes temporarily keeping an old middleware file, temporarily not mounting an obsolete route, or using a documented feature flag.
- Containment must not change the unrelated module's business workflow.

Temporary containment removal phase:

- Every containment file must list its importers, replacement owner, validation required before removal, and exact removal phase.
- If the containment is used by multiple old modules, each importer is removed when its owning module migrates; the wrapper is deleted in the final old-folder retirement phase after the last importer is gone.

Final legacy-folder retirement rule:

- Old global folders may exist during development only for unmigrated modules or documented containment.
- At final acceptance, no business implementation, duplicate wrapper, temporary containment, or empty old folder may remain.

## Module Migration Procedure

For each business module:

1. Inspect the current route-to-UI call path.
2. Define the new workflow behavior and database ownership.
3. Create or complete `server/modules/<feature>`.
4. Move or rewrite the module route, controller, service, repository, validator, constants, mappers, and module tests.
5. Move only generic cross-module code to `server/shared`.
6. Update `server.js` or the app composition layer to mount the module router directly.
7. Update all imports away from old global paths.
8. Remove obsolete old-path wrappers and duplicate implementations.
9. Run targeted backend tests, frontend build/checks, and end-to-end validation for the module.
10. Update the persistent refactor plan with files moved, wrappers removed, validation evidence, and deferred risks.
11. Do not start the next module without explicit approval.

## Minimal Change Rule

When correcting one concern, change only the files and functions required by that concern. Preserve unaffected controllers, services, repositories, routes, and pages.

Before editing, identify:

- exact functions affected;
- why each function must change;
- functions that must remain untouched.

Prefer small targeted changes over full-file regeneration. Use a full-file replacement only when the entire file genuinely needs restructuring or the user explicitly requests it.

## Module Feature Completeness Cross-Reference

Backend modularization is not sufficient for phase completion by itself. Every module phase must maintain a feature inventory in `QNH_New_Workflow_Modular_Refactor_Plan.md` before implementation begins.

The inventory must cover database-column ownership, frontend user actions, backend/API behavior, permissions, workflow/status rules, audit/history/notification behavior, validation, edge cases, and tests. A module may be marked `COMPLETED` only when every required inventory row is implemented and validated, or explicitly deferred with user approval.

This rule is defined in the persistent refactor plan section:

```text
Module Feature Completeness Standard
```

## Route Authorization Completeness Cross-Reference

Do not apply one module-level business permission blindly to every route in a module router. Also do not create large permission arrays for every possible future consumer.

Route authorization must distinguish read operations from write operations, administrative reads from operational lookups, and global permissions from department/category scoped permissions.

Every module phase must include a Route Authorization Matrix in `QNH_New_Workflow_Modular_Refactor_Plan.md` before completion. Each route must document:

- business operation;
- HTTP method;
- consumers;
- exact permission code or permission set;
- department/category/global scope rule;
- object-level access rule;
- response filtering or sensitivity.

Keep the matrix simple. Include known approved workflow consumers only; do not add hypothetical future consumers before their module phase.

The permanent rule is defined in the persistent refactor plan section:

```text
Route Authorization Completeness Standard
```

## Middleware And Service Responsibility Rules

Middleware may handle:

- authentication;
- workspace resolution;
- simple exact permission checks;
- request-level technical validation.

Middleware must not:

- query business repositories;
- load domain entities unnecessarily;
- duplicate service logic;
- make database-dependent business decisions;
- return module-specific business error formats.

Services handle:

- business authorization;
- workspace scope;
- category/department ownership;
- entity validation;
- workflow rules;
- transactions.

When validating access to an object requires loading that object, load it once in the service. Do not load it first in middleware and again in the service.

## Constants Rule

Use constants for stable permission codes, fixed workflow codes, fixed enum values, and required invariant codes.

Do not use constants for database IDs, database-managed names, Units of Measure records, catalog records, editable descriptions, or database sort order unless temporarily required by an existing fixed workflow operation.

## Current Module Isolation For Authorization

Do not add permissions or compatibility behavior for future modules before their own phase.

When a future module needs catalog or other prerequisite data:

```text
future module service
  -> calls an exported service/domain operation from the prerequisite module
```

The future module must not import the prerequisite module repository directly, and the prerequisite module must not contain permission arrays for future-module consumers.

## Route Mounting Approach

Each business module exposes one module router, for example:

```text
server.js
  -> app.use("/api/admin/budget-access", accessManagementRouter)
```

Routes inside the module own subpaths:

```text
modules/access-management/access.routes.js
  -> /assignments
  -> /users
  -> /departments
  -> /roles
```

The app composition layer must not contain business workflow logic.

## Dependency Rules

Modules may depend on shared infrastructure and stable read contracts from prerequisite modules. Modules must not import another module's repository directly unless an approved cross-module contract exists.

Preferred dependency direction:

```text
shared infrastructure
  -> access-management
    -> master-catalog
    -> financial-years
      -> department-budgets
        -> category-review
          -> category-packages
            -> change-requests
            -> transfers
            -> po-linking
              -> reports/dashboard
```

`server/modules/category-packages` owns Phase 5C hospital-wide package preparation, including package items, year-specific package sub-items, shared package model details, department-to-package-sub-item allocations, reconciliation, and CFO submission readiness. Category Review owns approved department quantities; Category Packages consumes those approved quantities and must not duplicate department contribution totals in a separate physical contribution table.

`server/modules/cfo-package-review` owns Phase 5D CFO review for submitted category packages. It reads category-package data, exposes CFO package queues and package detail views, records item-level CFO decisions, returns packages to the Category Manager, completes CFO review, and uses canonical CFO permissions. The CFO module must not reuse the removed old budget-approval workflow.

To prevent circular dependencies:

- Keep shared code business-neutral.
- Use service-level contracts for cross-module operations.
- Use database read models or dedicated query services for reporting.
- Do not import controllers, routes, or repositories across modules.
- If two modules need each other, extract the neutral primitive into `shared` or define an explicit orchestration module after approval.

## Final Cleanup and Acceptance Checks

Before the overall refactor is complete, run a repository scan proving:

- No business routes remain in `server/routes`.
- No business controllers remain in `server/controllers`.
- No business services remain in `server/services`.
- No business repositories remain in `server/repositories`.
- No business validators remain in global validator folders.
- No duplicate old/new implementations remain.
- No imports reference removed old paths.
- No temporary wrappers remain.
- No empty legacy folders remain.
- All module routers are mounted from the application composition layer.
- All shared files are genuinely reusable infrastructure.
- All migrated modules have targeted tests and frontend validation evidence.

The overall migration must not be marked complete until this final architecture scan passes.

## Production Readiness And Operational Monitoring

The future `Production Readiness and Operational Monitoring` phase is planned in `QNH_New_Workflow_Modular_Refactor_Plan.md`. This section records approved upcoming work only. Implementation must not start until the roadmap reaches that phase.

This phase must occur after all core business and workflow modules are stable and before production deployment, go-live validation, and final handover.

### Health Endpoint Architecture

Use separate public liveness and readiness endpoints:

- `GET /health/live`: confirms the Node.js process is alive. It must return quickly, avoid database queries, and expose only minimal non-sensitive information.
- `GET /health/ready`: confirms the API can currently serve normal Budget System requests. It should check essential dependencies such as SQL Server connectivity, required configuration, and critical initialization state. Unavailable readiness returns HTTP 503.

Public health responses must not expose SQL Server hostnames, database names unless explicitly approved, connection strings, credentials, internal IP addresses, file-system paths, stack traces, raw SQL errors, JWT information, or environment variables.

Basic liveness/readiness routes may live in a lightweight shared health component because they are infrastructure endpoints. Do not put all health logic directly in `server.js`.

### Protected System Health Module

Detailed operational diagnostics should be implemented in a small dedicated operational module, for example:

```text
server/modules/system-health/
  systemHealth.constants.js
  systemHealth.controller.js
  systemHealth.repository.js
  systemHealth.routes.js
  systemHealth.service.js
```

The current detailed endpoint is:

```http
GET /api/system-health/summary
```

Access must be limited to users with the explicit system-health viewing permission:

```text
can_view_system_health
```

Do not reuse an unrelated permission merely to avoid adding the correct authorization rule.

The system-health service owns component status calculation and safe administrative messages. The controller returns only safe mapped responses. Do not return secrets or raw infrastructure errors.

Use component statuses:

```text
HEALTHY
DEGRADED
CRITICAL
NOT_CONFIGURED
```

Do not report a component as healthy when it has not actually been checked.

### SQL Server Backup And Recovery Boundary

Database backup and recovery is an infrastructure and database-administration responsibility. The Node.js API must not directly perform SQL Server backup or restore operations.

The application may expose read-only backup status in the protected System Health API and administrator page, but it must not initially expose commands to run backups, delete backups, restore databases, change recovery model, or change retention policy.

Backup status should come from a controlled backend service that reads approved SQL Server backup history or a dedicated monitoring table. The browser must never query SQL Server system databases directly and must never receive physical backup paths, credentials, server names, or infrastructure secrets.

Preferred backup scheduling is SQL Server Agent when supported. If SQL Server Agent is unavailable, such as with some SQL Server Express installations, Windows Task Scheduler plus `sqlcmd` may be used by infrastructure administrators. Do not rely on manually copied `.bak` files inside the repository or project directory.

`RESTORE VERIFYONLY` is useful but does not replace an actual restore test. Production readiness requires a tested restore to a separate non-production database and verification that important application tables and queries work after restoration.

### Administrator System Health Page

The future frontend page should live in the existing frontend folder structure and be permission-protected in both frontend and backend.

Suggested navigation:

```text
Administration -> System Health
```

The first version must be read-only and provide an operational overview with safe status badges, manual refresh, last refresh timestamp, and safe error messages.

The page may show API status, SQL Server connectivity, notification-worker status when reliably available, and database backup status including last full/differential/log backups and warning state. It must not expose internal paths, credentials, server names, raw exceptions, or infrastructure secrets.

## Canonical Permission Architecture

New-workflow modules use one shared application permission contract:

```text
shared/permissions/permissionCodes.js
```

The database remains authoritative through:

```text
BS_budget_permissions.permission_code
BS_budget_role_permissions
BS_budget_user_permission_overrides
BS_budget_user_roles
```

Rules:

- New-workflow modules must import `PERMISSION_CODES`; do not repeat raw `can_*` strings in feature code.
- Access Management owns effective-permission resolution for the selected active `BS_budget_user_roles.id`.
- Serialized access uses `budgetAccess.permissionCodes`.
- `budgetAccess.permissions` and legacy aliases are not part of the new-workflow access contract.
- Budget System Admin access must come from normalized role-permission grants, not a magic global-admin bypass.
- Permission codes are SQL values and must be passed as parameters.
- Permission codes must never be interpolated as SQL column names.
- Notification permission recipients must be resolved through Access Management, not through notification repositories that inspect permission tables directly.

The current enforcement boundary and validation commands are tracked in `QNH_New_Workflow_Modular_Refactor_Plan.md`.

### Temporary Legacy Permission Compatibility Boundary

The target architecture has no legacy permission aliases, no legacy permission database columns, and no permission-column SQL. The live database uses the normalized permission registry only.

During development, a temporary adapter remains only for existing mounted old-workflow routes:

```text
server/middleware/permission.middleware.js
```

This adapter maps old route-level permission names to canonical `PERMISSION_CODES` and checks `req.budgetAccess.permissionCodes`. It must not be imported by new-workflow modules and must not be used by new routes.

New-workflow modules must use:

```text
server/shared/middleware/requireBudgetPermission.js
```

with explicit canonical constants:

```js
requireBudgetPermission(
  PERMISSION_CODES.MANAGE_BUDGET_CATALOG,
)
```

Existing old-workflow routes may temporarily use:

```js
requirePermission("can_approve_budget")
```

only until their owning module is migrated, replaced, or deleted.

Broad legacy mappings are approximate. A legacy name such as `can_approve_budget` may map to several canonical CFO permissions using "any permission" behavior. This is not acceptable for final module authorization. Each migrated module must replace broad legacy checks with precise route-specific permissions and service-level scope validation.

Delete `server/middleware/permission.middleware.js` only after:

1. all imports of it are removed;
2. old consumers are deleted, unmounted, or migrated to `requireBudgetPermission(PERMISSION_CODES.*)`;
3. `rg -n "middleware/permission.middleware|requirePermission\(" server` shows no active consumer.
