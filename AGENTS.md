# QNH Budget System

## 1. Project Purpose

Hospital Budget Management System covering:

- Budget access and workspace management
- Master catalog management
- Financial-year lifecycle
- Department annual budgets
- Department category budgets
- Department item requests and distributions
- Category Manager review
- Hospital-wide category packages
- CFO review
- Controlled budget change requests
- Category submission windows
- Package sub-items, pricing, and attachments
- Category budget transfers
- Purchase Order (PO) catalog mapping and PO linking
- Notifications
- Workflow history
- Technical audit logs
- Reporting and execution balances

The system is being migrated from the removed legacy workflow to the redesigned workflow and database model.

---

## 2. Current Refactor Objective

The current project still contains code based on the old workflow and old database tables.

The approved goal is to:

1. Replace the old workflow with the redesigned workflow.
2. Refactor the backend into a modular, feature-based architecture.
3. Complete the migration one full business module at a time.
4. Keep each migrated module working end to end:
   - repository and SQL;
   - service rules;
   - controller and routes;
   - authorization and workspace scope;
   - audit, workflow history, and notifications;
   - existing frontend API/hooks/pages;
   - tests and validation.
5. Remove obsolete code only after the replacement module is verified.
6. Keep the frontend folder architecture unchanged unless a separate request explicitly approves a frontend architecture refactor.

Do not perform a broad rewrite of the complete system in one step.

---

## 3. Technology Stack

### Backend

- Node.js
- Express.js
- Microsoft SQL Server
- `mssql`
- Repository pattern
- Service layer
- JWT authentication
- Permission- and workspace-based authorization

### Frontend

- React
- Vite
- React Query
- Tailwind CSS

---

## 4. Instruction and Documentation Priority

Before working, read the applicable `AGENTS.md` files from the repository root down to the target directory.

For the budget redesign, use this source-of-truth order:

1. Live database metadata and migrations applied to the current environment.
2. `docs/codexContext/newWorkFlow/QNH_Budget_Database_Scope_for_Codex.md`
3. Other current files inside `docs/codexContext/newWorkFlow`
4. Current approved backend domain rules and tests
5. Existing implementation patterns that do not conflict with the redesigned workflow
6. Older documentation only for historical context

When sources disagree, report the conflict and follow the highest-priority source.

Do not use an older document merely because the existing code still follows it.

---

## 5. Mandatory Discovery Before Planning

### 5.1 Major workflow or architecture work

For a major refactor, a new module, or workflow migration:

1. Read this file.
2. Find and read relevant nested `AGENTS.md` files.
3. Read every file inside:

   ```text
   docs/codexContext/newWorkFlow
   ```

4. Read the authoritative database scope:

   ```text
   docs/codexContext/newWorkFlow/QNH_Budget_Database_Scope_for_Codex.md
   ```

5. Inspect:
   - backend entry points;
   - route registration;
   - current controllers;
   - services;
   - repositories and SQL;
   - middleware;
   - authentication and permission resolution;
   - workspace switching;
   - audit logging;
   - workflow history;
   - notifications;
   - frontend routes, pages, hooks, API clients, and shared components;
   - tests;
   - current Git status and uncommitted changes.
6. Search the repository for:
   - old table names;
   - old statuses;
   - old permission booleans;
   - duplicate route registrations;
   - duplicate services or repositories;
   - old response contracts used by the frontend.

Do not inspect only file names. Read the real call path from route to UI.

### 5.2 Small module-specific task

For a small task inside an already-understood module:

1. Read this file and the applicable nested `AGENTS.md`.
2. Read the database scope.
3. Read the relevant workflow documentation.
4. Inspect every file in the actual call path.
5. Search for existing reusable code before creating anything.

Do not scan unrelated modules unless a dependency requires it.

---

## 6. Planning and Approval Gate

Before modifying files, always provide:

### Affected Files

List the exact existing files expected to change and why.

Also list proposed new files and their purpose.

### Implementation Plan

Describe:

- current behavior;
- required new behavior;
- database tables and status transitions;
- repositories and queries;
- services and transactions;
- routes and controllers;
- authorization and workspace rules;
- frontend changes;
- audit/history/notification behavior;
- tests and validation;
- obsolete code to remove after verification.

### Risks

Include:

- mixed old/new workflow behavior;
- compatibility with existing frontend responses;
- transaction and concurrency risks;
- permission or scope escalation;
- duplicate logic;
- migration and rollback concerns;
- affected modules outside the requested scope.

### Validation Approach

List the exact available commands and manual scenarios to validate the work.

Wait for explicit approval before:

- editing files;
- creating folders;
- moving files;
- changing schema;
- updating dependencies;
- deleting old code;
- starting the next phase.

If the user explicitly requests implementation after approving a plan, proceed within the approved scope.

---

## 7. Target Backend Architecture

The approved backend direction is a modular, feature-based architecture.

The final structure should follow this principle:

```text
backend/
├── modules/
│   ├── access-management/
│   ├── master-catalog/
│   ├── financial-years/
│   ├── department-budgets/
│   ├── category-review/
│   ├── category-packages/
│   ├── change-requests/
│   ├── transfers/
│   ├── po-linking/
│   ├── reports/
│   └── ...
│
└── shared/
    ├── auth/
    ├── database/
    ├── errors/
    ├── middleware/
    ├── validation/
    ├── audit/
    ├── notifications/
    └── utilities/
```

This tree is a principle, not permission to create all folders immediately.

The actual module names and paths must be proposed after inspecting the repository.

### 7.1 Module ownership

A backend business module should own its related:

- routes;
- controllers;
- services;
- repositories;
- SQL/query builders;
- validators and schemas;
- domain constants and statuses;
- DTOs/mappers;
- module-specific utilities;
- tests.

### 7.2 Shared ownership

Move code to `shared` only when it is truly reusable across multiple business modules.

Suitable shared concerns include:

- database connection and transaction helpers;
- authentication;
- common authorization primitives;
- error classes;
- generic validation helpers;
- audit infrastructure;
- notification queue infrastructure;
- file-storage infrastructure;
- pagination primitives.

Do not move business-specific logic into `shared`.

A large generic shared folder is not a successful modular architecture.

### 7.3 Frontend architecture

Do not reorganize the frontend into feature folders during this backend refactor.

Frontend files may be modified to complete a migrated module, but the current frontend folder structure remains in place until separately approved.

---

## 8. Vertical Module Migration Rule

Migrate one complete business module at a time.

The expected flow is:

```text
Understand current module
→ define new workflow behavior
→ refactor repository and SQL
→ implement service rules and transactions
→ update controller and routes
→ update authorization and workspace scope
→ update audit/history/notifications
→ update existing frontend API/hooks/pages
→ test end to end
→ remove obsolete module code
→ document completion
→ move to the next module
```

Do not migrate by horizontal technical layer such as:

```text
all repositories
→ all services
→ all controllers
```

A module is not complete merely because the backend compiles.

It must work from database through the UI.

---

## 9. Required Backend Flow

Within each module, use:

```text
Route
→ Controller
→ Service
→ Repository
→ Microsoft SQL Server
```

### Routes

Routes should:

- declare endpoints;
- apply authentication;
- apply coarse permission middleware where appropriate;
- delegate to controllers.

Routes must not contain workflow logic.

### Controllers

Controllers should:

- read validated request data;
- read authenticated actor/workspace context;
- call one service operation;
- map domain errors to HTTP responses.

Controllers must remain thin.

### Services

Services own business behavior:

- permission and scope checks;
- allowed status transitions;
- transaction boundaries;
- concurrency checks;
- cross-table validation;
- balance calculations;
- audit and workflow-history events;
- notification outbox writes.

Do not place business rules in controllers or repositories.

### Repositories

Repositories should:

- execute SQL;
- accept a transaction when required;
- return explicit records and affected-row counts;
- use parameterized queries;
- match actual SQL Server data types;
- avoid making business decisions.

---

## 10. Reuse and Duplication Rules

Before creating a file or abstraction, search for:

1. existing module code;
2. repositories;
3. services;
4. controllers;
5. route helpers;
6. transaction utilities;
7. validators;
8. error classes;
9. audit helpers;
10. notification helpers;
11. frontend components;
12. hooks;
13. API clients;
14. test factories and fixtures.

Reuse suitable code.

Do not preserve a poor cross-module abstraction merely to avoid creating a correct module-local implementation.

Do not duplicate:

- status-transition rules;
- permission resolution;
- balance formulas;
- transaction logic;
- API response mapping;
- frontend calculations already returned by the API.

---

## 11. New Workflow Overview

The removed workflow was:

```text
Department
→ General Approver
→ CFO
```

The approved workflow is:

```text
Department User / HOD
→ Category Budget Manager
→ CFO
→ Execution
```

The three budget responsibility categories are:

```text
IT
Biomedical
General
```

Each active department receives:

```text
One Department Annual Budget
├── IT Category Budget
├── Biomedical Category Budget
└── General Category Budget
```

Each financial year also receives:

```text
Hospital IT Package
Hospital Biomedical Package
Hospital General Package
```

Each category moves independently through planning and review.

---

## 12. Roles and Workspace Scope

Use the exact role codes defined by the current database.

| Role code | Department scope | Category scope | Main responsibility |
|---|---:|---:|---|
| `DEPARTMENT_BUDGET_MANAGER` | Required | `NULL` | Creates, edits, submits, and corrects the department budget |
| `DEPARTMENT_USER` | Required | `NULL` | Assists within one department according to effective permissions |
| `CATEGORY_BUDGET_MANAGER` | `NULL` | Required | Reviews one category across all departments and prepares its package |
| `BUDGET_APPROVER` | `NULL` | `NULL` | CFO review, lifecycle, change-request and transfer approval |
| `PO_LINK_MANAGER` | `NULL` | `NULL` | Reviews PO-link requests and manages mappings according to permissions |
| `BUDGET_SYSTEM_ADMIN` | `NULL` | `NULL` | Access, catalog, reporting, and audit administration |

A user may have multiple assignments.

Every scoped request must resolve the exact active:

```text
BS_budget_user_roles.id
```

Do not authorize using only `user_id` or a role name.

Record the acting assignment/workspace where the relevant audit or workflow table supports it.

---

## 13. Permission Model

Permissions are normalized through:

```text
BS_budget_permissions
BS_budget_role_permissions
BS_budget_user_permission_overrides
```

Effective permission for one assignment is:

```text
Role defaults
+ active GRANT overrides
- active DENY overrides
```

Do not reintroduce permission Boolean columns on `BS_budget_user_roles`.

Do not use removed fields such as:

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

Use exact permission codes from the database scope document.

Never invent a new permission code without an approved database and access-control change.

---

## 14. Financial-Year Rules

Stored financial-year statuses are:

```text
OPEN
PRE_CLOSING
CLOSED
```

### OPEN

Planning, review, package preparation, CFO review, and controlled change requests occur while the year is `OPEN`.

### PRE_CLOSING

The transition:

```text
OPEN → PRE_CLOSING
```

is the CFO's final approval of the complete annual budget.

Do not create a separate annual-approval table or status.

After `PRE_CLOSING`:

- normal budget editing stops;
- package returns stop;
- new change requests stop;
- category transfers become available;
- PO linking becomes available.

### CLOSED

The financial year becomes historical/read-only after all required execution activity is resolved.

Closing is blocked while pending transfers or PO links exist.

---

## 15. Opening a Financial Year

One transaction must:

1. Insert the financial year with `status = OPEN`.
2. Create one `BS_department_budgets` row for every active department.
3. Create exactly three `BS_department_category_budgets` rows under every parent.
4. Create exactly three `BS_category_submission_windows`.
5. Create exactly three `BS_category_budget_packages`.
6. Create no package items yet.
7. Insert workflow-history events.
8. Insert durable notification queue records.

Do not allow partially initialized financial years.

---

## 16. Department Budget Rules

Department users enter only:

- generic catalog item;
- requested quantity;
- distribution method and distribution rows.

They do not enter:

- unit price;
- total amount;
- vendor;
- model;
- detailed specification;
- package sub-items;
- PO links;
- transfers.

Stored header statuses:

```text
DRAFT
IN_CATEGORY_REVIEW
RETURNED_TO_DEPARTMENT
CATEGORY_REVIEW_COMPLETED
```

There is no separate `SUBMITTED` or `UNDER_CATEGORY_REVIEW` status.

Submission metadata records who submitted and when.

Stored item statuses:

```text
DRAFT
PENDING_CATEGORY_REVIEW
CATEGORY_ACCEPTED
NEEDS_MODIFICATION
```

On return:

- only `NEEDS_MODIFICATION` items are editable;
- `CATEGORY_ACCEPTED` items remain locked.

The distribution total must equal the requested quantity.

---

## 17. Lazy Package-Item Creation

Draft department items do not create package records.

When a catalog item is submitted for the first time in one year/category:

1. Create or reuse one `BS_category_budget_package_items` row.
2. Find the reusable `General` catalog sub-item.
3. Create the year-specific `General` package sub-item if missing.
4. Set `needs_reconciliation = 1`.

Use database uniqueness and idempotent service behavior to handle concurrent first submissions.

---

## 18. Category Manager Review

The Category Budget Manager works only within the assigned category.

The manager can view:

- department-by-department requests;
- hospital-wide consolidated demand.

The manager records:

```text
requested_quantity
category_approved_quantity
```

The approved quantity may be less than, equal to, or greater than the requested quantity.

The manager marks each item:

```text
CATEGORY_ACCEPTED
```

or:

```text
NEEDS_MODIFICATION
```

A department category budget becomes `CATEGORY_REVIEW_COMPLETED` only when every active item is accepted.

The Category Manager, not the CFO, returns a department category budget to its HOD.

---

## 19. Category Submission Windows

Each year/category has an independent window:

```text
OPEN
CLOSED
```

Closing IT does not close Biomedical or General.

After a category window is closed:

- new ordinary department submissions are blocked;
- existing submitted/reviewed records continue;
- the Category Manager can finalize a stable package.

While the year remains `OPEN`, the Category Manager may reopen the window with a reason when the workflow permits it.

Derived display states must not become stored header statuses:

```text
NO_REQUESTS
NOT_SUBMITTED_AT_CUTOFF
```

---

## 20. Package Sub-Items, Pricing, and Attachments

Departments request generic items.

Category Budget Managers manage reusable and year-specific sub-items.

Every generic catalog item must have exactly one active reusable:

```text
General
```

sub-item.

Package sub-items own:

- model/name;
- specification;
- unit of measure;
- quantity;
- unit price;
- notes;
- attachments;
- future PO links;
- transfer in/out;
- execution balance.

Pricing exists only at package-sub-item level.

Parent package-item amount is calculated from active sub-items.

Do not store or attach quotations/specifications directly on package parent items.

Attach documents through:

```text
BS_category_budget_package_sub_item_attachments
```

If a document applies to the entire parent item, attach it to the parent item's year-specific `General` package sub-item.

---

## 21. Package Reconciliation

The accepted department quantity for a package item is calculated from department items.

The package is ready only when:

```text
SUM(active package-sub-item quantities)
=
SUM(category-approved quantities of accepted active department items)
```

Set:

```text
needs_reconciliation = 1
```

when source quantities or package details become inconsistent.

A package cannot be submitted to CFO while any active package item needs reconciliation.

Do not duplicate department contribution totals in a physical contribution table.

---

## 22. CFO Review

Stored package statuses:

```text
DRAFT
IN_CFO_REVIEW
RETURNED_BY_CFO
CFO_REVIEW_COMPLETED
```

Stored package-item review values:

```text
NULL before CFO submission
PENDING_CFO_REVIEW
CFO_ACCEPTED
NEEDS_MODIFICATION
```

The CFO:

- reviews the complete hospital-wide category package;
- accepts package items or marks them for modification;
- does not directly edit quantities, prices, specifications, or attachments;
- returns the complete package to the Category Budget Manager;
- never returns a department budget directly to a Department User.

Return path:

```text
CFO
→ Category Budget Manager
→ Department User, only when department input is required
→ Category Budget Manager
→ CFO
```

A completed category package may be reopened only while the financial year remains `OPEN`.

---

## 23. Change Requests

After a package has completed CFO review and while the year remains `OPEN`, departments cannot directly edit approved records.

They use controlled change requests.

Supported change types:

```text
ADD_ITEM
INCREASE_QUANTITY
DECREASE_QUANTITY
MODIFY_ITEM
```

Applying an approved change must be transactional.

It must reopen only affected records and keep unaffected accepted records locked.

A change may require:

- department item creation/update;
- category review;
- package-item creation and General package-sub-item creation for a new catalog item;
- package reconciliation;
- renewed CFO review.

No change request may remain open when the year moves to `PRE_CLOSING`.

---

## 24. Category Budget Transfers

Transfers are available only after:

```text
Financial year status = PRE_CLOSING
```

Only authorized Category Budget Managers create transfer requests.

Authorized Budget Approvers approve or reject them.

Transfers occur only between two existing year-specific package sub-items:

```text
Existing source package sub-item
→ Existing destination package sub-item
```

They do not occur at parent-item level.

They do not create a new package item or package sub-item.

If the exact destination model does not exist, use the existing destination parent item's:

```text
General
```

package sub-item.

If the destination parent package item does not exist, reject the transfer.

Source and destination must belong to the same:

- financial year;
- budget category;
- category package.

Department scope is not part of execution transfers.

Pending transfer-out reserves source capacity.

Pending transfer-in is not executable.

Approved transfers form an immutable ledger. Reverse an approved transfer with a new opposite transfer.

---

## 25. PO Catalog Mapping and PO Linking

### PO catalog mapping

`BS_PO_CATALOG_MAPPINGS` maps an external PO item code to a reusable catalog sub-item.

Examples:

```text
PO code → Computers & Laptops / General
PO code → Computers & Laptops / Dell Latitude
```

Only one active mapping should exist per PO code.

### PO linking

PO linking targets:

```text
BS_category_budget_package_sub_items.id
```

not parent items or department items.

Only final reviewed PO/invoice source lines eligible for execution may be linked.

Draft, pending-review, cancelled, or rejected procurement records are not eligible.

PO-link approval is permission-based and normally handled through the PO Link Manager workspace.

Requester and approver must be different users.

Pending PO links reserve both:

- source PO quantity;
- package-sub-item quantity.

Recalculate availability inside the approval transaction.

---

## 26. Execution Balance Rules

Do not overwrite the original CFO-approved base package quantity when processing transfers or PO links.

Use ledger calculations.

### Available PO quantity

```text
Source PO quantity
- approved linked quantity
- pending linked quantity
```

### Available package-sub-item quantity for PO linking

```text
Base package quantity
+ approved transfer-in quantity
- approved transfer-out quantity
- approved PO-linked quantity
- pending PO-linked quantity
```

### Available transfer quantity

```text
Base package quantity
+ approved transfer-in quantity
- approved transfer-out quantity
- approved PO-linked quantity
- pending PO-linked quantity
- pending transfer-out quantity
```

Use SQL `DECIMAL` values for authoritative financial calculations.

Do not rely on JavaScript floating-point calculations for money.

Convert imported `FLOAT` PO-source values to appropriate decimal types before comparison or persistence.

---

## 27. Status and Transition Discipline

Do not add new statuses merely to represent that a user opened a page or started reading a record.

A stored status should change:

- responsibility;
- editability;
- permissions;
- next allowed action.

Use exact values from the database scope document.

Do not invent aliases such as:

```text
SUBMITTED
UNDER_CATEGORY_REVIEW
SUBMITTED_TO_CFO
UNDER_CFO_REVIEW
NO_REQUESTS
NOT_SUBMITTED
CHANGE_IN_PROGRESS
APPROVED_CATEGORY
```

unless the current database source of truth explicitly defines them.

---

## 28. Database Rules

Before any schema change:

1. explain the impact;
2. identify dependent foreign keys, views, procedures, functions, triggers, and backend queries;
3. explain data migration/reset behavior;
4. provide rollback or development-reset implications;
5. wait for approval.

Never modify schema without approval.

Use:

- primary keys;
- foreign keys;
- unique constraints;
- check constraints;
- filtered unique indexes where conditional uniqueness is required;
- query-driven indexes;
- `ROWVERSION` for concurrency.

Do not assume a foreign key automatically creates an index.

Do not use dynamic SQL unless needed for metadata-sensitive migration behavior, and explain why.

---

## 29. Transactions and Concurrency

Use one SQL transaction for every command that changes multiple business records.

Examples:

- open financial year;
- submit department category budget;
- return department category budget;
- create a package item and General sub-item;
- close or reopen a submission window;
- submit or return a CFO package;
- apply an approved change request;
- move to `PRE_CLOSING`;
- approve a transfer;
- approve a PO link.

Before committing a critical transition:

1. reload the current record inside the transaction;
2. validate its current status;
3. validate actor permission and scope;
4. validate cross-table balances;
5. use `row_version` or locking as appropriate;
6. update business records;
7. insert workflow history;
8. enqueue notifications;
9. commit.

A zero-row versioned update is a concurrency conflict.

Do not keep SQL transactions open while:

- sending email;
- calling external services;
- uploading large files.

---

## 30. Workflow History, Audit, and Notifications

### Workflow history

Use `BS_budget_workflow_history` for business-readable events:

- submitted;
- returned;
- accepted;
- resubmitted;
- review completed;
- package completed;
- financial year pre-closed;
- transfer decision;
- PO-link decision.

Record:

- financial-year context;
- entity type and ID;
- action;
- old/new status;
- note;
- acting user-role assignment;
- workspace;
- correlation ID.

Treat workflow history as append-only.

### Technical audit

Use `BS_audit_logs` for technical/security activity:

- endpoint or operation;
- old/new JSON;
- actor and IP;
- user agent;
- workspace context;
- exports and reports;
- security-sensitive administration.

Do not replace workflow history with technical audit logs.

### Notifications

Use `BS_Notifications` as a durable queue.

Insert the queue record in the business transaction.

Send/process the email outside the transaction.

Notification failure must not silently undo a successfully committed business action when the durable queue record was committed.

---

## 31. Single Source of Truth

Do not calculate or derive an authoritative value in multiple layers without a documented reason.

Before adding a calculation, check whether it already exists in:

- a database view/query;
- repository output;
- service output;
- API response.

Preferred ownership:

```text
Database aggregate
→ repository result
→ service response
→ API response
→ frontend display
```

Examples:

- Calculate consolidated demand in SQL, not again in controller and frontend.
- Calculate execution balances in one authoritative repository/query.
- Return parent totals from the API; do not recalculate money independently in React.
- Use service transition rules; do not duplicate them as controller decisions.

Frontend-only calculations may be used for previews, but backend/database validation remains authoritative.

---

## 32. Security Rules

Do not modify authentication, authorization, workspace resolution, role scope, permission resolution, or permission seeds without explicit approval.

For every protected command:

1. resolve the authenticated user;
2. resolve the active user-role assignment;
3. calculate effective permissions;
4. verify department/category scope;
5. verify the assignment is active;
6. prevent requester/approver self-approval where required;
7. record acting context.

Do not trust frontend-hidden controls as authorization.

Do not accept department or category scope directly from the client without validating it against the active assignment.

---

## 33. Frontend Rules

Reuse:

- existing components;
- existing React Query patterns;
- existing API clients;
- existing page layouts;
- existing modal and table patterns;
- existing error and loading states.

Do not reorganize the frontend folder architecture during the backend modular refactor.

When migrating a module:

- update the existing frontend files required for the module;
- preserve compatible response shapes where reasonable;
- document unavoidable API contract changes;
- remove frontend calls to old endpoints only after the new flow is verified;
- send `row_version` for mutable workflow commands;
- show backend-provided readiness and validation errors.

The frontend is not a security boundary.

---

## 34. Testing and Validation Rules

Do not claim a feature is complete without validation.

Before implementation, list the exact available project commands.

After implementation approval:

- run targeted tests and checks authorized in the approved plan;
- test repository queries;
- test service transitions;
- test permission and scope failures;
- test transaction rollback;
- test concurrency where relevant;
- test frontend behavior;
- test the complete user journey;
- run regression checks for previously migrated modules.

Do not automatically run broad commands such as:

```text
npm test
npm run build
npm run lint
```

unless:

- the approved plan explicitly includes them; or
- the user explicitly requests them.

If a relevant validation command cannot be run, state that clearly.

Never hide failing tests or unrelated pre-existing failures.

---

## 35. Engineering Review Rules

Act as an engineering reviewer and implementation partner, not merely a code generator.

Before accepting a proposal:

1. compare it with the authoritative database and workflow documents;
2. compare it with current project patterns;
3. identify architectural concerns;
4. identify business-rule violations;
5. identify security and scope risks;
6. identify performance and concurrency risks;
7. identify maintenance and technical-debt risks;
8. explain tradeoffs;
9. recommend the strongest approach;
10. disagree when appropriate.

Do not implement a harmful, inconsistent, redundant, or unnecessarily complex design without first explaining the concern.

Do not agree merely to be agreeable.

---

## 36. Ambiguity Rule

When a material requirement is ambiguous:

1. explain the ambiguity;
2. list the plausible interpretations;
3. explain the impact of each;
4. ask for clarification before coding.

Do not guess database fields, statuses, permission codes, or workflow transitions.

For a large task where some minor uncertainty remains, provide the best plan possible and clearly label the unresolved assumptions.

---

## 37. Scope Control

Stay within the approved module.

If another module must change:

1. identify the dependency;
2. explain why it is necessary;
3. list the affected files;
4. include it in the plan;
5. wait for approval.

Do not perform opportunistic unrelated refactors.

Do not modify shared infrastructure merely to make one module appear cleaner unless the change is genuinely cross-cutting and approved.

---

## 38. Legacy Tables and Concepts

Do not use or reintroduce:

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

Do not use the removed general department-approver workflow.

Do not create:

- a separate whole-year approval table;
- a physical department-contribution table;
- parent-item attachment storage;
- parent-item PO links;
- parent-item transfers;
- transfer-created package items/sub-items;
- legacy permission booleans.

If existing code references these concepts, classify it as migration work or obsolete code.

---

## 39. Ignore Rules

Never inspect generated or dependency directories unless the task explicitly requires it:

```text
node_modules
dist
build
coverage
.next
vendor
.git
```

Also avoid unrelated generated files, caches, large archives, and binary assets.

Focus on application source, tests, configuration, migrations, and authoritative documentation.

---

## 40. Git Rules

Do not:

- commit;
- push;
- create branches;
- create tags;
- create pull requests;
- rewrite history;
- discard user changes;
- reset files;
- clean untracked files;

unless explicitly requested and approved.

Before editing, inspect Git status.

Do not overwrite unrelated uncommitted work.

---

## 41. Required Pre-Implementation Response

Before changing code, provide:

### Repository Understanding

- current implementation and call path;
- relevant file paths;
- old/new workflow gaps.

### Affected Files

- existing files;
- proposed new files;
- obsolete files to remove after verification.

### Implementation Plan

- database;
- repository;
- service;
- route/controller;
- authorization/workspace;
- frontend;
- history/audit/notifications;
- tests.

### Risks

- technical;
- business;
- security;
- migration;
- compatibility;
- concurrency.

### Validation Approach

- exact commands;
- targeted tests;
- end-to-end scenarios;
- rollback/concurrency cases.

End with:

```text
Waiting for approval before implementation.
```

---

## 42. Required Post-Implementation Response

After implementing an approved phase, provide:

### Completed Work

List changed behavior and files.

### Database and Workflow Behavior

List tables, transitions, transactions, and balance rules affected.

### Validation Results

List every command and scenario run, including failures.

### Remaining Risks or Follow-Up

List unresolved dependencies and deferred work.

### Removed Legacy Code

List obsolete files/routes/queries removed after verification.

Do not start another module without approval.

---

## 43. Completion Definition

A migrated module is complete only when:

- it uses current table names and relationships;
- it follows the redesigned workflow;
- it follows the modular backend architecture;
- permissions and workspace scope are enforced;
- transactions and concurrency are handled;
- workflow history and notifications are integrated;
- the existing frontend works with it;
- tests and end-to-end scenarios pass;
- obsolete module code is removed;
- documentation is updated;
- no known legacy dependency remains in that module.

Compilation alone is not completion.
