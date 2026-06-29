# Phase 3 - Database Refactor Design

This document is the Phase 3 planning deliverable for the new QNH Budget workflow refactor.

Phase 3 is database architecture and data-model planning only.

This document does not contain executable SQL.

This document does not modify the database.

This document does not modify backend or frontend code.

Primary source of truth:

```text
docs/codexContext/new-budget-workflow-specification.md
```

Approved foundation documents:

```text
docs/codexContext/phase-1-foundation-architecture-review.md
docs/codexContext/phase-2-security-roles-workspace-context.md
```

## 1. Phase 3 Objective

Phase 3 defines the target data model required by the new workflow.

The goal is to answer:

```text
What data structures are needed to support the new centralized category budget workflow?
What current data structures can be reused?
What current structures conflict with the new workflow?
What new entities are required?
What relationships, lifecycle states, and audit boundaries must exist before implementation?
```

Phase 3 is not about writing migration scripts.

Phase 3 is about reaching agreement on the future data model before implementation begins.

## 2. Current Database Baseline

The current database model supports the old department-level workflow.

Important current concepts:

- departments
- financial years
- budget roles
- budget role permissions
- budget user roles
- budgets
- budget categories
- budget types
- budget items
- budget item distribution
- budget notes
- budget item requests
- budget transfers
- PO links
- notifications
- audit logs

The current model assumes:

```text
Budget
-> Budget Item
-> Quantity
-> Unit Price
-> Total Amount
```

This conflicts with the new workflow.

The new workflow assumes:

```text
Budget Container
-> Department Category Budget
-> Parent Item
-> Sub Item
-> Unit Cost and Total Amount
```

The most important current conflict is that the current `BS_budget_items` model stores pricing directly on the budget item.

In the new workflow, Department Users never enter pricing, and Parent Items should not be the financial amount source.

## 3. Target Data Model Overview

Recommended target model:

```text
Financial Year
-> Department Budget Container
-> Department Category Budget
-> Parent Item
-> Sub Item
```

Supporting model:

```text
Role Assignment
-> Workspace Context

Parent Item / Sub Item
-> Supporting Documents

Approved Category Budget
-> Change Request
-> Affected Item

Parent Item
-> Transfer

Sub Item
-> PO Link

Workflow Action
-> Audit Entry with Acting Context
```

The model must preserve the official source of truth:

```text
Sub Item Quantity x Unit Cost
-> Sub Item Total
-> Parent Item Total
-> Category Budget Total
```

## 4. Core Entity Recommendations

### 4.1 Financial Year

Current concept:

```text
BS_financial_years
```

Recommendation:

Reuse and refactor.

Existing statuses remain valid:

- `OPEN`
- `PRE_CLOSING`
- `CLOSED`

Required new concept:

```text
workflow_version
```

Purpose:

Distinguish legacy financial years from new workflow years.

Recommended values:

```text
LEGACY_DEPARTMENT_WORKFLOW
CATEGORY_WORKFLOW
```

Business rule:

Old years should not be converted into the new workflow.

New workflow should start with a new financial year.

### 4.2 Department Budget Container

Current concept:

```text
BS_budgets
```

Recommendation:

Reuse as the department financial-year container if practical.

Example:

```text
Laboratory Budget - FY2027
```

Important rule:

For new workflow years, this container should not be the lifecycle authority.

The lifecycle authority should be Department Category Budget.

The container can still support:

- department/year uniqueness
- financial year relationship
- department relationship
- high-level reporting
- legacy compatibility

### 4.3 Responsibility Category

New concept:

```text
Responsibility Category
```

Values for Version 1:

- IT
- Biomedical
- General

Recommendation:

Treat responsibility category as a workflow ownership concept, not merely an item taxonomy category.

Why:

The current `BS_budget_categories` table appears to represent item grouping/taxonomy.

The new IT/Biomedical/General category is a responsibility domain that controls:

- who reviews the request
- which Category Budget Manager workspace sees the request
- transfer boundaries
- category budget lifecycle
- reporting slices

The item master should assign each item to one responsibility category for the financial year.

Historical category ownership must remain unchanged.

### 4.4 Department Category Budget

New concept:

```text
Department Category Budget
```

Purpose:

Represent one department's lifecycle for one responsibility category in one financial year.

Examples:

```text
Laboratory IT Budget
Laboratory Biomedical Budget
Laboratory General Budget
```

Expected relationships:

```text
Department Category Budget
belongs to Department Budget Container
belongs to Responsibility Category
belongs to Financial Year through Department Budget Container
```

Recommended statuses:

- `DRAFT`
- `SUBMITTED_TO_CATEGORY_MANAGER`
- `RETURNED_TO_DEPARTMENT`
- `UNDER_CATEGORY_REVIEW`
- `SUBMITTED_TO_CFO`
- `RETURNED_TO_CATEGORY_MANAGER`
- `APPROVED`
- `NOT_USED`
- `CANCELLED`

Notes:

`NOT_USED` should be explicit.

Reason:

It improves reporting and financial year readiness checks.

### 4.5 Parent Item

New concept:

```text
Parent Item
```

Purpose:

Represent the generic department request.

Example:

```text
Item: Laptop
Requested Quantity: 5
Approved Quantity: 7
Distribution Method: Annual
```

Expected relationships:

```text
Parent Item
belongs to Department Category Budget
references Item Master / Budget Type
has many Sub Items
has many Supporting Documents
has many Notes / Review History records
```

Recommended fields conceptually:

- item reference
- requested quantity
- approved quantity
- distribution method
- distribution level
- review checkbox state
- category review status
- CFO review status
- returned/editable state
- active/inactive flag
- created/updated audit fields

Important rule:

Parent Item should not be manually priced by the Department User.

Parent Item amount should be derived from Sub Items.

### 4.6 Parent Item Distribution

Current concept:

```text
BS_budget_item_distribution
```

Recommendation:

Reuse the distribution concept, but attach it to Parent Item in the new workflow.

Reason:

Department Users define distribution as part of the business need.

Distribution is entered before sub-items and pricing.

Important rule:

Distribution quantities should align with requested or approved quantity according to the final business rule chosen during implementation design.

Recommended default:

```text
Department distribution starts from requested quantity.
If approved quantity changes, Category Budget Manager should review whether distribution should be adjusted.
```

This needs detailed implementation design later.

### 4.7 Sub Item

New concept:

```text
Sub Item
```

Purpose:

Represent the specification and pricing created by the Category Budget Manager.

Example:

```text
Parent Item: Laptop

Sub Items:
- Dell Latitude, Qty 4, Unit Cost 4,500
- HP EliteBook, Qty 3, Unit Cost 4,200
```

Expected relationships:

```text
Sub Item
belongs to Parent Item
has many Supporting Documents
may have many PO Links
```

Recommended fields conceptually:

- parent item reference
- sub-item name/specification
- description
- quantity
- unit cost
- total amount as derived or stored derived value
- notes
- active/inactive flag
- created/updated audit fields

Important validation:

```text
Sum of active Sub Item quantities must equal Parent Item approved quantity.
```

Important source-of-truth rule:

```text
Sub Item quantity x unit cost is the official financial amount source.
```

### 4.8 Supporting Documents

New concept:

```text
Supporting Document
```

Purpose:

Attach evidence to Parent Items and Sub Items.

Parent Item examples:

- business justification
- consolidation analysis
- technical recommendation
- market study

Sub Item examples:

- vendor quotation
- specification sheet
- technical comparison
- manufacturer documentation

Expected relationships:

```text
Supporting Document
belongs to Parent Item OR Sub Item
uploaded by User
belongs to approval history after CFO approval
```

Important rule:

After CFO approval, documents become part of approval history.

Approved documents should not be silently replaced.

Recommended design:

Use versioning or append-only replacement behavior.

### 4.9 Notes and Review History

Current concept:

```text
BS_budget_notes
```

Recommendation:

Refactor or replace for the new workflow.

Current note types are too limited:

- `GENERAL_RETURN`
- `ITEM_RETURN`
- `GENERAL_APPROVAL`
- `ITEM_APPROVAL`

New workflow needs notes for:

- Department submission
- Category Budget Manager review
- Category Budget Manager return to department
- CFO return to Category Budget Manager
- approved quantity justification
- approved quantity greater than requested
- sub-item pricing explanation
- change request decision

Recommended model:

Use a Review History or Workflow Notes concept that can attach to:

- Department Category Budget
- Parent Item
- Sub Item
- Change Request

### 4.10 Change Request

New concept:

```text
Change Request
```

Purpose:

Control changes to approved category budgets before `PRE_CLOSING`.

Allowed types:

- add item
- increase quantity
- decrease quantity
- modify existing item

Expected relationships:

```text
Change Request
belongs to Department Category Budget
requested by Department User
reviewed by Category Budget Manager and CFO
has affected items
```

Recommended statuses:

- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `ACCEPTED`
- `REJECTED`
- `CLOSED`
- `CANCELLED`

Important rule:

Accepted Change Requests reopen only affected items.

They do not reopen the entire category budget.

### 4.11 Change Request Affected Item

New concept:

```text
Change Request Affected Item
```

Purpose:

Identify exactly which Parent Items are affected by the Change Request.

Examples:

```text
Change Request:
Increase Laptop quantity

Affected Item:
Laptop Parent Item
```

For a new item request, this may initially reference a requested item master entry or a future Parent Item created after acceptance.

Important rule:

Unaffected approved items remain locked.

### 4.12 Transfers

Current concept:

```text
BS_budget_transfers
```

Recommendation:

Refactor to target Parent Items in the new workflow.

New rules:

- only Category Budget Managers create transfers
- CFO approves transfers
- transfers happen only after `PRE_CLOSING`
- transfers target Parent Items only
- Sub Items are not transferred
- cross-department transfers are not allowed
- cross-category transfers are not allowed

Current transfer fields reference old budget item IDs.

New transfer model must reference Parent Item IDs.

### 4.13 PO Links

Current concept:

```text
BS_PO_LINKS
```

Recommendation:

Refactor to target Sub Items in the new workflow.

New rules:

- PO Linking targets Sub Items
- PO Link approval is permission-based
- Version 1 normally assigns approval permission to Finance
- PO Linking happens after `PRE_CLOSING`

Current PO links reference old budget item IDs.

New PO links must reference Sub Item IDs.

### 4.14 Audit Logs

Current concepts:

```text
BS_audit_logs
BS_budget_audit_logs
```

Recommendation:

Standardize around the active audit mechanism and extend it conceptually with acting context.

Required acting context:

- workspace key or ID
- workspace label
- acting role
- department scope
- responsibility category scope
- permission used, where relevant

Important rule:

All workflow-critical actions must record acting context.

### 4.15 Notifications

Current concept:

```text
BS_Notifications
```

Recommendation:

Reuse notification storage and queue infrastructure.

Add enough payload context to route users to the correct workspace.

Examples:

- Department Category Budget ID
- responsibility category
- department
- target workspace type
- actor workspace context

## 5. Access and Workspace Data Model

Phase 2 approved Workspace Context Switching.

The data model must support:

- users with multiple active assignments
- department-scoped workspaces
- category-scoped workspaces
- CFO workspace
- PO approval workspace
- acting context in audit

### Current Problem

The current access resolver selects:

```text
TOP 1 active user role assignment
```

This is not enough.

The future model must resolve:

```text
all active assignments for the user
-> derive available workspaces
-> validate selected active workspace
```

### Recommended Conceptual Assignment Shape

A role assignment should conceptually support:

- user
- role
- department scope, optional
- responsibility category scope, optional
- active flag
- permission overrides, optional

Examples:

```text
John
Role: Department User
Department Scope: IT Department
Workspace: Department Budget - IT Department
```

```text
John
Role: Category Budget Manager
Responsibility Category Scope: IT
Workspace: IT Category Budget Management
```

```text
Sara
Role: Finance PO Link Approver
Permission: PO Link Approval
Workspace: PO Link Approval
```

## 6. Status Model

### Financial Year Status

Recommended statuses:

- `OPEN`
- `PRE_CLOSING`
- `CLOSED`

No change in concept.

### Department Budget Container Status

Recommendation:

For new workflow years, do not use this as the primary workflow state.

Possible high-level statuses:

- `ACTIVE`
- `COMPLETED`
- `CANCELLED`

Alternatively, keep legacy statuses for backward compatibility and derive new progress from category budgets.

Decision to finalize in implementation design.

### Department Category Budget Status

Recommended statuses:

- `DRAFT`
- `SUBMITTED_TO_CATEGORY_MANAGER`
- `UNDER_CATEGORY_REVIEW`
- `RETURNED_TO_DEPARTMENT`
- `SUBMITTED_TO_CFO`
- `RETURNED_TO_CATEGORY_MANAGER`
- `APPROVED`
- `NOT_USED`
- `CANCELLED`

This status is the lifecycle authority for new workflow years.

### Parent Item Review Status

Recommended statuses:

- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `REVIEWED_ACCEPTED`
- `RETURNED_TO_DEPARTMENT`
- `SUBMITTED_TO_CFO`
- `CFO_ACCEPTED`
- `CFO_RETURNED`
- `APPROVED`
- `REOPENED_BY_CHANGE_REQUEST`
- `CANCELLED`

The exact list can be simplified during implementation, but the model must support:

- checked items
- unchecked returned items
- read-only accepted items
- item-level CFO return
- item reopen through Change Request

### Change Request Status

Recommended statuses:

- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `ACCEPTED`
- `REJECTED`
- `CLOSED`
- `CANCELLED`

### Transfer Status

Recommended statuses:

- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

Existing transfer status model is mostly reusable.

### PO Link Status

Recommended statuses:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

Existing PO status model is mostly reusable.

## 7. Source-of-Truth Rules

### Amounts

Official source:

```text
Sub Item Quantity x Unit Cost
```

Derived values:

```text
Sub Item Total
Parent Item Total
Category Budget Total
Department Budget Total
Financial Year Total
```

Risk:

Storing all totals as editable values creates drift.

Recommendation:

Use one authoritative calculation path. If derived totals are persisted for performance, they must be recalculated only from sub-item data and never manually edited.

### Quantities

Department source:

```text
Requested Quantity
```

Category Budget Manager source:

```text
Approved Quantity
```

Sub-item rule:

```text
Sum of Sub Item quantities = Parent Item approved quantity
```

Approved quantity may be greater than requested quantity if justified.

### Category Ownership

Official source:

```text
Item Master responsibility category
```

Historical rule:

Category ownership changes affect future financial years only.

Recommendation:

Snapshot responsibility category onto new workflow budget records when the item is requested.

Reason:

Historical budgets must remain unchanged if the item master changes later.

### Attachments

Official rule:

Approved supporting documents become part of approval history.

Recommendation:

Use append-only versioning or immutable approved versions.

## 8. Current Table Impact Classification

| Current Table / Concept | Phase 3 Classification | Rationale |
|---|---|---|
| `BS_departments` | Reuse | Department scope remains required. |
| `BS_financial_years` | Refactor | Needs workflow version and category-aware readiness. |
| `BS_budgets` | Refactor | Useful as department budget container, not lifecycle authority. |
| `BS_budget_items` | Replace / Redesign | Old item stores price directly; new Parent Item must not. |
| `BS_budget_item_distribution` | Refactor | Distribution concept remains, but should attach to Parent Item. |
| `BS_budget_categories` | Refactor / Clarify | Existing taxonomy category should not be confused with responsibility category. |
| `BS_budget_types` | Refactor | Needs responsibility category ownership or snapshot support. |
| `BS_budget_notes` | Replace / Redesign | Current note types are too limited for new review history. |
| `BS_budget_user_roles` | Refactor | Must support multiple workspaces and category scope. |
| `BS_budget_role_permissions` | Refactor | Needs new permission groups and possibly role templates. |
| `BS_budget_transfers` | Refactor | Must target Parent Items and enforce same category. |
| `BS_PO_LINKS` | Refactor | Must target Sub Items. |
| `BS_Notifications` | Reuse | Queue storage remains useful. |
| `BS_audit_logs` | Refactor | Needs acting workspace context. |
| `BS_budget_item_requests` | Refactor / Optional Reuse | Could inspire item master requests, but not Change Requests. |

## 9. Recommended New Conceptual Entities

### Required

- Responsibility Category
- Department Category Budget
- Parent Item
- Parent Item Distribution
- Sub Item
- Supporting Document
- Review History
- Change Request
- Change Request Affected Item
- Workspace / Assignment Scope support
- Approval Package Snapshot or equivalent history structure

### Strongly Recommended

- Workflow Version on Financial Year
- Responsibility Category snapshot on Parent Item
- Acting Context fields on Audit Log
- Attachment Version or immutable approved document record

### Optional Later

- Reporting read models
- consolidated item demand materialized view
- approval package export snapshot
- segregation-of-duties exception tracking

## 10. Relationship Map

Recommended conceptual relationships:

```text
Financial Year
  -> Department Budget Container
       -> Department Category Budget
            -> Parent Item
                 -> Parent Item Distribution
                 -> Sub Item
                      -> Sub Item Supporting Document
                      -> PO Link
                 -> Parent Item Supporting Document
                 -> Review History
            -> Change Request
                 -> Change Request Affected Item
```

Access and audit:

```text
User
  -> Role Assignment
       -> Workspace
            -> Workflow Action
                 -> Audit Log with Acting Context
```

Transfers:

```text
Parent Item
  -> Transfer From
  -> Transfer To
```

Rules:

```text
Transfer From and Transfer To must be same responsibility category.
Transfer From and Transfer To must not cross departments.
```

## 11. Migration and Coexistence Strategy

Business decision:

```text
No existing budget migration is required.
```

Recommended strategy:

```text
Old financial years:
Legacy-compatible or read-only

New financial years:
Category workflow
```

Do not force old budget items into parent/sub-item records.

Reason:

Old records do not contain the required workflow history, category budget lifecycle, sub-items, supporting documents, or workspace context.

Recommended activation:

```text
Create a new financial year using CATEGORY_WORKFLOW.
Use new entities only for that year and later.
```

## 12. Reporting Considerations

New reports must be built from the new source-of-truth model.

Required report dimensions:

- financial year
- department
- responsibility category
- category budget status
- parent item
- requested quantity
- approved quantity
- sub-item quantity
- sub-item amount
- category total
- change request status
- transfer status
- PO link status

Do not use old budget item totals for new workflow reports.

Recommended reporting views:

- department category budget summary
- parent item summary
- sub-item financial summary
- consolidated item demand
- change request summary
- transfer balance summary
- PO link consumption summary

## 13. Performance Considerations

Potential expensive queries:

- consolidated item review across all departments
- CFO review package with parent items, sub-items, documents, notes, and history
- category total calculation across many sub-items
- PO remaining quantity by sub-item
- transfer balance by parent item

Recommended mitigation:

- define indexed foreign keys during implementation design
- consider read models for dashboards and reports
- avoid recalculating large totals repeatedly in frontend
- keep sub-item totals as the authoritative calculation path

No physical indexes are defined in this planning document.

## 14. Risks

### Risk: Reusing Old Budget Items Too Directly

Old budget items contain pricing and total amount.

New Parent Items should not be priced by Department Users.

Mitigation:

Treat Parent Item as a distinct new domain concept.

### Risk: Confusing Item Taxonomy With Responsibility Category

Existing budget categories may be item taxonomy.

New IT/Biomedical/General categories are workflow responsibility domains.

Mitigation:

Model responsibility category explicitly or clearly snapshot it from item master.

### Risk: Amount Drift

If totals are stored in multiple editable places, reports may disagree.

Mitigation:

Make sub-item pricing the authoritative calculation source.

### Risk: Weak Historical Audit

If item category ownership changes update historical records, reports and audit become unreliable.

Mitigation:

Snapshot responsibility category on budget records.

### Risk: Attachment Replacement

Replacing approved documents can destroy approval evidence.

Mitigation:

Use document versioning or immutable approved document records.

### Risk: Change Requests Reopening Too Much

If a Change Request reopens the whole category, it creates unnecessary rework.

Mitigation:

Track affected items explicitly.

## 15. Decisions Required Before SQL Design

These decisions should be approved before any schema scripts are written:

1. Use workflow version on Financial Year.
2. Preserve Department Budget as container.
3. Introduce Department Category Budget as lifecycle authority.
4. Treat Parent Item as distinct from old Budget Item.
5. Introduce Sub Item as pricing source.
6. Model responsibility category separately from item taxonomy or clearly snapshot it.
7. Use explicit `NOT_USED` category budget status.
8. Attach distribution to Parent Item.
9. Track review checkbox state on Parent Item.
10. Track supporting documents for Parent and Sub Items.
11. Make approved supporting documents immutable or versioned.
12. Track Change Requests and affected items explicitly.
13. Refactor Transfers to Parent Item target.
14. Refactor PO Links to Sub Item target.
15. Store acting workspace context in audit.

## 16. Phase 3 Deliverables

Phase 3 produces:

- conceptual target data model
- entity relationship map
- current table impact classification
- source-of-truth rules
- lifecycle status model
- migration/coexistence recommendation
- reporting and performance considerations
- risks and mitigations
- decisions required before SQL design

## 17. Phase 3 Acceptance Criteria

Phase 3 is complete when:

1. The target entity model is approved.
2. The team confirms that old financial years will not be migrated into the new structure.
3. The team accepts Department Category Budget as lifecycle authority.
4. The team accepts Parent Item and Sub Item as distinct concepts.
5. The team accepts Sub Item pricing as the amount source of truth.
6. The team accepts explicit responsibility category ownership and historical snapshot behavior.
7. The team accepts Change Request affected item tracking.
8. The team accepts Parent Item transfers and Sub Item PO links.
9. The team accepts audit acting context as a database requirement.
10. No blocking data-model questions remain before Phase 4 backend workflow foundation.

## 18. Phase 3 Recommendation

The recommended Phase 3 decision is:

```text
Do not mutate the old budget item model into the new workflow model.
Introduce a clean parent/sub-item structure for new workflow financial years.
Keep the existing department budget concept as a container.
Use department category budget as the lifecycle authority.
Use sub-item pricing as the financial source of truth.
```

This gives the system a maintainable long-term model while preserving existing infrastructure and legacy financial year compatibility.

## 19. Next Phase Dependency

Phase 4 Backend Workflow Foundation depends on Phase 3 approval.

Phase 4 should not begin until these are approved:

- target data model
- category budget lifecycle states
- parent/sub-item relationship
- source-of-truth rules
- workspace/audit data requirements
- old/new workflow coexistence strategy

