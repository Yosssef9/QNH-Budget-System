# New Budget System Workflow Quick Guide

## 1. Main Workflow Idea

Old workflow:

```text
Department
-> Approver
-> CFO
```

New workflow:

```text
Department User
-> Category Budget Manager
-> CFO
-> Execution
```

The main change is that budget review is now handled by hospital-wide category owners instead of general department approvers.

---

## 2. Main Roles

### Department User / HOD

- Creates the department budget requests.
- Enters only the item, quantity, and distribution method.
- Does not enter prices, models, specifications, or vendor details.

### Category Budget Manager

Official role names:

- IT Category Budget Manager
- Biomedical Category Budget Manager
- General Category Budget Manager

Main responsibility:

- Reviews all requests in their category across all departments.
- Consolidates similar requests.
- Decides approved quantities.
- Creates sub-items and prices.
- Adds supporting documents.
- Submits the final category package to CFO.

### CFO

- Reviews the final category budget package.
- Approves or returns the package.
- Does not directly edit quantities, prices, or specifications.

### Procurement / Finance PO Approval

- Participates in PO Linking approval only.
- Approval is permission-based, not hardcoded to one role.

---

## 3. Budget Categories

Each department can have three independent category budgets:

```text
IT
Biomedical
General
```

Example:

```text
Laboratory Department

IT:
- Laptop
- Printer

Biomedical:
- Patient Monitor

General:
- Chair
```

Each category can be submitted separately.

---

## 4. Department User Journey

Department User enters:

- Item
- Quantity
- Distribution method

Example:

```text
Laptop
Quantity: 5
Distribution: Quarterly
```

Department User does not enter:

- Unit cost
- Total amount
- Vendor
- Model
- Technical specification

---

## 5. Category Submission Cutoff

Before sending a category budget to CFO, the Category Budget Manager can close department submission for that category.

Example:

```text
IT Category
Close Department Submission
```

After closing IT submission:

- Departments can no longer submit new IT requests.
- The IT Category Budget Manager can finalize the full IT package.
- CFO receives the final stable IT budget.
- No new IT request can appear while CFO is reviewing.

Important:

- Closing IT does not close Biomedical or General.
- Each category closes independently.
- Before CFO approval, the Category Budget Manager may reopen submission if needed, with a reason.
- After CFO approval, changes must use Change Request workflow before PRE-CLOSING.

---

## 6. Category Budget Manager Journey

The Category Budget Manager reviews requests in two ways:

### Department View

```text
Laboratory
- Laptop 10
- Printer 3

Radiology
- Laptop 15
```

### Consolidated Item View

```text
Laptop
Total Requested Quantity: 25

Laboratory: 10
Radiology: 15
```

This allows the Category Budget Manager to understand both:

- who requested the item;
- total hospital-wide demand for that item.

---

## 7. Approved Quantity

Each item has:

```text
Requested Quantity
Approved Quantity
```

Example:

```text
Requested: 5 laptops
Approved: 7 laptops
```

Approved quantity may be less than, equal to, or greater than requested quantity.

The CFO still gives final approval.

---

## 8. Review Checkbox

Each item can be marked as reviewed.

Example:

```text
Laptop      Reviewed
Printer     Reviewed
Scanner     Needs Modification
Monitor     Needs Modification
```

If the budget is returned:

- reviewed items become read-only;
- unreviewed items remain editable;
- the department edits only the returned items.

---

## 9. Sub-Items

Departments request generic needs.

Example:

```text
Laptop
Quantity: 50
```

Category Budget Manager creates sub-items:

```text
Dell Latitude       Qty 30
HP EliteBook        Qty 15
Generic Laptop      Qty 5
```

Sub-items represent the actual specification and pricing.

Department Users do not manage or see sub-items during request entry.

---

## 10. Pricing

Pricing exists only at sub-item level.

Example:

```text
Dell Latitude
Qty: 30
Unit Cost: 4,500
Total: 135,000
```

Parent item total is calculated from sub-items.

```text
Laptop Total = Sum of Laptop Sub-Items
```

---

## 11. Supporting Documents

Category Budget Managers may attach documents to the consolidated item package.

Examples:

- Vendor quotation
- Technical comparison
- Market research
- Business justification
- Technical recommendation

Attachments help the CFO understand why the proposed quantity, specification, and cost are appropriate.

---

## 12. CFO Review

CFO sees one consolidated package per category and item.

Example:

```text
Category: IT
Item: Laptop
Total Requested Quantity: 50
Approved Quantity: 50
Sub-Items
Total Amount
Attachments
Department Contributions
Notes
Review History
```

CFO can:

- approve;
- return to Category Budget Manager.

CFO cannot return directly to Department User.

Return path:

```text
CFO
-> Category Budget Manager
-> Department User, if needed
-> Category Budget Manager
-> CFO
```

---

## 13. Category Approval

Each category is approved independently.

Example:

```text
IT: Approved
Biomedical: Under Review
General: Draft
```

A department does not need to submit empty categories.

---

## 14. Change Requests

After category approval but before PRE-CLOSING, departments cannot directly edit approved budgets.

They submit Change Requests.

Examples:

- Add item
- Increase quantity
- Decrease quantity
- Modify item

If accepted:

- only affected items reopen;
- unaffected approved items remain unchanged;
- normal review workflow repeats.

---

## 15. PRE-CLOSING

When CFO moves the financial year to PRE-CLOSING:

- budget editing stops;
- no new budget modifications are allowed;
- no emergency workflow exists after PRE-CLOSING;
- remaining change requests must be approved, rejected, or closed.

---

## 16. Transfers

After PRE-CLOSING:

- only Category Budget Managers can create transfers;
- Department Users cannot create transfers;
- transfers happen at parent item level;
- sub-items are not transferred;
- cross-category transfers are not allowed;
- cross-department transfers are not allowed;
- CFO approves or rejects transfer requests.

Example:

```text
IT Laptop -> IT Printer
Allowed

IT Laptop -> Biomedical Monitor
Not Allowed
```

---

## 17. PO Linking

PO Linking targets sub-items, not parent items.

Example:

```text
Parent Item:
Laptop

Sub Items:
- Dell Latitude
- HP EliteBook

PO Link target:
Dell Latitude
```

PO Link approval is permission-based.

the permission is normally assigned to Finance.

**Important:**

PO Linking is available only for final reviewed Purchase Orders that have completed the organization's procurement review process and are approved for execution.

Draft, pending review, cancelled, or rejected Purchase Orders are not eligible for PO Linking.


## 18. Financial Year Closing

CFO cannot close the financial year while there are:

- pending transfer requests;
- pending PO link requests.

The year can close only after required activities are resolved.

---

## 19. Workspace / Acting As

A user may have multiple responsibilities.

Example:

```text
John is:
- Head of IT Department
- IT Category Budget Manager
```

The system uses workspace switching.

Example:

```text
Department Workspace
Category Budget Management Workspace
PO Link Approval Workspace
CFO Review Workspace
```

The user must know which workspace they are acting in.

This keeps responsibilities separate even if one person has multiple roles.

---

## 20. Simple End-to-End Flow

```text
Financial Year Opened
-> Department Users enter requests
-> Departments submit category budgets
-> Category Budget Manager reviews and consolidates
-> Category Budget Manager closes department submission
-> Category Budget Manager creates sub-items and pricing
-> Category Budget Manager attaches documents
-> Category Budget Manager submits to CFO
-> CFO approves or returns
-> Approved category can receive Change Requests before PRE-CLOSING
-> CFO moves year to PRE-CLOSING
-> Category Budget Managers handle transfers
-> PO Linking happens against sub-items
-> Pending transfers and PO links are resolved
-> Financial Year Closed
```
