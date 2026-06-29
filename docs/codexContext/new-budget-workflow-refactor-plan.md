# New Budget Workflow Refactor Roadmap

This document explains how to transform the current QNH Budget System into the new centralized category budget workflow with the lowest practical risk and the highest reasonable reuse of existing infrastructure.

This is a planning document only.

It does not define database scripts, API contracts, React implementation, or code changes.

The source of truth for business behavior is:

```text
docs/codexContext/new-budget-workflow-specification.md
```

## 1. Refactor Strategy

The new workflow is not a small approval change. It changes the core budget planning model.

The current system is based on:

```text
Department Budget
-> Budget Approver
-> Approved / Returned
```

The new system is based on:

```text
Department User
-> Category Budget Manager
-> CFO
-> Execution
```

The safest approach is not a full application rewrite.

The safest approach is:

```text
Preserve infrastructure.
Replace the budget workflow domain.
Refactor downstream modules to target the new domain.
```

Preserve:

- authentication
- permission middleware pattern
- route-controller-service-repository architecture
- React Query data-fetching pattern
- shared frontend layout
- shared UI components
- notification queue infrastructure
- audit log infrastructure
- financial year lifecycle foundation
- PO source-data integration
- transfer approval skeleton
- access-management foundation

Replace or heavily refactor:

- department budget entry
- budget item model
- budget approval model
- budget balance model
- transfer target model
- PO link target model
- reporting aggregation model
- dashboard work queues
- permission semantics

The recommended target domain structure is:

```text
Financial Year
-> Department Budget Container
-> Department Category Budget
-> Parent Item
-> Sub Item
```

This allows reuse of the existing department budget concept while making category lifecycle the real workflow authority.

## 2. Current System Classification

### Backend Architecture

Classification: Reuse

Current state:

- backend follows Route -> Controller -> Service -> Repository -> MSSQL
- services contain business rules
- repositories contain SQL access
- controllers are mostly thin request handlers

Recommendation:

Keep this architecture. The refactor should add or modify services and repositories inside the same pattern.

Do not introduce a new backend architecture.

### Frontend Architecture

Classification: Reuse

Current state:

- React with Vite
- React Router
- React Query
- Axios API client
- Tailwind CSS
- shared layout and route guards

Recommendation:

Keep the frontend architecture. New workflow pages should use existing route, hook, API, and shared component patterns.

### Financial Years

Classification: Refactor

Current state:

- financial year can be `OPEN`, `PRE_CLOSING`, or `CLOSED`
- creating a financial year creates department budgets
- pre-closing requires all active budgets to be approved
- closing requires no pending transfers or unfinished PO links

New workflow impact:

- pre-closing readiness must be based on category budget status, not only department budget status
- unused categories must not block pre-closing
- normal change requests stop at `PRE_CLOSING`
- pending transfer and pending PO link blocking remains valid

Recommendation:

Reuse the financial year lifecycle, but replace readiness checks with category-aware rules.

### Budgets

Classification: Refactor

Current state:

- one budget per department per financial year
- budget status controls the whole workflow
- budget submission sends the whole budget to approval

New workflow impact:

- the department budget should become a container
- each department has independent IT, Biomedical, and General category budgets
- category budget status becomes the workflow authority

Recommendation:

Keep the department budget container if possible. Do not use the old budget status as the single workflow state for new financial years.

### Budget Items

Classification: Replace / Redesign

Current state:

- department users enter item, quantity, unit price, total amount, distribution method
- item total is quantity multiplied by unit price
- budget items are the approval and execution target

New workflow impact:

- Department Users must never enter price
- Parent Items hold requested quantity, approved quantity, distribution, notes, and review state
- Sub Items hold specification, quantity, unit cost, and amount
- parent totals are derived from sub-items

Recommendation:

Replace the old budget item behavior for new workflow years. Existing budget item code can be referenced for distribution handling, but the old price-bearing item model is not compatible.

### Budget Approval

Classification: Replace / Redesign

Current state:

- one approval layer
- whole-budget approve or return
- `can_approve_budget` gives broad budget approval access

New workflow impact:

- Category Budget Manager review happens before CFO review
- CFO cannot edit values
- CFO returns to Category Budget Manager, not directly to Department User
- review checkbox controls item-level locking
- category approval is independent

Recommendation:

Build new review services for Category Budget Manager and CFO. Do not stretch the old approval module into the new workflow.

### Permissions and Access Management

Classification: Refactor

Current state:

- generic permissions such as `can_edit_budget`, `can_approve_budget`, `can_request_transfer`, `can_approve_po_links`
- one active budget role is resolved for the user
- no active workspace or acting context
- no category-scoped role model

New workflow impact:

- official category roles are IT Category Budget Manager, Biomedical Category Budget Manager, General Category Budget Manager
- users may hold multiple responsibilities
- active workspace must determine acting context
- PO Link approval is permission-based
- Category Budget Manager delegation is role-based

Recommendation:

Extend the access model to support multiple workspaces per user. Avoid overloading `can_approve_budget` for category and CFO workflows.

### Notifications

Classification: Refactor

Current state:

- notification infrastructure exists
- recipient strategies include permission, owner, and broadcast
- budget submitted notifications go to generic budget approvers

New workflow impact:

- Department category submission must notify the correct Category Budget Manager role
- Category submission to CFO must notify CFO
- CFO return must notify Category Budget Manager
- category return to department must notify Department User
- change requests need new notification events
- workspace context should be included in relevant payloads

Recommendation:

Reuse the queue, worker, and template structure. Redesign notification types, recipient resolution, and templates for category-aware workflow.

### Audit Logs

Classification: Refactor

Current state:

- audit infrastructure exists
- mutating controllers write audit entries
- audit does not record active workspace

New workflow impact:

- audit must record acting workspace
- item review state changes must be auditable
- approved quantity changes must be auditable
- sub-item changes must be auditable
- supporting document changes must be auditable
- change request lifecycle must be auditable

Recommendation:

Reuse audit infrastructure. Extend audit event coverage and include acting context.

### Transfers

Classification: Refactor

Current state:

- users with transfer request permission can create transfers
- transfers target old budget items
- transfer approval goes to approver permission
- financial year must be `PRE_CLOSING`

New workflow impact:

- only Category Budget Managers create transfers
- transfers occur only within the same category
- cross-category transfers are not allowed
- cross-department transfers are not allowed
- transfers target Parent Items, not Sub Items
- CFO approves transfers

Recommendation:

Reuse the transfer request and approval skeleton. Replace eligibility, target model, permissions, and balance logic.

### PO Linking

Classification: Refactor

Current state:

- PO link request and approval infrastructure exists
- PO links target budget items
- approval uses `can_approve_po_links`
- PO source data is available
- PO linking is active during `PRE_CLOSING`

New workflow impact:

- PO links target Sub Items
- PO approval remains permission-based
- Version 1 usually assigns PO Link Approval permission to Finance
- Procurement participates only in PO Linking phase

Recommendation:

Reuse PO source lookup, PO link request lifecycle, approval lifecycle, notification pattern, and transparency concepts. Replace the target from budget item to sub-item.

### Reports and Dashboard

Classification: Replace / Redesign

Current state:

- reporting is limited
- dashboard and analytics are based on old budget and item assumptions
- current totals come from budget item amounts

New workflow impact:

- reports must show department category status
- requested quantity and approved quantity must be separate
- totals derive from sub-items
- consolidated item view becomes a core report/read model
- change request, transfer, PO, and attachment status must be reportable

Recommendation:

Rebuild reporting queries around the new source of truth. Reuse UI shells and formatting helpers only.

### Item Master and Budget Setup

Classification: Refactor

Current state:

- categories and types exist
- item request workflow can create new categories/types
- current category model is not clearly the same as IT/Biomedical/General ownership

New workflow impact:

- item master determines responsibility category
- Department Users do not choose IT/Biomedical/General manually
- Administrator controls item category ownership
- category ownership changes affect future years only

Recommendation:

Preserve existing item master administration where useful, but introduce explicit responsibility category ownership. Do not confuse item taxonomy with responsibility category.

## 3. Phase 1 - Foundation and Architecture Decisions

### Objective

Establish the refactor boundaries and final domain model before workflow code is changed.

### Business Goal

Make sure every future implementation decision follows the approved workflow specification.

### Scope

- confirm source-of-truth document
- define target domain vocabulary
- define old-vs-new workflow coexistence strategy
- identify affected modules
- define workflow-version approach for financial years

### Existing Modules to Reuse

- `docs/codexContext/new-budget-workflow-specification.md`
- backend architecture pattern
- frontend architecture pattern
- financial year lifecycle concept

### Existing Modules to Refactor

- budget workflow documentation
- permissions terminology
- route/page naming plan

### Completely New Modules

- none in this phase

### Database Impact

No schema work in this phase. Only conceptual data model design.

### Backend Impact

No backend code changes in this phase. Define service boundaries only.

### Frontend Impact

No frontend code changes in this phase. Define page and workspace structure only.

### Risks

- unclear domain vocabulary could lead to inconsistent implementation
- treating the old budget item as the new parent item without analysis could create technical debt

### Dependencies

- approved source-of-truth workflow
- agreement on coexistence strategy

### Expected Deliverables

- final domain glossary
- confirmed module classification
- approved implementation sequence

## 4. Phase 2 - Security, Roles, and Workspace Context

### Objective

Introduce the access model required for users with multiple responsibilities.

### Business Goal

Allow a user to act clearly as Department User or Category Budget Manager without mixing responsibilities.

### Scope

- Category Budget Manager role family
- IT/Biomedical/General Category Budget Manager roles
- Department Workspace
- Category Budget Management Workspace
- Current Workspace / Acting As concept
- role-based delegation
- permission-based PO Link approval

### Existing Modules to Reuse

- `verifyPortalJwt`
- `verifyBudgetAccess`
- `requirePermission`
- access management pages
- budget access repositories
- frontend auth context
- frontend route guards

### Existing Modules to Refactor

- `userRole.repository.js`
- budget access assignment service and repository
- access management UI
- dashboard navigation
- `permissions.js`
- route permission decisions

### Completely New Modules

- workspace resolver
- active workspace context
- category role assignment support
- acting-context audit helper

### Database Impact

Conceptual changes:

- support users having multiple active workspaces or role assignments
- support category scope on role assignments
- support acting context on auditable actions

### Backend Impact

- permission checks must understand active workspace where needed
- service methods must receive acting context
- PO approval remains permission-based, not role-name based

### Frontend Impact

- workspace selector
- active workspace display
- workspace-scoped navigation
- workspace-scoped dashboards

### Risks

- mixing permissions and active workspace can produce confusing access rules
- users with multiple roles may accidentally act in the wrong workspace if the UI is not explicit

### Dependencies

- final role names
- final workspace model

### Expected Deliverables

- workspace model approved
- access model design approved
- navigation model approved

## 5. Phase 3 - Database Refactor Design

### Objective

Design the data model required by the new workflow.

### Business Goal

Represent category budgets, parent items, sub-items, approvals, attachments, and change requests without forcing old budget item assumptions into the new workflow.

### Scope

- department budget container
- department category budget
- parent item
- sub-item
- review checkbox state
- approved quantity
- supporting documents
- change requests
- category approval history
- CFO review history
- transfer parent-item target
- PO sub-item target

### Existing Modules to Reuse

- `BS_budgets` concept as department financial year container, if feasible
- departments
- financial years
- item master/category/type tables where compatible
- audit log table concept
- notification table concept

### Existing Modules to Refactor

- `BS_budget_items` usage for new workflow
- budget notes usage
- PO links target
- transfer target
- budget role assignment model

### Completely New Modules

Conceptual entities:

- Department Category Budget
- Parent Item
- Sub Item
- Parent Item Attachment
- Sub Item Attachment
- Change Request
- Change Request Affected Item
- Review History
- Approval Package Snapshot

### Database Impact

High.

The current schema stores price on budget items. The new workflow stores price only on sub-items.

The current schema stores one budget status. The new workflow requires category-level and item-level lifecycle state.

### Backend Impact

Repository contracts must be redesigned before service implementation.

### Frontend Impact

Frontend cannot be fully rebuilt until the domain shape is stable.

### Risks

- modifying old tables in place may break old financial years
- duplicating totals in multiple places may create drift
- unclear historical category ownership may damage audit reliability

### Dependencies

- Phase 1 domain model
- Phase 2 role/workspace model

### Expected Deliverables

- conceptual entity model
- lifecycle state model
- data ownership rules
- compatibility decision for old financial years

## 6. Phase 4 - Backend Workflow Foundation

### Objective

Create the backend workflow foundation for department category budgets.

### Business Goal

Allow Department Users to create category-specific budget requests without pricing, and allow the system to route them to the correct Category Budget Manager.

### Scope

- department category budget creation/loading
- item master category ownership lookup
- Department User budget entry rules
- category submission
- returned item locking rules
- workflow status transitions

### Existing Modules to Reuse

- `budgets.routes.js`
- `budgets.controller.js`
- `budgets.service.js`
- `budgets.repository.js`
- `budgetItems.service.js` distribution concepts
- validation utilities where compatible

### Existing Modules to Refactor

- budget creation and current budget lookup
- budget submission
- budget item create/update/delete rules
- budget review feedback

### Completely New Modules

- category budget service
- parent item service
- category budget repository
- parent item repository

### Database Impact

Uses the new or refactored category budget and parent item structures.

### Backend Impact

Old whole-budget submission rules must not be reused for new workflow years.

### Frontend Impact

Frontend can begin consuming read-only versions of new budget/category endpoints after this phase.

### Risks

- old APIs may still be called by existing pages
- old budget item assumptions may leak into new workflow

### Dependencies

- database design approved
- workspace context available

### Expected Deliverables

- backend services for department category budget lifecycle
- item master category routing
- department submission workflow

## 7. Phase 5 - Department Workspace Frontend

### Objective

Build the Department Workspace experience for budget entry.

### Business Goal

Let Department Users enter only what they know: item, quantity, and distribution method.

### Scope

- Department Workspace landing page
- category budget list
- IT/Biomedical/General category status
- budget entry without pricing
- submit category budget
- returned item editing
- checked item read-only display

### Existing Modules to Reuse

- app layout
- route guards
- table components
- modal components
- distribution components where compatible
- budget header/summary visual patterns
- React Query hooks pattern

### Existing Modules to Refactor

- `BudgetEnteryPage.jsx`
- `BudgetItemsTable.jsx`
- budget API module
- budget hooks

### Completely New Modules

- Department Workspace page
- Department Category Budget page
- returned-item editor
- category status panel

### Database Impact

No new impact beyond earlier phases.

### Backend Impact

Uses Phase 4 APIs.

### Frontend Impact

High. The old budget entry grid should not be lightly modified because it exposes price fields.

### Risks

- users may expect old Excel import behavior
- returned-item locking must be visually clear
- distribution editing must remain simple

### Dependencies

- backend department category workflow
- workspace context

### Expected Deliverables

- Department User can create, edit, and submit category budget requests
- returned items are clearly editable or read-only according to review checkbox state

## 8. Phase 6 - Category Budget Management

### Objective

Build the Category Budget Management workflow.

### Business Goal

Allow Category Budget Managers to review requests across departments, consolidate demand, prepare sub-items, enter pricing, attach evidence, and submit to CFO.

### Scope

- Category Budget Management Workspace
- department view
- item consolidation view
- approved quantity editing
- review checkbox
- notes
- sub-item management
- sub-item pricing
- parent and sub-item attachments
- submit to CFO

### Existing Modules to Reuse

- table components
- drawer/modal components
- `BudgetTimeline` concept
- currency formatting
- notification infrastructure
- audit infrastructure

### Existing Modules to Refactor

- budget approval frontend concepts
- budget approval backend concepts
- notes/review feedback
- budget summary/totals

### Completely New Modules

- Category Budget Management page
- Consolidated Item Review page or tab
- Sub Item editor
- Supporting Documents panel
- Category Review service
- Sub Item service
- Attachment service

### Database Impact

Requires sub-items, attachments, review state, approved quantity, and category review history.

### Backend Impact

New services should own category review rules.

### Frontend Impact

High. This is a new major workspace, not a minor page edit.

### Risks

- consolidated review may become slow without optimized read models
- sub-item quantity must always reconcile to approved parent quantity
- amount totals must not be recalculated inconsistently across layers

### Dependencies

- Phase 4 backend foundation
- Phase 5 department submissions
- attachment storage decision

### Expected Deliverables

- Category Budget Manager can review and prepare category budget packages
- consolidated item view is available
- category package can be submitted to CFO

## 9. Phase 7 - CFO Workflow

### Objective

Build CFO review and approval workflow.

### Business Goal

Give CFO a complete approval package without allowing CFO to directly edit technical or pricing details.

### Scope

- CFO Review Workspace or page
- category budget package list
- parent item review
- department breakdown
- sub-item breakdown
- supporting document access
- notes and review history
- approve category
- return to Category Budget Manager
- item-level acceptance/return behavior

### Existing Modules to Reuse

- `BudgetApprovalPage.jsx` as reference only
- read-only grid concepts
- timeline concept
- modal/confirmation components
- notification infrastructure
- audit infrastructure

### Existing Modules to Refactor

- `budgetApproval.service.js`
- `budgetApproval.repository.js`
- approval API module and hooks
- old approval navigation

### Completely New Modules

- CFO category review service
- CFO review repository/read model
- CFO package review UI

### Database Impact

Requires CFO review state and approval history against category budgets and/or items.

### Backend Impact

Whole-budget approval APIs should not be the source of truth for new workflow years.

### Frontend Impact

High. Existing approval page is not compatible enough for direct reuse.

### Risks

- CFO screen can become too dense
- return routing must always go through Category Budget Manager
- item-level review must not falsely imply final category approval

### Dependencies

- Category Budget Management workflow
- supporting documents
- audit context

### Expected Deliverables

- CFO can approve or return category budget packages
- CFO cannot directly edit quantities, prices, sub-items, or attachments

## 10. Phase 8 - Change Requests

### Objective

Implement controlled changes to approved category budgets before `PRE_CLOSING`.

### Business Goal

Allow departments to request changes without reopening an entire approved category budget.

### Scope

- create Change Request
- add item request
- increase quantity request
- decrease quantity request
- item modification request
- CFO and Category Budget Manager review
- reopen only affected items
- repeat normal review workflow for affected items
- block normal changes after `PRE_CLOSING`

### Existing Modules to Reuse

- item request workflow concepts
- modal and table components
- notification infrastructure
- audit infrastructure

### Existing Modules to Refactor

- item request module only if reused conceptually
- budget status transition rules

### Completely New Modules

- Change Request service
- Change Request repository
- Change Request page
- Change Request review page
- affected item tracking

### Database Impact

Requires change request entities and affected item relationships.

### Backend Impact

Needs strong state transition rules to avoid reopening unaffected items.

### Frontend Impact

New Department Workspace and Category/CFO review flows for change requests.

### Risks

- change requests can create confusing partial approval states
- reopened item history must be clear
- accepted but not yet reapproved changes must not affect final approved totals prematurely

### Dependencies

- CFO workflow
- category item state model

### Expected Deliverables

- approved category budgets can be changed before `PRE_CLOSING`
- only affected items reopen
- all changes are auditable

## 11. Phase 9 - Transfers and PO Linking

### Objective

Refactor execution workflows to use the new budget model.

### Business Goal

Support controlled execution after `PRE_CLOSING` while preserving category boundaries.

### Scope

Transfers:

- Category Budget Manager creates transfers
- CFO approves transfers
- parent item target only
- no sub-item transfers
- no cross-category transfers
- no cross-department transfers

PO Linking:

- target sub-items
- permission-based PO Link approval
- Finance normally holds PO Link Approval in Version 1
- Procurement participates only in PO Linking phase

### Existing Modules to Reuse

- `transfer.routes.js`
- `transfer.controller.js`
- `transfer.service.js` approval skeleton
- `po.routes.js`
- `po.controller.js`
- `po.service.js` lifecycle skeleton
- PO source repository queries
- PO notification templates as reference
- transfer notification templates as reference

### Existing Modules to Refactor

- transfer eligibility queries
- transfer balance calculations
- transfer permission checks
- PO link target queries
- PO budget item picker
- PO quantity availability checks
- financial year close checks

### Completely New Modules

- parent item transfer eligibility read model
- sub-item PO linking eligibility read model
- category-aware balance service

### Database Impact

- transfers reference parent items
- PO links reference sub-items
- close checks reference new transfer/PO structures

### Backend Impact

High, because both modules currently depend on old budget items.

### Frontend Impact

High, but current pages can provide structural reference.

### Risks

- balance calculations may become inconsistent if parent/sub-item sources are mixed
- PO linking to sub-items changes all availability logic
- cross-category transfer blocking must be enforced server-side

### Dependencies

- approved category budgets
- parent item balances
- sub-item approved quantities
- `PRE_CLOSING` lifecycle rules

### Expected Deliverables

- transfers operate only within category at parent item level
- PO links operate at sub-item level
- year closing correctly blocks pending execution activities

## 12. Phase 10 - Reports, Notifications, Audit, and Dashboard

### Objective

Make the new workflow visible, reportable, and auditable.

### Business Goal

Give stakeholders reliable operational visibility and governance history.

### Scope

Reports:

- department/category status
- requested vs approved quantities
- parent item totals
- sub-item totals
- consolidated item demand
- change request status
- transfer status
- PO link status

Notifications:

- department category submitted
- category returned to department
- category submitted to CFO
- CFO returned to Category Budget Manager
- CFO approved category
- change request submitted/accepted/rejected
- transfer submitted/approved/rejected
- PO link submitted/approved/rejected

Audit:

- active workspace / acting as
- parent item changes
- approved quantity changes
- review checkbox changes
- sub-item changes
- attachment changes
- CFO decisions
- change request decisions

Dashboard:

- workspace-specific work queues
- Department Workspace tasks
- Category Budget Management tasks
- CFO tasks
- PO approval tasks

### Existing Modules to Reuse

- notification queue and worker
- audit log repository/service
- dashboard route/service pattern
- shared dashboard card components
- reports page shell if useful

### Existing Modules to Refactor

- notification type constants
- notification config
- recipient resolver
- templates
- dashboard repositories
- report repositories

### Completely New Modules

- category-aware reporting read models
- workspace-aware dashboard work queues
- audit event catalog for new workflow

### Database Impact

May require reporting-friendly views or read models to avoid slow consolidated queries.

### Backend Impact

Medium to high, depending on reporting depth.

### Frontend Impact

Medium. Dashboards and reports should use existing component patterns.

### Risks

- reports may accidentally use old totals
- notifications may go to wrong recipients without category-aware resolver
- audit entries are much less useful if acting context is missing

### Dependencies

- all core workflow phases

### Expected Deliverables

- workspace-specific dashboards
- complete notification coverage
- audit coverage for workflow-critical events
- reliable workflow reports

## 13. Phase 11 - Testing, Migration, and Rollout

### Objective

Roll out the new workflow safely for a new financial year.

### Business Goal

Avoid disrupting existing historical budgets while enabling the new workflow for future planning.

### Scope

- old workflow read-only compatibility
- new workflow financial year activation
- seeded roles and permissions
- test users for each workspace
- end-to-end workflow testing
- UAT scenarios
- rollout checklist

### Existing Modules to Reuse

- current historical budget views where possible
- existing auth and access management
- existing financial year administration

### Existing Modules to Refactor

- route availability by financial year workflow version
- old page navigation
- dashboard links

### Completely New Modules

- workflow-version routing rules if required
- rollout verification checklist

### Database Impact

No old budget migration is recommended unless explicitly required later.

New workflow should start with a new financial year.

### Backend Impact

Services must distinguish old and new workflow years if old data remains accessible.

### Frontend Impact

Navigation must not send new workflow users into old workflow pages for new years.

### Risks

- old and new workflows may coexist confusingly if routing is unclear
- old reports may not match new workflow terminology
- partial rollout can produce support burden

### Dependencies

- all previous phases

### Expected Deliverables

- UAT-approved workflow
- rollout checklist
- old-year compatibility decision
- production activation plan

## 14. Recommended Implementation Order

The recommended order is:

1. Foundation and architecture decisions.
2. Security, roles, and workspace context.
3. Database refactor design.
4. Backend department category budget foundation.
5. Department Workspace frontend.
6. Category Budget Management workflow.
7. CFO workflow.
8. Change Requests.
9. Transfers and PO Linking.
10. Reports, Notifications, Audit, and Dashboard.
11. Testing, migration, and rollout.

This order avoids building frontend screens against an unstable domain model.

It also avoids refactoring Transfers and PO Linking too early. Those modules depend on approved parent items and sub-items, so they should come after the core budget approval model is stable.

## 15. Critical Recommendations

### Do Not Reuse Old Budget Item Amounts

The old system treats budget item amount as:

```text
quantity x unit_price
```

The new system treats amount as:

```text
sum of sub-item totals
```

Do not keep both as competing sources of truth.

### Do Not Overload `can_approve_budget`

The old permission `can_approve_budget` is too broad for the new workflow.

The new workflow has separate responsibilities:

- Category Budget Manager review
- CFO approval
- PO Link approval

These should not all be represented by one generic approval permission.

### Do Not Hide Workspace Context

Users may hold multiple roles.

The active workspace must be explicit.

Audit entries must include the acting context.

### Do Not Treat Category as a Normal Item Category

IT, Biomedical, and General are responsibility categories.

They are not merely item taxonomy labels.

The item master may still have item categories or types, but responsibility category is a workflow ownership concept.

### Do Not Refactor Transfers Before Parent Items Are Stable

Transfers depend on approved parent item balances.

Implementing transfer changes too early risks rework.

### Do Not Refactor PO Linking Before Sub Items Are Stable

PO Linking targets sub-items.

Sub-item quantity, pricing, and approval status must be stable before PO Linking is rewritten.

## 16. Challenge Notes

### Opportunity to Reuse More

The app has useful infrastructure. Reuse it aggressively:

- route/controller/service/repository structure
- React Query hooks
- shared tables and modals
- notification queue
- audit logs
- PO source data queries
- financial year lifecycle shell

The business workflow modules should change, but the application platform does not need to be replaced.

### Biggest Maintainability Risk

The biggest risk is trying to patch the old budget item model until it resembles the new parent/sub-item model.

That will likely produce confusing code and unreliable totals.

The cleanest approach is to define the new domain clearly and refactor old modules to point to it where needed.

### Biggest UX Risk

The biggest UX risk is users with multiple responsibilities acting in the wrong context.

Workspace Context Switching must be visible and persistent.

### Biggest Reporting Risk

The biggest reporting risk is mixing old totals and new totals.

Reports must use the approved source of truth:

```text
Sub Item totals
-> Parent Item totals
-> Category Budget totals
```

### Biggest Governance Risk

The biggest governance risk is weak audit context.

Every workflow-critical action should record:

- user
- acting workspace
- role context
- entity
- old value where relevant
- new value where relevant
- timestamp

## 17. Rollout Recommendation

Use the new workflow for a new financial year.

Do not migrate old budgets into the new parent/sub-item structure unless the business later requires it.

Recommended rollout model:

```text
Old financial years:
Read-only or legacy-compatible views

New financial year:
New category workflow
```

This reduces migration risk and lets the team preserve historical audit integrity.

