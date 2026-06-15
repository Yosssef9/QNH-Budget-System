# QNH Budget System

# Purchase Order (PO) Linking Feature

## Functional & Technical Design Document (Version 1)

---

# 1. Purpose

This document defines the complete design of the Purchase Order (PO) Linking feature for the QNH Budget System.

The purpose of this feature is to:

- Import purchase records from Oracle ERP.
- Allow HODs to allocate purchased quantities against approved budget items.
- Allow Purchasing Department to review and approve allocations.
- Track budget utilization using actual purchases.
- Prevent over-allocation of PO quantities.
- Prevent over-consumption of approved budget quantities.
- Integrate with Financial Year Closing.
- Integrate with Notifications.
- Integrate with Audit Logs.
- Provide complete visibility and reporting.

---

# 2. Existing Oracle Data

Purchase records are imported from Oracle and stored locally.

Table:

```sql
BS_Purchase_Invoices_For_Budget
```

Example:

```text
ORDER_ID      : 20260000123

ITEM_CODE     : 2108020015

ITEM_DESC     : Stand Alone AC

QTY           : 10

UNIT_COST     : 5000

NET_AMOUNT    : 50000
```

Important:

A single row represents:

```text
One PO Line
One Item
One Quantity
```

NOT:

```text
A group of items
```

---

# 3. Why PO Linking Is Required

Oracle purchase records are imported from the ERP system and contain:

- Order ID
- Item Code
- Item Description
- Quantity
- Cost

However, Oracle records are not associated with:

- Department
- Budget
- Budget Item
- HOD

Additionally, Oracle item descriptions and Budget item names may differ.

Example:

Oracle:

```text
Stand Alone AC
```

Budget:

```text
Air Conditioning
```

Because the system cannot reliably determine the relationship automatically, a manual allocation workflow is required.

The purpose of the PO Linking feature is to create the relationship between:

```text
Oracle PO Record
↓
Budget Item
↓
Department Budget
```

# 4. Main Business Concept

The PO quantity can be split across multiple departments.

Example:

Oracle Record:

```text
Stand Alone AC

Qty = 10
```

Emergency Department:

```text
Air Conditioning
Approved Qty = 4
```

Links:

```text
Qty = 4
```

---

ICU Department:

```text
Air Conditioning
Approved Qty = 3
```

Links:

```text
Qty = 3
```

---

Administration:

```text
Air Conditioning
Approved Qty = 3
```

Links:

```text
Qty = 3
```

---

Result:

```text
Original PO Qty = 10

Allocated Qty = 10

Remaining Qty = 0
```

This is the approved design.

---

# 5. User Roles

## HOD

Permissions:

```text
can_view_po_links

can_request_po_links
```

Responsibilities:

- View all imported Oracle PO records.
- Search and filter PO records.
- View PO allocation history.
- View approved and pending allocations against each PO.
- Create PO link requests.
- View own request history.
- View rejected requests.
- Create new requests based on rejected requests.

### Notes

PO records are not assigned to departments.

All HODs can browse all imported PO records.

The allocation workflow determines which department consumes the PO quantity.

---

## Purchasing Department

Permissions:

```text
can_view_all_po_link_requests

can_approve_po_links
```

Responsibilities:

- View PO link requests from all departments.
- Review pending requests.
- Approve requests.
- Reject requests with notes.
- View allocation history.
- Monitor PO utilization.
- Monitor remaining quantities available for allocation.

### Notes

Purchasing does not manage Oracle PO records.

Purchasing reviews and approves allocation requests submitted by departments.

Purchasing has visibility across all departments and all PO link requests.

````
---

# 6. Workflow Overview

## Step 1

Oracle data imported into:

```sql
BS_Purchase_Invoices_For_Budget
````

---

## Step 2

HOD opens:

```text
PO Linking
```

inside:

```text
Budget View Page
```

---

## Step 3

HOD selects Budget Item.

Example:

```text
Air Conditioning

Approved Qty = 5
```

---

## Step 4

System displays available PO records.

Example:

```text
Stand Alone AC

PO Qty = 10

Approved Allocations = 4

Pending Allocations = 1

Available Qty = 5
```

---

## Step 5

HOD enters quantity.

Example:

```text
Request Qty = 3
```

---

## Step 6

System validates request.

---

## Step 7

Request submitted.

Status:

```text
PENDING
```

---

## Step 8

Purchasing reviews request.

---

## Step 9

Purchasing:

```text
Approve
```

or

```text
Reject
```

---

## Step 10

If rejected:

HOD receives rejection reason.

HOD may create a new request using the rejected request as a template.

A new request starts a new approval cycle.

---

# 7. Statuses

Only three statuses will exist.

```text
PENDING

APPROVED

REJECTED
```

Rejected requests remain in the system for audit purposes.

Rejected requests cannot be edited.

If changes are required, a new request must be created.

This provides a cleaner audit trail and treats each allocation as a separate transaction.

---

# 7.1. Rejected Request Workflow

When a request is rejected:

- Quantity reservation is released.
- Request status becomes REJECTED.
- HOD receives notification.
- HOD can view the rejection reason.
- HOD can create a new request using the rejected request as a template.
- The original rejected request remains unchanged for audit purposes.

Each new submission creates a new PO Link Request record with a new ID.

# 7.2. Duplicate Request From Rejected Request

Rejected requests cannot be edited.

To reduce user effort, the system provides a:

"Create New Request"

action.

When selected:

- PO Record is prefilled.
- Budget Item is prefilled.
- Quantity is prefilled.

The HOD may modify any value before submission.

Submitting creates a new PO Link Request record with a new ID.

The original rejected request remains unchanged.

# 8. Database Design

## Table 1

Existing Oracle Import Table

```sql
BS_Purchase_Invoices_For_Budget
```

No modifications required.

This table remains immutable.

It is only used as imported source data.

---

## Table 2

```sql
BS_PO_LINKS
```

Purpose:

Stores every allocation request.

```sql
CREATE TABLE dbo.BS_PO_LINKS
(
    ID BIGINT IDENTITY(1,1) PRIMARY KEY,

    PURCHASE_INVOICE_LINE_ID BIGINT NOT NULL,

    BUDGET_ID BIGINT NOT NULL,

    BUDGET_ITEM_ID BIGINT NOT NULL,

    PARENT_ITEM_NAME NVARCHAR(300) NULL,

    REQUESTED_QTY DECIMAL(18,3) NOT NULL,

    UNIT_COST DECIMAL(18,6) NOT NULL,

    LINKED_AMOUNT DECIMAL(18,6) NOT NULL,

    STATUS NVARCHAR(20) NOT NULL,

    REQUESTED_BY BIGINT NOT NULL,
    REQUESTED_AT DATETIME2 NOT NULL,

    APPROVED_BY BIGINT NULL,
    APPROVED_AT DATETIME2 NULL,
    REJECTED_BY BIGINT NULL,
    REJECTED_AT DATETIME2 NULL,

    REJECTION_REASON NVARCHAR(MAX) NULL,

    CREATED_AT DATETIME2 NOT NULL,
    UPDATED_AT DATETIME2 NOT NULL
)
```

---

## Recommended Indexes

```sql
CREATE INDEX IX_BS_PO_LINKS_PURCHASE_INVOICE_LINE_ID
ON BS_PO_LINKS(PURCHASE_INVOICE_LINE_ID);

CREATE INDEX IX_BS_PO_LINKS_BUDGET_ITEM_ID
ON BS_PO_LINKS(BUDGET_ITEM_ID);

CREATE INDEX IX_BS_PO_LINKS_STATUS
ON BS_PO_LINKS(STATUS);

CREATE INDEX IX_BS_PO_LINKS_REQUESTED_AT
ON BS_PO_LINKS(REQUESTED_AT);
```

# 9. Why No Request Header Table?

Rejected design:

```text
BS_PO_LINK_REQUESTS

BS_PO_LINK_REQUEST_ITEMS
```

Reason:

Each request links:

```text
One Budget Item
to
One Oracle PO Line
```

Therefore:

```text
One Row = One Request
```

is sufficient.

This matches Transfer architecture.

Simpler.

Less code.

Less complexity.

---

# 10. Quantity Reservation Logic

This is critical.

---

Example:

PO Qty:

```text
10
```

Approved:

```text
4
```

Pending:

```text
1
```

---

Available:

```text
10 - 4 - 1

= 5
```

Formula:

```text
Available PO Quantity

=

Original Quantity

-

Approved Quantity

-

Pending Quantity
```

---

Submission Validation Rule

A request cannot be submitted if:

```text
Approved PO Quantity

+

Pending PO Quantity

+

Requested Quantity

>

Original PO Quantity
```

Without reservation logic:

Multiple departments could consume the same quantity.

This must never happen.

---

## Reservation Rules

PENDING requests reserve quantity.

APPROVED requests consume quantity.

REJECTED requests do not reserve quantity.

Only PENDING and APPROVED requests are included in quantity calculations.

# 11. Budget Quantity Validation

Budget Item:

```text
Air Conditioning

Approved Qty = 5
```

Approved Links:

```text
2
```

Pending Links:

```text
1
```

---

Remaining:

```text
5 - 2 - 1

= 2
```

---

Formula:

```text
Remaining Budget Quantity

=

Approved Quantity

-

Approved Linked Quantity

-

Pending Linked Quantity
```

---

Validation:

```text
Requested Qty

<=

Remaining Budget Qty
```

Required.
Additional Validation Rule

Validation must include both APPROVED and PENDING requests.

A request cannot be submitted if:

```text
Approved Linked Quantity

+

Pending Linked Quantity

+

Requested Quantity

>

Approved Budget Quantity
```

---

## Multiple PO Allocation Support

A single Budget Item may receive allocations from multiple Oracle PO records.

This is an approved design and is expected to occur frequently in real-world purchasing scenarios.

### Example

Budget Item:

```text
PC

Approved Qty = 10
```

---

First Allocation:

```text
PO #1001

Item Description = Dell Desktop

Requested Qty = 5

Status = APPROVED
```

---

Second Allocation:

```text
PO #1002

Item Description = HP Desktop

Requested Qty = 5

Status = APPROVED
```

---

Result:

```text
Approved Budget Qty = 10

Linked Qty = 10

Remaining Qty = 0
```

This is valid.

The system tracks the total linked quantity across all approved and pending PO Link Requests associated with the Budget Item.

The source PO records may be different.

The source suppliers may be different.

The source invoices may be different.

### Business Rule

The system does not limit a Budget Item to a single PO record.

A Budget Item may receive allocations from any number of Oracle PO records provided that:

```text
Approved Linked Quantity

+

Pending Linked Quantity

+

Requested Quantity

<=

Approved Budget Quantity
```

### Relationship Model

```text
One Budget Item
        ↑
        │
Many PO Link Requests
        │
        ↓
Many Oracle PO Records
```

This creates a many-to-many relationship between Budget Items and Oracle PO Records through the BS_PO_LINKS table.

# 12. Amount Validation

Decision:

NO amount validation.

---

Reason:

Budget amount is approximate.

Actual purchase costs can differ.

---

Example:

Budget:

```text
Qty = 5

Amount = 100,000
```

Actual Purchase:

```text
Qty = 5

Amount = 130,000
```

Allowed.

---

System tracks variance.

But does not block.

---

# 13. Amount Calculation

Amount entered manually?

NO.

---

System calculates automatically.

Formula:

```text
Requested Qty

×

Unit Cost
```

Example:

```text
Qty = 3

Unit Cost = 5,000
```

Result:

```text
15,000
```

Automatically stored.

---

# 14. Purchasing Approval Screen

## Approval Validation

Before approving a request, the system must revalidate:

- Available PO Quantity
- Available Budget Quantity

using current data.

Approval must be blocked if either validation fails.

This prevents race conditions and ensures quantities remain valid even if other requests were approved after the original request was submitted.

### Example

PO Quantity:

```text
10
```

Request A:

```text
Qty = 5

Status = PENDING
```

Request B:

```text
Qty = 5

Status = PENDING
```

Both requests are valid when submitted because:

```text
Pending Qty = 0
```

at the time each request was created.

Later:

```text
Purchasing approves Request A
```

If another approved or pending allocation consumes the remaining quantity before Request B is reviewed, Request B may no longer be valid.

For this reason, approval cannot rely on the validation performed during request creation.

The system must perform the same quantity validation again during approval using the latest database values.

If the request exceeds either:

- Available PO Quantity
- Available Budget Quantity

approval must be blocked and the user informed that the allocation is no longer valid.

Purchasing sees:

```text
Department

Budget Item

PO Item

PO Qty

Already Allocated

Available Qty

Requested Qty

Linked Amount
```

---

Actions:

```text
Approve

Reject
```

---

Rejection requires notes.

---

# 15. HOD PO Search Screen

Filters:

```text
Invoice Number

Order ID

Item Code

Item Description

Supplier

Year

Store
```

---

Columns:

```text
Order ID

Item Code

Item Description

PO Qty

Approved Qty

Pending Qty

Available Qty

Unit Cost
```

---

# 16. Allocation Transparency

When viewing a PO:

System displays allocation history.

Example:

```text
PO Qty = 10
```

---

Approved:

| Department | Qty |
| ---------- | --- |
| ICU        | 3   |
| ER         | 2   |

---

Pending:

| Department | Qty |
| ---------- | --- |
| Admin      | 1   |

---

Summary:

```text
Original = 10

Approved = 5

Pending = 1

Available = 4
```

This visibility is mandatory.

---

# 17. Financial Year Rules

Current Budget System:

```text
OPEN

PRE_CLOSING

CLOSED
```

---

PO Linking allowed only during:

```text
PRE_CLOSING
```

---

Not allowed during:

```text
OPEN
```

Reason:

Budgets still being modified.

---

Not allowed during:

```text
CLOSED
```

Reason:

Year finalized.

---

# 18. Financial Year Closing Validation

Cannot Close Year If:

Any PO Link exists with:

```text
PENDING
```

---

Example:

```text
PO Link #100

Status = Pending
```

Close Year:

```text
BLOCKED
```

---

Reason:

Approval workflow unfinished.

---

# 19. What Does NOT Block Closing?

Not all budget items need allocations.

Example:

Budget:

```text
100 approved items
```

Only:

```text
60 linked
```

Still allowed.

Reason:

Unused budget is normal.

Hospitals regularly:

- Cancel purchases
- Delay purchases
- Leave budget unused

---

# Planned API Endpoints

## HOD

```http
GET /api/po-links/available-pos

GET /api/po-links/my

GET /api/po-links/:id

POST /api/po-links
```

## Purchasing

```http
GET /api/po-links/pending

PATCH /api/po-links/:id/approve

PATCH /api/po-links/:id/reject
```

# 20. Notifications

New Notification Types

```text
PO_LINK_SUBMITTED

PO_LINK_APPROVED

PO_LINK_REJECTED
```

---

Submission:

```text
HOD → Purchasing
```

---

Approval:

```text
Purchasing → HOD
```

---

Rejected:

```text
Purchasing → HOD
```

---

# 21. Audit Log Events

New Audit Events

```text
CREATE_PO_LINK

SUBMIT_PO_LINK

APPROVE_PO_LINK

REJECT_PO_LINK


```

Stored in:

```text
BS_AUDIT_LOGS
```

same as existing workflows.

---

# 22. Dashboard Integration

HOD Dashboard

Show:

```text
My Pending PO Links

My Rejected PO Links

My Approved PO Links
```

---

Purchasing Dashboard

Show:

```text
Pending PO Approvals

Approved Today

Rejected Today
```

Action Required card.

---

# 23. Reporting

Every Budget Item should show:

| Metric          | Value   |
| --------------- | ------- |
| Approved Qty    | 5       |
| Linked Qty      | 4       |
| Remaining Qty   | 1       |
| Approved Amount | 100,000 |
| Linked Amount   | 130,000 |
| Variance        | +30,000 |

---

# 24. Report Calculations

## Utilization By Quantity

Formula:

```text
Linked Qty

/

Approved Qty
```

Example:

```text
4 / 5

=

80%
```

---

## Variance

Formula:

```text
Linked Amount

-

Approved Amount
```

Example:

```text
130,000

-

100,000

=

+30,000
```

---

# 25. Full Example

Oracle Record:

```text
Stand Alone AC

Qty = 10

Unit Cost = 5,000
```

---

Emergency Budget Item:

```text
Approved Qty = 4
```

Request:

```text
Qty = 4
```

Approved.

---

ICU Budget Item:

```text
Approved Qty = 3
```

Request:

```text
Qty = 3
```

Approved.

---

Admin Budget Item:

```text
Approved Qty = 3
```

Request:

```text
Qty = 3
```

Approved.

---

Final State:

```text
Original PO Qty = 10

Approved Qty = 10

Pending Qty = 0

Available Qty = 0
```

---

# Future Enhancements (Not Included In Version 1)

The following features are intentionally excluded from Version 1:

- Automatic PO matching
- Automatic department assignment
- Oracle item mapping memory
- AI-assisted matching
- Bulk approvals
- Bulk allocations
- Supplier utilization reports

```
# 25. Final Design Decisions

✅ Oracle records remain immutable

✅ One PO line can be allocated across multiple departments

✅ One Budget Item can receive allocations from multiple PO records

✅ One request = one allocation

✅ Purchasing approves

✅ HOD requests

✅ Quantity validation enforced

✅ Amount validation NOT enforced

✅ Reservation logic required

✅ Financial year cannot close with pending PO links

✅ Financial year can close even if some budget items are never linked

✅ Notifications integrated

✅ Audit logs integrated

✅ Dashboard integrated

✅ Reporting integrated

✅ Full allocation transparency displayed

✅ Architecture aligned with existing Budget and Transfer workflows

---

END OF DOCUMENT
```
