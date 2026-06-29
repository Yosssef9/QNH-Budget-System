# Centralized Category Budget Workflow Walkthrough

This document explains the proposed workflow in simple language.

It is meant for discussion with department managers, Category Responsible users, CFO, developers, and other stakeholders.

It is not a technical design document. It does not explain database tables, APIs, or implementation details.

## 1. Introduction

The system is used to collect department budget needs, review them by the right specialist team, approve them financially, and then control execution through transfers and PO linking.

The main idea is simple:

```text
Departments say what they need.
Category Responsible users define the details and prices.
CFO approves the final budget.
Execution happens after approval.
```

Main roles:

- Department User
- Category Responsible
- CFO
- Execution users, including transfer and PO linking users

Why this workflow exists:

- Departments usually know what they need, but not the exact technical specification.
- IT, Biomedical, and General Responsible users can consolidate similar requests across departments.
- CFO needs clear quantities, pricing, notes, and documents before approval.
- Approved budgets need controlled changes, transfers, and PO linking.

## 2. Main Roles

### Workflow Shape

```text
Department User
      |
      v
Category Responsible
      |
      v
CFO
      |
      v
Execution
```

### Department User

The Department User enters the department need.

Example:

```text
Item: Laptop
Quantity: 5
Distribution: Monthly
```

The Department User does not need to know:

- laptop model
- technical specification
- vendor
- unit price
- market price

### Category Responsible

The Category Responsible reviews requests for one category.

Examples:

- IT Responsible reviews IT items.
- Biomedical Responsible reviews biomedical items.
- General Responsible reviews general items.

They decide the practical details:

- approved quantity
- technical option
- sub-items
- unit cost
- supporting documents
- recommendation notes

### CFO

The CFO reviews the final package.

The CFO checks:

- requested quantity
- approved quantity
- total amount
- department breakdown
- sub-item breakdown
- notes
- attachments
- review history

The CFO approves or returns the package.

The CFO does not directly edit quantities, prices, or specifications.

### Execution

Execution starts after the budget is approved and the financial year reaches the correct stage.

Execution includes:

- transfers
- PO linking
- financial year closing

## 3. Budget Categories

There are three fixed budget responsibility categories:

```text
IT
Biomedical
General
```

Each item belongs to one category through the item master.

Examples:

```text
Laptop          -> IT
Patient Monitor -> Biomedical
Office Chair    -> General
```

The user does not manually choose the category.

### Example: Laboratory Department

Laboratory may submit requests in more than one category.

```text
Laboratory Department

IT
- 5 Laptops
- 2 Printers

Biomedical
- 2 Patient Monitors

General
- 10 Chairs
```

If Laboratory has no General requests, it does not need to submit a General budget.

```text
Laboratory Department

IT: Submitted
Biomedical: Submitted
General: Not Used
```

## 4. Department User Journey

The Department User starts by entering what the department needs.

### Step 1: Open Budget Entry

```text
[Budget Entry Screen]

Department: Laboratory
Financial Year: 2027
```

### Step 2: Add Items

The user selects an item and enters quantity.

```text
Item: Laptop
Quantity: 5
Distribution: Monthly
```

Another item:

```text
Item: Printer
Quantity: 2
Distribution: Annual
```

The system knows both are IT items.

```text
Laptop  -> IT
Printer -> IT
```

### Step 3: Review Category Budget

The user sees a simple list.

```text
Laboratory IT Budget

+---------+----------+--------------+
| Item    | Quantity | Distribution |
+---------+----------+--------------+
| Laptop  | 5        | Monthly      |
| Printer | 2        | Annual       |
+---------+----------+--------------+
```

### Step 4: Submit Category Budget

The user submits the IT budget.

```text
Laboratory IT Budget
Status: Submitted to IT Responsible
```

The Biomedical and General budgets can remain draft or unused.

```text
IT: Submitted
Biomedical: Draft
General: Not Used
```

## 5. Category Responsible Journey

The Category Responsible reviews requests immediately after a department submits.

They do not need to wait for all departments.

### Example: IT Responsible Dashboard

```text
IT Responsible View

Submitted IT Budgets

+------------+------------+----------+
| Department | Items      | Status   |
+------------+------------+----------+
| Laboratory | 2 items    | New      |
| Radiology  | 1 item     | New      |
| ER         | 3 items    | In Review|
+------------+------------+----------+
```

### Department View

The IT Responsible can view one department at a time.

```text
Laboratory IT Budget

+---------+-----------+----------+-------+
| Item    | Requested | Approved | Notes |
+---------+-----------+----------+-------+
| Laptop  | 5         |          |       |
| Printer | 2         |          |       |
+---------+-----------+----------+-------+
```

### Consolidated View

The IT Responsible can also see all departments together.

```text
Laptop
Total Requested: 50

+------------+----------+
| Department | Quantity |
+------------+----------+
| Laboratory | 5        |
| Radiology  | 15       |
| ER         | 30       |
+------------+----------+
```

This helps the responsible user think like this:

```text
"The hospital needs 50 laptops total.
Maybe we can standardize the specification and estimate cost better."
```

### Review Actions

The Category Responsible can:

- adjust approved quantity
- add notes
- mark item reviewed
- return item for modification
- create sub-items
- add pricing
- attach documents
- submit to CFO

Example:

```text
Item: Laptop
Requested Quantity: 50
Approved Quantity: 45
Note: Reduced based on replacement schedule review.
Reviewed: Yes
```

## 6. Sub Item Example

Department users request a generic item.

```text
Parent Item: Laptop
Requested Quantity: 50
```

The IT Responsible breaks this into detailed sub-items.

```text
Parent Item: Laptop
Approved Quantity: 50

Sub Items

+----------------+----------+-----------+------------+
| Sub Item       | Quantity | Unit Cost | Total      |
+----------------+----------+-----------+------------+
| Dell Latitude  | 30       | 4,500     | 135,000    |
| HP EliteBook   | 15       | 4,200     | 63,000     |
| Generic Laptop | 5        | 4,000     | 20,000     |
+----------------+----------+-----------+------------+
| Total          | 50       |           | 218,000    |
+----------------+----------+-----------+------------+
```

Visual calculation:

```text
Dell Latitude
30 x 4,500 = 135,000

HP EliteBook
15 x 4,200 = 63,000

Generic Laptop
5 x 4,000 = 20,000

Laptop Total
135,000 + 63,000 + 20,000 = 218,000
```

Important rule:

```text
Sub Item Quantities must equal Parent Approved Quantity.

30 + 15 + 5 = 50
```

Department users do not manage this section.

## 7. CFO Journey

The CFO receives the completed category package.

### CFO Review Screen Example

```text
CFO Review

Department: Laboratory
Category: IT
Status: Submitted by IT Responsible
```

Parent item view:

```text
+---------+-----------+----------+------------+
| Item    | Requested | Approved | Total      |
+---------+-----------+----------+------------+
| Laptop  | 50        | 50       | 218,000    |
| Printer | 5         | 5        | 18,000     |
+---------+-----------+----------+------------+
```

### CFO Opens Laptop Details

```text
Laptop

Requested Quantity: 50
Approved Quantity: 50
Total Amount: 218,000
```

Department breakdown:

```text
+------------+----------+
| Department | Quantity |
+------------+----------+
| Laboratory | 5        |
| Radiology  | 15       |
| ER         | 30       |
+------------+----------+
```

Sub-item breakdown:

```text
+----------------+----------+-----------+------------+
| Sub Item       | Quantity | Unit Cost | Total      |
+----------------+----------+-----------+------------+
| Dell Latitude  | 30       | 4,500     | 135,000    |
| HP EliteBook   | 15       | 4,200     | 63,000     |
| Generic Laptop | 5        | 4,000     | 20,000     |
+----------------+----------+-----------+------------+
```

Notes:

```text
IT Recommendation:
Standardize laptops into two main specifications.
Use generic laptops only for non-clinical shared workstations.
```

Attachments:

```text
Parent Item Attachments
- Laptop Consolidation Analysis.pdf
- IT Recommendation.pdf

Sub Item Attachments
- Dell Latitude Specification.pdf
- HP EliteBook Comparison.xlsx
- Vendor Quotation.pdf
```

### CFO Decision

The CFO can approve reviewed items.

```text
Laptop: Approved
Printer: Returned for clarification
```

But the category is not final until all active items are resolved.

```text
IT Category Status: CFO Review In Progress
```

## 8. Returned Budget Example

Example:

```text
10 items submitted
7 items accepted
3 items need changes
```

### CFO Review Result

```text
+----------------+----------------+
| Item           | CFO Decision   |
+----------------+----------------+
| Laptop         | Approved       |
| Printer        | Approved       |
| Network Switch | Approved       |
| Monitor        | Approved       |
| Scanner        | Approved       |
| Tablet         | Approved       |
| UPS            | Approved       |
| Software       | Returned       |
| Router         | Returned       |
| Projector      | Returned       |
+----------------+----------------+
```

The CFO returns the problem items to the Category Responsible.

```text
CFO
-> IT Responsible
```

The IT Responsible decides whether the department must update anything.

If department input is needed:

```text
IT Responsible
-> Department User
```

### What Department User Sees

The user sees all 10 items, but only 3 are editable.

```text
Laboratory IT Budget Returned

+----------------+----------+----------------+
| Item           | Status   | Editable?      |
+----------------+----------+----------------+
| Laptop         | Accepted | No             |
| Printer        | Accepted | No             |
| Network Switch | Accepted | No             |
| Monitor        | Accepted | No             |
| Scanner        | Accepted | No             |
| Tablet         | Accepted | No             |
| UPS            | Accepted | No             |
| Software       | Returned | Yes            |
| Router         | Returned | Yes            |
| Projector      | Returned | Yes            |
+----------------+----------+----------------+
```

The accepted items are visible but read-only.

The returned items can be corrected and resubmitted.

## 9. Complete End-to-End Example

This example follows Laboratory Department from budget entry to financial year close.

### Step 1: Financial Year Opens

```text
Financial Year 2027
Status: OPEN
```

Departments can start entering budgets.

### Step 2: Laboratory Creates IT Budget

Laboratory opens the IT budget section.

```text
Laboratory Department
Category: IT
Status: Draft
```

### Step 3: Laboratory Adds Laptops

```text
Item: Laptop
Quantity: 50
Distribution: Monthly
```

Laboratory also adds printers.

```text
Item: Printer
Quantity: 5
Distribution: Annual
```

### Step 4: Laboratory Submits IT Budget

```text
Laboratory IT Budget
Status: Submitted to IT Responsible
```

### Step 5: IT Responsible Reviews

IT Responsible sees Laboratory's submission.

```text
Laboratory IT Budget

+---------+-----------+----------+
| Item    | Requested | Approved |
+---------+-----------+----------+
| Laptop  | 50        |          |
| Printer | 5         |          |
+---------+-----------+----------+
```

IT Responsible reviews the laptop request.

```text
Laptop
Requested: 50
Approved: 50
Reviewed: Yes
```

### Step 6: IT Responsible Creates Sub-Items

```text
Laptop Sub Items

+----------------+----------+-----------+------------+
| Sub Item       | Quantity | Unit Cost | Total      |
+----------------+----------+-----------+------------+
| Dell Latitude  | 30       | 4,500     | 135,000    |
| HP EliteBook   | 15       | 4,200     | 63,000     |
| Generic Laptop | 5        | 4,000     | 20,000     |
+----------------+----------+-----------+------------+
| Total          | 50       |           | 218,000    |
+----------------+----------+-----------+------------+
```

### Step 7: IT Responsible Adds Supporting Documents

Parent item documents:

```text
- Laptop Consolidation Analysis.pdf
- IT Technical Recommendation.pdf
```

Sub-item documents:

```text
- Dell Latitude Specification.pdf
- HP EliteBook Comparison.xlsx
- Vendor Quotation.pdf
```

### Step 8: IT Responsible Submits to CFO

```text
Laboratory IT Budget
Status: Submitted to CFO
```

### Step 9: CFO Reviews

CFO sees:

```text
Parent Item: Laptop
Requested Quantity: 50
Approved Quantity: 50
Total Amount: 218,000
```

CFO also sees:

```text
- Department breakdown
- Sub-item breakdown
- Notes
- Attachments
- Review history
```

### Step 10: CFO Returns One Item

CFO approves Laptop but returns Printer.

```text
Laptop: Approved
Printer: Returned
```

The category is not final yet.

```text
IT Category Status: CFO Review In Progress
```

### Step 11: IT Responsible Modifies Printer

IT Responsible reviews CFO's note.

```text
CFO Note:
Please confirm whether the requested printers are shared network printers or small desktop printers.
```

IT Responsible updates the printer sub-items and adds a note.

```text
Printer Note:
Updated to shared network printers based on department use.
```

### Step 12: IT Responsible Resubmits to CFO

```text
Printer
Status: Resubmitted to CFO
```

### Step 13: CFO Approves

CFO approves Printer.

```text
Laptop: Approved
Printer: Approved
```

Now all active items are approved.

```text
Laboratory IT Budget
Status: CFO Approved
```

### Step 14: Change Request Before PRE-CLOSING

Before `PRE_CLOSING`, Laboratory realizes it needs 5 more laptops.

The department cannot directly edit the approved item.

It submits a change request.

```text
Change Request
Item: Laptop
Request: Increase quantity from 50 to 55
Reason: New outpatient clinic expansion
```

Flow:

```text
Department User
-> IT Responsible
-> CFO
```

If accepted, only Laptop reopens.

Printer remains approved and locked.

### Step 15: CFO Moves Financial Year to PRE-CLOSING

Once budgeting is complete:

```text
Financial Year 2027
Status: PRE_CLOSING
```

At this point:

- normal budget editing stops
- new normal change requests stop
- transfers can begin
- PO linking can begin

### Step 16: Transfer Example

Only Category Responsible users create transfers.

Example:

```text
IT Responsible creates transfer

From: Printer
To: Laptop
Amount: 10,000
Reason: Printer savings moved to laptop shortage
```

CFO reviews:

```text
Transfer Request
Status: Pending CFO Approval
```

CFO approves or rejects.

### Step 17: PO Linking Example

PO linking happens against sub-items.

Example:

```text
Approved Parent Item:
Laptop

Approved Sub Item:
Dell Latitude
Quantity: 30
```

A PO line arrives:

```text
PO Line:
Dell Latitude Laptop
Quantity: 10
Unit Cost: 4,450
```

The PO link targets:

```text
Dell Latitude
```

not:

```text
Laptop
```

This keeps procurement linked to the approved specification.

### Step 18: Financial Year Closing

Before closing:

```text
No pending transfers
No pending PO links
```

Then CFO can close the year.

```text
Financial Year 2027
Status: CLOSED
```

## 10. Lifecycle Diagram

Final high-level workflow:

```text
Financial Year Opened
        |
        v
Budget Entry
        |
        v
Department Category Submission
        |
        v
Category Review
        |
        v
Sub Items + Pricing + Documents
        |
        v
CFO Review
        |
        v
Approval
        |
        v
Change Requests, if needed before PRE_CLOSING
        |
        v
Pre-Closing
        |
        v
Transfers
        |
        v
PO Linking
        |
        v
Financial Year Closed
```

Return flow:

```text
CFO returns item
        |
        v
Category Responsible reviews
        |
        v
Department User updates only if needed
        |
        v
Category Responsible resubmits
        |
        v
CFO approves
```

Simple summary:

```text
Department asks.
Category Responsible prepares.
CFO approves.
Execution consumes the approved budget.
```
