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
