# New Workflow Documentation Index

Date created: 2026-07-01
Last updated: 2026-07-02

Primary references:

- `QNH_Budget_Database_Scope_for_Codex.md` - database schema, relationships, statuses, permissions, and removed legacy tables.
- `QNH-Budget-Planning-and-Approval-Module-Updated.md` - detailed business workflow for planning and approval.
- `new-budget-workflow-quick-guide.md` - concise workflow guide.
- `QNH_New_Workflow_Modular_Refactor_Plan.md` - persistent migration plan, phase tracking, decisions, validation, and architecture cleanup progress.
- `QNH_Backend_Modular_Architecture_Target.md` - final backend module/shared architecture, file ownership rules, wrapper rules, migration procedure, and final acceptance checks.

## Current Phase Note

Phase 5C Category Package Preparation and Reconciliation is approved complete. Phase 5D CFO Review is implemented and awaiting live review/approval. CFO Review uses the new `server/modules/cfo-package-review` backend module and `/cfo-review` frontend page to review submitted category packages by package item and by department, accept package items, mark items as needing modification, return the whole package to the Category Manager, and complete CFO review.

Source-of-truth priority remains defined by `AGENTS.md`: live database metadata first, then the database scope document, then the other current new-workflow documents.

Upcoming production-readiness work includes SQL Server backup and recovery planning, liveness/readiness endpoints, a protected system-health API, and a read-only administrator System Health page. See the `Production Readiness and Operational Monitoring` phase in `QNH_New_Workflow_Modular_Refactor_Plan.md`.

Canonical permission architecture: new-workflow code uses `shared/permissions/permissionCodes.js`; the database registry is `BS_budget_permissions.permission_code`; Access Management owns effective-permission resolution; notification permission recipients are resolved through Access Management, not permission-column SQL. See `QNH_New_Workflow_Modular_Refactor_Plan.md` for the current enforcement boundary and validation commands.

Temporary legacy permission compatibility: `server/middleware/permission.middleware.js` remains only as an adapter for existing mounted old-workflow routes that still call legacy permission names. New-workflow modules must use canonical `PERMISSION_CODES` through `server/shared/middleware/requireBudgetPermission.js`. The adapter is not part of the target architecture and must be removed when all old consumers are migrated, unmounted, or deleted.
