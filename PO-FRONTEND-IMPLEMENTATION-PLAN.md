PO Frontend Implementation Plan
Context

We are implementing the Purchase Order (PO) Linking feature frontend for the QNH Budget System.

Before generating any code:

Always follow existing project architecture.
Always scan and reuse existing Transfer feature patterns first.
Always reuse existing shared components.
Never create large page components.
Split logic into reusable components.
Follow current React Query patterns.
Follow current API layer patterns.
Follow current page layout patterns.
Follow current dashboard patterns.
Follow current permission handling patterns.
Follow current modal, drawer, table, and filter patterns.
Follow current styling conventions.
Follow current folder structure.
Follow current naming conventions.
Follow current loading/error state patterns.
Follow current notification/toast patterns.

Never invent a new architecture if a similar implementation already exists.

Transfer feature is the primary reference implementation.

General Rules

Before every step:

Scan existing frontend code.
Find similar implementation.
Reuse existing components.
Reuse existing hooks.
Reuse existing utilities.
Reuse existing table patterns.
Reuse existing modal patterns.
Reuse existing drawer patterns.
Reuse existing dashboard card patterns.

Always prefer:

Reuse
>
Extend
>
Rewrite
Phase 1 — API Layer

Goal:

Create complete frontend API integration.

Files:

src/api/po.api.js

Requirements:

Implement:

getAvailablePOs()

getMyPOLinks()

getPendingPOLinks()

getPOLinkById()

getPOTransparency()

createPOLink()

approvePOLink()

rejectPOLink()

Must follow:

transfer.api.js
budget.api.js

patterns exactly.

Phase 2 — Feature Structure

Goal:

Create PO feature folder structure.

Create:

src/components/po/

Files:

POLinkForm.jsx

POLinkTable.jsx

POLinkDetailsDrawer.jsx

POTransparencyModal.jsx

POFilters.jsx

POSummaryCards.jsx

Rules:

No business logic inside pages.

Pages should orchestrate only.

Components should be reusable.

Phase 3 — PO Link Form

Goal:

Allow HOD to create PO Link requests.

Create:

POLinkForm.jsx

Requirements:

Budget Item selector

PO selector

Requested Quantity

Calculated Linked Amount

Validation display

Submit button

Reuse:

SearchableMultiSelect

existing form components

existing cards

existing inputs

Do not create custom controls if reusable controls already exist.

Phase 4 — Available PO Table

Goal:

Display available PO records.

Create:

POLinkTable.jsx

Columns:

Order ID

Item Code

Item Description

Supplier

PO Qty

Approved Qty

Pending Qty

Available Qty

Unit Cost

Requirements:

Search

Sorting

Pagination

Loading state

Empty state

Reuse current table implementation used in Transfer feature.

Phase 5 — Main HOD Page

Goal:

Create PO Linking page.

Create:

POLinkingPage.jsx

Responsibilities only:

Load data

Connect APIs

Manage state

Render child components

Should contain:

Filters

Summary Cards

PO Table

Create Request Form

Details Drawer

No large logic blocks.

Phase 6 — My Requests

Goal:

Allow HOD to view request history.

Requirements:

Tabs:

All

Pending

Approved

Rejected

Columns:

Request ID

Budget Item

PO Item

Requested Qty

Linked Amount

Status

Created At

Actions:

View

If rejected:

Create New Request

using request data as template.

Phase 7 — Request Details Drawer

Goal:

View full request details.

Create:

POLinkDetailsDrawer.jsx

Load:

GET /api/po-links/:id

Display:

PO Details

Budget Details

Request Details

Approval Information

Rejection Information

If rejected:

Show:

Create New Request

button.

Phase 8 — Purchasing Approval Page

Goal:

Allow Purchasing Department to review requests.

Create:

POApprovalPage.jsx

Requirements:

Filters:

Status

Department

Search

Financial Year

Actions:

Approve

Reject

View Details

Reuse approval patterns from:

TransferApprovalPage
Phase 9 — Approval Modals

Goal:

Implement approval workflow.

Reuse:

Existing confirmation modal

Approve:

Confirm Approval

Reject:

Reason Required

Must match Transfer workflow UX.

Phase 10 — Allocation Transparency

Goal:

Implement transparency modal.

Create:

POTransparencyModal.jsx

Load:

GET /api/po-links/po/:id/transparency

Display:

Summary:

Original Qty

Approved Qty

Pending Qty

Available Qty

Approved Allocations

Pending Allocations

Allocation History

Department Consumption

Must reuse existing modal component.

Phase 11 — Dashboard Integration

Goal:

Add PO metrics.

HOD Dashboard:

My Pending PO Links

My Approved PO Links

My Rejected PO Links

Purchasing Dashboard:

Pending PO Approvals

Approved Today

Rejected Today

Reuse dashboard card components.

Phase 12 — Routing

Add routes:

/purchase-orders

/po-approvals

Apply existing permission guards.

Phase 13 — Permissions

Verify visibility rules.

HOD:

can_view_po_links

can_request_po_links

Purchasing:

can_approve_po_links

can_view_all_po_link_requests

Reuse current permission system.

Phase 14 — Polish

Verify:

Loading states

Error states

Empty states

Toasts

Responsive layout

RTL compatibility

Accessibility

Development Workflow

For each phase:

Scan existing frontend.
Identify similar implementation.
Reuse components.
Reuse hooks.
Reuse API patterns.
Generate only files required for current phase.
Keep components small.
Avoid duplication.
Match project architecture exactly.
Execution Order
Phase 1  API Layer

Phase 2  Feature Structure

Phase 3  PO Link Form

Phase 4  Available PO Table

Phase 5  Main HOD Page

Phase 6  My Requests

Phase 7  Details Drawer

Phase 8  Approval Page

Phase 9  Approval Modals

Phase 10 Transparency Modal

Phase 11 Dashboard Integration

Phase 12 Routing

Phase 13 Permissions

Phase 14 Polish
Prompt For Next Session

When starting any phase, use:

Scan entire frontend and current PO implementation plan.

We are currently working on:

[PHASE NUMBER]

Before writing code:

- Find existing similar implementation.
- Reuse project patterns.
- Reuse existing components.
- Reuse Transfer feature architecture.
- Keep pages small.
- Split logic into reusable components.
- Match current code style exactly.

Give complete code for this phase only.
Show all files to create or modify.
Do not skip any required changes.