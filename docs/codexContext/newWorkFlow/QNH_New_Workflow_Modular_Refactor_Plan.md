# QNH New Workflow Modular Refactor Plan

## 1. Document Purpose and Authority

This file is the persistent source of truth for migrating the QNH Budget System from the removed legacy workflow to the redesigned workflow and modular backend architecture.

Architecture reference: `docs/codexContext/newWorkFlow/QNH_Backend_Modular_Architecture_Target.md`.

Authority order:

1. Live database metadata and migrations applied to the current environment.
2. `docs/codexContext/newWorkFlow/QNH_Budget_Database_Scope_for_Codex.md`.
3. Other current files in `docs/codexContext/newWorkFlow`.
4. Approved backend domain rules and tests.
5. Existing implementation patterns that do not conflict with the redesigned workflow.

Date created: 2026-07-01  
Last updated: 2026-07-03
Current migration status: Phase 1 access-management is complete. Phase 2 master-catalog is approved complete by user decision. Phase 3 financial-years is complete by user approval. Phase 4 department-budgets is complete by user approval after implementation, automated validation, and review. Phase 5 is in progress: 5A Category Manager Review and 5B Category Submission Windows are complete; 5C Category Package Preparation and Reconciliation is approved complete by user decision; 5D CFO Review is implemented and awaiting live review/approval.

Development migration isolation policy:

- Unmigrated modules are not required to remain functional during development.
- Each phase focuses exclusively on completing one vertical module.
- Unrelated modules must not receive temporary business-logic or authorization patches.
- Only minimal containment required for server startup is allowed.
- Each module is made functional when its own approved phase begins.

Frontend refactoring clarification:

- The new workflow implementation is not required to preserve the existing frontend file structure.
- Frontend restrictions that protect backend module boundaries or prevent unrelated backend work must not be interpreted as protection for old-workflow frontend files.
- Frontend pages, hooks, components, utilities, routes, and API wrappers may be modified, renamed, moved, split, merged, replaced, or deleted when doing so produces a cleaner implementation of the approved new workflow.
- Existing old-workflow frontend files are not permanent compatibility boundaries. They should be cleaned up when their owning workflow area is migrated and verified.
- API clients should follow new-workflow domain boundaries. New APIs must not be forced into legacy files such as `client/src/api/budget.api.js` merely because those files already exist.
- Before deleting, renaming, moving, or merging a frontend file, search all imports and routes, determine whether it is used by the new workflow, preserve genuinely shared reusable behavior, remove obsolete workflow-specific behavior, update consumers, and validate the affected feature.
- Generic shared frontend code may remain when it is still useful, including common modals, tables, formatting utilities, authentication utilities, permission helpers, layout components, and reusable form controls. Old workflow-specific assumptions must be removed before shared code is reused by the new workflow.
- This frontend flexibility does not override backend modular architecture rules. Backend business code must still move module by module into `server/modules`, and reusable backend infrastructure must stay in `server/shared`.

## 2. Repository Understanding

- Backend is currently layer-based under `server/routes`, `server/controllers`, `server/services`, `server/repositories`, `server/validators`, `server/middleware`, `server/notifications`, and `server/utils`.
- Backend entry point is `server/server.js`, which registers legacy route groups for auth, financial years, budgets, budget approval, categories, item requests, dashboard, audit logs, transfers, PO links, projects, and budget access admin.
- Database access uses `mssql` through `server/config/db.js`; `server/database/transaction.js` provides a generic transaction helper.
- Authentication now uses `server/shared/auth/verifyPortalJwt.js`; workspace and permission middleware are in `server/shared/middleware`.
- Phase 1 replaced obsolete access resolution. Access Management now resolves workspaces and effective permissions through `server/modules/access-management`; the old `server/repositories/userRole.repository.js` wrapper was removed.
- Frontend architecture is currently page/hook/API based under `client/src`, but this structure is not protected. Future phases may reorganize frontend files, API clients, hooks, routes, and components around the new workflow domains when the owning module is migrated.
- Current frontend route guards, API clients, and pages still use old permission names and old budget workflow contracts.
- Test setup is minimal: server uses Vitest; client has build and lint commands but no test command.
- App-level scans found no current `server` or `client` references to the redesigned workflow tables such as `BS_department_category_budgets`, `BS_category_budget_packages`, `BS_budget_workflow_history`, `BS_category_po_links`, or `BS_category_budget_transfers`.

## 3. Current-To-Target Gap Analysis

| Area | Current implementation | New workflow requirement | Main mismatch | Affected files | Required action |
|---|---|---|---|---|---|
| Access/workspace | Access Management now lives under `server/modules/access-management`; shared auth/workspace/permission middleware lives under `server/shared` | Normalized permissions and exact active `BS_budget_user_roles.id` workspace | Access Management completed; remaining compatibility aliases belong to future owning module migrations | `server/modules/access-management`, `server/shared/auth`, `server/shared/middleware`, frontend access page/helpers | Keep aliases temporary; remove when legacy modules migrate |
| Financial years | Opens year and creates `BS_budgets` | Atomic creation of department budgets, three category budgets, windows, packages, history, notifications | Initializes legacy tables only | `financialYears.*`, `budgets.repository.js`, `FinancialYearsPage.jsx` | Migrate after access foundation |
| Department budgets | `BS_budgets`, `BS_budget_items`, department-entered prices | `BS_department_budgets`, category children, generic catalog item, quantity/distribution only | Old department workflow and old table model | `budgets.*`, `budgetItems.*`, budget pages/hooks/components | Replace with department-budget module |
| Master catalog | `BS_budget_types` | `BS_budget_catalog_items`, `BS_budget_catalog_sub_items`, General sub-item invariant | Catalog hierarchy is obsolete | `category.*`, PO mapping files, setup UI | Migrate before department entry |
| Category review | No proper module; `itemRequest` is catalog request workflow | Category Manager reviews department category items | Missing new workflow | New category review module and frontend views | Add after department submission |
| CFO review | Approves department `BS_budgets` | Reviews category packages and package items | Removed workflow still active | `budgetApproval.*`, budget approval pages | Replace with package/CFO module |
| Change requests | Not implemented for new workflow | Controlled post-CFO-review changes while `OPEN` | Missing module | New backend and frontend updates | Add after CFO package completion |
| Transfers | `BS_budget_transfers` between budget items; can create new items | `BS_category_budget_transfers` between existing package sub-items | Wrong execution target and behavior | `transfer.*`, transfer pages/components | Migrate after package sub-items and `PRE_CLOSING` |
| PO linking | `BS_PO_LINKS` to budget items; `BS_PO_ITEM_MAPPINGS` to budget types | `BS_category_po_links` to package sub-items; `BS_PO_CATALOG_MAPPINGS` to reusable sub-items | Wrong target and mapping model | `po.*`, `poItemMappings.*`, PO pages/hooks | Migrate after package sub-items |
| Audit/history | Technical audit exists; workflow history not wired | Use `BS_audit_logs` plus `BS_budget_workflow_history` | Business history missing | `audit.*`, new shared history writer | Add shared workflow history |
| Notifications | Durable queue exists but recipient queries use old permissions/tables | Queue records inserted inside business transactions using new entities | Infrastructure reusable, integration obsolete | notification service/repositories/templates | Migrate per module |

## 4. Approved Target Backend Architecture

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
  shared/
    auth/
    database/
    errors/
    middleware/
    validation/
    audit/
    workflow-history/
    notifications/
    files/
    utilities/
```

Only folders needed by the active phase are created. Business-specific SQL, statuses, and transition rules stay in their owning module.

## 5. Business Module Boundaries

- `access-management`: role assignments, workspaces, effective permissions, role scope validation.
- `master-catalog`: departments, categories, UOM, generic catalog items, reusable catalog sub-items.
- `financial-years`: lifecycle, open/pre-close/close readiness, initialization.
- `department-budgets`: HOD entry, category budgets, requested items, distributions, category submission.
- `item-requests`: Department-user/HOD requests for missing catalog items under an existing fixed category; admin approval/rejection of those requests.
- `category-review`: category manager review and department returns.
- `category-submission-windows`: close/reopen category windows.
- `category-packages`: package items, sub-items, pricing, attachments, reconciliation, CFO review.
- `change-requests`: controlled changes while year is `OPEN`.
- `transfers`: post-`PRE_CLOSING` category transfer ledger.
- `po-linking`: PO catalog mappings, PO link requests/approval, PO availability.
- `reports` and `dashboard`: read models and aggregates after source modules are stable.

## 6. Shared Infrastructure Boundaries

- `shared/auth`: authentication primitives only.
- `shared/middleware`: generic authenticated-user, workspace, permission middleware.
- `shared/database`: connection, transaction, decimal/rowversion helpers.
- `shared/audit`: technical audit log infrastructure.
- `shared/workflow-history`: append-only workflow history infrastructure.
- `shared/notifications`: durable notification queue infrastructure.
- `shared/errors`, `shared/validation`, `shared/utilities`: generic helpers only.

## 6A. Frontend New-Workflow Refactoring Authority

The frontend is not required to preserve old workflow file names, folders, page boundaries, hook boundaries, or API wrapper boundaries.

Final frontend target state:

```text
Clean new-workflow frontend
+ clear feature ownership
+ domain-specific API modules
+ reusable shared components
+ no duplicate implementations
+ no unused pages
+ no obsolete hooks
+ no unused API wrappers
+ no dead routes
+ no old-workflow compatibility code unless still genuinely required
```

Allowed frontend actions during the owning module phase:

- Modify existing old-workflow frontend files.
- Rename frontend files.
- Move frontend files into better folders.
- Split large frontend files into smaller modules.
- Merge duplicated frontend files.
- Replace legacy pages, hooks, components, utilities, and API wrappers.
- Delete old-workflow frontend files that are no longer needed.
- Delete unused legacy code after verifying that it has no remaining consumers.
- Create new API client files, hooks, services, components, pages, and feature folders when this produces a cleaner architecture.
- Reorganize the budget frontend structure when needed for the new workflow.

API-client rule:

- Do not force every new-workflow API function into an existing legacy file such as `client/src/api/budget.api.js`.
- Frontend API modules should follow new-workflow domain boundaries where appropriate, for example `departmentBudgets.api.js`, `categoryBudgets.api.js`, `budgetPackages.api.js`, or `budgetApprovals.api.js`.
- Existing files such as `budget.api.js` may be reduced to shared functionality, split, renamed, replaced, or deleted if they become obsolete.
- Do not preserve a legacy API file merely to avoid changing imports.

Required judgment before deleting, renaming, moving, splitting, or merging frontend files:

1. Search all imports, routes, and references.
2. Determine whether the file is used by the new workflow.
3. Determine whether it is a genuinely shared component used by another active module.
4. Preserve reusable generic behavior where appropriate.
5. Remove workflow-specific legacy behavior that is no longer required.
6. Update all affected imports and routes.
7. Verify that no active page or feature is broken.

Shared frontend code may remain when it is still useful, including common modal components, shared table components, generic formatting utilities, authentication utilities, permission helpers, reusable layout components, and shared form controls.

Old workflow-specific assumptions must be removed from shared frontend files before those files are reused by the new workflow.

This frontend authority does not change backend rules. Backend business implementation must still be migrated into `server/modules/<feature>`, reusable backend infrastructure must remain under `server/shared`, and backend route wrappers must still be retired according to the module migration plan.

## 6B. Backend Architecture Migration and Legacy Folder Retirement

Final approved backend folder structure is documented in `QNH_Backend_Modular_Architecture_Target.md`.

Final ownership rules:

- Business-specific behavior goes under `server/modules/<feature>`.
- Cross-module reusable infrastructure goes under `server/shared/<concern>`.
- Application startup and module mounting stay in `server.js`, optional `app.js`, and bootstrap/configuration files.
- Old global business folders must be retired module by module and must not remain after final migration.

Current old architecture folders:

```text
server/routes
server/controllers
server/services
server/repositories
server/middleware
server/utils
server/validators
```

Access Management Phase 1 cleanup result:

- `server/server.js` now imports `server/modules/access-management/access.routes.js` directly.
- `server/server.js` mounts `app.use("/api/admin/budget-access", accessManagementRoutes)`.
- Access assignment/users/departments/roles routes, controllers, services, repositories, and validators are owned by `server/modules/access-management`.
- Old access-management wrappers in global folders were removed.
- Generic JWT middleware moved to `server/shared/auth/verifyPortalJwt.js`.
- Generic workspace and permission middleware are in `server/shared/middleware`.
- Legacy global middleware remains only as temporary startup containment for unmigrated old routes. Those routes must not be partially patched during Access Management.

Final Access Management module tree:

```text
server/modules/access-management/
  access.constants.js
  access.controller.js
  access.mapper.js
  access.repository.js
  access.routes.js
  access.service.js
  access.validators.js

server/tests/modules/access-management/
  access.constants.test.js
  access.service.test.js
```

Access Management files removed from old folders during Phase 1 architecture cleanup:

```text
server/routes/budgetAccessAssignments.routes.js
server/routes/budgetAccessUsers.routes.js
server/routes/budgetAccessDepartments.routes.js
server/routes/budgetAccessRoles.routes.js
server/controllers/budgetAccessAssignments.controller.js
server/controllers/budgetAccessUsers.controller.js
server/controllers/budgetAccessDepartments.controller.js
server/controllers/budgetAccessRoles.controller.js
server/services/budgetAccessAssignments.service.js
server/services/budgetAccessUsers.service.js
server/services/budgetAccessDepartments.service.js
server/services/budgetAccessRoles.service.js
server/repositories/budgetAccessAssignments.repository.js
server/repositories/budgetAccessUsers.repository.js
server/repositories/budgetAccessDepartments.repository.js
server/repositories/budgetAccessRoles.repository.js
server/repositories/userRole.repository.js
server/validators/budgetAccessAssignments.validator.js
```

Temporary wrappers after Phase 1:

| Wrapper | Why required | Current importers | Replacement owner | Removal phase | Validation before removal | Status |
|---|---|---|---|---|---|---|
| None for Access Management CRUD | Not applicable | None | `server/modules/access-management` | Phase 1 | `rg` found no old access wrapper importers | REMOVED |
| `server/middleware/verifyPortalJwt.middleware.js` | Temporary startup containment for unmigrated legacy routes | Legacy routes outside Access Management that still import old auth middleware | `server/shared/auth/verifyPortalJwt.js` | Remove importer-by-importer in each owning module phase; delete wrapper in final old-route retirement | Owning module route tests pass after importing shared auth directly; final `rg "middleware/verifyPortalJwt.middleware"` returns no matches | TEMPORARY |
| `server/middleware/verifyBudgetAccess.middleware.js` | Temporary startup containment for unmigrated legacy routes; not final Access Management architecture | Legacy routes outside Access Management that still import old workspace middleware | `server/shared/middleware/resolveBudgetWorkspace.js` | Remove importer-by-importer in each owning module phase; delete wrapper in final old-route retirement | Owning module authorization tests pass after using final shared workspace middleware; final `rg "middleware/verifyBudgetAccess.middleware"` returns no matches | TEMPORARY |
| `server/middleware/permission.middleware.js` | Temporary startup containment for unmigrated legacy routes that still use old permission names | Legacy routes outside Access Management that still import old permission middleware | `server/shared/middleware/requireBudgetPermission.js` plus module-specific normalized permission codes | Remove importer-by-importer in each owning module phase; delete wrapper in final old-route retirement | Owning module authorization tests pass with exact normalized permission codes; final `rg "middleware/permission.middleware"` returns no matches | TEMPORARY |

Remaining old-folder migration tracker:

| Current File | Current Folder | Target Module/Shared Area | Action | Migration Phase | Temporary Wrapper | Removal Phase | Status |
|---|---|---|---|---|---|---|---|
| `server/routes/auth.routes.js` | routes | shared/auth or access-management auth adapter | Move/replace | Auth/shared cleanup | No | Auth/shared cleanup | PLANNED |
| `server/routes/financialYears.routes.js` | routes | modules/financial-years | Move/replace | Phase 3 | No | Phase 3 | PLANNED |
| `server/routes/budgets.routes.js` | routes | modules/department-budgets | Deleted; replaced by `server/modules/department-budgets/departmentBudgets.routes.js` | Phase 4 | No | Phase 4 | REMOVED |
| `server/routes/budgetItems.routes.js` | routes | modules/department-budgets | Deleted; replaced by `server/modules/department-budgets/departmentBudgets.routes.js` | Phase 4 | No | Phase 4 | REMOVED |
| `server/routes/budgetItem.routes.js` | routes | future PO/transfer/project module cleanup | Keep temporarily for unrelated legacy startup path | Future PO/transfer/project phase | Yes | Owning future module phase | TEMPORARY |
| `server/routes/budgetDistribution.routes.js` | routes | modules/department-budgets | Rewrite/merge | Phase 4 | No | Phase 4 | PLANNED |
| `server/routes/budgetApproval.routes.js` | routes | modules/category-packages | Rewrite/replace | Phase 5 | No | Phase 5 | PLANNED |
| `server/routes/category.routes.js` | routes | modules/master-catalog | Rewrite/replace | Phase 2 | No | Phase 2 | PLANNED |
| `server/routes/itemRequest.routes.js` | routes | modules/item-requests | Deleted; replaced by `server/modules/item-requests/itemRequests.routes.js` | Phase 4 item-request restoration | No | Phase 4 | REMOVED |
| `server/routes/dashboard.routes.js` | routes | modules/dashboard | Move/rewrite | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/routes/audit.routes.js` | routes | shared/audit | Move/replace | Shared audit cleanup | No | Shared audit cleanup | PLANNED |
| `server/routes/transfer.routes.js` | routes | modules/transfers | Rewrite/replace | Phase 7 | No | Phase 7 | PLANNED |
| `server/routes/po.routes.js` | routes | modules/po-linking | Rewrite/replace | Phase 8 | No | Phase 8 | PLANNED |
| `server/routes/poItemMappings.routes.js` | routes | modules/po-linking | Rewrite/replace | Phase 8 | No | Phase 8 | PLANNED |
| `server/routes/projects.routes.js` | routes | modules/reports or projects | Move/review | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/routes/report.routes.js` | routes | modules/reports | Move/rewrite | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/routes/userRole.routes.js` | routes | modules/access-management or delete | Deleted; file was empty, unmounted, and unimported | Phase 1 architecture cleanup | No | Phase 1 | REMOVED |
| `server/routes/test.routes.js` | routes | test/dev support | Delete or move to dev support | Final cleanup | No | Final cleanup | NEEDS_REVIEW |
| `server/controllers/auth.controller.js` | controllers | shared/auth | Move/review | Auth/shared cleanup | No | Auth/shared cleanup | PLANNED |
| `server/controllers/financialYears.controller.js` | controllers | modules/financial-years | Move/rewrite | Phase 3 | No | Phase 3 | PLANNED |
| `server/controllers/budgets.controller.js` | controllers | modules/department-budgets | Deleted; replaced by `server/modules/department-budgets/departmentBudgets.controller.js` | Phase 4 | No | Phase 4 | REMOVED |
| `server/controllers/budgetItems.controller.js` | controllers | modules/department-budgets | Deleted; replaced by `server/modules/department-budgets/departmentBudgets.controller.js` | Phase 4 | No | Phase 4 | REMOVED |
| `server/controllers/budgetItem.controller.js` | controllers | future PO/transfer/project module cleanup | Keep temporarily for unrelated legacy startup path | Future PO/transfer/project phase | Yes | Owning future module phase | TEMPORARY |
| `server/controllers/budgetDistribution.controller.js` | controllers | modules/department-budgets | Rewrite/merge | Phase 4 | No | Phase 4 | PLANNED |
| `server/controllers/budgetApproval.controller.js` | controllers | modules/category-packages | Rewrite/replace | Phase 5 | No | Phase 5 | PLANNED |
| `server/controllers/category.controller.js` | controllers | modules/master-catalog | Rewrite/replace | Phase 2 | No | Phase 2 | PLANNED |
| `server/controllers/itemRequest.controller.js` | controllers | modules/item-requests | Deleted; replaced by `server/modules/item-requests/itemRequests.controller.js` | Phase 4 item-request restoration | No | Phase 4 | REMOVED |
| `server/controllers/dashboard.controller.js` | controllers | modules/dashboard | Move/rewrite | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/controllers/audit.controller.js` | controllers | shared/audit | Move/replace | Shared audit cleanup | No | Shared audit cleanup | PLANNED |
| `server/controllers/transfer.controller.js` | controllers | modules/transfers | Rewrite/replace | Phase 7 | No | Phase 7 | PLANNED |
| `server/controllers/po.controller.js` | controllers | modules/po-linking | Rewrite/replace | Phase 8 | No | Phase 8 | PLANNED |
| `server/controllers/poItemMappings.controller.js` | controllers | modules/po-linking | Rewrite/replace | Phase 8 | No | Phase 8 | PLANNED |
| `server/controllers/projects.controller.js` | controllers | modules/reports or projects | Move/review | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/controllers/report.controller.js` | controllers | modules/reports | Move/rewrite | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/controllers/userRole.controller.js` | controllers | modules/access-management or delete | Deleted; file was empty and unimported | Phase 1 architecture cleanup | No | Phase 1 | REMOVED |
| `server/services/auth.service.js` | services | shared/auth | Move/review | Auth/shared cleanup | No | Auth/shared cleanup | PLANNED |
| `server/services/financialYears.service.js` | services | modules/financial-years | Move/rewrite | Phase 3 | No | Phase 3 | PLANNED |
| `server/services/budgets.service.js` | services | modules/department-budgets | Deleted; replaced by `server/modules/department-budgets/departmentBudgets.service.js` | Phase 4 | No | Phase 4 | REMOVED |
| `server/services/budgetItems.service.js` | services | modules/department-budgets | Deleted; replaced by `server/modules/department-budgets/departmentBudgets.service.js` | Phase 4 | No | Phase 4 | REMOVED |
| `server/services/budgetItem.service.js` | services | future PO/transfer/project module cleanup | Keep temporarily for unrelated legacy startup path | Future PO/transfer/project phase | Yes | Owning future module phase | TEMPORARY |
| `server/services/budgetDistribution.service.js` | services | modules/department-budgets | Rewrite/merge | Phase 4 | No | Phase 4 | PLANNED |
| `server/services/budgetBalance.service.js` | services | modules/reports or shared balance read model | Move/rewrite | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/services/budgetTimeline.service.js` | services | shared/workflow-history or reports | Move/replace | Shared history or reports phase | No | Owning phase | PLANNED |
| `server/services/budgetReviewFeedback.service.js` | services | modules/category-packages | Rewrite/replace | Phase 5 | No | Phase 5 | PLANNED |
| `server/services/budgetApproval.service.js` | services | modules/category-packages | Rewrite/replace | Phase 5 | No | Phase 5 | PLANNED |
| `server/services/balance.service.js` | services | modules/reports or shared balance read model | Move/review | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/services/category.service.js` | services | modules/master-catalog | Rewrite/replace | Phase 2 | No | Phase 2 | PLANNED |
| `server/services/itemRequest.service.js` | services | modules/item-requests | Deleted; replaced by `server/modules/item-requests/itemRequests.service.js` | Phase 4 item-request restoration | No | Phase 4 | REMOVED |
| `server/services/dashboard.service.js` | services | modules/dashboard | Move/rewrite | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/services/audit.service.js` | services | shared/audit | Move/replace | Shared audit cleanup | No | Shared audit cleanup | PLANNED |
| `server/services/transfer.service.js` | services | modules/transfers | Rewrite/replace | Phase 7 | No | Phase 7 | PLANNED |
| `server/services/po.service.js` | services | modules/po-linking | Rewrite/replace | Phase 8 | No | Phase 8 | PLANNED |
| `server/services/poItemMappings.service.js` | services | modules/po-linking | Rewrite/replace | Phase 8 | No | Phase 8 | PLANNED |
| `server/services/projects.service.js` | services | modules/reports or projects | Move/review | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/services/report.service.js` | services | modules/reports | Move/rewrite | Reports/dashboard phase | No | Reports/dashboard phase | PLANNED |
| `server/services/notification.service.js` | services | shared/notifications | Move/replace | Shared notifications cleanup | No | Shared notifications cleanup | PLANNED |
| `server/services/userRole.service.js` | services | modules/access-management or delete | Deleted; file was empty and unimported | Phase 1 architecture cleanup | No | Phase 1 | REMOVED |
| `server/repositories/*` old business repositories | repositories | owning modules or shared data infrastructure | Move/rewrite/delete per module | Owning module phase | No | Owning module phase | PLANNED |
| `server/repositories/notificationRecipients.repository.js` | repositories | shared/notifications | Move after notification cleanup | Shared notifications cleanup | No | Shared notifications cleanup | PLANNED |
| `server/repositories/audit.repository.js` | repositories | shared/audit | Move after audit cleanup | Shared audit cleanup | No | Shared audit cleanup | PLANNED |
| `server/validators/*` old validators | validators | owning modules or shared/validation | Move/rewrite per module | Owning module phase | No | Owning module phase | PLANNED |
| `server/middleware/error.middleware.js` | middleware | shared/errors or shared/middleware | Move | Shared infrastructure cleanup | No | Shared infrastructure cleanup | PLANNED |
| `server/middleware/upload.middleware.js` | middleware | shared/files | Move | Shared files cleanup | No | Shared files cleanup | PLANNED |
| `server/utils/*` | utils | shared/utilities, shared/audit, shared/errors, shared/notifications | Move/review | Shared infrastructure cleanup | No | Shared infrastructure cleanup | PLANNED |

Validation required before removing any old-folder file:

- All importers updated to module/shared path.
- `rg` confirms no stale old-path imports.
- Targeted module tests pass.
- Relevant frontend build/checks pass.
- The owning phase updates this plan with actual files moved/removed.

Final architecture acceptance criteria:

- No business implementation remains in old global folders.
- No temporary wrappers remain.
- No duplicate old/new implementations remain.
- Module routers are mounted directly from the application composition layer.
- Shared files are genuinely reusable infrastructure.
- Empty legacy folders are removed.

## 7. Module Dependency Graph

```text
shared database/errors/auth
  -> access-management/workspace
    -> master-catalog
    -> financial-years
      -> department-budgets
        -> category-review
          -> category-submission-windows
          -> category-packages
            -> CFO review
            -> change-requests
            -> PRE_CLOSING readiness
              -> transfers
              -> po-linking
                -> reports/dashboard execution balances
```

Shared audit, workflow history, and notifications are used by command modules but do not own business rules.

## 8. Recommended Implementation Order

1. Access management and workspace foundation.
2. Master catalog.
3. Financial years.
4. Department budgets.
5. Category review.
6. Category submission windows.
7. Category packages and CFO review.
8. Change requests.
9. `PRE_CLOSING` readiness hardening.
10. Transfers.
11. PO linking and PO mappings.
12. Reports, dashboard, projects, and price intelligence.

## 9. Selected First Module

Selected first module: access-management / workspace foundation.

Reason: every later protected command requires exact active assignment resolution, normalized effective permissions, and department/category scope enforcement. The current app still authorizes through removed boolean columns and a single implicit latest assignment.

## 10. Detailed Phase One Plan

Scope:

- Create `server/modules/access-management`.
- Refactor runtime budget access resolution to use normalized permission tables.
- Preserve existing route paths where practical.
- Keep temporary frontend compatibility booleans mapped from new permission codes.
- Update frontend auth/permission helpers in the cleanest current structure for the migrated access workflow. Frontend files may be reorganized when the owning workflow area is migrated and imports are verified.
- Update the persistent plan file after implementation and validation.

Excluded:

- No financial-year, department-budget, catalog, package, transfer, or PO business migration.
- No schema changes.
- No dependency changes.
- Frontend feature folders may be introduced when they support the migrated workflow and do not create duplicate old/new implementations. During Phase 1, no broad frontend reorganization was required.

Tables used:

- `BS_budget_roles`
- `BS_budget_permissions`
- `BS_budget_role_permissions`
- `BS_budget_user_roles`
- `BS_budget_user_permission_overrides`
- `BS_departments`
- `BS_budget_categories`
- `users`
- `BS_audit_logs`

Backend files expected:

- Module files under `server/modules/access-management`, including route, controller, service, repository, validators, constants, and mapper.
- Shared auth and middleware under `server/shared/auth` and `server/shared/middleware`.
- No permanent Access Management compatibility wrappers remain in old global folders.
- Route registration in `server/server.js` mounts `server/modules/access-management/access.routes.js` directly at `/api/admin/budget-access`.

Frontend files expected:

- `client/src/context/AuthContext.jsx`
- `client/src/context/RequirePermission.jsx`
- `client/src/helpers/permissions.js`
- Budget access page/API/hooks if needed for the updated response contract.

Service rules:

- Resolve all active assignments for the authenticated user.
- Select workspace by request header if provided; otherwise default to the newest active assignment for temporary compatibility.
- Compute effective permissions as role defaults plus GRANT overrides minus DENY overrides.
- Validate role scope matrix for assignment create/update.
- Expose legacy permission booleans only as a temporary compatibility adapter.

Audit:

- Access assignment changes write technical audit events through the existing audit infrastructure.
- Workflow history is not used for purely administrative access changes in Phase 1.

Completion criteria:

- `/api/auth/me` returns active workspaces, selected workspace, assignment ID, role code, department/category scope, permission codes, and compatibility `permissions` object.
- Access-management runtime code no longer reads removed permission boolean columns.
- Existing frontend route guards continue to work through compatibility mapping.
- Targeted server tests pass.
- Plan file records implementation and validation.

## 11. Testing Strategy

Available commands:

- `cd server; npm run test`
- `cd server; npm run test:coverage`
- `cd client; npm run build`
- `cd client; npm run lint`

Phase 1 targeted tests:

- Effective permission role default inclusion.
- GRANT override adds permission.
- DENY override removes permission.
- Multiple active assignments return multiple workspaces.
- Workspace header selects the requested assignment.
- Inactive assignments are rejected.
- Department/category/global role scope validation.
- Existing route guard compatibility for legacy frontend permission names.

## 12. Risks and Controls

| Risk | Control |
|---|---|
| Old and new permission models mixed permanently | Temporary compatibility adapter has explicit removal point after modules migrate |
| Scope escalation from implicit workspace | Default assignment is compatibility only; module commands must use selected assignment ID |
| Frontend breaks before all pages migrate | Keep compatibility `permissions` object and route paths |
| Unknown live schema differences | Keep SQL aligned to database scope; validation will expose schema mismatch |
| Large shared folder growth | Only generic middleware/helpers go into shared |
| Legacy deletion too early | Remove obsolete code only after targeted validation |

## 13. Open Questions and Assumptions

- Assumption: the live database matches `QNH_Budget_Database_Scope_for_Codex.md`.
- Assumption: PDF files in the workflow folder mirror the Markdown documents. Local PDF text extraction tools were not available during planning.
- Conflict: the quick guide says transfers happen at parent item level, while the database scope and detailed workflow require package-sub-item transfers. Follow the database scope.
- Permission override management UI may be deferred if the existing frontend does not support it cleanly in Phase 1.

## 14. Legacy Code and Table References To Remove

Remove or replace module by module:

```text
BS_budgets
BS_budget_items
BS_budget_item_distribution
BS_budget_notes
BS_budget_types
BS_budget_sub_items
BS_department_budget_request_items
BS_department_budget_request_distribution
BS_category_review_packages
BS_category_type_reviews
BS_category_type_review_sub_items
BS_category_type_review_attachments
BS_category_type_review_sub_item_attachments
BS_PO_LINKS
BS_PO_ITEM_MAPPINGS
BS_PO_SUB_ITEM_MAPPINGS
BS_budget_transfers
BS_financial_year_budget_approvals
BS_financial_year_budget_approval_packages
BS_category_budget_package_contributions
BS_category_budget_package_item_attachments
```

Removed permission booleans must not be used in new backend code:

```text
can_view_budget
can_edit_budget
can_request_transfer
can_approve_budget
can_approve_transfer
can_manage_users
can_manage_categories
can_view_reports
can_manage_financial_years
can_view_po_links
can_request_po_links
can_view_all_po_link_requests
can_approve_po_links
can_manage_po_item_mappings
```

## 15. Phase Tracking

| Phase | Module | Status | Approved Scope | Started | Completed | Validation | Notes |
|---|---|---|---|---|---|---|---|
| Planning | Repository and architecture analysis | APPROVED | Planning only | 2026-07-01 | 2026-07-01 | Repository inspected, no app code changed | User approved implementation |
| Phase 1 | Access management and workspace foundation | COMPLETED | Runtime access resolution, normalized permissions, GRANT/DENY override administration, frontend compatibility, module-owned backend vertical slice | 2026-07-01 | 2026-07-01 | Targeted access-management tests passed; client build passed; targeted frontend lint passed; backend syntax checks passed; old wrapper scan passed; removed permission-column SQL scan passed for access paths; live HOD to Category Manager workspace switching passed | Completed after live browser verification confirmed workspace switching |
| Phase 2 | Master catalog | COMPLETED | Master Catalog backend module, existing setup frontend integration, tests, validation, and legacy category/type cleanup | 2026-07-01 | 2026-07-02 | Backend tests, syntax checks, targeted frontend lint, client build passed; user approved phase closure | Completed by user approval after authorization simplification and sub-item planning updates |
| Phase 3 | Financial years | COMPLETED | Financial Years backend module, redesigned year initialization, lifecycle transitions, connected frontend updates, tests, validation, and legacy wrapper cleanup | 2026-07-02 | 2026-07-02 | `npm.cmd test -- tests/modules/financial-years` passed; Financial Years module `node --check` passed; focused frontend lint passed; client build passed; old-table scan passed; old wrapper import scan passed; live DB/UI approval provided by user | Completed by user approval |
| Phase 4 | Department budgets | COMPLETED | Department Budget Entry and Department Budget listing against redesigned department-budget tables, approved UI/UX direction, backend module, frontend integration, tests, validation, and legacy cleanup | 2026-07-02 | 2026-07-04 | Automated backend tests, backend syntax checks, focused frontend lint, client build, old table scan, permission alias scan, and deleted wrapper import scan passed; completion accepted by user approval | Completed by user approval |
| Phase 5 | Category review/windows/packages/CFO | IN_PROGRESS | Execute as 5A Category Review, 5B Submission Windows, 5C Category Packages/Reconciliation, 5D CFO Review | 2026-07-04 | - | 5A, 5B, 5C, and focused 5D syntax checks/lint/build passed | 5D is implemented and awaiting live review/approval |
| Phase 5A | Category Manager Review | COMPLETED | Category Manager review queue, approved-quantity decisions, review completion, audit/history/notifications, frontend page | 2026-07-04 | 2026-07-04 | `npm.cmd test -- tests/modules/category-review` passed; focused lint passed; client build passed | Completed; revised before 5C to remove return-to-HOD cycle |
| Phase 5B | Category Submission Windows | COMPLETED | Category Manager control of assigned-category submission window close/reopen, backend enforcement, audit/history/notifications, UI control, tests, validation | 2026-07-05 | 2026-07-05 | `npm.cmd test -- tests/modules/category-review/categoryReview.service.test.js` passed; notification resolver test passed; focused lint passed; client build passed; old-table and legacy-permission scans passed | Completed; 5C not started |
| Phase 5C | Category Package Preparation and Reconciliation | COMPLETED | Category Manager package workbench, shared reusable models, shared pricing/specification/notes/attachments, department allocations, reconciliation, Excel quantity import, CFO submission readiness | 2026-07-05 | 2026-07-07 | Backend syntax checks, focused frontend lint, client build, and user live review/approval | Completed by user approval; package data feeds CFO review |
| Phase 5D | CFO Review | IN_REVIEW | CFO package queue, by-package-item and by-department review views, item accept/needs-modification decisions, mark-all-needs-modification, package return, package completion, notifications, and Category Manager edit locks for CFO-returned items | 2026-07-07 | - | Backend `node --check`; focused frontend ESLint; client build passed | Awaiting user live review/approval |
| Phase 6 | Adjustment requests after PRE_CLOSING | IN_PROGRESS | Department scoped adjustment requests for `ADD_ITEM` and `INCREASE_QUANTITY`, Category Manager approve/reject tracking, HOD dashboard visibility, and Transfer page review panel; no budget/package mutation in this phase | 2026-07-12 | - | Backend syntax checks passed; client build passed | Replaces the older active change-application flow with a post-PRE_CLOSING request tracker that Category Managers can later fulfill through transfers |
| Phase 7 | Transfers | NOT_STARTED | - | - | - | - | Depends on PRE_CLOSING/package sub-items |
| Phase 8 | PO linking and PO mappings | NOT_STARTED | - | - | - | - | Depends on package sub-items |
| Phase 9 | Production Readiness and Operational Monitoring | PLANNED | Upcoming documentation only: SQL Server backup/recovery strategy, liveness/readiness endpoints, protected system-health API, and read-only administrator System Health page | - | - | - | Must occur after core workflow modules are stable and before production deployment, go-live validation, and final handover |

## 16. Decision Log

| Date | Decision | Reason | Affected Modules | Approved By |
|---|---|---|---|---|
| 2026-07-01 | Use vertical module migration, one complete business module at a time | Prevents unsafe horizontal rewrite and mixed workflows | All modules | User |
| 2026-07-01 | Backend becomes modular; frontend folder architecture remains unchanged | Requested architecture boundary at the time; frontend-folder-preservation guidance is superseded by the 2026-07-03 frontend refactoring authority decision, while backend modular rules remain active | Backend and frontend integration | User |
| 2026-07-01 | Start with access-management/workspace foundation | Later modules depend on exact assignment, normalized permissions, and scope | Access management, all protected modules | User |
| 2026-07-01 | Follow database scope over quick guide for transfer target | Source-of-truth priority; database scope says transfers target package sub-items | Transfers, PO linking, category packages | User-approved documentation |
| 2026-07-01 | Keep legacy permission names only as temporary compatibility aliases mapped from normalized permission codes | Existing route guards and frontend pages still use old names; replacing all business modules in Phase 1 would violate vertical migration | Access management, current legacy modules, frontend route guards | User-approved Phase 1 scope |
| 2026-07-01 | Remove old per-user boolean override controls from the access management page for Phase 1 | The redesigned database uses `BS_budget_user_permission_overrides`, not boolean columns on `BS_budget_user_roles`; override management can be added as a normalized admin feature later | Access management frontend | User-approved Phase 1 scope |
| 2026-07-01 | Use current-module isolation during development | Unmigrated modules are not required to keep working after each phase; cross-module compatibility patching creates duplicate effort and misleading intermediate architecture | All modules | User correction |
| 2026-07-01 | Revert Phase 1 notification permission-recipient migration | Notification recipient lookup belongs to future notification/business-module migration and is not required by Access Management | Notifications, future business modules | User correction |
| 2026-07-01 | Keep old global middleware only as temporary startup containment for unmigrated routes | Access Management uses final shared middleware directly; old modules may remain untouched until their own phase | Unmigrated legacy routes, shared auth/middleware | User correction |
| 2026-07-01 | Complete normalized permission override administration in Phase 1 | Phase 1 cannot be complete until `BS_budget_user_permission_overrides` can be managed by assignment from the Access Management API and page | Access management | User |
| 2026-07-01 | Mark Phase 1 Access Management completed | Targeted validation passed and user verified live HOD/category-manager workspace switching in browser | Access management | User |
| 2026-07-01 | Plan Phase 2 as Master Catalog | Current catalog setup still uses removed `BS_budget_types`; financial-year opening and department-budget entry depend on stable departments, categories, generic catalog items, and reusable sub-items | Master catalog, financial years, department budgets | Pending user approval |
| 2026-07-01 | Start Phase 2 Master Catalog implementation | User approved the Phase 2 plan; work remains scoped to Master Catalog and connected setup frontend only | Master catalog | User |
| 2026-07-01 | Keep Phase 2 in review after code validation | Automated Phase 2 checks pass, but module completion requires live DB/UI validation of the setup page against `BS_budget_categories`, `BS_units_of_measure`, `BS_budget_catalog_items`, and `BS_budget_catalog_sub_items` | Master catalog | Codex review |
| 2026-07-02 | Simplify Master Catalog authorization | Removed cross-module permission arrays and repository-backed authorization middleware; operational lookups are scoped in the service, while administration routes use `MASTER_CATALOG_PERMISSION` at the route boundary | Master catalog | User |
| 2026-07-02 | Approve Phase 2 and plan Phase 3 | User approved the current Master Catalog phase and requested the next phase plan with no implementation until approval | Master catalog, financial years | User |
| 2026-07-02 | Start and complete Phase 3 Financial Years | User approved continuing until the phase is completed; module now initializes redesigned financial-year workflow records and removes old route/controller/service/validator wrappers | Financial years | User |
| 2026-07-02 | Mark Phase 3 complete and prepare Phase 4 overview | User approved Phase 3 Financial Years and requested only the Phase 4 overview with no implementation | Financial years, department budgets | User |
| 2026-07-02 | Start Phase 4 Department Budgets implementation | User approved implementing Phase 4 after the business scope and Budget Entry UI/UX direction were documented | Department budgets | User |
| 2026-07-02 | Keep Phase 4 in review after automated validation | Automated checks pass, but module completion requires live DB/UI verification of Department Budget Entry against initialized redesigned tables | Department budgets | Codex review |
| 2026-07-04 | Mark Phase 4 Department Budgets complete | User explicitly approved marking Phase 4 finished after implementation, automated validation, documentation updates, and review | Department budgets | User |
| 2026-07-04 | Split Phase 5 into separately validated subphases | User requested smaller testable slices because the combined Category Review, Package, and CFO workflow is too large for one implementation pass | Phase 5A, 5B, 5C, 5D | User |
| 2026-07-04 | Complete Phase 5A Category Manager Review | Implemented category-scoped review queue, item decisions, completion, frontend page, notifications, tests, and validation | Category review | User-approved Phase 5A scope |
| 2026-07-05 | Revise Phase 5 workflow before 5C | Removed the active return-to-HOD correction cycle; Category Manager now records approved quantities and notes, HOD sees reviewed decisions read-only, and package demand will use approved quantities | Department budgets, category review, future category packages | User-approved revised workflow |
| 2026-07-05 | Complete Phase 5B Category Submission Windows | Implemented assigned-category submission window read/close/reopen controls in the category-review module, with backend scope enforcement, audit, workflow history, notifications, frontend UI, tests, and validation | Category review, category submission windows | User-approved Phase 5B scope |
| 2026-07-07 | Complete Phase 5C Category Package Preparation and Reconciliation by user approval | Implemented package workbench, shared model and pricing workflow, department allocations, reconciliation, attachments, and Excel quantity import; user approved Phase 5C closure | Category packages | User |
| 2026-07-07 | Implement Phase 5D CFO Review | Added new-workflow CFO review backend module and frontend page, precise CFO package permissions, item-level decisions, package return/completion, notifications, and Category Manager edit locks for returned items | CFO review, category packages, notifications | User-approved Phase 5D scope |
| 2026-07-03 | Frontend may be refactored freely by workflow domain during owning module phases | The new workflow should not be layered on top of old frontend architecture; old frontend files, API wrappers, hooks, pages, and components may be moved, split, renamed, replaced, or deleted after import/reference checks and validation. This supersedes earlier frontend-folder-preservation guidance while leaving backend modular rules unchanged. | All frontend workflow areas; backend unaffected | User |

## 17. Validation Log

| Date | Phase | Command or Scenario | Result | Notes |
|---|---|---|---|---|
| 2026-07-01 | Planning | Repository and workflow documentation inspection | Completed | App still uses legacy workflow tables |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/access.constants.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/access.service.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/access.repository.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/workspace.mapper.js` | Passed | Static syntax check before mapper rename |
| 2026-07-01 | Phase 1 | `node --check server/shared/middleware/resolveBudgetWorkspace.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/shared/middleware/requireBudgetPermission.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/repositories/notificationRecipients.repository.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/repositories/audit.repository.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/utils/audit.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/tests/modules/access-management/access.constants.test.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `node --check server/tests/modules/access-management/access.service.test.js` | Passed | Static syntax check |
| 2026-07-01 | Phase 1 | `cd server; npm.cmd test` | Blocked | `vitest` is not installed in `server/node_modules/.bin` |
| 2026-07-01 | Phase 1 | Client build readiness check | Blocked | `vite` is not installed in `client/node_modules/.bin`; build not run |
| 2026-07-01 | Phase 1 | `cd server; npm.cmd test -- tests/modules/access-management` | Passed | Final targeted run: 2 test files passed, 6 tests passed |
| 2026-07-01 | Phase 1 | `cd client; npm.cmd run build` | Passed | Final build: Vite v8.0.10 transformed 3170 modules and built successfully |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/access.constants.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/access.repository.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/access.service.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/access.validators.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | `node --check server/modules/access-management/workspace.mapper.js` | Passed | Final syntax check before mapper rename |
| 2026-07-01 | Phase 1 | `node --check server/shared/middleware/resolveBudgetWorkspace.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | `node --check server/shared/middleware/requireBudgetPermission.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | `node --check server/repositories/notificationRecipients.repository.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | `node --check server/repositories/audit.repository.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | `node --check server/utils/audit.js` | Passed | Final syntax check |
| 2026-07-01 | Phase 1 | Removed permission-column scan across Phase 1 access paths | Passed | `rg` returned no matches for removed permission-column usage in access resolver, repositories, middleware, and notification recipient lookup |
| 2026-07-01 | Phase 1 | `cd client; npx.cmd eslint src/pages/BudgetAccessManagementPage.jsx src/helpers/permissions.js src/context/RequirePermission.jsx` | Passed | Phase 1 access page/helper/guard lint clean |
| 2026-07-01 | Phase 1 | `cd server; npm.cmd test` | Failed unrelated | All tests passed, but Vitest reported one unhandled DB configuration error from legacy item-request test path; excluded from Phase 1 decision per user instruction |
| 2026-07-01 | Phase 1 | `cd client; npm.cmd run lint` | Failed unrelated | Project-wide lint has pre-existing unrelated errors; Phase 1 access page/helper/guard targeted lint passed |
| 2026-07-01 | Phase 1 architecture cleanup | `node --check server/server.js` | Passed | Server mounts `modules/access-management/access.routes.js` directly |
| 2026-07-01 | Phase 1 architecture cleanup | `node --check server/modules/access-management/access.routes.js` | Passed | Module router syntax check |
| 2026-07-01 | Phase 1 architecture cleanup | `node --check server/modules/access-management/access.controller.js` | Passed | Module controller syntax check |
| 2026-07-01 | Phase 1 architecture cleanup | `node --check server/modules/access-management/access.mapper.js` | Passed | Renamed module mapper syntax check |
| 2026-07-01 | Phase 1 architecture cleanup | `node --check server/shared/auth/verifyPortalJwt.js` | Passed | Generic auth middleware moved to shared/auth |
| 2026-07-01 | Phase 1 architecture cleanup | `cd server; npm.cmd test -- tests/modules/access-management` | Passed | Final targeted run after route/controller consolidation: 2 files, 7 tests |
| 2026-07-01 | Phase 1 architecture cleanup | `cd client; npm.cmd run build` | Passed | Vite v8.0.10 transformed 3170 modules and built successfully after backend route consolidation |
| 2026-07-01 | Phase 1 architecture cleanup | Old access-wrapper import scan | Passed | `rg` found no old Access Management wrapper importers |
| 2026-07-01 | Phase 1 architecture cleanup | Removed permission-column SQL scan | Passed | `rg "bur\\.can_|brp\\.can_|COALESCE\\([^\\r\\n]*can_"` returned no matches in Phase 1 access/shared paths |
| 2026-07-01 | Phase 1 architecture cleanup | `cd server; npm.cmd test -- tests/modules/access-management` after deleting unmounted `userRole.*` and duplicate `budgetRoles.repository.js` | Passed | 2 files, 7 tests |
| 2026-07-01 | Phase 1 architecture cleanup | `node --check server/server.js` after deleting unmounted `userRole.*` and duplicate `budgetRoles.repository.js` | Passed | Server composition syntax check |
| 2026-07-01 | Phase 1 architecture cleanup | `cd client; npm.cmd run build` after final cleanup | Passed | Vite v8.0.10 transformed 3170 modules and built successfully |
| 2026-07-01 | Phase 1 isolation review | Reverted unrelated old-route middleware import compatibility patches | Passed | `server/routes/poItemMappings.routes.js`, `server/routes/projects.routes.js`, `server/routes/transfer.routes.js`, and other unmigrated old routes remain on legacy middleware until their own module phases |
| 2026-07-01 | Phase 1 isolation review | Reverted notification recipient normalized-permission migration | Passed | Notification permission lookup belongs to future notification/business-module migration; final `git diff -- server/repositories/notificationRecipients.repository.js` showed no content diff, only a line-ending warning |
| 2026-07-01 | Phase 1 isolation review | `cd server; npm.cmd test -- tests/modules/access-management` | Passed | 2 test files passed, 7 tests passed |
| 2026-07-01 | Phase 1 isolation review | `cd client; npm.cmd run build` | Passed | Vite v8.0.10 transformed 3170 modules and built successfully |
| 2026-07-01 | Phase 1 isolation review | `node --check server/server.js` | Passed | Server composition syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/modules/access-management/access.routes.js` | Passed | Module router syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/modules/access-management/access.controller.js` | Passed | Module controller syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/modules/access-management/access.service.js` | Passed | Module service syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/modules/access-management/access.repository.js` | Passed | Module repository syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/modules/access-management/access.constants.js` | Passed | Module constants syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/modules/access-management/access.mapper.js` | Passed | Module mapper syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/modules/access-management/access.validators.js` | Passed | Module validators syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/shared/auth/verifyPortalJwt.js` | Passed | Shared auth syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/shared/middleware/resolveBudgetWorkspace.js` | Passed | Shared workspace middleware syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/shared/middleware/requireBudgetPermission.js` | Passed | Shared permission middleware syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/middleware/verifyPortalJwt.middleware.js` | Passed | Temporary legacy auth containment syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/middleware/verifyBudgetAccess.middleware.js` | Passed | Temporary legacy workspace containment syntax check |
| 2026-07-01 | Phase 1 isolation review | `node --check server/middleware/permission.middleware.js` | Passed | Temporary legacy permission containment syntax check |
| 2026-07-01 | Phase 1 isolation review | `rg "shared/(auth\|middleware)" server/routes/poItemMappings.routes.js server/routes/projects.routes.js server/routes/transfer.routes.js` | Passed | No matches; the explicitly named future-module routes were not patched to shared middleware |
| 2026-07-01 | Phase 1 isolation review | Removed permission-column SQL scan in Access paths | Passed | `rg "r\\.(can_|\\[can_)|bur\\.(can_|\\[can_)|brp\\.(can_|\\[can_)|COALESCE\\([^\\r\\n]*can_" server/modules/access-management server/shared/middleware server/shared/auth` returned no matches |
| 2026-07-01 | Phase 1 isolation review | `git diff --stat -- server/package-lock.json client/package-lock.json` | Completed | Dependency installation changed both lockfiles: 75 insertions and 6 deletions |
| 2026-07-01 | Phase 1 override completion | `node --check server/modules/access-management/access.routes.js` | Passed | Module router syntax check after override endpoints |
| 2026-07-01 | Phase 1 override completion | `node --check server/modules/access-management/access.controller.js` | Passed | Module controller syntax check after override handlers |
| 2026-07-01 | Phase 1 override completion | `node --check server/modules/access-management/access.service.js` | Passed | Module service syntax check after override transaction service |
| 2026-07-01 | Phase 1 override completion | `node --check server/modules/access-management/access.repository.js` | Passed | Module repository syntax check after permission matrix and override replacement queries |
| 2026-07-01 | Phase 1 override completion | `node --check server/modules/access-management/access.validators.js` | Passed | Module validators syntax check after override payload validation |
| 2026-07-01 | Phase 1 override completion | `node --check server/tests/modules/access-management/access.service.test.js` | Passed | Access service test syntax check |
| 2026-07-01 | Phase 1 override completion | `cd server; npm.cmd test -- tests/modules/access-management` | Passed | 2 test files passed, 8 tests passed |
| 2026-07-01 | Phase 1 override completion | `cd client; npx.cmd eslint src/pages/BudgetAccessManagementPage.jsx src/helpers/permissions.js src/context/RequirePermission.jsx src/hooks/budget-access/useBudgetAccessAssignments.js src/api/budgetAccessAssignments.api.js` | Passed | Focused Access frontend lint passed |
| 2026-07-01 | Phase 1 override completion | `cd client; npm.cmd run build` | Passed | Vite v8.0.10 transformed 3170 modules and built successfully |
| 2026-07-01 | Phase 1 override completion | Removed permission-column SQL scan in Access paths | Passed | `rg "r\\.(can_|\\[can_)|bur\\.(can_|\\[can_)|brp\\.(can_|\\[can_)|COALESCE\\([^\\r\\n]*can_" server/modules/access-management server/shared/middleware server/shared/auth` returned no matches |
| 2026-07-01 | Phase 1 workspace UI completion | Approved UI decision | Completed | Existing `DashboardLayout` user card is the only permanent workspace control; clicking it opens desktop modal/mobile full-screen dialog |
| 2026-07-01 | Phase 1 workspace UI completion | `cd client; npx.cmd eslint src/layouts/DashboardLayout.jsx src/context/AuthContext.jsx src/api/api.js src/api/workspaceHeader.js src/context/RequirePermission.jsx src/components/WorkspaceSelectionDialog.jsx src/helpers/workspaceLabels.js` | Passed | Focused workspace UI/auth/header lint passed with no warnings |
| 2026-07-01 | Phase 1 workspace UI completion | `cd client; npm.cmd run build` | Passed | Vite v8.0.10 transformed 3173 modules and built successfully |
| 2026-07-01 | Phase 1 workspace UI completion | `cd server; npm.cmd test -- tests/modules/access-management` | Passed | 2 test files passed, 8 tests passed |
| 2026-07-01 | Phase 1 workspace switch regression | Static click-path trace | Completed | `WorkspaceSelectionDialog` option button passes `onClick={() => onSelect?.(workspace.userRoleId)}` and disables only the selected option or switching state; `DashboardLayout` delegates to `switchWorkspace(userRoleId)` |
| 2026-07-01 | Phase 1 workspace switch regression | Root cause | Fixed in code | `client/src/api/api.js` request interceptor always wrote `x-budget-user-role-id` from the previous workspace bridge state, which could overwrite the explicit new assignment id passed by `switchWorkspace` to `/auth/me` |
| 2026-07-01 | Phase 1 workspace switch regression | Fix | Completed | `client/src/api/api.js` now preserves an explicit request-level `x-budget-user-role-id`; `client/src/context/AuthContext.jsx` sets the workspace header bridge to the requested assignment id before calling `/auth/me` and restores the previous bridge value on failure |
| 2026-07-01 | Phase 1 workspace switch regression | `node --check server/modules/access-management/access.service.js` | Passed | Backend selected-workspace service syntax check |
| 2026-07-01 | Phase 1 workspace switch regression | `node --check server/shared/middleware/resolveBudgetWorkspace.js` | Passed | Backend header parsing middleware syntax check |
| 2026-07-01 | Phase 1 workspace switch regression | `cd server; npm.cmd test -- tests/modules/access-management` | Passed | 2 test files passed, 8 tests passed; selected-workspace service test now passes requested assignment id as string to cover header/localStorage normalization |
| 2026-07-01 | Phase 1 workspace switch regression | `cd client; npm.cmd run build` | Passed | Vite v8.0.10 transformed 3173 modules and built successfully |
| 2026-07-01 | Phase 1 workspace switch regression | `cd client; npx.cmd eslint client/src/components/WorkspaceSelectionDialog.jsx client/src/layouts/DashboardLayout.jsx client/src/context/AuthContext.jsx client/src/api/api.js client/src/api/workspaceHeader.js client/src/context/RequirePermission.jsx` | Failed command invocation | Command was run from `client`, so repo-root file patterns did not match; rerun with client-relative paths passed |
| 2026-07-01 | Phase 1 workspace switch regression | `cd client; npx.cmd eslint src/components/WorkspaceSelectionDialog.jsx src/layouts/DashboardLayout.jsx src/context/AuthContext.jsx src/api/api.js src/api/workspaceHeader.js src/context/RequirePermission.jsx` | Passed | Focused workspace selector/auth/API lint passed |
| 2026-07-01 | Phase 1 workspace switch regression | Manual HOD to Category Manager browser verification | Passed | User later verified live switching between `HOD - Information Technology Department` and `Category Budget Manager - IT Category`; final live verification entries below preserve the detailed results |
| 2026-07-01 | Final Phase 1 audit | Documentation refresh | Completed | Read root `AGENTS.md`; no nested `AGENTS.md` files exist; read current files in `docs/codexContext/newWorkFlow`, including database scope, modular architecture target, quick guide, detailed planning workflow, README, and this plan |
| 2026-07-01 | Final Phase 1 audit | PDF extraction check | Tool unavailable | `where.exe pdftotext` returned no executable and Python check showed `pypdf False`, `pdfplumber False`; corresponding Markdown source documents were read and treated as authoritative text |
| 2026-07-01 | Final Phase 1 audit | Module ownership review | Passed | Access Management business backend files are owned by `server/modules/access-management`; `server/server.js` mounts the module router directly; old Access Management global wrappers were removed |
| 2026-07-01 | Final Phase 1 audit | Role-scope validation review | Passed with DB-trigger caveat | Service validation and tests enforce department/category/global role-scope rules. Repository documentation does not include trigger DDL; database scope says live trigger coverage must not be assumed from uploaded table-only DDL |
| 2026-07-01 | Final Phase 1 audit | `cd server; npm.cmd test -- tests/modules/access-management` | Passed | 2 test files passed, 8 tests passed |
| 2026-07-01 | Final Phase 1 audit | `cd client; npm.cmd run build` | Passed | Vite v8.0.10 transformed 3173 modules and built successfully |
| 2026-07-01 | Final Phase 1 audit | `cd client; npx.cmd eslint src/pages/BudgetAccessManagementPage.jsx src/components/WorkspaceSelectionDialog.jsx src/context/AuthContext.jsx src/layouts/DashboardLayout.jsx src/api/api.js src/api/workspaceHeader.js src/helpers/permissions.js src/helpers/workspaceLabels.js src/context/RequirePermission.jsx src/hooks/budget-access/useBudgetAccessAssignments.js src/api/budgetAccessAssignments.api.js` | Passed | Focused Phase 1 frontend lint passed |
| 2026-07-01 | Final Phase 1 audit | `node --check server/server.js` | Passed | Server composition syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/modules/access-management/access.routes.js` | Passed | Module router syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/modules/access-management/access.controller.js` | Passed | Module controller syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/modules/access-management/access.service.js` | Passed | Module service syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/modules/access-management/access.repository.js` | Passed | Module repository syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/modules/access-management/access.validators.js` | Passed | Module validators syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/modules/access-management/access.mapper.js` | Passed | Module mapper syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/modules/access-management/access.constants.js` | Passed | Module constants syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/shared/auth/verifyPortalJwt.js` | Passed | Shared auth syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/shared/middleware/resolveBudgetWorkspace.js` | Passed | Shared workspace middleware syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/shared/middleware/requireBudgetPermission.js` | Passed | Shared permission middleware syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/tests/modules/access-management/access.service.test.js` | Passed | Access service test syntax check |
| 2026-07-01 | Final Phase 1 audit | `node --check server/tests/modules/access-management/access.constants.test.js` | Passed | Access constants test syntax check |
| 2026-07-01 | Final Phase 1 audit | Old table scan in Phase 1 paths | Passed | `rg` returned no matches for removed table names in Access Management module, shared auth/middleware, workspace UI/auth files, and Access tests |
| 2026-07-01 | Final Phase 1 audit | Removed permission-column SQL scan in Phase 1 backend paths | Passed | `rg` returned no matches for old boolean permission column SQL usage in `server/modules/access-management`, `server/shared/auth`, or `server/shared/middleware` |
| 2026-07-01 | Final Phase 1 audit | Old Access Management wrapper import scan | Passed | `rg` returned no matches for deleted Access Management route/controller/service/repository/validator wrapper imports |
| 2026-07-01 | Final Phase 1 audit | Trigger DDL repository scan | Not confirmed | `rg` found no checked-in role-scope trigger DDL for `BS_budget_user_roles`; service validation remains authoritative unless the live database is separately inspected |
| 2026-07-01 | Final Phase 1 live verification | HOD -> Category Manager | Passed | User verified live browser switch from `HOD - Information Technology Department` to `Category Budget Manager - IT Category` |
| 2026-07-01 | Final Phase 1 live verification | Category Manager -> HOD | Passed | User verified live browser switch back to `HOD - Information Technology Department` |
| 2026-07-01 | Final Phase 1 live verification | Header card update | Passed | User verified header card updates after switching |
| 2026-07-01 | Final Phase 1 live verification | Workspace selection now works | Passed | User verified selected assignment works as expected |
| 2026-07-02 | Phase 2 authorization correction | `node --check server\modules\master-catalog\masterCatalog.constants.js` | Passed | Source syntax check |
| 2026-07-02 | Phase 2 authorization correction | `node --check server\modules\master-catalog\masterCatalog.routes.js` | Passed | Source syntax check |
| 2026-07-02 | Phase 2 authorization correction | `node --check server\modules\master-catalog\masterCatalog.controller.js` | Passed | Source syntax check |
| 2026-07-02 | Phase 2 authorization correction | `node --check server\modules\master-catalog\masterCatalog.service.js` | Passed | Source syntax check |
| 2026-07-02 | Phase 2 authorization correction | `npm.cmd test -- tests/modules/master-catalog` from `server` | Passed | 4 test files passed, 19 tests passed; middleware authorization tests were removed and scope is covered through service tests |
| 2026-07-02 | Phase 2 authorization correction | `rg "masterCatalog.authorization\|CATALOG_CATEGORY_READ_PERMISSIONS\|CATALOG_ITEM_READ_PERMISSIONS\|CATALOG_UNIT_READ_PERMISSIONS\|CATALOG_SUB_ITEM_READ_PERMISSIONS\|DEPARTMENT_CATALOG_LOOKUP_PERMISSIONS\|CATEGORY_CATALOG_LOOKUP_PERMISSIONS\|MANAGE_BUDGET_ACCESS_PERMISSION\|requireAnyMasterCatalogPermission\|requireCatalogCategoryScope\|requireCatalogItemCategoryScope" server\modules\master-catalog server\tests\modules\master-catalog` | Passed | No matches in Master Catalog source/tests |
| 2026-07-02 | Phase 2 authorization correction | `npm.cmd run build` from `client` | Passed | Client build still passes; no frontend files changed for this authorization correction |
| 2026-07-02 | Phase 2 authorization correction | `node --check server\tests\modules\master-catalog\masterCatalog.service.test.js` and `node --check server\tests\modules\master-catalog\masterCatalog.routes.test.js` | Not run | Windows sandbox returned `CreateProcessAsUserW failed: 5`; Vitest successfully parsed and executed both test modules |

## 18. Phase 1 Implementation Summary

Status: `COMPLETED`

Actual files created:

- `server/modules/access-management/access.constants.js`
- `server/modules/access-management/access.controller.js`
- `server/modules/access-management/access.mapper.js`
- `server/modules/access-management/access.repository.js`
- `server/modules/access-management/access.routes.js`
- `server/modules/access-management/access.service.js`
- `server/modules/access-management/access.validators.js`
- `server/shared/auth/verifyPortalJwt.js`
- `server/shared/middleware/resolveBudgetWorkspace.js`
- `server/shared/middleware/requireBudgetPermission.js`
- `server/tests/modules/access-management/access.constants.test.js`
- `server/tests/modules/access-management/access.service.test.js`
- `client/src/api/workspaceHeader.js`
- `client/src/components/WorkspaceSelectionDialog.jsx`
- `client/src/helpers/workspaceLabels.js`

Actual files modified:

- `server/server.js`
- `server/utils/audit.js`
- `server/repositories/audit.repository.js`
- `client/src/context/AuthContext.jsx`
- `client/src/context/RequirePermission.jsx`
- `client/src/helpers/permissions.js`
- `client/src/api/budgetAccessAssignments.api.js`
- `client/src/hooks/budget-access/useBudgetAccessAssignments.js`
- `client/src/api/api.js`
- `client/src/context/AuthContext.jsx`
- `client/src/layouts/DashboardLayout.jsx`
- `client/src/pages/BudgetAccessManagementPage.jsx`

Actual Access Management wrapper files removed:

- `server/routes/budgetAccessAssignments.routes.js`
- `server/routes/budgetAccessUsers.routes.js`
- `server/routes/budgetAccessDepartments.routes.js`
- `server/routes/budgetAccessRoles.routes.js`
- `server/controllers/budgetAccessAssignments.controller.js`
- `server/controllers/budgetAccessUsers.controller.js`
- `server/controllers/budgetAccessDepartments.controller.js`
- `server/controllers/budgetAccessRoles.controller.js`
- `server/services/budgetAccessAssignments.service.js`
- `server/services/budgetAccessUsers.service.js`
- `server/services/budgetAccessDepartments.service.js`
- `server/services/budgetAccessRoles.service.js`
- `server/repositories/budgetAccessAssignments.repository.js`
- `server/repositories/budgetAccessUsers.repository.js`
- `server/repositories/budgetAccessDepartments.repository.js`
- `server/repositories/budgetAccessRoles.repository.js`
- `server/repositories/userRole.repository.js`
- `server/repositories/budgetRoles.repository.js`
- `server/validators/budgetAccessAssignments.validator.js`

Implemented behavior:

- Runtime budget access now resolves active `BS_budget_user_roles.id` assignments as workspaces.
- Effective permissions now come from `BS_budget_role_permissions`, `BS_budget_permissions`, and `BS_budget_user_permission_overrides`.
- DENY overrides remove permissions after role defaults and GRANT overrides are combined.
- `x-budget-user-role-id` or `x-budget-workspace-id` can select a workspace; missing header defaults to newest active assignment for temporary compatibility.
- Existing API paths are preserved while `server/server.js` mounts the Access Management module router directly at `/api/admin/budget-access`.
- Access assignment create/update no longer writes removed permission boolean columns.
- Access assignment permission override administration now reads active `BS_budget_permissions`, role defaults from `BS_budget_role_permissions`, and active GRANT/DENY rows from `BS_budget_user_permission_overrides`.
- Access assignment permission override replacement runs in one SQL transaction, deactivating removed overrides and merging current GRANT/DENY selections.
- Access assignment scope validation uses role codes and enforces department/category/global scope rules.
- Access admin routes now use `can_manage_budget_access`.
- Technical audit writes now include workspace metadata columns from `BS_audit_logs`.
- Frontend permission helpers support normalized permission codes and temporary legacy aliases.
- `BudgetAccessManagementPage.jsx` now edits user role assignments by user, role, department scope, category scope, and assignment-specific GRANT/DENY permission overrides.
- The existing `DashboardLayout` user card is now the active workspace control and remains the only permanent workspace indicator in the header.
- The header card displays the signed-in user and selected assignment as `<Role Label> - <Scope Label>` using the selected workspace's role and scope fields, not inferred permissions.
- Workspace selection persists the exact `BS_budget_user_roles.id` per authenticated user as `budgetWorkspaceId:<userId>`.
- Authenticated API requests send `x-budget-user-role-id` when a valid selected workspace exists.
- Invalid saved workspace IDs are removed; one active assignment is selected automatically, and multiple active assignments require explicit selection.
- Workspace switching refreshes `/auth/me`, replaces `budgetAccess`, clears React Query cache, rebuilds sidebar/navigation from the replacement permissions, and redirects to `/` if the current route is no longer permitted.
- Workspace switching failure preserves the previous active workspace and shows an error.
- `WorkspaceSelectionDialog` groups assignments by Department, Category, and Global workspaces and supports selected indicator text/icon, Escape close, focus containment, backdrop close, close button, and focus return.

Implemented APIs and contracts:

- Existing `/api/auth/me` route continues to use the same route path but now receives `req.budgetAccess` from the modular resolver.
- Existing `/api/admin/budget-access/assignments` route path is preserved.
- Existing `/api/admin/budget-access/roles` route path is preserved and returns active roles with `role_code`.
- Existing budget access user/department lookup routes are preserved and protected by `can_manage_budget_access`.
- Added `GET /api/admin/budget-access/assignments/:id/permission-overrides`.
- Added `PUT /api/admin/budget-access/assignments/:id/permission-overrides` with payload `{ overrides: [{ permission_id, action: "GRANT" | "DENY" }] }`; omitted permissions inherit from the role.
- Existing `/api/auth/me` is reused for workspace refresh; selected assignment is supplied through `x-budget-user-role-id`.

Tables and query ownership:

- Phase 1 active access queries use `BS_budget_user_roles`, `BS_budget_roles`, `BS_budget_permissions`, `BS_budget_role_permissions`, `BS_budget_user_permission_overrides`, `BS_departments`, `BS_budget_categories`, and `users`.
- Phase 1 audit writes use `BS_audit_logs`.

Legacy code intentionally still present after Phase 1:

- Legacy business modules still check old permission names through old global middleware. Those files are temporary startup containment only and must be removed when each owning module is migrated.
- Legacy notification owner lookups still reference old business tables such as `BS_budgets`, `BS_budget_transfers`, and `BS_PO_LINKS`. These are deferred to the corresponding business-module migrations.
- Old Access Management global wrappers were removed; there is no permanent old-path forwarding layer for Access Management CRUD.
- Unrelated route middleware-import changes were reverted for `server/routes/poItemMappings.routes.js`, `server/routes/projects.routes.js`, `server/routes/transfer.routes.js`, and other unmigrated legacy routes.

Validation outcome:

- Phase 1 targeted access-management tests passed after architecture cleanup: 2 files, 7 tests.
- Phase 1 targeted access-management tests passed after override completion: 2 files, 8 tests.
- Client production build passed.
- Focused Access frontend lint passed.
- Focused workspace UI/auth/header lint passed.
- Phase 1 backend syntax checks passed.
- Removed permission-column scan passed for Phase 1 access resolver, repositories, and shared Access Management middleware.
- Old Access Management wrapper import scan passed after deleting wrappers.
- No Phase 1-specific automated test or build blocker remains after the workspace switch header fix.
- Project-wide server/client validation still has unrelated legacy/pre-existing issues outside Phase 1 scope; these are not blockers for Phase 1 completion.
- Live browser verification passed with one user that has both `HOD - Information Technology Department` and `Category Budget Manager - IT Category` assignments.
- Final Phase 1 audit completed on 2026-07-01. Phase 1 is `COMPLETED`.
- Dependency installation modified `server/package-lock.json` and `client/package-lock.json`; earlier lockfile review showed 2 files changed with 75 insertions and 6 deletions.

## 19. Phase 2 Plan - Master Catalog

Status: `IN_REVIEW`  
Implementation started: `NO`

### Recommended Module

Phase 2 should be `master-catalog`.

Reason:

- Access Management is now complete and provides exact active workspace and normalized permission enforcement.
- Financial-year opening requires stable active departments and exactly three active budget categories.
- Department-budget entry requires active generic catalog items grouped by budget category.
- Category package preparation requires reusable catalog sub-items, including one active `General` sub-item per catalog item.
- Current catalog implementation still uses removed `BS_budget_types` and "type/item" terminology.

### Candidate Comparison

| Candidate | Advantages | Disadvantages / Risk | Decision |
|---|---|---|---|
| Master catalog | Establishes departments, categories, UOM, generic catalog items, and reusable sub-items needed by later modules; current implementation has clear obsolete-table usage | Requires replacing old category/type setup UI terminology and old item-request approval behavior | Recommended |
| Financial years | Natural next workflow step after access; existing page already has open/pre-close/close controls | Opening a year depends on active departments/categories and later creates department budgets, windows, and packages; doing it before catalog risks weak initialization rules | Defer to Phase 3 |
| Department budgets | High workflow value for HOD entry | Depends on financial-year initialization, catalog items, and category windows | Defer until catalog and financial years are stable |

### Exact Scope

Phase 2 includes:

- Move/rewrite catalog backend into `server/modules/master-catalog`.
- Replace old `BS_budget_types` usage with:
  - `BS_budget_categories`
  - `BS_units_of_measure`
  - `BS_budget_catalog_items`
  - `BS_budget_catalog_sub_items`
- Manage budget categories as the approved responsibility categories. Creation/deactivation rules must preserve the invariant that the system has exactly the approved responsibility categories for workflow use unless a later database-approved change says otherwise.
- Manage generic catalog items under a budget category.
- Manage reusable catalog sub-items under a catalog item.
- Ensure every catalog item has exactly one active reusable `General` sub-item.
- Update the existing frontend setup page/API/hooks in place without reorganizing frontend folders.
- Remove old category/type backend wrappers after verification.

### Explicit Exclusions

Phase 2 does not implement:

- Financial-year opening or initialization.
- Department annual budgets or department category budgets.
- Department requested items and distributions.
- Category Manager review.
- Category submission windows.
- Category package preparation or year-specific package sub-items.
- CFO review.
- Change requests.
- Transfers.
- PO catalog mappings or PO linking.
- Reports/dashboard rewrite.

### Owned Database Tables

Primary owned tables:

- `BS_budget_categories`
- `BS_units_of_measure`
- `BS_budget_catalog_items`
- `BS_budget_catalog_sub_items`

Read dependencies:

- `users` only for audit actor context.
- `BS_budget_user_roles` and normalized permission tables only through Access Management middleware.

Tables that must not be used in Phase 2:

- `BS_budget_types`
- `BS_budget_sub_items`
- `BS_budget_items`
- `BS_department_budget_request_items`
- `BS_category_type_reviews`
- `BS_category_type_review_sub_items`

### Current Old Implementation

Current backend files:

- `server/routes/category.routes.js`
- `server/controllers/category.controller.js`
- `server/services/category.service.js`
- `server/repositories/category.repository.js`
- `server/validators/category.validator.js`

Current frontend files:

- `client/src/pages/BudgetSetupPage.jsx`
- `client/src/api/budgetSetup.api.js`
- `client/src/hooks/budgets/useBudgetSetup.js`

Current related item-request files to inspect before implementation:

- `server/routes/itemRequest.routes.js`
- `server/controllers/itemRequest.controller.js`
- `server/services/itemRequest.service.js`
- `server/repositories/itemRequest.repository.js`
- `server/validators/itemRequest.validator.js`

The item-request path may be obsolete catalog-request workflow or may need to be split between Master Catalog and future Category Review. Do not rewrite it in Phase 2 unless it is strictly part of catalog administration and can be completed end to end.

### Current-To-New Gaps

| Area | Current | Required | Action |
|---|---|---|---|
| Generic items | `BS_budget_types` under category | `BS_budget_catalog_items` under `BS_budget_categories` | Rewrite repository/API response contracts |
| Sub-items | Old `BS_budget_sub_items` concepts are not owned by current setup path | `BS_budget_catalog_sub_items` reusable records | Add sub-item APIs and UI controls |
| General sub-item | Not enforced by current setup path | Exactly one active reusable `General` sub-item per catalog item | Service transaction on catalog item creation; validation tests |
| Units | Not represented in old type setup | `BS_units_of_measure` supports catalog item/sub-item UOM | Add read APIs and UI selection where required |
| Terminology | "type/item" | "catalog item" and "reusable sub-item" | Update UI labels/API DTOs and reorganize frontend API/component boundaries when useful for the new workflow |
| Permissions | Legacy `can_manage_categories` in old routes/navigation | Normalized `can_manage_budget_catalog` | Module routes use exact normalized permission; legacy alias remains only for unmigrated navigation until its owning route phase |

### Target Backend Module Tree

```text
server/modules/master-catalog/
  masterCatalog.constants.js
  masterCatalog.controller.js
  masterCatalog.mapper.js
  masterCatalog.repository.js
  masterCatalog.routes.js
  masterCatalog.service.js
  masterCatalog.validators.js

server/tests/modules/master-catalog/
  masterCatalog.service.test.js
  masterCatalog.constants.test.js
```

Exact filenames may be adjusted to match implementation details, but business-specific catalog code must live in `server/modules/master-catalog`.

### Shared Infrastructure Used

- `server/shared/auth/verifyPortalJwt.js`
- `server/shared/middleware/resolveBudgetWorkspace.js`
- `server/shared/middleware/requireBudgetPermission.js`
- existing transaction helper `server/database/transaction.js` unless moved later to `server/shared/database`
- audit writer infrastructure through existing `server/utils/audit.js` / `server/repositories/audit.repository.js` until shared audit cleanup phase

### Repositories and SQL

Repository queries must:

- use only current catalog tables;
- parameterize all inputs;
- use trigger-safe `OUTPUT ... INTO` when writing to trigger-bearing tables;
- create catalog item and its default `General` reusable sub-item atomically;
- prevent duplicate active catalog item names/codes within a category;
- prevent duplicate reusable sub-item names/codes within a catalog item;
- enforce one active `General` reusable sub-item per catalog item through service/database constraints where available.

### Services and Transactions

Required service rules:

- Validate active category before creating a catalog item.
- Validate UOM existence when a catalog item or sub-item requires UOM.
- Create catalog item plus default `General` sub-item in one transaction.
- Prevent deactivating the only active `General` sub-item for a catalog item.
- Prevent duplicate `General` reusable sub-items.
- Use soft deactivation where historical references may exist.
- Do not allow frontend-submitted category or catalog IDs to bypass database existence checks.

### Routes and Controllers

Proposed route mount:

```text
server.js
  app.use("/api/master-catalog", masterCatalogRoutes)
```

Potential preserved compatibility endpoints may be considered only if they reduce frontend churn during Phase 2 and are removed before module completion or explicitly documented as frontend API compatibility. Do not keep old backend route wrappers permanently.

Proposed API surface:

- `GET /api/master-catalog/categories`
- `GET /api/master-catalog/units-of-measure`
- `GET /api/master-catalog/catalog-items`
- `POST /api/master-catalog/catalog-items`
- `PATCH /api/master-catalog/catalog-items/:id`
- `PATCH /api/master-catalog/catalog-items/:id/status`
- `GET /api/master-catalog/catalog-items/:id/sub-items`
- `POST /api/master-catalog/catalog-items/:id/sub-items`
- `PATCH /api/master-catalog/catalog-sub-items/:id`
- `PATCH /api/master-catalog/catalog-sub-items/:id/status`

Final API paths should be confirmed during implementation after reading current frontend call contracts.

### Permissions and Workspace Scope

- All write routes require exact normalized permission `can_manage_budget_catalog`.
- Read routes for setup/admin views may require `can_manage_budget_catalog` unless a read-only catalog use case is needed by another migrated module.
- Workspace resolution uses exact active `BS_budget_user_roles.id`; permissions must come from the selected assignment only.
- Do not infer catalog admin access from role names.

### Audit, History, and Notifications

- Technical audit required for catalog item/sub-item/category/UOM administration changes.
- Workflow history is not required for static master catalog administration unless a later approved rule says otherwise.
- Notifications are not required for Phase 2 catalog CRUD unless a catalog request approval flow is explicitly retained and migrated.

### Existing Frontend Files Affected

Expected files:

- `client/src/pages/BudgetSetupPage.jsx`
- `client/src/api/budgetSetup.api.js`
- `client/src/hooks/budgets/useBudgetSetup.js`
- `client/src/helpers/permissions.js` only if alias documentation/removal tracking must be updated
- `client/src/layouts/DashboardLayout.jsx` only if changing navigation permission from legacy alias to normalized catalog permission is in-scope and does not partially migrate unrelated pages

Frontend architecture was not reorganized during this phase because the existing setup page could be updated safely in place. This is not a permanent restriction; future frontend cleanup may split, rename, move, replace, or delete old workflow files after import/reference checks and validation.

### Tests

Backend tests:

- catalog item creation creates default `General` sub-item transactionally;
- duplicate item rejected;
- duplicate sub-item rejected;
- second active `General` sub-item rejected;
- deactivating only active `General` sub-item rejected;
- invalid category rejected;
- invalid UOM rejected;
- permission middleware requires `can_manage_budget_catalog`;
- transaction rollback when sub-item creation fails.

Frontend validation:

- focused lint for touched setup page/API/hooks;
- build succeeds;
- manual setup workflow for category item and sub-item management.

### End-To-End Scenarios

- Budget System Admin opens setup page with `can_manage_budget_catalog`.
- Admin creates a catalog item under IT and sees the automatic `General` sub-item.
- Admin adds a specific reusable sub-item under the item.
- Admin edits item/sub-item names and UOM where allowed.
- Admin cannot create duplicate item or duplicate `General` sub-item.
- Admin deactivates a non-General sub-item safely.
- User without `can_manage_budget_catalog` cannot access write APIs.

### Legacy Files Removed After Completion

Remove or replace after Phase 2 validation:

- `server/routes/category.routes.js`
- `server/controllers/category.controller.js`
- `server/services/category.service.js`
- `server/repositories/category.repository.js`
- `server/validators/category.validator.js`

Item-request files are removed in Phase 2 only if they are fully replaced by the Master Catalog module; otherwise assign them to the earliest safe owning phase with explicit reason.

### Temporary Containment

- Old route imports for unrelated modules remain untouched.
- If the old `/api/categories` route is needed briefly for frontend compatibility, document every importer and remove it before marking Phase 2 complete unless explicitly approved as a temporary frontend adapter with a removal phase.

### Risks

| Risk | Control |
|---|---|
| Confusing old "type" terminology with new catalog item/sub-item model | Rename DTOs and UI labels carefully; document compatibility mappings |
| Breaking pages that still expect `/categories/:id/types` | Update the existing setup API/hook/page together with backend; avoid partial compatibility wrappers |
| Missing default `General` sub-item | Transactional service tests and repository uniqueness checks |
| Over-broad catalog permission aliases | Use `can_manage_budget_catalog` in new module; keep legacy aliases only for unmigrated modules |
| Item-request workflow ambiguity | Classify before editing; do not partially migrate category review work into catalog phase |
| Financial-year phase blocked by catalog gaps | Completion criteria include active categories/items/sub-items readiness for financial-year and department-budget phases |

### Validation Commands

Use actual available scripts:

```powershell
cd D:\QNH-Budget-System-V2-Clean\server
npm.cmd test -- tests/modules/master-catalog

cd D:\QNH-Budget-System-V2-Clean\client
npm.cmd run build

cd D:\QNH-Budget-System-V2-Clean\client
npx.cmd eslint <touched frontend files>
```

Also run:

```powershell
node --check server\modules\master-catalog\masterCatalog.routes.js
node --check server\modules\master-catalog\masterCatalog.controller.js
node --check server\modules\master-catalog\masterCatalog.service.js
node --check server\modules\master-catalog\masterCatalog.repository.js
node --check server\modules\master-catalog\masterCatalog.validators.js
rg "<removed table names>" server\modules\master-catalog <touched frontend files>
rg "BS_budget_types|BS_budget_sub_items" server\modules\master-catalog <touched frontend files>
rg "server/routes/category|controllers/category|services/category|repositories/category" server client/src
```

### Completion Criteria

Phase 2 is complete only when:

- Master Catalog backend business code is owned by `server/modules/master-catalog`.
- APIs use current catalog tables only.
- Catalog item creation atomically creates exactly one reusable active `General` sub-item.
- Sub-item CRUD and deactivation rules work.
- Existing setup frontend works with the new API.
- Exact normalized permission `can_manage_budget_catalog` protects the module.
- Technical audit records catalog administration changes.
- Targeted module tests pass.
- Client build and focused lint pass.
- Old category/type backend wrappers are removed or explicitly documented with a removal phase.
- No Phase 2 code uses removed tables such as `BS_budget_types`.

## 20. Next Approved Action

Phase 2 is complete by user approval. Do not start Phase 3 implementation without explicit user approval of the Phase 3 plan.

## 20. Phase 2 Implementation Review - Master Catalog

Date updated: 2026-07-01

Status: IN_REVIEW

Phase 2 implementation is code-complete for the Master Catalog vertical slice. The module is not marked `COMPLETED` yet because live database and browser validation of the setup workflow is still required.

### Final Backend Module Tree

```text
server/modules/master-catalog/
â”œâ”€â”€ masterCatalog.constants.js
â”œâ”€â”€ masterCatalog.controller.js
â”œâ”€â”€ masterCatalog.mapper.js
â”œâ”€â”€ masterCatalog.repository.js
â”œâ”€â”€ masterCatalog.routes.js
â”œâ”€â”€ masterCatalog.service.js
â””â”€â”€ masterCatalog.validators.js
```

### Backend Files Created

| File | Purpose |
|---|---|
| `server/modules/master-catalog/masterCatalog.constants.js` | Master Catalog permission, category codes, expense types, General sub-item defaults, catalog-code normalization |
| `server/modules/master-catalog/masterCatalog.validators.js` | Request validation for categories, catalog items, reusable sub-items, and activation status |
| `server/modules/master-catalog/masterCatalog.mapper.js` | API response mapping for categories, units, catalog items, and sub-items |
| `server/modules/master-catalog/masterCatalog.repository.js` | SQL Server access for current Master Catalog tables |
| `server/modules/master-catalog/masterCatalog.service.js` | Catalog business rules, uniqueness checks, General sub-item enforcement, transaction boundaries |
| `server/modules/master-catalog/masterCatalog.controller.js` | Thin HTTP controller layer with audit calls |
| `server/modules/master-catalog/masterCatalog.routes.js` | Authenticated, workspace-resolved, permission-protected Master Catalog routes |

### Backend Files Modified

| File | Change |
|---|---|
| `server/server.js` | Mounted `masterCatalogRoutes` at `/api/master-catalog`; removed old `/api/categories` mount |
| `server/services/itemRequest.service.js` | Replaced old category/type service dependency with Master Catalog service calls for the existing catalog-request approval path only |

### Backend Files Removed

The old Master Catalog technical-layer wrapper chain was removed after route registration and imports moved to the module:

| Removed File | Replacement |
|---|---|
| `server/routes/category.routes.js` | `server/modules/master-catalog/masterCatalog.routes.js` |
| `server/controllers/category.controller.js` | `server/modules/master-catalog/masterCatalog.controller.js` |
| `server/services/category.service.js` | `server/modules/master-catalog/masterCatalog.service.js` |
| `server/repositories/category.repository.js` | `server/modules/master-catalog/masterCatalog.repository.js` |
| `server/validators/category.validator.js` | `server/modules/master-catalog/masterCatalog.validators.js` |

No temporary Master Catalog route/controller/service/repository compatibility wrapper remains.

### Frontend Files Modified

| File | Change |
|---|---|
| `client/src/api/budgetSetup.api.js` | Repointed setup calls from old category/type endpoints to `/master-catalog`; added units-of-measure fetch |
| `client/src/hooks/budgets/useBudgetSetup.js` | Added Master Catalog unit query hook and retained existing page hook shape |
| `client/src/pages/BudgetSetupPage.jsx` | Updated visible labels from type-based wording to catalog-item wording; switched setup page to Master Catalog API contract; replaced auto-selected category effect with derived `activeCategoryId` |

The frontend folder architecture was not reorganized.

### APIs Implemented

Mounted under:

```text
/api/master-catalog
```

Implemented routes:

```text
GET    /categories
POST   /categories
PATCH  /categories/:categoryId
DELETE /categories/:categoryId
GET    /categories/:categoryId/usage
GET    /categories/:categoryId/catalog-items
POST   /categories/:categoryId/catalog-items
GET    /catalog-items
PATCH  /catalog-items/:catalogItemId
PATCH  /catalog-items/:catalogItemId/status
GET    /catalog-items/:catalogItemId/usage
GET    /catalog-items/:catalogItemId/sub-items
POST   /catalog-items/:catalogItemId/sub-items
PATCH  /sub-items/:subItemId
PATCH  /sub-items/:subItemId/status
GET    /units-of-measure
```

All routes use authenticated budget workspace resolution. Permissions are route-specific:

- Operational read routes for active categories and category catalog items allow the existing department/category operational permissions that need selectable catalog data.
- Administrative dependency/usage routes and all mutation routes require exact normalized permission `can_manage_budget_catalog`.
- Category-scoped workspaces are restricted to their assigned `budget_category_id` where the route targets category-specific data.

### Database Tables Used

Phase 2 Master Catalog code uses current schema tables:

```text
BS_budget_categories
BS_units_of_measure
BS_budget_catalog_items
BS_budget_catalog_sub_items
```

Phase 2 scans found no Master Catalog references to removed tables:

```text
BS_budget_types
BS_budget_sub_items
BS_budget_items
BS_budgets
```

### Business Rules Implemented

- Only the supported responsibility categories are accepted: `IT`, `BIOMEDICAL`, `GENERAL`.
- Catalog items are unique by code globally and by name within category.
- Creating a catalog item is transactional and creates its required reusable `General` sub-item.
- Every default General sub-item must use code `GENERAL`.
- A second active General sub-item is rejected.
- The default General sub-item cannot be changed to non-General.
- The default General sub-item cannot be deactivated.
- Category deactivation is blocked during this migration to preserve the exact three responsibility categories.
- Repository writes use `OUTPUT ... INTO` table variables instead of direct `OUTPUT INSERTED.*`.

### Audit Behavior

The Master Catalog controller writes technical audit events for category, catalog-item, and sub-item create/update/status operations using the existing audit infrastructure. Workflow-history events are not required for Phase 2 catalog administration.

### Validation Commands And Results

| Command | Result |
|---|---|
| `node --check server\modules\master-catalog\masterCatalog.constants.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.validators.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.mapper.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.repository.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.service.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.controller.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.routes.js` | PASSED |
| `node --check server\services\itemRequest.service.js` | PASSED |
| `node --check server\server.js` | PASSED |
| `npm.cmd test -- tests/modules/master-catalog tests/modules/access-management` from `server` | PASSED, 4 test files, 14 tests |
| `npx.cmd eslint src/pages/BudgetSetupPage.jsx src/api/budgetSetup.api.js src/hooks/budgets/useBudgetSetup.js` from `client` | PASSED |
| `npm.cmd run build` from `client` | PASSED |
| `rg "BS_budget_types\|BS_budget_sub_items\|BS_budget_items\|BS_budgets\|can_manage_categories\|can_view_budget\|can_edit_budget" server/modules/master-catalog client/src/pages/BudgetSetupPage.jsx client/src/api/budgetSetup.api.js client/src/hooks/budgets/useBudgetSetup.js` | PASSED, no matches |
| `rg "category\.service\|category\.repository\|category\.controller\|category\.routes\|category\.validator\|routes/category\|/api/categories" server client/src -g !node_modules -g !dist -g !build -g !coverage` | PASSED, no matches |

The project `npm run lint` command currently runs the whole client and still reports unrelated legacy-module lint failures. The targeted Phase 2 frontend lint command above passes.

### Tests Added

```text
server/tests/modules/master-catalog/masterCatalog.constants.test.js
server/tests/modules/master-catalog/masterCatalog.service.test.js
```

Covered cases:

- category code normalization;
- catalog code normalization;
- transactional catalog-item creation with automatic General sub-item creation;
- duplicate catalog item name rejection;
- second General sub-item rejection;
- default General sub-item deactivation rejection.

### Remaining Validation Required Before COMPLETED

Live runtime validation is still required against the development database and browser:

1. Load the Budget Setup page.
2. Confirm category list uses `BS_budget_categories`.
3. Confirm catalog item list uses `BS_budget_catalog_items`.
4. Create a catalog item and verify the default `General` reusable sub-item is created in `BS_budget_catalog_sub_items`.
5. Edit a catalog item.
6. Deactivate a catalog item.
7. Confirm category deactivation is blocked with a controlled message.
8. Confirm the setup page sends `x-budget-user-role-id` and requires `can_manage_budget_catalog`.
9. Confirm no stale `/api/categories` request is emitted by the page.

### Known Unrelated Working Tree Items

The working tree contains many Phase 1 changes and unrelated pre-existing changes outside this Phase 2 scope. They were not refactored as part of Master Catalog. The excluded old item-request service test was not inspected or modified during this Phase 2 implementation.

### Next Action

Phase 2 is complete by user approval after Master Catalog implementation, sub-item responsibility clarification, and authorization simplification. Do not start Phase 3 implementation without explicit approval of the Phase 3 plan.

## 21. Route Authorization Completeness Standard

Date added: 2026-07-02

Do not apply one module permission blindly to every route. Also do not create large permission arrays for every possible future consumer.

Every future module feature inventory must include a route-by-route authorization matrix before implementation.

Each route must be authorized according to:

- business operation;
- HTTP method;
- owning workspace;
- required permission, when the route is administrative or otherwise permission-gated;
- department/category/global scope;
- object-level access;
- response sensitivity.

Before marking any module `COMPLETED`, verify:

- every route has been reviewed individually;
- read and write operations are distinguished;
- administrative and operational reads are distinguished;
- workspace scope is enforced;
- no route receives a permission merely because it is in the same router;
- no frontend-only restriction is treated as security;
- tests cover permitted and forbidden roles or workspaces.

Required matrix format:

| Method | Route | Business Purpose | Consumer | Permission | Workspace Scope | Object Scope |
|---|---|---|---|---|---|---|
| GET | `/example` | Example lookup | Current approved workflow consumer | Exact permission or active workspace | Department/category/global | Active only |

Operational lookup routes may be authorized by a valid active workspace plus service-layer business scope instead of a broad permission array. Administration routes require exact permissions at the route boundary.

Middleware should handle authentication, workspace resolution, simple exact permission checks, and request-level technical validation. Middleware must not query business repositories, duplicate service object loading, or return module-specific business error formats.

Services should handle business authorization, workspace scope, category/department ownership, entity validation, workflow rules, and transactions. If object access requires loading the object, load it in the service.

When correcting one concern, change only the required functions and preserve unaffected code. Do not regenerate full files unless the full file genuinely requires restructuring.

Use constants for stable permission codes, fixed workflow codes, fixed enum values, and required invariant codes. Do not create constants for database-managed catalog records, Units of Measure records, editable descriptions, or future-module permission groupings.

## 22. Module Feature Completeness Standard

Date added: 2026-07-02

Every module phase must include a feature-completeness gate before implementation and before completion. A module is not complete merely because routes compile, files are moved into `server/modules`, or a partial happy path passes.

### Required Pre-Implementation Feature Inventory

Before implementation begins for every module, create a `Feature Inventory` subsection in this plan. The inventory must inspect and compare:

- new-workflow documentation;
- database tables and every owned column;
- current frontend pages, forms, buttons, tables, filters, exports, and dialogs;
- current backend endpoints;
- old implementation features that still matter under the new workflow;
- permissions and role scopes;
- status transitions;
- audit, workflow-history, and notification behavior;
- reports and exports;
- validation rules;
- empty, invalid, duplicate, inactive, and concurrency edge cases.

Use this checklist format:

| Feature / User Action | Required by Workflow | Existing Implementation | Backend | Frontend | Tests | Status |
|---|---|---|---|---|---|---|
| Example feature | Yes | Partial | Pending | Partial | Missing | INCOMPLETE |

### Required Coverage Reviews

Every module plan must explicitly include:

- database-column coverage review;
- frontend user-action coverage review;
- backend/API coverage review;
- permissions and workflow review;
- testing matrix;
- final completeness audit.

Before marking any module `COMPLETED`, re-read the workflow and database documentation, recheck every owned database column, every frontend action, every permission and scope rule, every relevant create/read/update/activate/deactivate/delete path, and every inventory row. Required rows must be complete or explicitly deferred with user approval.

## 23. Phase 2 Feature Inventory - Master Catalog

Date updated: 2026-07-02

| Feature / User Action | Required by Workflow | Existing Implementation | Backend | Frontend | Tests | Status |
|---|---|---|---|---|---|---|
| List budget responsibility categories | Yes | Implemented through Master Catalog module | Implemented | Implemented | Covered by build/lint and module service tests where applicable | IN_REVIEW |
| Add catalog item | Yes | Implemented, but originally missed required UOM field | Implemented | Implemented | Covered | IN_REVIEW |
| Select Unit of Measure when adding catalog item | Yes; `BS_budget_catalog_items.unit_of_measure_id` is NOT NULL FK to `BS_units_of_measure.id` | Was missing in frontend and backend allowed default fallback | Implemented: required validator, active-unit service lookup, no default fallback | Implemented: required selector populated from `/units-of-measure`, payload sends `unit_of_measure_id` | Covered by validator/service tests, targeted lint, build | IN_REVIEW |
| Edit catalog item Unit of Measure | Yes | Was missing from edit row | Implemented | Implemented | Covered by service test and targeted frontend validation | IN_REVIEW |
| Return/display Unit of Measure in catalog list | Yes | Backend returned `unit_of_measure_id`, `unit_name`, `unit_code`; UI searched unit but did not display it | Implemented | Implemented as table column | Covered by service mapper/list test and build | IN_REVIEW |
| Reject missing Unit of Measure | Yes | Backend previously accepted missing value and selected a default active unit | Implemented | Implemented with toast and disabled submit | Covered by validator/service tests and targeted lint | IN_REVIEW |
| Reject malformed Unit of Measure | Yes | Partially handled only if provided | Implemented | Implemented via select value | Covered by validator test | IN_REVIEW |
| Reject invalid or inactive Unit of Measure | Yes | Active lookup existed, but missing value defaulted | Implemented via `findUnitByIdRepo` active-only lookup | Selector loads active units only | Covered by service test | IN_REVIEW |
| List reusable sub-items under catalog item | Yes; `BS_budget_catalog_sub_items` reusable master records | Backend implemented; frontend missing before 2026-07-02 sub-item update | Implemented through `GET /catalog-items/:itemId/sub-items` | Implemented in Budget Setup reusable model panel | Covered by targeted lint/build and existing module tests | IN_REVIEW |
| Create reusable sub-item | Yes | Backend implemented; frontend missing before 2026-07-02 sub-item update | Implemented through `POST /catalog-items/:itemId/sub-items` with default UOM validation; `sub_item_code` is generated by the backend for non-General models | Implemented through reusable model dialog without manual code entry | Covered by targeted lint/build and existing module tests | IN_REVIEW |
| Edit reusable sub-item | Yes | Backend implemented; frontend missing before 2026-07-02 sub-item update | Implemented through `PATCH /catalog-sub-items/:subItemId`; generated `sub_item_code` is read-only and protected `General` identity remains locked | Implemented through reusable model dialog; `General` code/name locked | Covered by targeted lint/build and existing module tests | IN_REVIEW |
| Activate/deactivate reusable sub-item | Yes | Backend implemented; frontend missing before 2026-07-02 sub-item update | Implemented through `PATCH /catalog-sub-items/:subItemId/status`; service blocks deactivating `General` | Implemented; `General` deactivate button disabled | Covered by targeted lint/build and existing module tests | IN_REVIEW |
| Protect default `General` reusable sub-item | Yes; exactly one active `General` per catalog item | Service implemented; frontend did not expose the rule | Implemented in create/update/status service rules | Implemented as protected badge, locked identity, disabled deactivate | Covered by targeted lint/build and existing module tests | IN_REVIEW |
| Package sub-item quantity, unit price, notes, attachments, reconciliation | Yes, but belongs to Category Packages, not Master Catalog | Not implemented in Master Catalog | Deferred to future `category-packages` module | Deferred to future Category Package UI | Future package tests required | DEFERRED_WITH_APPROVED_SCOPE |

### Phase 2 Unit of Measure Correction

Files changed on 2026-07-02:

- `client/src/pages/BudgetSetupPage.jsx`
- `server/modules/master-catalog/masterCatalog.validators.js`
- `server/modules/master-catalog/masterCatalog.service.js`
- `server/modules/master-catalog/masterCatalog.repository.js`
- `server/tests/modules/master-catalog/masterCatalog.service.test.js`
- `server/tests/modules/master-catalog/masterCatalog.validators.test.js`

Behavior corrected:

- Catalog item create/edit now requires `unit_of_measure_id`.
- The create form loads active `BS_units_of_measure` rows and displays `name` with optional `unit_code`.
- The create payload includes `unit_of_measure_id`.
- The edit row loads the existing item `unit_of_measure_id` and can change it.
- The catalog table displays Unit of Measure.
- Backend validation rejects missing, non-numeric, and non-positive `unit_of_measure_id`.
- Backend service rejects missing, invalid, or inactive units.
- The old silent default-unit fallback was removed.

Validation results:

| Command | Result |
|---|---|
| `node --check server\modules\master-catalog\masterCatalog.validators.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.service.js` | PASSED |
| `npm.cmd test -- tests/modules/master-catalog tests/modules/access-management` from `server` | PASSED, 5 files, 21 tests |
| `npx.cmd eslint src/pages/BudgetSetupPage.jsx src/api/budgetSetup.api.js src/hooks/budgets/useBudgetSetup.js` from `client` | PASSED |
| `npm.cmd run build` from `client` | PASSED |

Data migration risk:

- The documentation states `BS_budget_catalog_items.unit_of_measure_id` is NOT NULL.
- Existing live data was not queried in this session, so whether any development rows contain `NULL` remains unverified.
- If live rows with `NULL` exist despite the documented NOT NULL schema, repair must be explicit and reviewed. Do not silently assign an arbitrary default such as `Each`.
- The UI displays `Unassigned` only as a defensive temporary display for unexpected legacy/null API data; editing requires selecting a valid unit before save.

## 24. Phase 2 Route Authorization Matrix - Master Catalog

Date updated: 2026-07-02

Status: IN_REVIEW

Router-level middleware:

```text
verifyPortalJwt
resolveBudgetWorkspace
```

Master Catalog uses a simple boundary:

- Operational lookup routes are available to authenticated users with a valid active workspace. Business access and category scope are enforced in the service.
- Administration routes require `MASTER_CATALOG_PERMISSION`, which maps to `can_manage_budget_catalog`, at the route boundary.

| Method | Route | Business Purpose | Consumer | Permission | Workspace Scope | Object Scope |
|---|---|---|---|---|---|---|
| GET | `/categories` | Active responsibility-category lookup | Current active budget workspace; Budget Setup admin | None at route boundary; service requires active Department workspace, active Category workspace, or `can_manage_budget_catalog` | Department workspace sees all active categories; Category workspace sees assigned category only; catalog admin sees all | Active categories only |
| GET | `/categories/:categoryId/catalog-items` | Active generic item lookup for one category | Current active budget workspace; Budget Setup admin | None at route boundary; service requires active Department workspace, active Category workspace, or `can_manage_budget_catalog` | Department workspace may read any category; Category workspace may read only assigned `budget_category_id`; catalog admin may read all | Active catalog items only |
| GET | `/units-of-measure` | Administrative active unit lookup for Budget Setup | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | Active units only |
| GET | `/catalog-items` | Administrative full catalog list | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | Active items only |
| POST | `/categories` | Create structural responsibility category | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | N/A |
| PATCH | `/categories/:categoryId` | Update structural responsibility category | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | N/A |
| DELETE | `/categories/:categoryId` | Deactivate structural responsibility category | Catalog admin | `can_manage_budget_catalog` | Global catalog admin; service currently blocks deactivation to preserve IT/Biomedical/General invariant | N/A |
| GET | `/categories/:categoryId/usage` | Administrative dependency check | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | Usage summary only |
| POST | `/categories/:categoryId/catalog-items` | Create generic catalog item | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | N/A |
| PATCH | `/catalog-items/:itemId` | Edit generic catalog item | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | N/A |
| PATCH | `/catalog-items/:itemId/status` | Activate/deactivate generic catalog item | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | N/A |
| GET | `/catalog-items/:itemId/usage` | Administrative dependency check | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | Usage summary only |
| GET | `/catalog-items/:itemId/sub-items` | Administrative reusable catalog sub-item lookup for Budget Setup | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | Active reusable sub-items only |
| POST | `/catalog-items/:itemId/sub-items` | Create reusable catalog sub-item | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | N/A |
| PATCH | `/catalog-sub-items/:subItemId` | Edit reusable catalog sub-item | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | N/A |
| PATCH | `/catalog-sub-items/:subItemId/status` | Activate/deactivate reusable catalog sub-item | Catalog admin | `can_manage_budget_catalog` | Global catalog admin | N/A |

Final authorization correction:

- Deleted `server/modules/master-catalog/masterCatalog.authorization.js`.
- Deleted `server/tests/modules/master-catalog/masterCatalog.authorization.test.js`.
- Removed cross-module permission arrays from `server/modules/master-catalog/masterCatalog.constants.js`.
- Kept `MASTER_CATALOG_PERMISSION`.
- Kept `router.use(verifyPortalJwt)` and `router.use(resolveBudgetWorkspace)` for all Master Catalog routes.
- Registered operational lookup routes before `router.use(requireBudgetPermission(MASTER_CATALOG_PERMISSION))`.
- Registered all administration routes after the management permission boundary.
- Moved operational workspace/category scope to `masterCatalog.service.js`.

The Department Budget Entry page still uses legacy `/categories` APIs because the Department Budget module has not been migrated. Future modules must define their own secured operations in their own phase and call exported Master Catalog service/domain operations where needed. Master Catalog must not contain future-module permission arrays.

## 25. Phase 2 Sub-Item Responsibility Decision - Master Catalog

Date: 2026-07-02

Status: IN_REVIEW

### Business Decision

Reusable catalog sub-items and year-specific package sub-items are separate entities and must remain separate workflow operations.

`BS_budget_catalog_sub_items` is the reusable model/specification master below a generic catalog item. It owns reusable/default fields only:

- `catalog_item_id`
- `sub_item_code` as a generated read-only reference code; users must not type or edit it manually.
- `name`
- `default_specification`
- `default_unit_of_measure_id`
- `is_default_general`
- `is_active`

Reusable sub-item identity is the database `id`. The code remains for display,
audit, search, and integrations, but the Master Catalog and Category Package
Workbench must create normal reusable models without a manual code field.
The backend generates codes for non-General reusable models and preserves the
fixed `GENERAL` code only for default General sub-items.

`BS_category_budget_package_sub_items` is the year-specific package detail record. It owns package-specific snapshots and execution data:

- `category_budget_package_item_id`
- `catalog_sub_item_id`
- name/specification/unit snapshots
- quantity
- unit price
- notes
- attachments
- PO links
- transfer and execution balances

### Approved Responsibility Split

Budget Setup / Master Catalog owns reusable sub-item administration only:

- list reusable sub-items;
- create reusable sub-item;
- edit reusable sub-item;
- activate/deactivate reusable sub-item;
- view and maintain the protected `General` default sub-item;
- manage default specification;
- manage default Unit of Measure;
- validate duplicate code/name under the same catalog item;
- validate active default Unit of Measure;
- audit reusable sub-item changes.

Category Packages, in a future phase, owns year-specific package sub-items:

- select an existing reusable catalog sub-item;
- create a new reusable catalog sub-item inline when needed;
- create the linked package sub-item snapshot;
- edit year-specific quantity;
- edit year-specific unit price;
- edit year-specific specification and Unit of Measure snapshot;
- manage notes and attachments;
- reconcile total package quantity.

### Permission Decision

`can_manage_budget_catalog` remains the global Budget Setup permission for reusable catalog sub-item CRUD.

`can_manage_category_budget_sub_items` will be used in the future Category Packages phase for package-sub-item preparation within the active Category Manager workspace and assigned category. It must not grant global catalog administration.

No new permission is required at this time.

### Backend Module Interaction Decision

`server/modules/master-catalog` owns reusable catalog sub-item CRUD and validation.

The future `server/modules/category-packages` module must not import the Master Catalog repository directly. If inline reusable-model creation is needed during package preparation, the Category Packages service must call an exported Master Catalog domain/service command and pass the active SQL transaction so reusable model creation and package snapshot creation commit or roll back together.

Master Catalog must not import Category Packages, preventing a circular dependency.

### Frontend Component Decision

Use shared reusable field components with separate dialogs:

- `client/src/components/catalog/CatalogSubItemFields.jsx`
- `client/src/components/catalog/CatalogSubItemDialog.jsx`

Future package preparation should use a separate package dialog, for example:

- `client/src/components/category-packages/PackageSubItemDialog.jsx`

Do not create one universal sub-item dialog with mixed catalog/package behavior.

### Current Implementation Update

Files created:

- `client/src/components/catalog/CatalogSubItemFields.jsx`
- `client/src/components/catalog/CatalogSubItemDialog.jsx`

Files modified:

- `client/src/api/budgetSetup.api.js`
- `client/src/hooks/budgets/useBudgetSetup.js`
- `client/src/pages/BudgetSetupPage.jsx`
- `docs/codexContext/newWorkFlow/QNH_New_Workflow_Modular_Refactor_Plan.md`

Current Budget Setup behavior now includes:

- open reusable models for a selected catalog item;
- list reusable sub-items from `GET /api/master-catalog/catalog-items/:itemId/sub-items`;
- create reusable sub-items with `POST /api/master-catalog/catalog-items/:itemId/sub-items`;
- edit reusable sub-items with `PATCH /api/master-catalog/catalog-sub-items/:subItemId`;
- activate/deactivate reusable sub-items with `PATCH /api/master-catalog/catalog-sub-items/:subItemId/status`;
- lock deactivation for the protected `General` sub-item in the UI;
- allow editing the protected `General` default specification and Unit of Measure while keeping its identity locked;
- keep quantity, unit price, notes, attachments, PO links, transfers, and reconciliation out of Budget Setup.

### Current Module Scope Still Excluded

The following remain future Category Packages scope:

- year-specific package sub-item creation;
- package sub-item quantity;
- package sub-item unit price;
- package sub-item attachments;
- package reconciliation;
- inline reusable model creation from package preparation;
- category-package transaction that creates both reusable master and package snapshot.

### Validation Log

Commands run on 2026-07-02:

| Command | Result |
|---|---|
| `node --check server\modules\master-catalog\masterCatalog.routes.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.service.js` | PASSED |
| `npm.cmd test -- tests/modules/master-catalog` from `server` | PASSED: 4 files, 20 tests |
| `npx.cmd eslint client\src\pages\BudgetSetupPage.jsx client\src\api\budgetSetup.api.js client\src\hooks\budgets\useBudgetSetup.js client\src\components\catalog\CatalogSubItemFields.jsx client\src\components\catalog\CatalogSubItemDialog.jsx` | PASSED |
| `npm.cmd run build` from `client` | PASSED |

### Remaining Phase 2 Review Items

- Live DB/UI verification is still required before marking Phase 2 `COMPLETED`.
- Verify Budget Setup can create, edit, activate, and deactivate non-General reusable sub-items against live `BS_budget_catalog_sub_items`.
- Verify protected `General` cannot be deactivated and cannot have its identity changed.
- Verify duplicate name/code and inactive matching records are rejected by backend validation and surfaced clearly in the UI.
- Verify the default Unit of Measure is active and persisted through `default_unit_of_measure_id`.
- Verify audit rows are written for reusable sub-item create/update/status changes.

## 26. Phase 2 Authorization Correction - Master Catalog

Date: 2026-07-02

Status: IN_REVIEW

### Final Approved Design

Master Catalog authorization now uses two categories:

1. Operational catalog lookup.
2. Master Catalog administration.

Operational lookup routes:

- `GET /api/master-catalog/categories`
- `GET /api/master-catalog/categories/:categoryId/catalog-items`

These routes require an authenticated user and a resolved active budget workspace. They do not use cross-module permission arrays. The service applies business access rules:

- Department workspace: may read active categories and active generic catalog items from all three categories.
- Category workspace: may read only the assigned category and active generic catalog items in that category.
- Workspace with `can_manage_budget_catalog`: may read all catalog lookup data.
- Unrelated global workspace: denied.

Administration routes are registered after:

```js
router.use(requireBudgetPermission(MASTER_CATALOG_PERMISSION));
```

`MASTER_CATALOG_PERMISSION` maps to `can_manage_budget_catalog`.

### Files Changed

Deleted:

- `server/modules/master-catalog/masterCatalog.authorization.js`
- `server/tests/modules/master-catalog/masterCatalog.authorization.test.js`

Modified:

- `server/modules/master-catalog/masterCatalog.constants.js`
- `server/modules/master-catalog/masterCatalog.routes.js`
- `server/tests/modules/master-catalog/masterCatalog.service.test.js`
- `server/tests/modules/master-catalog/masterCatalog.routes.test.js`
- `docs/codexContext/newWorkFlow/QNH_New_Workflow_Modular_Refactor_Plan.md`
- `docs/codexContext/newWorkFlow/QNH_Backend_Modular_Architecture_Target.md`

### Preserved Logic

No unrelated item, sub-item, Unit of Measure, duplicate-validation, transaction, audit, or frontend logic was rewritten for this correction.

### Removed Coupling

The Master Catalog module no longer defines or imports cross-module permission groupings for Department Budgets, Category Packages, PO Mappings, or Access Management. Future modules must define their own secured operations during their own phase and call exported Master Catalog service/domain operations where needed.

### Validation Results

| Command | Result |
|---|---|
| `node --check server\modules\master-catalog\masterCatalog.constants.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.routes.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.controller.js` | PASSED |
| `node --check server\modules\master-catalog\masterCatalog.service.js` | PASSED |
| `npm.cmd test -- tests/modules/master-catalog` from `server` | PASSED, 4 files, 19 tests |
| Deleted authorization import/name scan in `server\modules\master-catalog` and `server\tests\modules\master-catalog` | PASSED, no matches |
| `npm.cmd run build` from `client` | PASSED |

Phase 2 is complete by user approval. Any additional Master Catalog live DB/UI observations should be handled as follow-up fixes, not as a blocker to planning Phase 3.

## 27. Phase 3 Plan - Financial Years

Date created: 2026-07-02

Status: IN_REVIEW

Implementation started: NO

### Recommended Module

Phase 3 should be `financial-years`.

### Why This Module Is Next

Financial-year opening is the foundation for all planning data that follows Master Catalog:

- Department Budgets need an active `BS_financial_years` row.
- Department Budget Entry needs initialized `BS_department_budgets` and `BS_department_category_budgets`.
- Category Submission Windows require one row per year/category.
- Category Packages require one header per year/category.
- Change Requests, PRE_CLOSING, Transfers, and PO Linking all depend on correct financial-year lifecycle state.

### Current Implementation Summary

Current backend files:

- `server/routes/financialYears.routes.js`
- `server/controllers/financialYears.controller.js`
- `server/services/financialYears.service.js`
- `server/repositories/financialYears.repository.js`
- `server/validators/financialYears.validator.js`
- `server/helpers/financialYear.helper.js`
- notification templates:
  - `server/notifications/templates/financialYearOpened.template.js`
  - `server/notifications/templates/financialYearPreClosing.template.js`
  - `server/notifications/templates/financialYearClosed.template.js`

Current frontend files:

- `client/src/api/financialYears.api.js`
- `client/src/hooks/financial-years/useFinancialYears.js`
- `client/src/pages/FinancialYearsPage.jsx`
- route registration in `client/src/routes/AppRouter.jsx`
- navigation references in `client/src/layouts/DashboardLayout.jsx`

Current route paths:

- `GET /api/financial-years`
- `GET /api/financial-years/current`
- `GET /api/financial-years/open`
- `POST /api/financial-years`
- `PATCH /api/financial-years/:id/pre-close`
- `PATCH /api/financial-years/:id/close`

Current backend route protection uses old global middleware:

- `server/middleware/verifyPortalJwt.middleware.js`
- `server/middleware/verifyBudgetAccess.middleware.js`
- `server/middleware/permission.middleware.js`

Current service behavior still creates legacy department budgets through `createBudgetsForAllDepartmentsRepo` and old `BS_budgets` paths. Current repository checks also reference removed legacy tables:

- `BS_budgets`
- `BS_budget_items`
- `BS_budget_transfers`
- `BS_PO_LINKS`

### New Workflow Requirement

Opening a financial year must be one transaction:

1. Insert `BS_financial_years` with `status = OPEN`.
2. Create one `BS_department_budgets` row for every active department.
3. Create exactly three `BS_department_category_budgets` rows under every department annual budget.
4. Create exactly three `BS_category_submission_windows` rows.
5. Create exactly three `BS_category_budget_packages` headers.
6. Create no package items yet.
7. Insert workflow-history events.
8. Insert durable notification queue records.

Financial-year statuses:

- `OPEN`
- `PRE_CLOSING`
- `CLOSED`

`OPEN -> PRE_CLOSING` is the CFO final approval of the complete annual budget. Do not create a separate annual approval table.

### Explicit Scope

Phase 3 includes:

- Move Financial Years backend into `server/modules/financial-years`.
- Replace old global route/controller/service/repository/validator ownership for this module.
- Use shared auth/workspace/permission middleware directly.
- Use current schema tables:
  - `BS_financial_years`
  - `BS_departments`
  - `BS_budget_categories`
  - `BS_department_budgets`
  - `BS_department_category_budgets`
  - `BS_category_submission_windows`
  - `BS_category_budget_packages`
  - `BS_budget_workflow_history`
  - `BS_Notifications`
  - `BS_audit_logs`
- Frontend files may be reorganized when implementing this module if it improves the new workflow structure. Do not preserve old filenames or folders merely for compatibility; update imports and routes and validate affected pages.
- Update existing Financial Years page/API/hooks only as needed for the new API contract and lifecycle behavior.
- Add module tests for repository/service/route authorization behavior.
- Remove old Financial Years backend wrappers after validation.

### Explicit Exclusions

Phase 3 does not implement:

- Department Budget Entry item requests.
- Category Manager review.
- Category package item/sub-item preparation.
- CFO package review UI.
- Change requests.
- Transfers.
- PO linking.
- Reports/dashboard rewrites.
- Rewriting unrelated modules that merely consume financial-year data.

If an unrelated legacy route breaks server startup, use only minimal startup containment and document it.

### Target Backend Module Tree

```text
server/modules/financial-years/
  financialYears.routes.js
  financialYears.controller.js
  financialYears.service.js
  financialYears.repository.js
  financialYears.validators.js
  financialYears.mapper.js
  financialYears.constants.js
```

Module tests:

```text
server/tests/modules/financial-years/
  financialYears.constants.test.js
  financialYears.validators.test.js
  financialYears.service.test.js
  financialYears.routes.test.js
```

Potential shared infrastructure used:

- `server/shared/auth/verifyPortalJwt.js`
- `server/shared/middleware/resolveBudgetWorkspace.js`
- `server/shared/middleware/requireBudgetPermission.js`
- existing transaction helper, unless moved to `server/shared/database` in an approved shared-infrastructure cleanup
- existing audit helper/repository, unless moved in a later shared audit cleanup
- existing notification queue infrastructure

### Owned Database Tables

Primary owned table:

- `BS_financial_years`

Initialized dependency tables during `OPEN`:

- `BS_department_budgets`
- `BS_department_category_budgets`
- `BS_category_submission_windows`
- `BS_category_budget_packages`

Read dependencies:

- `BS_departments`
- `BS_budget_categories`

History/side-effect tables:

- `BS_budget_workflow_history`
- `BS_Notifications`
- `BS_audit_logs`

Tables that must not be used in Phase 3:

- `BS_budgets`
- `BS_budget_items`
- `BS_budget_transfers`
- `BS_PO_LINKS`
- `BS_financial_year_budget_approvals`
- `BS_financial_year_budget_approval_packages`

### Feature Inventory

| Feature / User Action | Required by Workflow | Existing Implementation | Backend | Frontend | Tests | Status |
|---|---|---|---|---|---|---|
| List financial years | Yes | Existing old global path reads `BS_financial_years` | Move into module; preserve response shape where possible | Existing page table | Add route/service tests | PLANNED |
| Get current/latest financial year | Yes | Existing `/current` endpoint | Move into module; define latest/active semantics explicitly | Existing hooks used by other pages | Add service test | PLANNED |
| Get open financial year | Yes | Existing `/open` endpoint | Move into module; 404 if none | Existing hook mismatch currently invalidates `open` but uses `active` key | Add service test | PLANNED |
| Open financial year | Yes | Inserts `BS_financial_years`, then creates legacy `BS_budgets` | Replace with atomic new workflow initialization | Existing form can remain, but copy must reflect initialization | Add transaction, rollback, duplicate, active-year tests | PLANNED |
| Create department annual budgets for active departments | Yes | Legacy budget creation | Insert `BS_department_budgets` per active department | No direct UI beyond result/summary | Add service/repository tests | PLANNED |
| Create three department category budgets per department | Yes | Missing | Insert `BS_department_category_budgets` for IT/Biomedical/General under each department budget | No direct UI beyond result/summary | Add count/rollback tests | PLANNED |
| Create category submission windows | Yes | Missing | Insert one `BS_category_submission_windows` per category with `OPEN` | Optional summary in UI | Add service test | PLANNED |
| Create category budget packages | Yes | Missing | Insert one `BS_category_budget_packages` per category with `DRAFT` | Optional summary in UI | Add service test | PLANNED |
| Insert workflow history on open | Yes | Missing | Insert `BS_budget_workflow_history` in transaction | No direct UI | Add repository/service test | PLANNED |
| Queue financial-year opened notification | Yes | Queues after transaction through old notification service | Queue durable record in transaction if infrastructure supports it; otherwise document required shared notification adjustment | No direct UI | Add service test/mocking | PLANNED |
| Move OPEN to PRE_CLOSING | Yes, later in workflow | Existing checks old budget approval count | Implement only if completion criteria can be based on new package statuses; otherwise keep route but block with clear not-ready error until Category Packages phase | Existing button/modal | Add status/permission tests | PLANNED |
| Close PRE_CLOSING to CLOSED | Yes, execution cleanup | Existing checks old transfers/PO links | Implement only against new `BS_category_budget_transfers` and `BS_category_po_links`, or block with clear not-ready error until execution modules migrate | Existing button/modal | Add blocking tests | PLANNED |
| Audit lifecycle commands | Yes | Existing controller audit | Preserve/align with workspace context | No direct UI | Add mock assertion where practical | PLANNED |
| Authorization | Yes | Old global middleware and legacy permission wrapper | Use shared auth/workspace and exact `can_manage_financial_years` for mutations/admin list; decide read route permissions in matrix | Existing nav permission aliases may remain for unmigrated frontend only | Add route tests | PLANNED |

### Route Authorization Matrix

| Method | Route | Business Purpose | Consumer | Permission | Workspace Scope | Object Scope |
|---|---|---|---|---|---|---|
| GET | `/api/financial-years` | Administrative lifecycle list | Budget System Admin / Budget Approver with lifecycle responsibility | `can_manage_financial_years` | Active global/admin workspace | All years |
| GET | `/api/financial-years/current` | Current financial-year lookup for app context | Any authenticated active budget workspace that needs current year context | Active workspace; no management permission if response is non-sensitive | None beyond active assignment | Latest/open active year only, exact semantics to define before implementation |
| GET | `/api/financial-years/open` | Open planning year lookup | Active budget workflow pages | Active workspace; service returns 404 if none | None beyond active assignment | Current OPEN year only |
| POST | `/api/financial-years` | Open/initialize a new financial year | Budget System Admin / authorized lifecycle manager | `can_manage_financial_years` | Active global/admin workspace | New year; no other OPEN/PRE_CLOSING year |
| PATCH | `/api/financial-years/:id/pre-close` | Move OPEN to PRE_CLOSING | Budget Approver/CFO lifecycle authority | `can_manage_financial_years` for now unless approved separate CFO lifecycle permission exists | Active global/admin workspace | Existing OPEN year; all package readiness rules satisfied |
| PATCH | `/api/financial-years/:id/close` | Move PRE_CLOSING to CLOSED | Budget System Admin / CFO lifecycle authority | `can_manage_financial_years` for now unless approved separate close permission exists | Active global/admin workspace | Existing PRE_CLOSING year; no pending execution obligations |

Open question: confirm whether `can_manage_financial_years` is the final permission for PRE_CLOSING and CLOSED transitions, or whether CFO-specific normalized permissions should gate those commands. Do not invent a new permission without approval.

### Repository And SQL Plan

Repository operations should include:

- `listFinancialYears`
- `findFinancialYearById`
- `findFinancialYearByYear`
- `findOpenFinancialYear`
- `findActiveFinancialYear`
- `insertFinancialYearOpen`
- `listActiveDepartments`
- `listActiveBudgetCategories`
- `insertDepartmentBudgetsForYear`
- `insertDepartmentCategoryBudgetsForYear`
- `insertCategorySubmissionWindowsForYear`
- `insertCategoryBudgetPackagesForYear`
- `insertWorkflowHistory`
- `insertNotificationQueueRecord`, or call approved shared notification repository
- `transitionToPreClosing`
- `transitionToClosed`
- readiness-count checks using current tables only

Use parameterized SQL and SQL Server transactions.

For trigger-safe writes, avoid direct `OUTPUT INSERTED.*` if triggers exist on target tables; use `OUTPUT INSERTED.<columns> INTO @Inserted` and select from the table variable where needed.

### Service Rules And Transactions

Open financial year transaction:

1. Validate year is integer and in database allowed range.
2. Reject duplicate `BS_financial_years.year`.
3. Reject if an `OPEN` or `PRE_CLOSING` year already exists.
4. Load active departments.
5. Load active categories and require exactly IT, Biomedical, General.
6. Insert `BS_financial_years` with `OPEN`.
7. Insert one department budget per active department.
8. Insert three department category budgets per department with `DRAFT`.
9. Insert three submission windows with `OPEN`.
10. Insert three category budget packages with `DRAFT`.
11. Insert workflow history.
12. Queue notification record.
13. Commit.

Rollback on any failure must leave no partial year initialization.

PRE_CLOSING:

- Reload target year in transaction.
- Require status `OPEN`.
- Confirm category package readiness rules using new package tables.
- Reject open change requests.
- Update `BS_financial_years` status to `PRE_CLOSING`, set `pre_closed_by/pre_closed_at`.
- Insert workflow history and notification queue record in the same transaction.

CLOSED:

- Reload target year in transaction.
- Require status `PRE_CLOSING`.
- Confirm no pending transfers and no unresolved PO links using new execution tables.
- Update status to `CLOSED`, set `closed_by/closed_at`.
- Insert workflow history and notification queue record in the same transaction.

If new transfer/PO tables are not implemented enough to verify closure safely, close should be intentionally blocked with a clear error and documented as deferred to the execution modules rather than using old tables.

### Existing Frontend Changes

The current frontend files may be updated in place or reorganized if that produces a cleaner Financial Years workflow. Preserve only genuinely reusable shared behavior; remove old workflow assumptions when the owning frontend area is migrated.

Expected changes:

- `client/src/api/financialYears.api.js`
- `client/src/hooks/financial-years/useFinancialYears.js`
- `client/src/pages/FinancialYearsPage.jsx`

Possible small connected changes:

- `client/src/routes/AppRouter.jsx` only if route permission guard needs exact normalized permission adjustment.
- `client/src/layouts/DashboardLayout.jsx` only if nav visibility still depends on an obsolete alias.

Frontend behavior should:

- show initialized year status and timestamps;
- submit year open command;
- show backend initialization/readiness errors;
- keep pre-close/close buttons disabled or explanatory if backend says the transition is not currently allowed;
- avoid implying legacy department-budget approval rules still apply.

### Audit, Workflow History, Notifications

Audit:

- write technical audit for open/pre-close/close commands, including acting assignment/workspace context where supported.

Workflow history:

- write business-readable `BS_budget_workflow_history` events for:
  - `FINANCIAL_YEAR_OPENED`
  - `FINANCIAL_YEAR_PRE_CLOSED`
  - `FINANCIAL_YEAR_CLOSED`

Notifications:

- queue durable records for:
  - financial year opened;
  - financial year moved to PRE_CLOSING;
  - financial year closed.

Notification dispatch must remain outside the SQL transaction; queue persistence should happen inside the business transaction when supported.

### Legacy Files To Remove After Validation

Remove after module router is mounted and tests pass:

- `server/routes/financialYears.routes.js`
- `server/controllers/financialYears.controller.js`
- `server/services/financialYears.service.js`
- `server/repositories/financialYears.repository.js`
- `server/validators/financialYears.validator.js`

Do not delete shared notification templates unless they are replaced or still used from shared notification infrastructure.

### Tests Required

Backend:

- constants/validators tests for statuses and year validation;
- service test: open year creates all required records;
- service test: open year rollback on failure;
- service test: duplicate year rejected;
- service test: active year already exists rejected;
- service test: missing active departments rejected;
- service test: missing/not-exact three categories rejected;
- service test: PRE_CLOSING transition requires OPEN and readiness;
- service test: CLOSED transition requires PRE_CLOSING and no pending execution obligations;
- route test: admin/mutation routes require `can_manage_financial_years`;
- route test: current/open lookup behavior matches matrix;
- repository SQL smoke tests if test database support exists.

Frontend:

- build check;
- focused lint for changed financial-year files;
- manual UI scenarios:
  - open year success;
  - duplicate year error;
  - active year already exists error;
  - pre-close blocked until readiness;
  - close blocked until execution readiness;
  - refresh shows latest status.

### Validation Commands

Use actual available commands:

```powershell
cd D:\QNH-Budget-System-V2-Clean\server
npm.cmd test -- tests/modules/financial-years
node --check server\modules\financial-years\financialYears.routes.js
node --check server\modules\financial-years\financialYears.controller.js
node --check server\modules\financial-years\financialYears.service.js
node --check server\modules\financial-years\financialYears.repository.js
node --check server\modules\financial-years\financialYears.validators.js

cd D:\QNH-Budget-System-V2-Clean\client
npx.cmd eslint src/pages/FinancialYearsPage.jsx src/api/financialYears.api.js src/hooks/financial-years/useFinancialYears.js
npm.cmd run build
```

Also run scans:

```powershell
rg "BS_budgets|BS_budget_items|BS_budget_transfers|BS_PO_LINKS|BS_financial_year_budget_approvals" server\modules\financial-years
rg "routes/financialYears|controllers/financialYears|services/financialYears|repositories/financialYears|validators/financialYears" server client\src
```

### Risks And Controls

| Risk | Control |
|---|---|
| Partial financial-year initialization | Single SQL transaction; rollback tests |
| Legacy `BS_budgets` usage remains | Focused old-table scan in financial-years module |
| PRE_CLOSING implemented against incomplete package workflow | Gate with explicit readiness checks; block safely if dependent modules not ready |
| Close implemented against old transfers/PO links | Do not use old execution tables; block/defer closure checks until new execution modules exist if needed |
| Notification queue not transaction-safe yet | Use existing durable queue only if transaction support exists; otherwise document shared notification adjustment before implementation |
| Opening year before Master Catalog categories are valid | Require exactly active IT, Biomedical, General categories |
| Empty active department list | Reject open-year operation with clear error |
| Duplicate route/module architecture | Mount module router directly; remove old wrappers after tests |
| Frontend copy still references legacy approval flow | Update page text and modal warnings to new workflow terminology |

### Completion Criteria

Phase 3 may be marked `COMPLETED` only when:

- Financial Years backend business code is owned by `server/modules/financial-years`.
- Old Financial Years route/controller/service/repository/validator files are removed or explicitly documented as temporary with a removal phase.
- Opening a year initializes all required new workflow records in one transaction.
- No Phase 3 code references removed legacy financial-year workflow tables.
- Authorization matrix is implemented and tested.
- Workflow history, audit, and notification behavior are implemented or explicitly approved as deferred with reason.
- Existing frontend Financial Years page works with the new API behavior.
- Targeted backend tests pass.
- Client build passes.
- Live DB/UI validation confirms open-year initialization counts and no partial initialization.

### Next Approved Action

Phase 3 implementation is complete. Do not start Phase 4 until the user approves the Phase 4 plan.

## 28. Phase 3 Implementation Summary - Financial Years

Status: `IN_REVIEW`  
Started: 2026-07-02  
Completed: -

### Final Backend Module Tree

```text
server/modules/financial-years/
  financialYears.constants.js
  financialYears.controller.js
  financialYears.mapper.js
  financialYears.repository.js
  financialYears.routes.js
  financialYears.service.js
  financialYears.validators.js
```

### Final Test Tree

```text
server/tests/modules/financial-years/
  financialYears.constants.test.js
  financialYears.routes.test.js
  financialYears.service.test.js
  financialYears.validators.test.js
```

### Files Created

- `server/modules/financial-years/financialYears.constants.js`
- `server/modules/financial-years/financialYears.controller.js`
- `server/modules/financial-years/financialYears.mapper.js`
- `server/modules/financial-years/financialYears.repository.js`
- `server/modules/financial-years/financialYears.routes.js`
- `server/modules/financial-years/financialYears.service.js`
- `server/modules/financial-years/financialYears.validators.js`
- `server/tests/modules/financial-years/financialYears.constants.test.js`
- `server/tests/modules/financial-years/financialYears.routes.test.js`
- `server/tests/modules/financial-years/financialYears.service.test.js`
- `server/tests/modules/financial-years/financialYears.validators.test.js`

### Files Modified

- `server/server.js`: mounts `server/modules/financial-years/financialYears.routes.js`.
- `server/repositories/financialYears.repository.js`: replaced legacy repository implementation with a temporary read-only compatibility adapter for unmigrated legacy services.
- `client/src/hooks/financial-years/useFinancialYears.js`: invalidates the actual active financial-year query key after lifecycle mutations.
- `client/src/pages/FinancialYearsPage.jsx`: uses database-supported year range through 2200, shows opened labels, supports `opened_*` response fields, and removes focused lint blockers.
- `docs/codexContext/newWorkFlow/QNH_New_Workflow_Modular_Refactor_Plan.md`: records Phase 3 implementation and validation.

### Files Removed

- `server/routes/financialYears.routes.js`
- `server/controllers/financialYears.controller.js`
- `server/services/financialYears.service.js`
- `server/validators/financialYears.validator.js`

### Temporary Compatibility Adapter

| File | Why It Remains | Current Importers | Replacement Owner | Removal Phase | Validation Before Removal |
|---|---|---|---|---|---|
| `server/repositories/financialYears.repository.js` | Unmigrated legacy services import read helpers from the old path during server startup | `server/services/budgetApproval.service.js`, `server/services/budgetItem.service.js`, `server/services/budgets.service.js`, `server/services/po.service.js` | `server/modules/financial-years/financialYears.repository.js` plus future owning modules | Remove each import during the owning module phase; final deletion no later than the last phase that migrates these legacy services | `rg "financialYears.repository" server` shows no legacy service imports; server starts; owning module tests pass |

The adapter exports only read helpers from the new module. It does not contain lifecycle write logic, old workflow checks, or legacy table queries.

### APIs Implemented

| Method | Route | Authorization |
|---|---|---|
| `GET` | `/api/financial-years/current` | Authenticated active budget workspace |
| `GET` | `/api/financial-years/open` | Authenticated active budget workspace |
| `GET` | `/api/financial-years` | `can_manage_financial_years` |
| `POST` | `/api/financial-years` | `can_manage_financial_years` |
| `PATCH` | `/api/financial-years/:id/pre-close` | `can_manage_financial_years` |
| `PATCH` | `/api/financial-years/:id/close` | `can_manage_financial_years` |

### Database Tables Used

- `BS_financial_years`
- `BS_departments`
- `BS_budget_categories`
- `BS_department_budgets`
- `BS_department_category_budgets`
- `BS_category_submission_windows`
- `BS_category_budget_packages`
- `BS_budget_workflow_history`
- `BS_budget_change_requests`
- `BS_category_budget_transfers`
- `BS_category_po_links`
- `BS_category_budget_package_items`
- `BS_category_budget_package_sub_items`

No Financial Years module code references removed legacy tables:

- `BS_budgets`
- `BS_budget_items`
- `BS_budget_transfers`
- `BS_PO_LINKS`
- `BS_financial_year_budget_approvals`

### Implemented Behavior

- Opening a financial year rejects duplicates, invalid sequence, or an existing `OPEN`/`PRE_CLOSING` year.
- Opening a financial year requires active departments and exactly the approved active categories: `IT`, `BIOMEDICAL`, `GENERAL`.
- Opening a financial year runs in one SQL transaction and creates:
  - one `BS_financial_years` row with `OPEN`;
  - one `BS_department_budgets` row per active department;
  - three `BS_department_category_budgets` rows per department with `DRAFT`;
  - three `BS_category_submission_windows` rows with `OPEN`;
  - three `BS_category_budget_packages` rows with `DRAFT`;
  - one `BS_budget_workflow_history` event.
- Writes use trigger-safe `OUTPUT ... INTO` patterns.
- PRE_CLOSING requires `OPEN`, existing department budgets, all category packages completed by CFO, and no open change requests.
- PRE_CLOSING readiness is checked before and inside the transition transaction.
- CLOSED requires `PRE_CLOSING`, no pending category transfers, and no pending PO links.
- CLOSED readiness is checked before and inside the transition transaction.
- Technical audit remains in controllers through existing `auditLog`.
- Notifications are queued through existing notification infrastructure after the transaction commits. Durable notification queue insertion inside the same transaction remains a shared infrastructure limitation to revisit when notification infrastructure is migrated.

### Validation Log

| Date | Phase | Command or Scenario | Result | Notes |
|---|---|---|---|---|
| 2026-07-02 | Phase 3 | `node --check server\modules\financial-years\financialYears.constants.js` | Passed | Syntax check |
| 2026-07-02 | Phase 3 | `node --check server\modules\financial-years\financialYears.validators.js` | Passed | Syntax check |
| 2026-07-02 | Phase 3 | `node --check server\modules\financial-years\financialYears.mapper.js` | Passed | Syntax check |
| 2026-07-02 | Phase 3 | `node --check server\modules\financial-years\financialYears.repository.js` | Passed | Syntax check |
| 2026-07-02 | Phase 3 | `node --check server\modules\financial-years\financialYears.service.js` | Passed | Syntax check |
| 2026-07-02 | Phase 3 | `node --check server\modules\financial-years\financialYears.controller.js` | Passed | Syntax check |
| 2026-07-02 | Phase 3 | `node --check server\modules\financial-years\financialYears.routes.js` | Passed | Syntax check |
| 2026-07-02 | Phase 3 | `node --check server\repositories\financialYears.repository.js` | Passed | Temporary adapter syntax check |
| 2026-07-02 | Phase 3 | `node --check server\server.js` | Passed | Application composition syntax check |
| 2026-07-02 | Phase 3 | `npm.cmd test -- tests/modules/financial-years` | Passed | 4 test files, 14 tests |
| 2026-07-02 | Phase 3 | `npx.cmd eslint src/pages/FinancialYearsPage.jsx src/api/financialYears.api.js src/hooks/financial-years/useFinancialYears.js` | Passed | Focused frontend lint |
| 2026-07-02 | Phase 3 | `npm.cmd run build` in `client` | Passed | Vite production build |
| 2026-07-02 | Phase 3 | `rg "BS_budgets|BS_budget_items|BS_budget_transfers|BS_PO_LINKS|BS_financial_year_budget_approvals" server\modules\financial-years` | Passed | No matches |
| 2026-07-02 | Phase 3 | `rg "routes/financialYears|controllers/financialYears|services/financialYears|validators/financialYears" server client\src` | Passed | No deleted wrapper imports |
| 2026-07-02 | Phase 3 | `rg "financialYears.repository" server -g "!node_modules"` | Passed with documented temporary imports | Only new module, tests, adapter, and four unmigrated legacy service imports remain |

### Remaining Phase 3 Completion Blocker

- Live DB/UI verification has not been run because opening a financial year would create real development database records. Before marking Phase 3 `COMPLETED`, verify through the UI/API that opening a safe test financial year creates:
  - one `BS_financial_years` row;
  - one `BS_department_budgets` row per active department;
  - three `BS_department_category_budgets` rows per department;
  - three `BS_category_submission_windows` rows;
  - three `BS_category_budget_packages` rows;
  - one `BS_budget_workflow_history` row for the open event;
  - no package items.

### Known Deferred/Unrelated Items

- Same-transaction notification queue insertion is not implemented because the current shared notification infrastructure does not accept a SQL transaction. Existing queue behavior is preserved after successful business commit.
- Unmigrated legacy services still import the temporary `server/repositories/financialYears.repository.js` read adapter. These imports belong to future module phases and were not partially refactored during Phase 3.

### Next Recommended Phase

Phase 4 should be `department-budgets`, because it depends on active financial years, initialized `BS_department_budgets`, initialized `BS_department_category_budgets`, active catalog lookups, and Access Management workspace resolution.

Do not start Phase 4 until the user approves its detailed plan.

## 29. Phase 9 Plan - Production Readiness and Operational Monitoring

Status: `PLANNED` / `UPCOMING` / `NOT STARTED`
Position: after all core business and workflow modules are stable, before production deployment, go-live validation, and final handover.

This section records approved upcoming work only. Implementation must not start until the roadmap reaches the Production Readiness and Operational Monitoring phase.

Do not implement these requirements during earlier business-module phases unless the user explicitly changes the roadmap. Do not create health routes, a system-health module, administrator pages, permissions, SQL backup scripts, SQL Server Agent jobs, environment variables, tests, database changes, or server bootstrapping changes before Phase 9 approval.

### Scope

Phase 9 must cover:

- SQL Server database backup and recovery strategy.
- Public backend liveness and readiness endpoints.
- Protected administrator system-health API.
- Read-only administrator System Health page.
- Operational acceptance checks required before production deployment and final go-live approval.

### SQL Server Backup And Recovery Strategy

Database backup and recovery is an infrastructure and database-administration responsibility. The Node.js API must not directly perform SQL Server backup or restore operations.

The final backup strategy must be agreed with hospital IT and the database administrator. Before implementation or operational sign-off, Phase 9 must determine:

- whether SQL Server Agent is available;
- whether the database uses `SIMPLE`, `FULL`, or `BULK_LOGGED` recovery;
- whether backups are already configured by hospital infrastructure;
- where existing backups are stored;
- how long backups are retained;
- whether transaction-log backups are running;
- whether restore tests are performed;
- who monitors backup failures;
- SQL Server edition;
- required recovery point objective;
- required recovery time objective;
- available backup storage;
- retention requirements;
- off-server, separate, or isolated backup copies;
- database size and growth;
- production maintenance window;
- hospital security and compliance requirements.

Do not create a second backup system before checking whether the database server already has a managed backup plan.

The final strategy should consider:

- full database backups;
- differential backups;
- transaction-log backups when the recovery model requires them;
- backup compression where supported;
- backup checksums;
- backup verification;
- backup retention and cleanup;
- separate or isolated backup copies;
- backup failure notifications;
- regular restore testing;
- a documented recovery procedure.

Provisional example only, not final production values:

```text
Full backup: daily
Differential backup: several times per day
Transaction-log backup: every 15-30 minutes under FULL recovery
Retention: based on hospital policy
Restore test: scheduled regularly in a non-production environment
```

Preferred scheduling mechanism: SQL Server Agent when supported. If SQL Server Agent is unavailable, such as with some SQL Server Express installations, use Windows Task Scheduler plus `sqlcmd` as the fallback. The application must not rely on a manually copied `.bak` file inside the Git repository or project directory.

`RESTORE VERIFYONLY` is useful but does not replace an actual restore test. Phase 9 must include a tested restore to a separate non-production database and verification that important application tables and queries work after restoration.

### Backup Monitoring Data

The future administration UI may display backup status, but it must be read-only.

It may show:

- last successful full backup;
- last successful differential backup;
- last successful transaction-log backup;
- backup age;
- backup type;
- backup duration;
- backup size;
- verification status;
- last restore-test date;
- current recovery model;
- backup warning status.

The first version must not provide:

- run backup;
- delete backup;
- restore database;
- change recovery model;
- change retention policy.

Backup status should come from a controlled backend service that reads approved SQL Server backup history or a dedicated monitoring table. The browser must not query SQL Server system databases directly. Do not expose physical backup paths, credentials, server names, or infrastructure secrets to the frontend.

### Health And Readiness Endpoints

Public health responses must be minimal and non-sensitive.

Target liveness endpoint:

```http
GET /health/live
```

Purpose: confirm that the Node.js process is alive and can respond.

Liveness should:

- return quickly;
- avoid database queries;
- return HTTP 200 while the process is healthy;
- include only minimal non-sensitive information.

Example liveness response:

```json
{
  "status": "alive",
  "service": "qnh-budget-api",
  "timestamp": "ISO timestamp",
  "uptimeSeconds": 1234
}
```

Target readiness endpoint:

```http
GET /health/ready
```

Purpose: confirm that the API can currently serve normal Budget System requests.

Readiness should check essential dependencies such as:

- SQL Server connection;
- required application configuration;
- critical initialization state.

Optional integrations should affect readiness only when they are essential to safe normal system operation. A temporary optional integration failure must not automatically make the entire API unavailable if the main Budget System can still operate safely.

Example ready response:

```json
{
  "status": "ready",
  "checks": {
    "sqlServer": "ok"
  },
  "timestamp": "ISO timestamp"
}
```

Example unavailable response:

```json
{
  "status": "not_ready",
  "checks": {
    "sqlServer": "failed"
  },
  "timestamp": "ISO timestamp"
}
```

Unavailable readiness must return HTTP 503 Service Unavailable.

Public health responses must not expose SQL Server hostnames, database names unless explicitly approved, connection strings, credentials, internal IP addresses, file-system paths, stack traces, raw SQL errors, JWT information, or environment variables.

### Protected System Health API

Future protected endpoint:

```http
GET /api/admin/system-health
```

The final route name may be adjusted to match approved module conventions.

Access must be limited to global administrators or users with an explicit system-health viewing permission. Do not reuse an unrelated permission merely to avoid creating the correct authorization rule. During Phase 9, determine whether a dedicated normalized permission such as `can_view_system_health` is required, and update database seeds/documentation only after approval.

The detailed endpoint may return:

- overall system status;
- API process status;
- SQL Server connectivity status;
- SQL response latency;
- application uptime;
- application version or commit version;
- environment name;
- notification worker status;
- last successful notification-worker execution;
- backup status summary;
- last successful backup timestamps;
- backup warning state;
- health-check execution timestamp.

Use clear statuses:

```text
HEALTHY
WARNING
UNAVAILABLE
UNKNOWN
```

Do not report a component as healthy when it has not actually been checked. If a check cannot be performed because required database permissions are missing, report `UNKNOWN` with a safe administrative message.

Never return secrets or raw infrastructure errors.

### Administrator System Health Page

Add a future protected frontend page:

```text
Administration -> System Health
```

Suggested page title:

```text
System Health
```

The page should provide an operational overview, not raw developer logs.

Suggested summary cards:

- Overall Status
- API Status
- Database Status
- Notification Worker Status
- Database Backup Status

Suggested sections:

- API: current status, uptime, application version, last health check, API response latency.
- Database: connection status, response latency, recovery model, last successful connectivity check.
- Notification worker: worker status, last successful run, last failed run, pending notification count, failed notification count, only when reliably available.
- Database backups: last full backup, last differential backup, last transaction-log backup, backup age, latest backup result, last restore-test date, warning when backup is older than the approved threshold.

The page must:

- load health information on entry;
- provide a manual Refresh button;
- show last refresh timestamp;
- use clear status badges;
- display safe error messages;
- remain read-only in its first version;
- be permission-protected in both frontend and backend.

Optional auto-refresh may be added at a reasonable interval. Do not create aggressive polling that adds unnecessary load.

### Suggested Module Placement

During Phase 9 implementation, prefer a small dedicated operational module:

```text
server/modules/system-health/
  systemHealth.constants.js
  systemHealth.controller.js
  systemHealth.repository.js
  systemHealth.routes.js
  systemHealth.service.js
```

The repository may read SQL connectivity, application-owned worker status tables, and approved SQL Server backup-history information. The service should calculate component status, overall status, warning thresholds, and safe administrative messages. The controller should return only the safe mapped response.

Do not put all health logic directly inside `server.js`.

Basic `/health/live` and `/health/ready` routes may remain in a lightweight shared health component because they are infrastructure endpoints rather than normal business-module routes.

### Future Configuration

Document future environment variables during Phase 9 without committing secret or machine-specific values:

```text
HEALTH_SQL_TIMEOUT_MS
HEALTH_CACHE_SECONDS
BACKUP_FULL_WARNING_HOURS
BACKUP_LOG_WARNING_MINUTES
SYSTEM_VERSION
```

Do not store database passwords, backup credentials, or infrastructure secrets in documentation or committed `.env` files. Warning thresholds must match the approved backup policy.

### Testing Requirements

Phase 9 must include tests for:

- liveness returns HTTP 200 without requiring SQL Server;
- readiness returns HTTP 200 when SQL Server is available;
- readiness returns HTTP 503 when SQL Server is unavailable;
- readiness respects a short timeout;
- public responses contain no sensitive details;
- unauthorized users cannot access detailed system health;
- authorized administrators can access detailed system health;
- overall status is calculated correctly;
- `UNKNOWN` is returned when a check cannot be performed;
- backup warnings are calculated from approved thresholds;
- frontend hides the page without permission;
- frontend handles `HEALTHY`, `WARNING`, `UNAVAILABLE`, and `UNKNOWN` states.

Mocks are acceptable inside automated tests. Do not use fake permanent production data for backup status.

### Operational Acceptance Criteria

Do not mark Phase 9 complete until:

- health endpoints are implemented;
- detailed health endpoint is permission-protected;
- administrator System Health page is implemented;
- SQL Server edition and recovery model are documented;
- the approved backup schedule is documented;
- backup jobs are configured by the responsible administrator;
- backup failure alerting is configured;
- retention and cleanup are configured;
- a separate or isolated backup copy exists;
- at least one actual restore test succeeds;
- the recovery procedure is documented;
- sensitive infrastructure details are not exposed.

Application code completion alone is not sufficient to mark the database backup requirement complete. Infrastructure configuration and restore testing must also be verified.

## 30. Phase 4 Overview - Department Budgets

Status: `IN_PROGRESS`
Implementation status: `STARTED`
Approval required before implementation: `APPROVED`

This section is the approved Phase 4 implementation scope. Do not start Phase 5 until Phase 4 is validated and documented.

### Recommended Module

Phase 4 should implement `department-budgets`.

Reason:

- Phase 1 provides exact user assignment/workspace and normalized permissions.
- Phase 2 provides active catalog categories and generic catalog items.
- Phase 3 creates `BS_department_budgets` and three `BS_department_category_budgets` per department/year.
- Department Budget Entry is the next core workflow step after opening a financial year.

### Business Goal

Replace the legacy department budget workflow with the redesigned department planning workflow:

```text
Department User / HOD
â†’ create or update generic item requests
â†’ distribute requested quantities
â†’ submit one department category budget to Category Manager
-> view Category Manager decisions after submission as read-only updates
```

Departments request generic catalog items only. They must not enter unit price, total amount, vendor, model, detailed specification, package sub-items, PO links, or transfers.

### Backend Target Module

```text
server/modules/department-budgets/
  departmentBudgets.constants.js
  departmentBudgets.controller.js
  departmentBudgets.mapper.js
  departmentBudgets.repository.js
  departmentBudgets.routes.js
  departmentBudgets.service.js
  departmentBudgets.validators.js
```

Possible module tests:

```text
server/tests/modules/department-budgets/
  departmentBudgets.constants.test.js
  departmentBudgets.validators.test.js
  departmentBudgets.service.test.js
  departmentBudgets.routes.test.js
```

### Owned Database Tables

- `BS_department_budgets`
- `BS_department_category_budgets`
- `BS_department_category_budget_items`
- `BS_department_category_budget_item_distributions`

Read dependencies:

- `BS_financial_years`
- `BS_departments`
- `BS_budget_categories`
- `BS_budget_catalog_items`
- `BS_category_submission_windows`
- `BS_category_budget_packages`
- `BS_category_budget_package_items`
- `BS_budget_catalog_sub_items`

Write dependencies during submission:

- `BS_category_budget_package_items`
- `BS_category_budget_package_sub_items` for the year-specific `General` sub-item when first required
- `BS_budget_workflow_history`
- `BS_Notifications` through existing shared notification infrastructure where supported
- `BS_audit_logs` through existing audit infrastructure

### Current Legacy Implementation To Replace

Backend legacy paths:

- `server/routes/budgets.routes.js`
- `server/routes/budgetItems.routes.js`
- `server/routes/budgetItem.routes.js`
- `server/routes/budgetDistribution.routes.js`
- `server/controllers/budgets.controller.js`
- `server/controllers/budgetItems.controller.js`
- `server/controllers/budgetItem.controller.js`
- `server/controllers/budgetDistribution.controller.js`
- `server/services/budgets.service.js`
- `server/services/budgetItems.service.js`
- `server/services/budgetItem.service.js`
- `server/services/budgetDistribution.service.js`
- `server/repositories/budgets.repository.js`
- `server/repositories/budgetItems.repository.js`
- `server/repositories/budgetItem.repository.js`
- `server/validators/budgetItems.validator.js`
- `server/helpers/distribution.helper.js` if reusable after review, otherwise replace with module-local validation
- `server/helpers/validateBudgetModifyPermission.js` if still needed after workspace-scoped service rules

Frontend files likely affected:

- `client/src/api/budget.api.js`
- `client/src/pages/BudgetsPage.jsx`
- `client/src/pages/budget/MyBudgetsPage.jsx`
- `client/src/pages/budget/AllBudgetsPage.jsx`
- `client/src/pages/budget/BudgetEnteryPage.jsx`
- `client/src/pages/budget/BudgetViewPage.jsx`
- `client/src/components/budgets/shared/BudgetItemsTable.jsx`
- `client/src/helpers/budgetRows.helper.js`
- `client/src/helpers/pageLockRules.js`
- `client/src/config/dashboard/quickActions.js`
- `client/src/config/dashboard/hodCards.jsx`
- `client/src/routes/AppRouter.jsx` only if route permission wiring needs exact normalized permission adjustment

Frontend folder reorganization is allowed during Phase 4 when it improves the new Department Budget workflow. The implementation may split `budget.api.js`, move budget pages/hooks/components, delete obsolete old-workflow frontend files, and create domain-specific frontend modules after checking import consumers and validating affected routes.

### Required Feature Inventory Before Implementation

The detailed Phase 4 plan must include a row-by-row inventory for at least:

| Feature / User Action | Required By Workflow | Current Implementation | Backend | Frontend | Tests | Status |
|---|---|---|---|---|---|---|
| View current department annual budget | Yes | Legacy `BS_budgets` | Pending | Existing pages need remap | Pending | PLANNED |
| View three category budgets | Yes | Missing/new workflow only | Pending | Existing UI needs category structure | Pending | PLANNED |
| Add generic catalog item request | Yes | Legacy budget item | Pending | Existing entry page needs payload update | Pending | PLANNED |
| Edit draft requested item | Yes | Legacy budget item | Pending | Existing entry page needs update | Pending | PLANNED |
| Delete/deactivate draft requested item | Yes, where supported | Legacy active flags | Pending | Existing UI review | Pending | PLANNED |
| Distribution total equals requested quantity | Yes | Existing helper likely reusable after review | Pending | Existing entry page has distribution UI | Pending | PLANNED |
| Submit category budget | Yes | Legacy submit/approval flow | Pending | Existing UI needs status/action update | Pending | PLANNED |
| View Category Manager decisions after submission | Yes | Missing/new workflow only | Pending | Entry page needs read-only decision display | Pending | PLANNED |
| Prevent edits after submission | Yes | Legacy approval concepts differ | Pending | Existing UI lock logic needs rewrite | Pending | PLANNED |
| Lazy package item and General sub-item creation on first submission | Yes | Missing | Pending | No direct UI | Pending | PLANNED |

### Route Authorization Overview

The detailed Phase 4 plan must include a route authorization matrix. Initial direction:

| Operation Type | Likely Permission | Workspace Scope |
|---|---|---|
| View own department budgets | `can_view_department_budget_requests` or `can_manage_department_budget_requests` | Department workspace only; active assignment department must match budget department |
| Create/edit/delete draft requests | `can_manage_department_budget_requests` | Department workspace only; active assignment department must match |
| Submit department category budget | `can_manage_department_budget_requests` | Department workspace only; category window must be open |
| View read-only submitted/reviewed records | `can_view_department_budget_requests` or manage permission | Department workspace only |

Do not infer role from permissions. Use `req.budgetAccess.userRoleId`, department scope, exact permissions, and object ownership checks.

### Key Business Rules

- Use exact header statuses:
  - `DRAFT`
  - `IN_CATEGORY_REVIEW`
  - `CATEGORY_REVIEW_COMPLETED`
- Use exact item statuses:
  - `DRAFT`
  - `PENDING_CATEGORY_REVIEW`
  - `CATEGORY_REVIEW_COMPLETED`
- Do not create `SUBMITTED`, `UNDER_CATEGORY_REVIEW`, or legacy approval statuses.
- Department users request generic catalog items only.
- Requested quantity must be positive.
- Distribution rows must sum exactly to requested quantity.
- Draft department items do not create package records.
- On first submission of a catalog item in a financial year/category, create or reuse a `BS_category_budget_package_items` row and create the year-specific `General` package sub-item if missing.
- After submission, HOD users cannot edit, add, delete, import, copy, or resubmit the submitted category budget during Category Manager review.
- Budget Entry shows Category Manager decisions read-only: requested quantity, approved quantity, difference, review note, review status, reviewed by, and reviewed at.

### Explicit Exclusions

Phase 4 does not implement:

- Category Manager review decisions.
- Category submission window administration.
- Category package detailed sub-items, pricing, attachments, or reconciliation UI.
- CFO review.
- Change requests after CFO review.
- Transfers.
- PO linking.
- Reports.
- Production-readiness health endpoints or backup monitoring.

### Budget Entry UI/UX Requirement

The Department Budget Entry page is the primary operational page of the Budget System.

It must receive deliberate UI/UX design attention and must not be implemented as a collection of generic white containers or a minimally styled form.

The approved direction must preserve the familiar existing `BudgetEnteryPage` design while improving its visual hierarchy, category navigation, table usability, distribution entry, draft visibility, validation, Import Excel, Copy From History, and submission experience.

The design must remain simple and professional and must not become overengineered.

A UI/UX proposal must be presented and explicitly approved before frontend implementation begins. Approval of the Phase 4 business scope is not approval of the UI design.

### Current Page Visual Assessment

Existing `client/src/pages/budget/BudgetEnteryPage.jsx` strengths to preserve:

- Familiar HOD workflow with page title, action bar, budget context, main item table, validation, summary, and legends.
- Existing `BudgetDistributionTable` keeps the table as the main workspace and supports wide distribution entry.
- Excel import/download entry point already exists and is familiar.
- Copy From History drawer already exists and is useful for repeated annual budget preparation.
- Unsaved-change feedback already exists and should remain visible.
- Validation feedback exists and should be made more contextual rather than removed.
- Distribution controls for annual, quarterly, monthly, and custom entry are already familiar and should evolve rather than be replaced.
- Existing dialogs for submit, delete, and import summary provide recognizable interaction patterns.

Elements that need improvement:

- The current page uses many independent white rounded containers, which can make the workflow feel fragmented.
- The current action area gives several commands similar visual weight.
- The page does not yet communicate the new three-category workflow clearly.
- The old status language such as `PENDING_APPROVAL`, returned approval notes, unit price, and total amount concepts must be removed or renamed for the new workflow.
- The page currently assumes one department budget table rather than IT, Biomedical, and General category budgets.
- Import and Copy From History are visually large compared with their supporting role.
- Validation is separated from the row context; Phase 4 should make row/category validation easier to understand.
- Distribution entry is powerful but can feel wide and dense; it needs clearer totals, remaining quantity, and mismatch feedback.

### Proposed Page Hierarchy

The Phase 4 design should use one connected work area with a clear hierarchy:

1. Compact page identity and budget context:
   - department name;
   - financial year;
   - active workspace label;
   - overall status.
2. Overall completion/progress:
   - three category completion summary;
   - unsaved-change state;
   - validation status.
3. Category navigation:
   - IT;
   - Biomedical;
   - General;
   - item count and simple status per category.
4. Active category item-entry table:
   - generic catalog item;
   - requested quantity;
   - distribution method;
   - distribution rows;
   - row validation and actions.
5. Supporting tools:
   - Import Excel;
   - Download Template;
   - Copy From History.
6. Stable action area:
   - primary Review and Submit;
   - secondary Save Draft;
   - secondary Add Item;
   - tertiary import/history/template actions.

### Desktop Wireframe

```text
Department Budget Entry
Information Technology Department Â· FY 2027 Â· HOD Workspace
[Draft saved/unsaved indicator]                         [Save Draft] [Review and Submit]

Progress: 2 of 3 categories have items Â· 1 category needs attention

[ IT                    12 items Â· Complete      ]
[ Biomedical             5 items Â· Draft         ]
[ General                0 items Â· Not started   ]

Active Category: IT
Toolbar: [Add Item] [Import Excel] [Copy From History] [Download Template]

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Generic Item              Requested Qty   Distribution     Status   Actions â”‚
â”‚ Computers & Laptops       [ 24 ]          Monthly          Complete Edit    â”‚
â”‚ Office Equipment          [ 10 ]          Quarterly        Needs attention  â”‚
â”‚   Distribution: Q1 [2] Q2 [3] Q3 [3] Q4 [2]  Total 10 / 10                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

Validation: Office Equipment distribution is incomplete.
```

### Smaller-Screen Wireframe

```text
Department Budget Entry
Information Technology Department
FY 2027 Â· HOD Workspace

[Review and Submit]
[Save Draft] [Add Item]

Categories
[IT Â· 12 Â· Complete]
[Biomedical Â· 5 Â· Draft]
[General Â· 0 Â· Not started]

Active Category: IT
[Import Excel] [Copy History]

Scrollable item workspace
Item row
  Generic item
  Quantity
  Distribution method
  Distribution controls
  Row actions
```

On smaller screens, the category controls may become horizontally scrollable segmented controls or stacked compact buttons. The active category must remain textually clear, not color-only.

### Category Navigation Design

Use compact connected category controls, not detached large cards.

Each category should show:

```text
Category name
Item count
Simple status text
Optional unsaved or warning indicator
```

Examples:

```text
IT Â· 12 items Â· Complete
Biomedical Â· 5 items Â· Draft
General Â· 0 items Â· Not started
```

Active category state should use typography, border/indicator, background contrast, and `aria-selected` or equivalent semantics. Do not rely only on color.

### Table Design

The table remains the main workspace.

Design direction:

- Keep a wide, readable table with sticky header where useful.
- Keep stable row height and clear row separation.
- Use compact but readable quantity inputs.
- Preserve familiar item/distribution editing patterns.
- Remove old price/amount columns for Department Budget Entry because departments no longer enter price or total amount.
- Make row-level validation visible near the row and summarized above/below the table.
- Use a clear empty state in the table area when a category has no items.

Avoid large sidebars, decorative panels, oversized headers, and excessive summary cards that reduce table width.

### Distribution Design

Preserve the familiar distribution behavior where it already works.

Improve clarity by showing:

- distribution total;
- requested quantity;
- remaining or over/under amount;
- mismatch warning in text;
- clear month/quarter grouping;
- consistent input sizing.

Do not hide frequently used distribution fields behind multiple clicks. Do not put each month inside a decorative card. Do not add charts or animations.

### Action Hierarchy

Primary:

- `Review and Submit`

Secondary:

- `Save Draft`
- `Add Item`

Supporting:

- `Import Excel`
- `Copy From History`
- `Download Template`

Do not use multiple large primary-colored buttons. Supporting tools should remain discoverable but visually quieter than submission and saving.

### Draft, Unsaved, And Validation Presentation

The page should immediately answer:

- Which department/year is being edited?
- Which category is active?
- Are there unsaved changes?
- Are distributions complete?
- Which category or row needs attention?
- What is the next action?

Use user-facing labels:

- `Not started`
- `Draft`
- `Needs attention`
- `Complete`
- `Unsaved changes`

Do not expose internal workflow codes directly unless formatted.

### Required Page States To Design Before Coding

Phase 4 UI approval must cover:

- initial loading;
- empty department budget;
- category with no items;
- category with entered items;
- unsaved changes;
- validation errors;
- invalid distribution totals;
- import preview;
- Copy From History preview;
- saving;
- save success;
- save failure;
- submission review;
- submitted/read-only state;
- returned editable state;
- backend unavailable.

### Accessibility Requirements

The Phase 4 UI must include:

- visible keyboard focus;
- sufficient contrast;
- readable input labels;
- clear error association;
- accessible category navigation;
- status text in addition to color;
- reasonable control sizes;
- logical keyboard order.

Do not remove focus outlines unless an equally visible replacement is provided.

### Design Tokens Using Existing Styles

Use existing project Tailwind conventions:

- Page background: current light slate background / `text-slate-*` palette.
- Main workspace background: white only for meaningful grouped areas, especially the primary table workspace.
- Borders: subtle `border-slate-200` with restrained contrast.
- Radius: keep existing rounded style, but avoid unnecessary nested rounded containers.
- Spacing: compact enterprise spacing, generally `p-4` to `p-6`, with tighter table rows.
- Heading hierarchy: page title remains clear but not hero-sized.
- Table density: optimized for many rows, not marketing spacing.
- Status badges: compact, text + color, using existing warning/success/slate treatments.
- Primary action: existing blue primary style.
- Secondary actions: white or subtle tinted buttons.
- Supporting tools: compact controls or menu actions.

### Elements Intentionally Not Added

Do not add:

- a new UI library;
- an unrelated frontend architecture rewrite outside the approved workflow scope;
- large hero sections;
- decorative illustrations;
- glassmorphism;
- animated backgrounds;
- many separate white cards;
- charts for distribution entry;
- unrelated dashboard redesigns;
- advanced keyboard shortcuts unless documented and discoverable.

### Recommended UI Direction

Recommended direction:

```text
Evolve the existing BudgetEnteryPage into a connected three-category
budget-entry workspace.
```

This preserves the current page identity and its familiar table/distribution workflow, while improving:

- context visibility;
- category navigation;
- action priority;
- draft/validation clarity;
- table usability;
- distribution feedback;
- import/history placement;
- empty/error/submitted states.

The page should feel polished, professional, and practical for repeated HOD use, without becoming overdesigned or visually fragmented.

### Validation Overview

Expected validation commands after implementation approval:

```powershell
cd D:\QNH-Budget-System-V2-Clean\server
npm.cmd test -- tests/modules/department-budgets
node --check server\modules\department-budgets\departmentBudgets.routes.js
node --check server\modules\department-budgets\departmentBudgets.controller.js
node --check server\modules\department-budgets\departmentBudgets.service.js
node --check server\modules\department-budgets\departmentBudgets.repository.js
node --check server\modules\department-budgets\departmentBudgets.validators.js

cd D:\QNH-Budget-System-V2-Clean\client
npx.cmd eslint src/pages/BudgetsPage.jsx src/pages/budget/MyBudgetsPage.jsx src/pages/budget/BudgetEnteryPage.jsx src/pages/budget/BudgetViewPage.jsx src/api/budget.api.js
npm.cmd run build
```

Focused scans:

```powershell
rg "BS_budgets|BS_budget_items|BS_budget_item_distribution|BS_budget_notes|BS_budget_types" server\modules\department-budgets client\src
rg "routes/budgets|controllers/budgets|services/budgets|repositories/budgets|budgetItems|budgetItem|budgetDistribution" server client\src
```

Manual scenarios:

- HOD views current department budget with three categories.
- HOD adds a generic IT catalog item request with quantity and distribution.
- Missing distribution or mismatched distribution total is rejected.
- HOD submits one category budget.
- API creates/reuses package parent item and General package sub-item on submission.
- HOD cannot edit submitted items.
- Submitted/reviewed category budgets are read-only to the HOD.
- Category Manager decisions appear in Budget Entry as read-only requested quantity, approved quantity, difference, note, reviewer, and timestamp.
- Department workspace cannot access another department budget.
- Category/global workspace cannot perform department-entry commands.

### Main Risks

| Risk | Control |
|---|---|
| Existing frontend depends on legacy response shape | Preserve compatible fields where safe, but map from redesigned tables |
| Package-item lazy creation crosses module boundaries | Use an explicit service/domain operation or carefully scoped repository logic; document ownership |
| Distribution decimal precision errors | Validate with decimal-safe backend logic and database constraints |
| Mixed old/new budget routes remain mounted | Mount new module router and remove old department-budget wrappers only after validation |
| Unmigrated Transfer/PO pages import old budget API | Do not patch those future modules except for minimal containment if server startup breaks |
| Incorrect department scope | Enforce department ownership in service using active `BS_budget_user_roles.id` |

### Completion Criteria

Phase 4 can be completed only when:

- Department Budget backend business code is owned by `server/modules/department-budgets`.
- Old Department Budget route/controller/service/repository/validator wrappers are removed or explicitly documented as temporary with exact removal phase.
- All Phase 4 feature inventory rows are complete or explicitly deferred with approval.
- No Phase 4 code uses removed legacy tables.
- Existing frontend department-budget pages work with the new API.
- Authorization and department-scope tests pass.
- Distribution and status-transition tests pass.
- Submission creates/reuses package parent and General sub-item correctly.
- Client build passes.
- Live browser/API validation confirms the HOD workflow end to end.

## 31. Phase 4 Implementation Summary - Department Budgets

Status: `COMPLETED`

Implementation date: 2026-07-02

Phase 4 implementation has passed automated validation and is marked `COMPLETED` by user approval on 2026-07-04.

### Backend Module Tree

```text
server/modules/department-budgets/
  departmentBudgets.constants.js
  departmentBudgets.controller.js
  departmentBudgets.mapper.js
  departmentBudgets.repository.js
  departmentBudgets.routes.js
  departmentBudgets.service.js
  departmentBudgets.validators.js
```

### Backend APIs Implemented

- `GET /api/budgets/current`
- `GET /api/budgets/my`
- `GET /api/budgets/history/approved`
- `GET /api/budgets/history/:departmentCategoryBudgetId/items`
- `GET /api/budgets/:departmentBudgetId`
- `PUT /api/budgets/categories/:departmentCategoryBudgetId/items`
- `PATCH /api/budgets/categories/:departmentCategoryBudgetId/submit`

### Database Tables Used

- `BS_department_budgets`
- `BS_department_category_budgets`
- `BS_department_category_budget_items`
- `BS_department_category_budget_item_distributions`
- `BS_category_submission_windows`
- `BS_category_budget_packages`
- `BS_category_budget_package_items`
- `BS_budget_catalog_sub_items`
- `BS_category_budget_package_sub_items`
- `BS_budget_workflow_history`

### Implemented Business Behavior

- Department workspaces view only their own initialized annual budget and three category budgets.
- Budget Entry works one category budget at a time: IT, Biomedical, and General.
- Each Budget Entry category tab is permanently locked to its own category. The row category is derived from the active tab/category budget context, not from a user-editable row field.
- The Budget Entry row category control is read-only and displays the active category with a "Locked to selected tab" helper label.
- Local draft rows and Copy From History rows are normalized to the active tab category before being displayed or saved.
- Department users request generic catalog items, requested quantity, and distributions only.
- Unit price, total amount, vendor, model, specification, package sub-items, transfers, and PO links are not part of Department Budget Entry.
- The three main categories are fixed system categories: IT, Biomedical, and General.
- Department users cannot request new categories or modify the fixed category definitions.
- Department users can request a missing catalog item under one existing fixed category through the restored Budget Entry `Request Item` action.
- Budget Entry table rows remain locked to the active category tab. The separate Add Item Request modal defaults to the active tab category but allows the user to choose IT, Biomedical, or General from a controlled dropdown.
- Item-request backend validation rejects missing, inactive, invalid, unsupported, or custom category submissions and never creates a new main category.
- Draft category budgets can add/edit/remove requested items.
- Submitted category budgets are read-only to HOD users; Category Manager decisions are displayed as read-only review results.
- Distribution total must equal requested quantity.
- Submitting a category budget moves it to `IN_CATEGORY_REVIEW`.
- Submission creates or reuses package parent records and creates the year-specific `General` package sub-item if missing.
- The submission confirmation modal names the exact active category budget, for example `IT Category Budget`, and states that only the currently selected category budget is submitted.
- Workflow history is written for draft save and category submission.
- Technical audit records are written for save and submit controller actions.
- A durable notification queue record is inserted after category submission using existing notification infrastructure.

### Frontend Files Updated

- `client/src/api/budget.api.js`
- `client/src/pages/budget/BudgetEnteryPage.jsx`
- `client/src/pages/budget/MyBudgetsPage.jsx`
- `client/src/pages/budget/BudgetViewPage.jsx`
- `client/src/hooks/budgets/useCreateBudgetManual.js`
- `client/src/hooks/budgets/useBudgetSummary.js`
- `client/src/hooks/budgets/useBudgetTotals.js`
- `client/src/helpers/budgetRows.helper.js`
- `client/src/helpers/budgetValidation.helper.js`
- `client/src/helpers/budgetCalculations.helper.js`
- `client/src/components/budgets/shared/BudgetDistributionTable.jsx`
- `client/src/components/budgets/shared/BudgetDistributionRow.jsx`
- `client/src/components/budgets/shared/BudgetSummaryPanel.jsx`
- `client/src/components/budgets/shared/BudgetCompactSummaryPanel.jsx`
- `client/src/components/budgets/shared/BudgetItemsTable.jsx`
- `client/src/components/budgets/CopyBudgetHistoryList.jsx`
- `client/src/components/budgets/CopyBudgetPreview.jsx`

### Legacy Files Removed

- `server/routes/budgets.routes.js`
- `server/routes/budgetItems.routes.js`
- `server/controllers/budgets.controller.js`
- `server/controllers/budgetItems.controller.js`
- `server/services/budgets.service.js`
- `server/services/budgetItems.service.js`
- `server/repositories/budgetItems.repository.js`
- `server/validators/budgetItems.validator.js`

### Temporary Legacy Files Remaining

- `server/repositories/budgets.repository.js` remains because unrelated legacy `server/services/budgetItem.service.js` still imports `getCurrentBudgetRepo`. That route belongs to future PO/transfer/project cleanup and was not partially refactored during Phase 4.
- `server/routes/budgetItem.routes.js`, `server/controllers/budgetItem.controller.js`, `server/services/budgetItem.service.js`, `server/repositories/budgetItem.repository.js`, and legacy transfer/PO/project paths remain for their own future phases.

### Validation Log

| Date | Phase | Command or Scenario | Result | Notes |
|---|---|---|---|---|
| 2026-07-02 | Phase 4 | `node --check server\server.js` | Passed | Application composition imports the department-budgets module router directly |
| 2026-07-02 | Phase 4 | `node --check server\modules\department-budgets\departmentBudgets.constants.js` | Passed | Syntax check |
| 2026-07-02 | Phase 4 | `node --check server\modules\department-budgets\departmentBudgets.validators.js` | Passed | Syntax check |
| 2026-07-02 | Phase 4 | `node --check server\modules\department-budgets\departmentBudgets.mapper.js` | Passed | Syntax check |
| 2026-07-02 | Phase 4 | `node --check server\modules\department-budgets\departmentBudgets.repository.js` | Passed | Syntax check |
| 2026-07-02 | Phase 4 | `node --check server\modules\department-budgets\departmentBudgets.service.js` | Passed | Syntax check |
| 2026-07-02 | Phase 4 | `node --check server\modules\department-budgets\departmentBudgets.controller.js` | Passed | Syntax check |
| 2026-07-02 | Phase 4 | `node --check server\modules\department-budgets\departmentBudgets.routes.js` | Passed | Syntax check |
| 2026-07-02 | Phase 4 | `npm.cmd test -- tests/modules/department-budgets` | Passed | 2 test files, 7 tests |
| 2026-07-02 | Phase 4 | `npx.cmd eslint src/pages/budget/BudgetEnteryPage.jsx src/pages/budget/MyBudgetsPage.jsx src/pages/budget/BudgetViewPage.jsx src/api/budget.api.js src/hooks/budgets/useCreateBudgetManual.js src/helpers/budgetRows.helper.js src/helpers/budgetValidation.helper.js src/components/budgets/shared/BudgetDistributionTable.jsx src/components/budgets/shared/BudgetDistributionRow.jsx src/components/budgets/shared/BudgetSummaryPanel.jsx src/components/budgets/shared/BudgetCompactSummaryPanel.jsx src/components/budgets/CopyBudgetPreview.jsx src/components/budgets/CopyBudgetHistoryList.jsx src/components/budgets/shared/BudgetItemsTable.jsx` | Passed | Focused frontend lint |
| 2026-07-02 | Phase 4 | `npm.cmd run build` in `client` | Passed | Vite v8.0.10 transformed 3173 modules and built successfully |
| 2026-07-02 | Phase 4 | `rg "BS_budgets|BS_budget_items|BS_budget_item_distribution|BS_budget_notes|BS_budget_types|BS_department_budget_request_items" server\modules\department-budgets client\src\pages\budget\BudgetEnteryPage.jsx client\src\hooks\budgets\useCreateBudgetManual.js client\src\api\budget.api.js client\src\helpers\budgetRows.helper.js client\src\helpers\budgetValidation.helper.js client\src\components\budgets\shared\BudgetDistributionRow.jsx client\src\components\budgets\shared\BudgetDistributionTable.jsx` | Passed | No removed old-table references in Phase 4 paths |
| 2026-07-02 | Phase 4 | `rg "can_view_budget|can_edit_budget|can_approve_budget|can_manage_categories" server\modules\department-budgets client\src\pages\budget\BudgetEnteryPage.jsx client\src\hooks\budgets\useCreateBudgetManual.js client\src\api\budget.api.js` | Passed | No legacy permission aliases in Phase 4 paths |
| 2026-07-02 | Phase 4 | `rg "budgetItems.validator|budgetItems.repository|budgetItems.service|budgets.service|budgets.controller|budgetItems.controller|budgets.routes|budgetItems.routes" server client\src` | Passed with expected test-name match | Only `departmentBudgets.service.test.js` contains the words "department budgets service" |
| 2026-07-02 | Phase 4 category-tab lock correction | `npx.cmd eslint src/pages/budget/BudgetEnteryPage.jsx src/hooks/budgets/useCreateBudgetManual.js src/components/budgets/shared/BudgetDistributionRow.jsx src/components/budgets/shared/BudgetDistributionTable.jsx` | Passed | Focused lint for the locked-category Budget Entry correction |
| 2026-07-02 | Phase 4 category-tab lock correction | `rg -n "Locked to selected tab|Category being submitted|Search category|name=.category.|onChange=.*category" client\src\pages\budget\BudgetEnteryPage.jsx client\src\hooks\budgets\useCreateBudgetManual.js client\src\components\budgets\shared\BudgetDistributionRow.jsx` | Passed | Found only the intended locked-category helper and submission-modal text; no editable category search/control pattern remained in the affected row path |
| 2026-07-02 | Phase 4 category-tab lock correction | `npm.cmd run build` in `client` | Passed | Vite v8.0.10 transformed 3173 modules and built successfully |
| 2026-07-02 | Phase 4 category-tab lock correction | `npm.cmd test -- tests/modules/department-budgets` in `server` | Passed | 2 test files, 7 tests |
| 2026-07-05 | Phase 4 returned-budget correction | `node --check server\modules\department-budgets\departmentBudgets.service.js` | Passed | Returned-budget save enforcement syntax |
| 2026-07-05 | Phase 4 returned-budget correction | `node --check server\modules\department-budgets\departmentBudgets.controller.js` | Passed | Review-feedback controller syntax |
| 2026-07-05 | Phase 4 returned-budget correction | `node --check server\modules\department-budgets\departmentBudgets.routes.js` | Passed | Review-feedback route syntax |
| 2026-07-05 | Phase 4 returned-budget correction | `node --check server\tests\modules\department-budgets\departmentBudgets.service.test.js` | Passed | Department-budget service test syntax |
| 2026-07-05 | Phase 4 returned-budget correction | `node --check server\modules\department-budgets\departmentBudgets.repository.js` | Passed | Repository syntax unchanged but rechecked |
| 2026-07-05 | Phase 4 returned-budget correction | `npm.cmd test -- tests/modules/department-budgets/departmentBudgets.service.test.js` in `server` | Passed | 1 file, 11 tests; covers DRAFT omission, returned new-item rejection, returned omission rejection, catalog-change rejection, accepted-item read-only, needs-modification correction, and restored review-feedback mapping |
| 2026-07-05 | Phase 4 returned-budget correction | `npx.cmd eslint src\pages\budget\BudgetEnteryPage.jsx src\hooks\budgets\useCreateBudgetManual.js src\components\budgets\shared\BudgetDistributionTable.jsx src\components\budgets\shared\BudgetDistributionRow.jsx` in `client` | Passed | Focused frontend lint |
| 2026-07-05 | Phase 4 returned-budget correction | `npm.cmd run build` in `client` | Passed | Vite v8.0.10 transformed 3178 modules and built successfully |

### Phase 4 Returned-Budget Correction - Superseded 2026-07-05

The temporary returned-budget correction behavior was superseded by the revised Phase 5 workflow before Phase 5C began. It must not be treated as active workflow behavior.

Active Department Budget rules after the revised workflow:

- `DRAFT` category budgets keep the replacement-based Save Draft behavior: added rows, catalog-item changes, quantity/distribution edits, and removed saved rows are persisted only on Save Draft. Omitted saved rows may be soft-deactivated by `deactivateCategoryBudgetItemsNotInListRepo`.
- Removing a persisted row in `DRAFT` is tracked as a structural unsaved change so the page does not incorrectly show "All changes are saved" before Save Draft.
- Submission moves the category budget from `DRAFT` to `IN_CATEGORY_REVIEW`.
- After submission, the HOD Budget Entry view is read-only. HOD users cannot add rows, import rows, copy from history, request an item from the submitted-entry toolbar, delete rows, replace catalog items, change quantities, change distributions, or resubmit in the same review cycle.
- Category Manager decisions are visible to the HOD in Budget Entry as read-only decision data: requested quantity, approved quantity, difference, review note, review status, reviewed by, and reviewed at.
- There is no active `RETURNED_TO_DEPARTMENT` or `NEEDS_MODIFICATION` department correction flow between Category Manager and HOD.
- A reviewed department item uses `CATEGORY_REVIEW_COMPLETED`; approved quantity `0` means the item was reviewed and not approved for package demand.
- `GET /api/budgets/:departmentBudgetId/review-feedback` was removed from the new `department-budgets` module. Any remaining old feedback components are deferred legacy code and must not be used by the new workflow.

Files changed:

- `client/src/pages/budget/BudgetEnteryPage.jsx`
- `client/src/hooks/budgets/useCreateBudgetManual.js`
- `client/src/components/budgets/shared/BudgetDistributionTable.jsx`
- `client/src/components/budgets/shared/BudgetDistributionRow.jsx`
- `server/modules/department-budgets/departmentBudgets.service.js`
- `server/tests/modules/department-budgets/departmentBudgets.service.test.js`

### Phase 4 Completion Record

Phase 4 was completed by user approval after implementation, automated validation, and review. The following live scenarios remain useful regression checks for future phases and releases:

- HOD opens Budget Entry and sees the initialized department annual budget.
- IT, Biomedical, and General category tabs show the correct category budgets.
- Row category is locked to the active tab and cannot be changed by the HOD.
- Switching tabs loads and saves rows only for the selected tab's category budget.
- Submit confirmation clearly names the active category budget and states that only that category is submitted.
- HOD adds a generic catalog item request with requested quantity and valid distribution.
- Missing or mismatched distributions are rejected.
- Save Draft persists to `BS_department_category_budget_items` and `BS_department_category_budget_item_distributions`.
- Refresh preserves saved rows from the database.
- Submit moves only the active category budget to `IN_CATEGORY_REVIEW`.
- Submission creates or reuses `BS_category_budget_package_items`.
- Submission creates the year-specific `General` row in `BS_category_budget_package_sub_items` when missing.
- Submitted rows become read-only.
- Submitted category budgets are read-only to HOD users.
- Reviewed Category Manager decisions are visible in Budget Entry as read-only requested quantity, approved quantity, difference, note, reviewer, and timestamp.
- Workflow-history and audit rows exist for save and submit.
- Copy From History loads new-workflow category history and copies rows into the active category.
- Department workspace cannot access another department budget.

Phase 5A and Phase 5B are complete. Phase 5C has not started. Prepare and review/approve the Phase 5C Category Package Preparation and Reconciliation plan before implementation.

### Revised Department-to-Category Workflow Before Phase 5C - 2026-07-05

Approved before Phase 5C implementation.

The active workflow is:

```text
HOD submits department category budget
-> Category Manager reviews submitted items
-> Category Manager records approved quantities and notes
-> HOD sees decisions in Budget Entry as read-only updates
-> Category Manager closes the category submission window
-> Category Manager completes reviews for submitted departments
-> Category Manager prepares/reconciles the category package from approved quantities
-> Category Manager submits package to CFO
-> CFO approves package or returns it to Category Manager
-> Category Manager updates the package and resubmits to CFO when required
```

Rules:

- There is no active return-to-HOD correction cycle in Category Manager review.
- Department category budgets use `DRAFT`, `IN_CATEGORY_REVIEW`, and `CATEGORY_REVIEW_COMPLETED`.
- Department budget items use `DRAFT`, `PENDING_CATEGORY_REVIEW`, and `CATEGORY_REVIEW_COMPLETED`.
- `RETURNED_TO_DEPARTMENT`, department-level `CATEGORY_ACCEPTED`, and department-level `NEEDS_MODIFICATION` are retired from the active department review model.
- `requested_quantity` remains the HOD's original request and is never overwritten by Category Manager review.
- `category_approved_quantity` is the Category Manager's decision and may be less than, equal to, greater than, or `0` compared with requested quantity.
- Approved quantity `0` means the item was reviewed and not approved for package demand; no separate department-level rejected status is required.
- Category Manager may update only approved quantity and review note for submitted department items.
- HOD Budget Entry remains editable only in `DRAFT`; after submission it is informational/read-only.
- Budget Entry shows each reviewed item with requested quantity, approved quantity, difference, review status, Category Manager note, reviewed by, and reviewed at.
- If a previously reviewed decision changes, affected department users are notified through `DEPARTMENT_BUDGET_APPROVAL_UPDATED`.
- Phase 5C package demand and reconciliation must use `SUM(category_approved_quantity)`, not `SUM(requested_quantity)`.
- CFO returns are package-level returns to the Category Manager only; CFO does not return a department budget directly to HOD.

Database/reset note:

- Because the system is still in development, the clean active model is preferred over preserving old test data statuses.
- `server/scripts/migrate-simplified-department-review-workflow.sql` documents the development migration/reset path for existing test databases by converting old department review statuses and replacing the old check constraints.
- Do not run the script automatically from application code. Apply it deliberately during environment migration/reset.

Validation recorded for the revised workflow cleanup:

| Date | Command | Result | Notes |
|---|---|---|---|
| 2026-07-05 | `npm.cmd test -- tests/modules/category-review/categoryReview.service.test.js` in `server` | Passed | 1 file, 11 tests |
| 2026-07-05 | `npm.cmd test -- tests/modules/department-budgets/departmentBudgets.service.test.js` in `server` | Passed | 1 file, 7 tests |
| 2026-07-05 | `npm.cmd test -- tests/notifications/recipientResolver.test.js` in `server` | Passed | 1 file, 2 tests |
| 2026-07-05 | `npx.cmd eslint src/pages/category-review/CategoryReviewPage.jsx src/pages/budget/BudgetEnteryPage.jsx src/components/budgets/shared/BudgetDistributionRow.jsx src/components/budgets/shared/BudgetDistributionTable.jsx src/helpers/budgetRows.helper.js src/hooks/budgets/useCreateBudgetManual.js src/api/categoryReview.api.js` in `client` | Passed | Focused frontend lint |
| 2026-07-05 | `npm.cmd run build` in `client` | Passed | Vite build completed; 3177 modules transformed |
| 2026-07-05 | `rg -n "RETURNED_TO_DEPARTMENT|NEEDS_MODIFICATION|CATEGORY_ACCEPTED|DEPARTMENT_CATEGORY_BUDGET_RETURNED|Return to Department|Needs Modification|returnDepartmentCategoryBudget|markCategoryBudgetReturnedRepo|getDepartmentBudgetReviewFeedback" server\modules server\notifications client\src\pages\category-review client\src\pages\budget client\src\components\budgets\shared client\src\hooks\budgets client\src\helpers server\tests\modules\category-review server\tests\modules\department-budgets -g !node_modules -g !dist` | Passed | No retired department-return symbols in the active new-workflow boundary |

## 31A. Phase 5A Plan - Category Manager Review

Status: `COMPLETED`

Started: 2026-07-04
Completed: 2026-07-04

Phase 5 remains one roadmap phase, but it is executed as separately validated subphases:

```text
5A - Category Manager Review
5B - Category Submission Windows
5C - Category Package Preparation and Reconciliation
5D - CFO Review
```

Phase 5A owns only the Category Manager review of submitted department category budgets.

### Scope

- Create `server/modules/category-review`.
- Add Category Manager review APIs for assigned-category queue, department category budget detail, approved-quantity item decisions, and review completion.
- Enforce selected Category Manager workspace scope through `BS_budget_user_roles.budget_category_id`.
- Use canonical permissions only:
  - `PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS`
  - `PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS`
- Replace old frontend review/approval access for Category Manager with a new Category Review page.
- Show assigned category, financial year, department review queue, item decisions, distribution details, pending/reviewed counts, approved quantity differences, and completion actions.
- Write workflow history, audit logs, and notifications for review decisions, decision updates, and completion.
- Add targeted backend tests and focused frontend lint/build validation.

### Explicit Exclusions

- No category submission window close/reopen commands in 5A.
- No package sub-item editing, pricing, attachments, or reconciliation in 5A.
- No package submission to CFO in 5A.
- No CFO review in 5A.
- No change requests, transfers, PO linking, reports, or production-readiness work.
- No broad old workflow refactor outside files directly replaced by Category Review navigation/routes.

### Database Tables

- `BS_department_category_budgets`
- `BS_department_category_budget_items`
- `BS_department_category_budget_item_distributions`
- `BS_department_budgets`
- `BS_departments`
- `BS_budget_categories`
- `BS_budget_catalog_items`
- `BS_financial_years`
- `BS_budget_workflow_history`
- `BS_audit_logs`
- `BS_Notifications`

### Route Authorization Matrix

| Method | Route | Business Purpose | Consumer | Permission | Workspace Scope | Object Scope |
|---|---|---|---|---|---|---|
| `GET` | `/api/category-review/queue` | Review queue and summary | Category Manager | `VIEW_CATEGORY_BUDGET_REQUESTS` | Category workspace | Active assignment category only |
| `GET` | `/api/category-review/budgets/:departmentCategoryBudgetId` | Department category budget review detail | Category Manager | `VIEW_CATEGORY_BUDGET_REQUESTS` | Category workspace | Budget category must match workspace category |
| `PATCH` | `/api/category-review/items/:itemId/decision` | Record approved quantity and review note | Category Manager | `REVIEW_DEPARTMENT_CATEGORY_REQUESTS` | Category workspace | Item's parent category must match workspace category |
| `PATCH` | `/api/category-review/budgets/:departmentCategoryBudgetId/complete` | Mark category review completed | Category Manager | `REVIEW_DEPARTMENT_CATEGORY_REQUESTS` | Category workspace | Every active item must be `CATEGORY_REVIEW_COMPLETED` |

### Completion Criteria

- Category Manager sees only their assigned category.
- Category Manager cannot view or modify another category.
- Submitted department category budgets appear in the review queue.
- Item decisions record `category_approved_quantity`, optional review note, reviewer, and timestamp.
- Approved quantity may be `0`; this means reviewed and not approved for package demand.
- Completion requires every active submitted item to be reviewed.
- HOD submitted/reviewed Budget Entry remains read-only and displays Category Manager decisions.
- Workflow history, audit, and notification behavior is recorded.
- New frontend page is polished enough for operational review and does not reuse old CFO approval terminology.
- Targeted backend tests, syntax checks, focused frontend lint, client build, and old-permission scan pass for 5A paths.

### Implemented Backend Module Tree

```text
server/modules/category-review/
  categoryReview.constants.js
  categoryReview.controller.js
  categoryReview.mapper.js
  categoryReview.repository.js
  categoryReview.routes.js
  categoryReview.service.js
  categoryReview.validators.js
```

### Implemented APIs

- `GET /api/category-review/queue`
- `GET /api/category-review/budgets/:departmentCategoryBudgetId`
- `PATCH /api/category-review/items/:itemId/decision`
- `PATCH /api/category-review/budgets/:departmentCategoryBudgetId/complete`

### Frontend Files

- `client/src/api/categoryReview.api.js`
- `client/src/pages/category-review/CategoryReviewPage.jsx`
- `client/src/routes/AppRouter.jsx`
- `client/src/layouts/DashboardLayout.jsx`

### Notification Updates

- Added `DEPARTMENT_CATEGORY_BUDGET_RETURNED`.
- Added `CATEGORY_REVIEW_COMPLETED`.
- Return notifications use canonical department-scoped permission resolution with `PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS`.
- Completion notifications use canonical category-scoped permission resolution with `PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS`.
- No legacy permission middleware or old permission aliases were introduced.

### Validation Log

| Date | Command | Result | Notes |
|---|---|---|---|
| 2026-07-04 | `node --check server\modules\category-review\categoryReview.constants.js` | Passed | Syntax check |
| 2026-07-04 | `node --check server\modules\category-review\categoryReview.mapper.js` | Passed | Syntax check |
| 2026-07-04 | `node --check server\modules\category-review\categoryReview.validators.js` | Passed | Syntax check |
| 2026-07-04 | `node --check server\modules\category-review\categoryReview.repository.js` | Passed | Syntax check |
| 2026-07-04 | `node --check server\modules\category-review\categoryReview.service.js` | Passed | Syntax check |
| 2026-07-04 | `node --check server\modules\category-review\categoryReview.controller.js` | Passed | Syntax check |
| 2026-07-04 | `node --check server\modules\category-review\categoryReview.routes.js` | Passed | Syntax check |
| 2026-07-04 | `node --check server\server.js` | Passed | Module router mounted |
| 2026-07-04 | `npm.cmd test -- tests/modules/category-review` | Passed | 1 test file, 8 tests |
| 2026-07-04 | `npm.cmd test -- tests/notifications/recipientResolver.test.js` | Passed | Existing notification resolver tests still pass |
| 2026-07-04 | `npx.cmd eslint src/pages/category-review/CategoryReviewPage.jsx src/api/categoryReview.api.js src/routes/AppRouter.jsx src/layouts/DashboardLayout.jsx` | Passed | Focused frontend lint |
| 2026-07-04 | `npm.cmd run build` in `client` | Passed | Vite built successfully; `CategoryReviewPage` bundle generated |
| 2026-07-04 | `rg -n "can_view_budget|can_edit_budget|can_approve_budget|can_manage_categories|can_manage_financial_years|requirePermission\(" server\modules\category-review client\src\pages\category-review client\src\api\categoryReview.api.js` | Passed | No matches; no legacy permissions in 5A paths |
| 2026-07-04 | `rg -n "BS_budgets|BS_budget_items|BS_budget_item_distribution|BS_budget_types|BS_category_review_packages|BS_category_type_reviews" server\modules\category-review client\src\pages\category-review client\src\api\categoryReview.api.js` | Passed | No matches; no removed old tables in 5A paths |

## 31B. Phase 5B Plan - Category Submission Windows

Status: `COMPLETED`

Started: 2026-07-05
Completed: 2026-07-05

Phase 5B owns Category Manager control of the assigned category's submission window for the active `OPEN` financial year.

### Scope Completed

- Kept the implementation inside `server/modules/category-review` because the window control is a Category Manager operation tied to the selected category workspace.
- Added API support to read, close, and reopen the active category submission window.
- Enforced selected `CATEGORY_BUDGET_MANAGER` workspace scope through the active assignment's `budget_category_id`.
- Used canonical permissions only:
  - `PERMISSION_CODES.VIEW_CATEGORY_BUDGET_REQUESTS`
  - `PERMISSION_CODES.CONTROL_CATEGORY_SUBMISSION_WINDOW`
- Required a reopen reason.
- Allowed an optional close reason.
- Blocked close/reopen while the financial year is not `OPEN`.
- Kept department submission blocking authoritative in `departmentBudgets.service.js`, which already rejects category submissions when the matching `BS_category_submission_windows.status` is not `OPEN`.
- Added workflow history and audit records for close and reopen.
- Added durable notifications for close and reopen using the canonical notification recipient resolver.
- Added a visible Category Submission Window panel to the Category Review page.

### APIs Implemented

```text
GET   /api/category-review/submission-window
PATCH /api/category-review/submission-window/close
PATCH /api/category-review/submission-window/reopen
```

### Database Tables Used

- `BS_category_submission_windows`
- `BS_financial_years`
- `BS_budget_categories`
- `BS_budget_workflow_history`
- `BS_audit_logs`
- `BS_Notifications`
- `BS_budget_user_roles`
- `BS_budget_permissions`
- `BS_budget_role_permissions`
- `BS_budget_user_permission_overrides`

No schema changes were made.

### Route Authorization Matrix

| Method | Route | Business Purpose | Consumer | Permission | Workspace Scope | Object Scope |
|---|---|---|---|---|---|---|
| `GET` | `/api/category-review/submission-window` | View assigned category window | Category Manager | `VIEW_CATEGORY_BUDGET_REQUESTS` | Category workspace | Active assignment category only |
| `PATCH` | `/api/category-review/submission-window/close` | Close assigned category submissions | Category Manager | `CONTROL_CATEGORY_SUBMISSION_WINDOW` | Category workspace | Active assignment category only; financial year must be `OPEN`; window must be `OPEN` |
| `PATCH` | `/api/category-review/submission-window/reopen` | Reopen assigned category submissions | Category Manager | `CONTROL_CATEGORY_SUBMISSION_WINDOW` | Category workspace | Active assignment category only; financial year must be `OPEN`; window must be `CLOSED`; reason required |

### Frontend Files

- `client/src/pages/category-review/CategoryReviewPage.jsx`
- `client/src/api/categoryReview.api.js`

The UI displays:

- current category;
- financial year;
- window status;
- last closer and close timestamp;
- reopen reason;
- Close submissions action;
- Reopen submissions action;
- confirmation modal explaining the impact of closing;
- required reopen-reason modal.

### Backend Files

- `server/modules/category-review/categoryReview.constants.js`
- `server/modules/category-review/categoryReview.validators.js`
- `server/modules/category-review/categoryReview.mapper.js`
- `server/modules/category-review/categoryReview.repository.js`
- `server/modules/category-review/categoryReview.service.js`
- `server/modules/category-review/categoryReview.controller.js`
- `server/modules/category-review/categoryReview.routes.js`

### Notification Updates

- Added `CATEGORY_SUBMISSION_WINDOW_CLOSED`.
- Added `CATEGORY_SUBMISSION_WINDOW_REOPENED`.
- Added `server/notifications/templates/categorySubmissionWindow.template.js`.
- Close/reopen notifications use `PERMISSION_CODES.MANAGE_DEPARTMENT_BUDGET_REQUESTS` with `GLOBAL` scope because the current notification resolver supports `GLOBAL`, `CATEGORY`, and `DEPARTMENT`; department assignments are not category-scoped. This notifies department-budget managers that the category-wide submission state changed.

### Validation Log

| Date | Command | Result | Notes |
|---|---|---|---|
| 2026-07-05 | `node --check server\modules\category-review\categoryReview.constants.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\modules\category-review\categoryReview.validators.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\modules\category-review\categoryReview.mapper.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\modules\category-review\categoryReview.repository.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\modules\category-review\categoryReview.service.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\modules\category-review\categoryReview.controller.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\modules\category-review\categoryReview.routes.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\constants\notificationTypes.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\notifications\notificationConfig.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\notifications\buildNotificationPayload.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\notifications\templateResolver.js` | Passed | Syntax check |
| 2026-07-05 | `node --check server\notifications\templates\categorySubmissionWindow.template.js` | Passed | Syntax check |
| 2026-07-05 | `npm.cmd test -- tests/modules/category-review/categoryReview.service.test.js` in `server` | Passed | 1 file, 12 tests |
| 2026-07-05 | `npm.cmd test -- tests/notifications/recipientResolver.test.js` in `server` | Passed | 1 file, 2 tests |
| 2026-07-05 | `npx.cmd eslint src\pages\category-review\CategoryReviewPage.jsx src\api\categoryReview.api.js` in `client` | Passed | Focused frontend lint |
| 2026-07-05 | `npm.cmd run build` in `client` | Passed | Vite v8.0.10 transformed 3178 modules and built successfully |
| 2026-07-05 | `rg -n "BS_budgets|BS_budget_items|BS_budget_item_distribution|BS_budget_types|BS_category_review_packages|BS_category_type_reviews|BS_category_type_review" server\modules\category-review client\src\pages\category-review client\src\api\categoryReview.api.js` | Passed | No removed old-table references in Phase 5B paths |
| 2026-07-05 | `rg -n "can_view_budget|can_edit_budget|can_approve_budget|can_manage_categories|can_manage_financial_years|requirePermission\(" server\modules\category-review client\src\pages\category-review client\src\api\categoryReview.api.js` | Passed | No legacy permission aliases in Phase 5B paths |
| 2026-07-05 | `git diff --check -- server\modules\category-review server\tests\modules\category-review server\constants\notificationTypes.js server\notifications\notificationConfig.js server\notifications\buildNotificationPayload.js server\notifications\templateResolver.js server\notifications\templates\categorySubmissionWindow.template.js client\src\pages\category-review\CategoryReviewPage.jsx client\src\api\categoryReview.api.js` | Passed | Scoped whitespace check |

## 31C. Phase 5C Plan - Category Package Preparation and Reconciliation

Status: `IN_REVIEW`

Started: 2026-07-06

Phase 5C owns the Category Manager hospital-wide package-preparation workflow for the assigned category and active `OPEN` financial year.

### Scope Implemented

- Created `server/modules/category-packages`.
- Added the category package API under `/api/category-packages`.
- Added the package allocation relationship script:
  - `server/scripts/add-category-package-sub-item-allocations.sql`
- Added the frontend API:
  - `client/src/api/categoryPackages.api.js`
- Added the package workbench component:
  - `client/src/components/category-packages/CategoryPackageWorkbench.jsx`
- Embedded the package workbench into the existing Category Manager page:
  - `client/src/pages/category-review/CategoryReviewPage.jsx`

### Allocation Database Rule

Phase 5C adds one normalized allocation relationship:

```text
BS_department_category_budget_items
        |
        | allocated_quantity
        v
BS_category_budget_package_sub_item_allocations
        |
        v
BS_category_budget_package_sub_items
```

The allocation row owns only:

```text
department category budget item
package sub-item
allocated quantity
audit/concurrency metadata
```

It must not own price, specification, unit, note, attachment, reusable-model identity, or package-sub-item identity.

Zero allocations are not stored. Saving zero removes the allocation row.

### Shared Package Sub-Item Rule

One year-specific package sub-item is shared across the hospital package.

For example:

```text
Dell Latitude 5450
```

has one shared:

```text
unit price
specification snapshot
unit of measure
package note
attachment set
system-maintained quantity
```

Departments allocated to Dell must not have different Dell prices, specifications, units, notes, or attachments.

### Quantity and Reconciliation Rules

- `BS_category_budget_package_sub_items.quantity` remains.
- It is system-maintained from department allocations while the package is editable.
- It is not exposed as an independent editable field.
- Package demand uses `SUM(BS_department_category_budget_items.category_approved_quantity)`.
- Reconciliation is enforced at:
  - department item level;
  - package sub-item level;
  - generic package item level.
- Under-allocation can be saved while the package remains editable.
- A new save that overallocates a department item is rejected.
- Existing excess caused by a later approved-quantity reduction is preserved and shown as needing reconciliation until manually corrected.

### UI/UX Direction

The Category Manager uses one coherent page:

```text
CategoryReviewPage
  -> Department Review workspace
  -> Category Package Workbench
```

The package workbench shows:

- assigned category and financial year context;
- package readiness blockers;
- approved demand, allocated demand, remaining demand;
- requested generic item list;
- shared models and pricing table;
- department demand breakdown;
- allocation drawer that edits only allocated quantity;
- CFO submission confirmation.

The UI intentionally keeps shared model details and department allocations separate:

- shared model details are edited once per package sub-item;
- department allocation drawer edits only allocation quantity;
- model identity is locked after package sub-item creation.

### APIs Implemented

```text
GET    /api/category-packages/current
GET    /api/category-packages/readiness
GET    /api/category-packages/items/:packageItemId
POST   /api/category-packages/items/:packageItemId/sub-items
PATCH  /api/category-packages/sub-items/:packageSubItemId
DELETE /api/category-packages/sub-items/:packageSubItemId
PUT    /api/category-packages/department-items/:departmentItemId/allocations
PATCH  /api/category-packages/:packageId/submit-to-cfo
```

### Route Authorization Matrix

| Method | Route | Business Purpose | Consumer | Permission | Workspace Scope | Object Scope |
|---|---|---|---|---|---|---|
| `GET` | `/api/category-packages/current` | View assigned category package | Category Manager | `MANAGE_CATEGORY_BUDGET_PACKAGES` | Category workspace | Active assignment category only |
| `GET` | `/api/category-packages/readiness` | View CFO submission blockers | Category Manager | `MANAGE_CATEGORY_BUDGET_PACKAGES` | Category workspace | Active assignment category only |
| `GET` | `/api/category-packages/items/:packageItemId` | View package item detail | Category Manager | `MANAGE_CATEGORY_BUDGET_PACKAGES` | Category workspace | Package item category must match assignment |
| `POST` | `/api/category-packages/items/:packageItemId/sub-items` | Add shared package model | Category Manager | `MANAGE_CATEGORY_BUDGET_SUB_ITEMS` | Category workspace | Package item category must match assignment |
| `PATCH` | `/api/category-packages/sub-items/:packageSubItemId` | Edit shared price/spec/note | Category Manager | `MANAGE_CATEGORY_BUDGET_SUB_ITEMS` | Category workspace | Package sub-item category must match assignment |
| `DELETE` | `/api/category-packages/sub-items/:packageSubItemId` | Remove shared package model and allocations while editable | Category Manager | `MANAGE_CATEGORY_BUDGET_SUB_ITEMS` | Category workspace | Package sub-item category must match assignment |
| `PUT` | `/api/category-packages/department-items/:departmentItemId/allocations` | Replace department allocation split | Category Manager | `MANAGE_CATEGORY_BUDGET_SUB_ITEMS` | Category workspace | Department item category must match assignment and selected package sub-items |
| `PATCH` | `/api/category-packages/:packageId/submit-to-cfo` | Submit reconciled package to CFO | Category Manager | `SUBMIT_CATEGORY_BUDGET_PACKAGES_TO_CFO` | Category workspace | Package category must match assignment |

### Backend Files

- `server/modules/category-packages/categoryPackages.constants.js`
- `server/modules/category-packages/categoryPackages.validators.js`
- `server/modules/category-packages/categoryPackages.mapper.js`
- `server/modules/category-packages/categoryPackages.repository.js`
- `server/modules/category-packages/categoryPackages.service.js`
- `server/modules/category-packages/categoryPackages.controller.js`
- `server/modules/category-packages/categoryPackages.routes.js`
- `server/server.js`

### Validation Log

| Date | Command | Result | Notes |
|---|---|---|---|
| 2026-07-06 | `node --check server\modules\category-packages\categoryPackages.constants.js` | Passed | Syntax check |
| 2026-07-06 | `node --check server\modules\category-packages\categoryPackages.validators.js` | Passed | Syntax check |
| 2026-07-06 | `node --check server\modules\category-packages\categoryPackages.repository.js` | Passed | Syntax check |
| 2026-07-06 | `node --check server\modules\category-packages\categoryPackages.service.js` | Passed | Syntax check |
| 2026-07-06 | `node --check server\modules\category-packages\categoryPackages.controller.js` | Passed | Syntax check |
| 2026-07-06 | `node --check server\modules\category-packages\categoryPackages.routes.js` | Passed | Syntax check |
| 2026-07-06 | `node --check server\server.js` | Passed | Syntax check |
| 2026-07-06 | `npm.cmd test -- tests/modules/category-packages/categoryPackages.service.test.js` in `server` | Passed | 1 file, 3 tests |
| 2026-07-06 | `npx.cmd eslint client/src/components/category-packages/CategoryPackageWorkbench.jsx client/src/api/categoryPackages.api.js` | Passed | Focused lint for new Phase 5C frontend files |
| 2026-07-06 | `npm.cmd run build` in `client` | Passed | Vite v8.0.10 built successfully |

### Remaining Phase 5C Blocker

Package sub-item attachment upload/download/remove is still blocked by missing active shared file-storage/upload implementation in the current new-workflow backend. The table exists and the workbench displays attachment counts from `BS_category_budget_package_sub_item_attachments`, but attachment management must be completed before Phase 5C can be marked `COMPLETED`.

### Remaining Phase 5 Work

- Complete Phase 5C attachment management and live DB/UI validation.
- Phase 5D: CFO Review.

## 32. Canonical Permission Architecture Boundary Refactor

Status: `IN_REVIEW`

Implementation date: 2026-07-04

Scope boundary:

- Canonical permission architecture is applied now to new-workflow modules and shared infrastructure they require.
- Deferred old workflow modules may temporarily keep their legacy permission path until their owning module is migrated or deleted.
- Do not claim the entire repository is legacy-free until the final old-module retirement scan passes.
- The live database contains no legacy permission bit columns. Legacy permission names exist only in temporary application compatibility code and existing deferred old-route consumers.

Implemented new-workflow boundary:

- `server/modules/access-management`
- `server/modules/department-budgets`
- `server/modules/financial-years`
- `server/modules/item-requests`
- `server/modules/master-catalog`
- `server/shared/middleware/requireBudgetPermission.js`
- `server/notifications`
- `server/services/notification.service.js`
- new-workflow frontend route guards, layout navigation, dashboard actions, and shared permission helper

Canonical contract:

```text
shared/permissions/permissionCodes.js
```

The shared contract exports `PERMISSION_CODES`, `PERMISSION_CODE_VALUES`,
`assertCanonicalPermissionCode`, `hasPermission`, `hasAnyPermission`, and
`hasAllPermissions`.

Application code in the implemented new-workflow boundary must import canonical constants instead of repeating raw `can_*` strings.

### Temporary Legacy Permission Compatibility Boundary

The new-workflow enforcement boundary is canonical-only.

A temporary isolated compatibility adapter remains for mounted old-workflow routes that have not reached their owning refactor phase:

```text
server/middleware/permission.middleware.js
```

This file is not part of the target architecture. It exists only to prevent existing mounted old-workflow routes from crashing while they await migration, replacement, or deletion. It maps legacy route names such as:

```text
can_approve_budget
can_edit_budget
can_manage_categories
```

to one or more canonical permissions from:

```text
shared/permissions/permissionCodes.js
```

The adapter:

- does not restore legacy permission columns;
- does not add legacy permissions to the database;
- does not add legacy names to `PERMISSION_CODES`;
- checks the canonical `req.budgetAccess.permissionCodes` produced by Access Management;
- must not be imported by new-workflow modules;
- must not be used by newly written routes.

New-workflow permission path:

```text
New-workflow route
-> server/shared/middleware/requireBudgetPermission.js
-> PERMISSION_CODES.*
-> req.budgetAccess.permissionCodes
-> strict canonical permission helper
```

Example:

```js
requireBudgetPermission(
  PERMISSION_CODES.MANAGE_BUDGET_CATALOG,
)
```

Deferred old-workflow compatibility path:

```text
Old mounted route
-> server/middleware/permission.middleware.js
-> temporary legacy-name mapping
-> canonical PERMISSION_CODES
-> req.budgetAccess.permissionCodes
```

Example:

```js
requirePermission("can_approve_budget")
```

This second path is permitted only for existing deferred old-workflow consumers. Do not copy it into new files.

Security limitation:

- Some broad legacy permissions map to several canonical permissions using "any permission" behavior.
- For example, `can_approve_budget` may temporarily correspond to multiple CFO-related canonical permissions.
- This mapping is an approximation for operational continuity only. It is not precise enough for final route authorization.
- When the owning module is refactored, broad router-level legacy protection must be replaced with precise route-specific permissions such as `PERMISSION_CODES.VIEW_CFO_CATEGORY_BUDGET_PACKAGES` for reads and `PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES` for approval commands.

Removal conditions:

The compatibility middleware can be deleted only after every import of `server/middleware/permission.middleware.js` has been removed. Each old consumer must first be deleted, unmounted as obsolete, or migrated to `requireBudgetPermission(PERMISSION_CODES.*)` with precise route-level permissions.

Before deletion, verify:

```powershell
rg -n "middleware/permission.middleware|requirePermission\(" server
```

There must be no active consumer remaining.

Repository scans should report deferred old-workflow consumers separately instead of treating them as canonical new-workflow code. The enforcement boundary expands as each old module is migrated or removed.

Serialized access representation:

```text
budgetAccess.permissionCodes
```

`budgetAccess.permissions` is no longer serialized by Access Management for the new workflow. Helpers may create an in-memory `Set` from `permissionCodes`, but they must not maintain a second serialized permission map.

Notification recipient architecture:

```text
New-workflow emitter
-> notificationConfig using PERMISSION_CODES
-> recipientResolver
-> access-management getUsersByEffectivePermission
-> normalized parameterized SQL where permission_code = @permissionCode
```

Permission codes are SQL values, not SQL identifiers. Notification permission lookup must not use dynamic SQL column names such as `r.${permissionColumn}` or `brp.${permissionColumn}`.

Notification scope types currently supported:

```text
GLOBAL
CATEGORY
DEPARTMENT
```

Implemented mappings:

| Notification | Permission | Scope |
|---|---|---|
| `ITEM_REQUEST_CREATED` | `PERMISSION_CODES.MANAGE_BUDGET_CATALOG` | `GLOBAL` |
| `DEPARTMENT_CATEGORY_BUDGET_SUBMITTED` | `PERMISSION_CODES.REVIEW_DEPARTMENT_CATEGORY_REQUESTS` | `CATEGORY` by `payload.categoryId` |
| `CATEGORY_BUDGET_PACKAGE_SUBMITTED` | `PERMISSION_CODES.APPROVE_CATEGORY_BUDGET_PACKAGES` | `GLOBAL` |
| `TRANSFER_CREATED` | `PERMISSION_CODES.APPROVE_CATEGORY_TRANSFERS` | `GLOBAL`, to be refined when Transfers is migrated |
| `PO_LINK_SUBMITTED` | `PERMISSION_CODES.APPROVE_CATEGORY_PO_LINKS` | `GLOBAL`, to be refined when PO Linking is migrated |

Deferred legacy inventory:

- Old global route/controller/service/repository files outside implemented new-workflow modules may still contain old permission names.
- Those files are not part of this enforcement boundary and must be migrated or deleted during their owning module phase.
- `server/middleware/permission.middleware.js` remains deferred legacy infrastructure only for old workflow routes. New-workflow modules must not import it.

Validation commands:

```powershell
cd D:\QNH-Budget-System-V2-Clean\server
npm.cmd test -- tests/modules/access-management tests/modules/department-budgets tests/modules/item-requests tests/notifications/recipientResolver.test.js
npm.cmd run scan:permission-boundary
npm.cmd run validate:permissions

cd D:\QNH-Budget-System-V2-Clean\client
npx.cmd eslint src/helpers/permissions.js src/routes/AppRouter.jsx src/layouts/DashboardLayout.jsx src/config/dashboard/quickActions.js src/config/dashboard/dashboardCards.jsx src/config/dashboard/adminCards.jsx src/config/dashboard/workPanels.js src/pages/budget/MyBudgetsPage.jsx src/pages/budget/BudgetViewPage.jsx vite.config.js
npm.cmd run build
```

Validation log:

| Date | Command | Result | Notes |
|---|---|---|---|
| 2026-07-04 | `node --check shared\permissions\permissionCodes.js` | Passed | Canonical shared contract syntax |
| 2026-07-04 | `node --check server\modules\access-management\access.constants.js` | Passed | Access constants syntax |
| 2026-07-04 | `node --check server\modules\access-management\access.mapper.js` | Passed | Access mapper syntax |
| 2026-07-04 | `node --check server\modules\access-management\access.service.js` | Passed | Access service syntax |
| 2026-07-04 | `node --check server\modules\access-management\access.repository.js` | Passed | Access repository syntax |
| 2026-07-04 | `node --check server\notifications\recipientResolver.js` | Passed | Recipient resolver syntax |
| 2026-07-04 | `node --check server\notifications\notificationConfig.js` | Passed | Notification config syntax |
| 2026-07-04 | `node --check server\repositories\notificationRecipients.repository.js` | Passed | Legacy permission-column lookup removed |
| 2026-07-04 | `npm.cmd test -- tests/modules/access-management tests/modules/department-budgets tests/modules/item-requests tests/notifications/recipientResolver.test.js` | Passed | 7 files, 24 tests |
| 2026-07-04 | Focused frontend ESLint command listed above | Passed | No output from ESLint |
| 2026-07-04 | `npm.cmd run scan:permission-boundary` | Passed | Raw legacy permission scan passed in the implemented boundary |
| 2026-07-04 | `npm.cmd run build` in `client` | Passed | Vite build succeeded |
| 2026-07-04 | `npm.cmd run validate:permissions` | Timed out | Command was added, but live DB comparison did not complete within 120 seconds in this run |

Remaining permission architecture follow-up:

- Run `npm.cmd run validate:permissions` successfully against the live SQL Server connection before production readiness.
- Expand `scan:permission-boundary` when each old module is migrated or deleted.
- Remove deferred legacy permission infrastructure when no old route imports it.
