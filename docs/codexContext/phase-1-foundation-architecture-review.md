# Phase 1 - Foundation and Architecture Review

This document is the Phase 1 planning deliverable for the new QNH Budget workflow refactor.

Phase 1 is architecture and planning only.

No frontend code, backend code, database scripts, schema changes, or implementation work are included in this phase.

Primary source of truth:

```text
docs/codexContext/new-budget-workflow-specification.md
```

Supporting roadmap:

```text
docs/codexContext/new-budget-workflow-refactor-plan.md
```

## 1. Phase 1 Objective

The objective of Phase 1 is to establish the architecture foundation before implementation starts.

Phase 1 must answer:

```text
What exactly are we building?
What parts of the existing system are affected?
What can be reused?
What must be redesigned?
What decisions must be locked before code changes begin?
```

Phase 1 does not build the new workflow.

Phase 1 prepares the project so later phases can be implemented with lower risk.

## 2. Approved Phase 1 Direction

The refactor will proceed phase by phase.

The approved strategy is:

```text
Preserve existing infrastructure.
Replace the workflow-specific budget domain.
Refactor downstream modules only where the new domain requires it.
```

This means the project should not be rewritten from scratch.

The application already has useful infrastructure:

- Node.js / Express backend
- route-controller-service-repository pattern
- MSSQL repository layer
- React / Vite frontend
- React Query API patterns
- shared UI components
- authentication and route guards
- notification queue
- audit log infrastructure
- financial year lifecycle foundation
- PO source-data integration
- transfer approval skeleton

The budget workflow itself needs major redesign because the old model and new model have different business assumptions.

## 3. Documents Reviewed

Phase 1 review is based on these documents:

- `docs/codexContext/new-budget-workflow-specification.md`
- `docs/codexContext/new-budget-workflow-refactor-plan.md`
- `docs/codexContext/architecture.md`
- `docs/codexContext/business-rules.md`
- `docs/codexContext/permissions.md`
- `docs/codexContext/notifications.md`
- `docs/codexContext/po-module.md`
- `docs/sql/tabels.sql`
- current project source structure under `server`
- current project source structure under `client`

## 4. Current System Baseline

The current system is based on the old department-level budget workflow.

Current high-level workflow:

```text
Department Budget
-> Budget Approver
-> Approved / Returned
```

Current system characteristics:

- one budget exists per department per financial year
- department users can enter quantity, unit price, total amount, item category/type, and distribution
- budget amount is stored on the budget item
- budget approval is whole-budget based
- returned budgets reopen through old budget status behavior
- transfers target old budget items
- PO links target old budget items
- reports and dashboard logic assume old budget items and old totals
- permissions are generic and do not support workspace context

The current workflow conflicts with the new source-of-truth workflow in several core areas.

The most important conflict is pricing.

Current model:

```text
Budget Item Quantity x Unit Price = Budget Item Total
```

New model:

```text
Sub Item Quantity x Unit Cost
-> Sub Item Total
-> Parent Item Total
-> Category Budget Total
```

This means old budget item totals cannot remain the authoritative source for new workflow years.

## 5. Target Domain Model

The recommended target business architecture is:

```text
Financial Year
-> Department Budget Container
-> Department Category Budget
-> Parent Item
-> Sub Item
```

### Financial Year

The Financial Year remains the top-level lifecycle period.

Existing statuses remain useful:

- `OPEN`
- `PRE_CLOSING`
- `CLOSED`

The financial year lifecycle must become category-aware.

### Department Budget Container

The existing department budget concept should be preserved as a container.

Example:

```text
Laboratory Budget - FY2027
```

This container should not be the final workflow authority for new workflow years.

### Department Category Budget

The Department Category Budget becomes the main workflow lifecycle unit.

Example:

```text
Laboratory IT Budget
Laboratory Biomedical Budget
Laboratory General Budget
```

Each category budget has its own status.

Example:

```text
Laboratory

IT Budget: Approved
Biomedical Budget: Under Review
General Budget: Not Used
```

### Parent Item

The Parent Item represents the department's generic business request.

Example:

```text
Laptop
Requested Quantity: 5
Approved Quantity: 7
Distribution Method: Annual
```

Parent Items hold:

- requested quantity
- approved quantity
- distribution method
- review checkbox state
- notes
- parent item attachments

Parent Items do not hold manually entered pricing from Department Users.

### Sub Item

The Sub Item represents the detailed specification and pricing prepared by the Category Budget Manager.

Example:

```text
Parent Item: Laptop

Sub Items:
- Dell Latitude, Qty 4, Unit Cost 4,500
- HP EliteBook, Qty 3, Unit Cost 4,200
```

Sub Items hold:

- specification/name
- quantity
- unit cost
- total amount
- supporting documents

Sub Item pricing is the official source of budget amount.

## 6. Module Classification

### Reuse

These areas should be preserved with minimal conceptual change:

| Area | Reason |
|---|---|
| Backend architecture | Existing route-controller-service-repository pattern matches project rules. |
| Frontend architecture | React, React Query, route guards, and API modules remain suitable. |
| Authentication | Existing JWT and budget access loading can remain the foundation. |
| Shared UI components | Tables, modals, pagination, drawers, badges, and layout are reusable. |
| Notification queue infrastructure | Queue/worker/template pattern is reusable. |
| Audit infrastructure | Existing audit mechanism is reusable with expanded context. |
| Financial year lifecycle concept | `OPEN`, `PRE_CLOSING`, and `CLOSED` remain valid. |
| PO source data integration | Existing PO source data can still feed PO Linking. |

### Refactor

These areas should be kept but changed significantly:

| Area | Reason |
|---|---|
| Financial Years | Readiness checks must become category-aware. |
| Budgets | Department budget becomes a container, not the workflow authority. |
| Permissions | Must support workspaces, category roles, and clearer approval separation. |
| Notifications | Recipients must become category/workspace aware. |
| Audit Logs | Must include active workspace / acting-as context. |
| Transfers | Must target Parent Items and enforce category boundaries. |
| PO Linking | Must target Sub Items and keep approval permission-based. |
| Item Master / Budget Setup | Must define responsibility category ownership. |

### Replace / Redesign

These areas should not be patched lightly:

| Area | Reason |
|---|---|
| Budget Item behavior | Old item has price directly on item; new model prices sub-items. |
| Budget Approval | Old whole-budget approval cannot represent Category Manager + CFO flow. |
| Budget Balance | Old balance is based on budget item totals; new balances derive from parent/sub-item structure. |
| Reports and Analytics | Old totals and statuses are not compatible with new source-of-truth rules. |
| Department Budget Entry screen | Old screen exposes price fields, which are forbidden for Department Users. |
| CFO Review screen | Old approval screen cannot represent sub-items, attachments, and return routing adequately. |

### New

These areas are new workflow concepts:

| Area | Reason |
|---|---|
| Workspace Context Switching | Required because one user may hold multiple business responsibilities. |
| Department Workspace | Required for department-owned budget entry. |
| Category Budget Management Workspace | Required for hospital-wide category review. |
| Department Category Budget | Required for independent IT/Biomedical/General lifecycle. |
| Parent Item | Required for generic department requests and approved quantity. |
| Sub Item | Required for specification and pricing. |
| Supporting Documents | Required for parent and sub-item evidence. |
| Change Requests | Required for controlled changes before `PRE_CLOSING`. |
| Category Review History | Required for audit and CFO review. |

## 7. Architectural Decisions to Lock

### Decision 1: Workflow Versioning

Recommendation:

```text
Use the new workflow only for a new financial year.
Keep old financial years legacy-compatible or read-only.
```

Reason:

Old budgets do not contain parent items, sub-items, category budget sections, or workspace context.

Converting old budgets would add migration risk without business value at this stage.

Decision status:

```text
Recommended for approval before Phase 2.
```

### Decision 2: Department Budget Container

Recommendation:

```text
Preserve the department budget as a financial-year container.
Move lifecycle authority to Department Category Budget.
```

Reason:

The existing system already organizes budgets by department and financial year. That concept remains useful.

However, the new workflow requires separate lifecycle states for IT, Biomedical, and General.

Decision status:

```text
Recommended for approval before database design.
```

### Decision 3: Parent Item as New Domain Concept

Recommendation:

```text
Treat Parent Item as a new domain concept.
Do not assume old budget item equals new Parent Item.
```

Reason:

Old budget items contain unit price and total amount. New Parent Items must not be priced directly by Department Users.

Implementation may later reuse some table or code patterns, but the business concept is different.

Decision status:

```text
Recommended for approval before Phase 3.
```

### Decision 4: Sub Item as Amount Source

Recommendation:

```text
Sub Item pricing is the only official source of budget amount.
```

Reason:

This prevents duplicate calculations and amount drift.

Decision status:

```text
Already confirmed in source-of-truth workflow.
```

### Decision 5: Active Workspace Required for Mutating Actions

Recommendation:

```text
Every workflow-critical mutating action should carry active workspace / acting-as context.
```

Reason:

One person may act as Department User and Category Budget Manager. Audit must show which responsibility was used.

Decision status:

```text
Already confirmed in source-of-truth workflow.
```

### Decision 6: Permission Separation

Recommendation:

```text
Do not reuse can_approve_budget as the universal approval permission.
```

Reason:

Category Budget Manager review, CFO approval, and PO Link approval are different responsibilities.

Decision status:

```text
Recommended for approval before Phase 2 implementation design.
```

## 8. Assumptions to Validate

These assumptions should be confirmed before implementation starts:

1. New workflow starts with a new financial year.
2. Existing budgets do not need migration into parent/sub-item structure.
3. Old financial years can remain readable under old assumptions.
4. IT, Biomedical, and General remain fixed responsibility categories in Version 1.
5. Item master determines responsibility category.
6. Department Users do not manually choose responsibility category.
7. Category Budget Manager delegation remains role-based.
8. PO Link approval remains permission-based.
9. Finance Department role normally receives PO Link Approval permission in Version 1.
10. Cross-category transfers are blocked.
11. Cross-department transfers are blocked.
12. Approved quantity may exceed requested quantity when justified.
13. No normal budget modifications are allowed after `PRE_CLOSING`.
14. Supporting documents become part of approval history after CFO approval.
15. Workspace context is required for audit and user experience.

## 9. Risks to Eliminate Before Code

### Risk: Old and New Workflow State Mixed Together

If old budget status and new category budget status are both treated as workflow authority, users and reports will become inconsistent.

Mitigation:

```text
Define Department Category Budget as the lifecycle authority for new workflow years.
```

### Risk: Duplicate Amount Sources

If parent item totals and category totals are stored or edited independently from sub-items, totals may drift.

Mitigation:

```text
Use sub-item totals as the source of truth.
Treat parent and category totals as derived values.
```

### Risk: Permission Overload

If `can_approve_budget` is reused for CFO, Category Budget Manager, and global budget access, the access model will become unclear.

Mitigation:

```text
Separate workspace roles from approval permissions.
```

### Risk: Workspace Confusion

A user with multiple roles may perform an action under the wrong responsibility.

Mitigation:

```text
Show active workspace clearly.
Require acting context on workflow actions.
Record acting context in audit.
```

### Risk: Premature PO and Transfer Refactor

PO Linking depends on sub-items. Transfers depend on parent items.

Mitigation:

```text
Do not refactor PO Linking or Transfers before Parent Item and Sub Item models are stable.
```

### Risk: Reporting Against Old Totals

Existing reports may continue using old budget item totals.

Mitigation:

```text
Mark old reports as legacy or redesign reports against the new parent/sub-item model.
```

## 10. Phase 1 Deliverables

Phase 1 produces these deliverables:

| Deliverable | Status |
|---|---|
| Source-of-truth workflow confirmed | Complete |
| Current system baseline reviewed | Complete |
| Target domain model proposed | Complete |
| Module classification completed | Complete |
| Architecture decisions identified | Complete |
| Assumptions to validate documented | Complete |
| Risks to eliminate documented | Complete |
| Phase 2 readiness criteria documented | Complete |

## 11. Open Business Questions

Most major business questions have been resolved in the source-of-truth workflow.

The remaining questions are architecture execution questions rather than workflow policy questions.

### Question 1: Old Financial Years

Should old financial years become read-only after the new workflow is introduced?

Recommendation:

```text
Yes, old years should be read-only or legacy-compatible.
They should not be converted into the new workflow.
```

### Question 2: New Workflow Activation

Can an existing `OPEN` financial year be moved to the new workflow if it has no activity?

Recommendation:

```text
Avoid this in Version 1.
Start the new workflow with a newly created financial year.
```

### Question 3: CFO Access Model

Should CFO be represented as a role, a permission set, or both?

Recommendation:

```text
Use both.
CFO should have a recognizable role and explicit permissions.
Permissions remain the enforcement mechanism.
```

### Question 4: Self-Review Visibility

If a user submits a department budget and also reviews the same category as Category Budget Manager, should the system block the review?

Recommendation:

```text
Allow it in Version 1.
Audit it clearly.
Show CFO a warning when submitter and reviewer are the same person.
```

### Question 5: Not Used Category Status

Should `Not Used` be explicit or inferred from no items?

Recommendation:

```text
Use an explicit Not Used state.
This improves reporting and PRE_CLOSING readiness checks.
```

## 12. Phase 2 Readiness Criteria

Phase 2 should not begin until these criteria are accepted:

- source-of-truth workflow remains approved
- workflow versioning approach is approved
- department budget container strategy is approved
- Department Category Budget is accepted as the lifecycle authority
- Parent Item and Sub Item are accepted as distinct domain concepts
- Sub Item pricing is accepted as the financial source of truth
- Workspace Context Switching is accepted as mandatory
- active workspace / acting-as audit context is accepted as mandatory
- permission separation is accepted, especially avoiding `can_approve_budget` as a catch-all
- old financial year compatibility strategy is accepted
- explicit `Not Used` category status decision is accepted or rejected

## 13. Phase 1 Acceptance Criteria

Phase 1 is complete when:

1. The project team agrees this document accurately describes the Phase 1 architecture foundation.
2. The team accepts the target domain structure:

```text
Financial Year
-> Department Budget Container
-> Department Category Budget
-> Parent Item
-> Sub Item
```

3. The team accepts the module classification.
4. The team accepts that implementation should not start until Phase 2 access/workspace design is completed.
5. The team confirms no blocking business workflow questions remain for Phase 2.
6. The team either approves or revises the recommendations in the Open Business Questions section.

## 14. Phase 1 Recommendation

Phase 1 should be considered an architecture gate.

The recommended next action after approving Phase 1 is:

```text
Start Phase 2 - Security, Roles, and Workspace Context
```

Phase 2 should focus only on:

- role model
- permission model
- workspace context model
- acting-as audit requirements
- navigation and access behavior

No database implementation, backend workflow implementation, or frontend workflow screens should begin until Phase 2 is approved.

