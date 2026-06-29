# New Budget Workflow Specification

This document is the official business specification for the upcoming QNH Budget Management System workflow refactor.

It is the single source of truth for the new workflow. Future business analysis, implementation planning, development work, testing, and AI-assisted changes should refer to this document first.

This document explains how the workflow behaves, who performs each action, what each role is allowed to modify, what each role is not allowed to modify, and what happens next at each stage.

This document intentionally avoids database design, API design, and frontend implementation details.

## 1. Overview

The new budget workflow changes the system from a department-only approval model into a category-based specialist review model.

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
```

The old workflow allowed departments to submit complete budget items directly for approval. In that model, department users were expected to enter item quantities, prices, and other budget details.

The new workflow separates responsibilities more clearly.

Department users are responsible for explaining what the department needs.

Category Budget Managers are responsible for reviewing those needs, defining technical details, selecting or describing specifications, estimating prices, adding supporting documents, and preparing a complete recommendation for CFO review.

The CFO is responsible for final financial approval. The CFO reviews the recommendation package but does not directly edit quantities, specifications, or prices.

This separation exists because hospital departments often know their operational needs, but they may not know the technical specification, market cost, standard model, or best procurement approach.

Example:

```text
Laboratory needs laptops.

Laboratory knows:
- It needs 5 laptops.

Laboratory may not know:
- which laptop model is appropriate
- whether the hospital has a standard laptop specification
- current unit cost
- vendor quotation
- technical comparison
```

In the new workflow:

```text
Laboratory requests 5 laptops.
IT Category Budget Manager reviews the request.
IT Category Budget Manager defines the actual laptop specifications and pricing.
CFO reviews and approves the final IT budget package.
```

The purpose of the new workflow is to improve:

- technical review
- pricing accuracy
- budget consolidation
- CFO decision quality
- audit history
- procurement alignment
- control over post-approval changes

## 2. Main Roles

### Department User

The Department User represents a hospital department.

The Department User is responsible for entering department needs.

The Department User enters:

- item
- quantity
- distribution method

The Department User does not enter:

- unit cost
- total amount
- technical specification
- model number
- vendor
- sub-items
- final pricing recommendation

Example:

```text
Department: Laboratory
Item: Laptop
Quantity: 5
Distribution Method: Annual
```

The department is only saying:

```text
We need 5 laptops.
```

The department is not saying:

```text
We need Dell Latitude 7450 laptops at 4,500 SAR each.
```

### IT Category Budget Manager

The IT Category Budget Manager reviews all IT budget requests from all departments.

The IT Category Budget Manager is responsible for IT-related technical and pricing review.

Examples of IT items:

- laptops
- printers
- network switches
- software licenses
- servers
- tablets

The IT Category Budget Manager can:

- review IT requests
- view requests by department
- view consolidated IT item quantities across departments
- adjust approved quantities
- add notes
- mark IT items as reviewed
- return IT items for modification
- create IT sub-items
- enter IT pricing
- attach IT supporting documents
- submit IT category budgets to CFO
- create IT-related transfers after `PRE_CLOSING`

The IT Category Budget Manager cannot approve the budget on behalf of the CFO.

### Biomedical Category Budget Manager

The Biomedical Category Budget Manager reviews all Biomedical budget requests from all departments.

The Biomedical Category Budget Manager is responsible for biomedical equipment and clinical engineering review.

Examples of Biomedical items:

- patient monitors
- ECG machines
- infusion pumps
- ventilators
- biomedical devices

The Biomedical Category Budget Manager can:

- review Biomedical requests
- view requests by department
- view consolidated Biomedical item quantities across departments
- adjust approved quantities
- add notes
- mark Biomedical items as reviewed
- return Biomedical items for modification
- create Biomedical sub-items
- enter Biomedical pricing
- attach Biomedical supporting documents
- submit Biomedical category budgets to CFO
- create Biomedical-related transfers after `PRE_CLOSING`

The Biomedical Category Budget Manager cannot approve the budget on behalf of the CFO.

### General Category Budget Manager

The General Category Budget Manager reviews all General budget requests from all departments.

The General Category Budget Manager is responsible for general non-IT and non-Biomedical needs.

Examples of General items:

- chairs
- desks
- office furniture
- general equipment
- non-specialized supplies

The General Category Budget Manager can:

- review General requests
- view requests by department
- view consolidated General item quantities across departments
- adjust approved quantities
- add notes
- mark General items as reviewed
- return General items for modification
- create General sub-items
- enter General pricing
- attach General supporting documents
- submit General category budgets to CFO
- create General-related transfers after `PRE_CLOSING`

The General Category Budget Manager cannot approve the budget on behalf of the CFO.

### CFO

The CFO is the final financial approval authority.

The CFO reviews category budget packages after Category Budget Manager review is complete.

The CFO can:

- review parent items
- review approved quantities
- review total amounts
- review department breakdowns
- review sub-item breakdowns
- review notes
- review supporting documents
- approve category budgets
- return items or category budgets to Category Budget Manager
- manage financial year movement into `PRE_CLOSING`
- close the financial year after pending activities are resolved

The CFO cannot directly edit:

- department requested quantity
- category approved quantity
- sub-items
- unit cost
- total amount
- technical specification
- supporting documents

If the CFO requires a change, the CFO returns the item or budget to the Category Budget Manager.

The CFO return path is:

```text
CFO
-> Category Budget Manager
-> Department User, if department changes are needed
-> Category Budget Manager
-> CFO
```

The Category Budget Manager always remains the technical review layer.

### Procurement

Procurement participates only in the PO Linking phase for Version 1.

Procurement does not participate in:

- department budget entry
- category review
- sub-item preparation
- CFO budget approval

Procurement may participate through PO Linking permissions and PO Link approval rules.

Example:

```text
Approved Sub Item:
Dell Latitude Laptop

PO Line:
Dell Latitude Laptop from supplier

Procurement involvement begins when the PO line is linked to the approved sub-item.
```

PO Linking approval permissions must be configurable.

## 3. Workspace Context Switching

The system uses Workspace Context Switching.

A single user may have more than one business responsibility. The system must distinguish what the user is currently acting as, not only what permissions the user has.

Example:

```text
User: John

Responsibility 1:
Head of IT Department

Responsibility 2:
IT Category Budget Manager
```

As Head of IT Department, John behaves like a Department User. He creates and submits only the IT Department's own budget requests.

As IT Category Budget Manager, John reviews all IT budget requests from every department across the hospital.

These responsibilities must remain independent.

### Workspace Types

The system must support at least these workspace types:

- Department Workspace
- Category Budget Management Workspace

### Department Workspace

The Department Workspace is used when a user is acting on behalf of one department.

Example:

```text
Current Workspace:
Department Budget - IT Department

Acting As:
Department User for IT Department
```

In this workspace, John can create and submit the IT Department's own budget requests.

He does not review other departments from this workspace.

### Category Budget Management Workspace

The Category Budget Management Workspace is used when a user is acting as a hospital-wide category manager.

Example:

```text
Current Workspace:
IT Category Budget Management

Acting As:
IT Category Budget Manager
```

In this workspace, John reviews IT requests from all departments.

He does not submit the IT Department's own department budget from this workspace.

### Current Workspace / Acting As Rule

The system must always know and display the active workspace.

The active workspace controls:

- available menu items
- available actions
- visible data
- notifications shown as relevant work
- audit context

Example:

```text
User: John
Current Workspace: IT Category Budget Management
Acting As: IT Category Budget Manager
Action: Returned Laboratory Laptop item for clarification
```

This is different from:

```text
User: John
Current Workspace: Department Budget - IT Department
Acting As: Department User for IT Department
Action: Submitted IT Department IT Budget
```

The same person performed both actions, but the business responsibility was different.

### Workspace Selection

If a user has only one workspace, the system may open that workspace directly.

If a user has multiple workspaces, the system should allow the user to choose or switch the active workspace.

Example:

```text
Available Workspaces:

- Department Budget - IT Department
- IT Category Budget Management
```

The system may remember the user's last selected workspace, but the active workspace must remain visible.

### Why Workspace Context Exists

Workspace Context Switching prevents confusion when one user has multiple responsibilities.

It also improves audit clarity.

Without workspace context, an audit entry might only say:

```text
John returned Laptop request.
```

With workspace context, the audit entry can say:

```text
John returned Laptop request while acting as IT Category Budget Manager.
```

That distinction is required for governance.

### Segregation of Duties Note

A user may submit a department budget and also review that department's category budget if the same person holds both roles.

Example:

```text
John submits the IT Department IT Budget as Department User.
John also reviews IT-category requests as IT Category Budget Manager.
```

This is allowed unless the business later introduces a stricter segregation-of-duties rule.

However, the system must audit the acting workspace clearly. The CFO should be able to identify when the submitter and category reviewer are the same person.

Recommended CFO warning:

```text
Reviewer is also the submitting department manager.
```

### Delegation

Category Budget Manager delegation is role-based.

There is no special delegation workflow in Version 1.

If the IT Category Budget Manager is unavailable, the Administrator assigns the same role to another user.

Example:

```text
Original:
John = IT Category Budget Manager

Temporary coverage:
Sara = IT Category Budget Manager
```

Sara receives the IT Category Budget Management workspace because she has the role.

## 4. Budget Categories

Every department effectively has three independent category budgets:

- IT
- Biomedical
- General

Each category has its own lifecycle.

Each category can be submitted independently.

This means a department does not need to complete all categories at the same time.

Example:

```text
Department: Laboratory

IT Budget: Submitted
Biomedical Budget: Draft
General Budget: Draft
```

In this example, the IT Category Budget Manager can begin reviewing the Laboratory IT Budget immediately. The IT Category Budget Manager does not need to wait for the Laboratory Biomedical Budget or General Budget.

Another example:

```text
Department: Laboratory

IT Budget: Submitted
Biomedical Budget: Submitted
General Budget: Not Used
```

In this example, Laboratory has no General requests. The department does not need to submit an empty General budget.

Category assignment comes from the item master.

Example:

```text
Laptop -> IT
Patient Monitor -> Biomedical
Office Chair -> General
```

Department users do not manually choose whether an item belongs to IT, Biomedical, or General.

If an item is classified incorrectly, an Administrator corrects the item master. Category Budget Managers do not directly change item category ownership.

Item category changes affect future financial years only. Historical budgets remain unchanged for audit and reporting purposes.

## 5. Department User Workflow

The Department User starts the workflow by entering budget requests for the department.

The Department User only enters:

- item
- quantity
- distribution method

The Department User never enters:

- unit cost
- total amount
- technical specification
- model number
- vendor
- sub-item

### Basic Example

```text
Department: Laboratory
Item: Laptop
Quantity: 5
Distribution Method: Annual
```

The department is simply requesting five laptops.

The department is not choosing:

- Dell Latitude
- HP EliteBook
- Lenovo ThinkPad
- any other technical model

The department is not entering:

```text
Unit Cost: 4,500
Total Amount: 22,500
```

Those details are handled later by the Category Budget Manager.

### Category Submission Example

Laboratory creates an IT budget:

```text
Laboratory IT Budget

Laptop
Quantity: 5
Distribution Method: Annual

Printer
Quantity: 2
Distribution Method: Annual
```

When Laboratory submits the IT budget, it goes to the IT Category Budget Manager.

```text
Laboratory IT Budget
-> IT Category Budget Manager
```

The Biomedical and General budgets can remain separate.

```text
Laboratory

IT Budget: Submitted
Biomedical Budget: Draft
General Budget: Not Used
```

### What Happens After Submission

After submission:

- the Category Budget Manager can begin review
- the submitted category is no longer freely editable by the Department User
- returned items may become editable again if the Category Budget Manager returns them
- accepted items remain locked when returned budgets are sent back

Scenario:

```text
Laboratory submits IT Budget.
IT Category Budget Manager reviews it.
IT Category Budget Manager accepts Laptop but returns Printer.
Laboratory can edit Printer only.
Laboratory cannot edit Laptop because Laptop was already accepted.
```

## 6. Category Budget Manager Workflow

Category Budget Manager review starts immediately after a department submits that category.

There is no need to wait for all departments to submit.

Example:

```text
Laboratory submits IT Budget today.
Radiology submits IT Budget next week.

IT Category Budget Manager can review Laboratory today.
IT Category Budget Manager does not need to wait for Radiology.
```

### What Category Budget Managers Can Do

The Category Budget Manager can:

- review requests
- filter by department
- filter by item
- view consolidated quantities
- modify approved quantity
- add notes
- mark items as reviewed
- create sub-items
- enter pricing
- attach supporting documents
- submit to CFO

### Department Review Example

IT Category Budget Manager opens Laboratory IT Budget:

```text
Laboratory IT Budget

Laptop
Requested Quantity: 5
Approved Quantity: blank

Printer
Requested Quantity: 2
Approved Quantity: blank
```

IT Category Budget Manager reviews Laptop:

```text
Laptop
Requested Quantity: 5
Approved Quantity: 4
Note: One existing laptop can be reused.
Reviewed: Yes
```

Only the approved quantity continues to the next stage.

In this example:

```text
Requested Quantity: 5
Approved Quantity: 4
```

The budget continues with four laptops, not five.

### Consolidated Review Example

IT Category Budget Manager may also view the same item across departments:

```text
Laptop

Laboratory: 5
ER: 20
Radiology: 10

Total Requested: 35
```

This helps IT make a hospital-wide recommendation.

Example decision:

```text
The hospital requested 35 laptops.
IT approves 32 laptops after reviewing existing stock and replacement schedule.
```

### Sub-Item and Pricing Example

The department requested generic laptops.

IT Category Budget Manager creates sub-items:

```text
Parent Item: Laptop
Approved Quantity: 4

Sub Items:
- Dell Latitude, Quantity 3, Unit Cost 4,500
- Generic Laptop, Quantity 1, Unit Cost 4,000
```

The Category Budget Manager submits the prepared package to CFO after review is complete.

## 7. Review Checkbox

The review checkbox is a core business rule.

The checkbox means:

```text
This item has been reviewed and accepted at the current review stage.
```

The checkbox does not mean the full budget is finally approved by CFO.

It means the item is accepted enough to be locked if the budget is returned for other items.

### Basic Example

Department Budget:

```text
Laptop  [checked]
Printer [checked]
Monitor [unchecked]
Scanner [unchecked]
```

If the Category Budget Manager returns the budget:

Checked items:

- already reviewed
- accepted
- displayed as read-only
- Department User cannot modify them

Unchecked items:

- need changes
- remain editable
- Department User must modify them before resubmission

### What the Department User Sees

Returned budget:

```text
Item      Status     Editable
Laptop    Accepted   No
Printer   Accepted   No
Monitor   Returned   Yes
Scanner   Returned   Yes
```

The Department User can edit Monitor and Scanner only.

The Department User cannot edit Laptop or Printer.

### Example With 10 Items

Laboratory submits 10 IT items.

IT Category Budget Manager reviews them:

```text
Item 1  checked
Item 2  checked
Item 3  checked
Item 4  checked
Item 5  checked
Item 6  checked
Item 7  checked
Item 8  unchecked
Item 9  unchecked
Item 10 unchecked
```

IT Category Budget Manager returns the budget.

Result:

```text
7 items are locked.
3 items are editable.
```

The Department User does not redo all 10 items.

The Department User only fixes the 3 returned items.

### Why This Rule Exists

This rule prevents unnecessary rework.

Without this rule, a department might need to review and resubmit the entire budget because of a few problematic items.

With this rule:

```text
Accepted items stay accepted.
Problem items are corrected.
```

### Important Scenario

If Laptop is checked and Printer is unchecked:

```text
Laptop is accepted.
Printer needs modification.
```

When the budget is returned:

```text
Laptop cannot be changed by the department.
Printer can be changed by the department.
```

If the department wants to change Laptop later, it must use the approved change process if the budget has already moved forward.

## 8. Consolidated Review

Category Budget Managers have two different views:

- Department View
- Item View

Both are required because they answer different questions.

### Department View

Department View shows what one department requested.

Example:

```text
Laboratory

Laptop: 5
Printer: 3
```

This answers:

```text
What does Laboratory need?
```

### Item View

Item View shows the same item across departments.

Example:

```text
Laptop

Laboratory: 5
ER: 20
Radiology: 10

Total: 35
```

This answers:

```text
How many laptops does the hospital need overall?
```

### Why Both Views Are Necessary

Department View is needed because each department has its own operational needs.

Item View is needed because the Category Budget Manager must consolidate demand across the hospital.

Scenario:

```text
Laboratory requests 5 laptops.
ER requests 20 laptops.
Radiology requests 10 laptops.
```

If IT Category Budget Manager only reviews by department, the total hospital need may not be obvious.

With Item View:

```text
Laptop Total Requested: 35
```

IT can prepare a better technical recommendation and pricing estimate.

## 9. Approved Quantity

Each parent item has two important quantities:

- Requested Quantity
- Approved Quantity

Requested Quantity is what the department asked for.

Approved Quantity is what the Category Budget Manager recommends after review.

Example:

```text
Item: Laptop
Requested Quantity: 10
Approved Quantity: 8
```

Only the approved quantity continues to the next stage.

In this example, the budget continues with eight laptops.

The CFO reviews eight laptops, not ten.

### Why Approved Quantity May Be Lower

The approved quantity may be lower because:

- existing stock can be reused
- request is higher than actual need
- item will be shared between departments
- budget constraints require reduction
- replacement schedule does not justify the full quantity

Example:

```text
Department requested 10 laptops.
IT Category Budget Manager found 2 existing laptops can be reassigned.
Approved Quantity becomes 8.
```

### Approved Quantity May Be Higher Than Requested

The approved quantity may also be higher than the requested quantity.

This is allowed because the Category Budget Manager is the hospital-wide technical reviewer for that category. The Category Budget Manager may identify a broader operational need, standardization requirement, replacement need, or capacity requirement that the department did not know when entering the request.

Example:

```text
Department requested:
Laptop = 5

IT Category Budget Manager approves:
Laptop = 7
```

This is valid.

The reason must be documented in the item notes.

Example note:

```text
Approved quantity increased from 5 to 7 because two additional laptops are required for the new reception workflow and shared specimen collection station.
```

The CFO still performs final review before the category budget becomes approved.

The Department User does not approve the increase. The Department User only entered the original requested quantity.

### Approved Quantity and Sub Items

Sub-item quantities must match the approved quantity.

Example:

```text
Parent Item: Laptop
Approved Quantity: 8

Sub Items:
Dell Latitude: 6
Generic Laptop: 2

Total Sub Item Quantity: 8
```

This is valid because:

```text
6 + 2 = 8
```

Invalid example:

```text
Parent Item: Laptop
Approved Quantity: 8

Sub Items:
Dell Latitude: 6
Generic Laptop: 1

Total Sub Item Quantity: 7
```

This is not valid because:

```text
6 + 1 does not equal 8
```

## 10. Sub Item Concept

Department users request generic business needs.

Example:

```text
Laptop
```

The Department User does not select:

```text
Dell Latitude
HP EliteBook
Generic Laptop
```

The Category Budget Manager determines the actual technical specifications.

Example:

```text
Laptop
|
+-> Dell Latitude
+-> HP EliteBook
+-> Generic Laptop
```

### Why Sub Items Exist

Sub Items exist because departments usually request needs in simple business language.

Category Budget Managers translate those needs into practical specifications.

Example:

```text
Department request:
Laptop

IT Category Budget Manager specification:
Dell Latitude, 16GB RAM, business laptop
```

Sub Items allow the budget to show:

- what specification is recommended
- how many units of each specification are needed
- what each specification costs
- which documents support the recommendation

### Who Creates Sub Items

Only the relevant Category Budget Manager creates and manages sub-items.

Examples:

```text
IT Category Budget Manager creates sub-items for IT parent items.
Biomedical Category Budget Manager creates sub-items for Biomedical parent items.
General Category Budget Manager creates sub-items for General parent items.
```

Department users do not create sub-items.

CFO does not create sub-items.

### Who Can Edit Sub Items

The relevant Category Budget Manager can edit sub-items while the item is still in review or returned for modification.

After CFO approval, sub-items become part of the approval history.

If a change is needed after approval but before `PRE_CLOSING`, the affected item must go through the Change Request workflow.

### Sub Item Example

Department request:

```text
Laptop
Quantity: 50
```

IT Category Budget Manager review:

```text
Parent Item: Laptop
Approved Quantity: 50

Sub Items:
Dell Latitude: 30
HP EliteBook: 15
Generic Laptop: 5
```

The sub-items explain what the generic laptop request actually means.

## 11. Pricing

Pricing exists only at the Sub Item level.

Department users never enter prices.

Parent item amount is derived from sub-items.

Category budget total is derived from parent item totals.

### Pricing Flow

```text
Sub Item Quantity x Unit Cost
-> Sub Item Total
-> Parent Item Total
-> Category Budget Total
```

### Example

Parent Item:

```text
Laptop
Approved Quantity: 50
```

Sub Items:

```text
Dell Latitude
Quantity: 30
Unit Cost: 4,500
Total: 135,000

HP EliteBook
Quantity: 15
Unit Cost: 4,200
Total: 63,000

Generic Laptop
Quantity: 5
Unit Cost: 4,000
Total: 20,000
```

Parent Item Total:

```text
135,000 + 63,000 + 20,000 = 218,000
```

So:

```text
Laptop Parent Item Total = 218,000
```

### Category Budget Total Example

IT Budget:

```text
Laptop Total: 218,000
Printer Total: 18,000
Network Switch Total: 40,000
```

Category Budget Total:

```text
218,000 + 18,000 + 40,000 = 276,000
```

The Category Budget Total is not entered manually. It is calculated from the approved parent item totals.

## 12. Supporting Documents

Category Budget Managers may attach supporting documents.

Supporting documents help the CFO understand why the proposed amount is appropriate.

Examples of supporting documents:

- vendor quotation
- technical comparison
- market research
- business justification
- technical recommendation
- product specification sheet
- manufacturer documentation
- capacity or utilization study

Attachments may exist on both:

- Parent Items
- Sub Items

### Parent Item Attachment Example

Parent Item:

```text
Laptop
```

Possible parent item attachments:

```text
Laptop Consolidation Analysis.pdf
IT Technical Recommendation.pdf
Market Research.xlsx
```

These documents explain the overall recommendation for the parent item.

### Sub Item Attachment Example

Sub Item:

```text
Dell Latitude
```

Possible sub-item attachments:

```text
Dell Latitude Specification.pdf
Vendor Quotation.pdf
Laptop Comparison.xlsx
```

These documents explain the specific sub-item selection and price.

### Why Attachments Matter

Without attachments, the CFO may see:

```text
Laptop Total: 218,000
```

But may not understand why that amount is reasonable.

With attachments, the CFO can review:

```text
What specification was selected?
Why was it selected?
What market price supports it?
What vendor quotation supports it?
Was another option compared?
```

Attachments are optional in the current workflow, but they become part of the approval history once approved.

After approval, historical evidence should not be replaced. If a newer document is needed, it should be added as a new version.

## 13. CFO Workflow

The CFO reviews the category budget after the Category Budget Manager submits it.

The CFO sees a complete approval package.

For every Parent Item, the CFO can view:

- approved quantity
- total amount
- department breakdown
- sub-item breakdown
- notes
- supporting documents

### CFO Review Example

CFO opens:

```text
Department: Laboratory
Category: IT
Status: Submitted to CFO
```

CFO sees parent items:

```text
Item      Approved Quantity   Total Amount
Laptop    4                   18,000
Printer   2                   12,000
```

CFO opens Laptop:

```text
Parent Item: Laptop
Requested Quantity: 5
Approved Quantity: 4
Total Amount: 18,000
```

CFO sees department breakdown:

```text
Laboratory: 4
```

CFO sees sub-item breakdown:

```text
Dell Latitude
Quantity: 3
Unit Cost: 4,500
Total: 13,500

Generic Laptop
Quantity: 1
Unit Cost: 4,500
Total: 4,500
```

CFO sees notes:

```text
IT reduced the request from 5 to 4 because one existing laptop can be reused.
```

CFO sees supporting documents:

```text
Laptop Recommendation.pdf
Vendor Quotation.pdf
```

### CFO Return Process

If the CFO disagrees or needs clarification, the CFO returns the item or budget to Category Budget Manager.

The return path is:

```text
CFO
-> Category Budget Manager
-> Department User, if needed
-> Category Budget Manager
-> CFO
```

The CFO does not return directly to the Department User.

This is important because the Category Budget Manager must remain the technical review layer.

### CFO Return Scenario

CFO reviews Printer and writes:

```text
Please clarify whether these are shared network printers or desktop printers.
```

The budget returns to IT Category Budget Manager.

IT Category Budget Manager may answer directly if IT already knows the answer.

If department input is needed, IT Category Budget Manager returns the item to Laboratory.

Laboratory edits only the returned item.

After Laboratory resubmits, IT Category Budget Manager reviews again and sends it back to CFO.

## 14. Category Approval

IT, Biomedical, and General are approved independently.

One category may be approved while another category is still under review.

Example:

```text
Laboratory

IT Budget: Approved
Biomedical Budget: Under CFO Review
General Budget: Draft
```

This is allowed.

The IT Budget does not need to wait for the Biomedical Budget or General Budget.

Another example:

```text
Radiology

IT Budget: Approved
Biomedical Budget: Returned to Biomedical Category Budget Manager
General Budget: Not Used
```

The approved IT Budget remains approved.

The returned Biomedical Budget continues through its own workflow.

Category approval is the authoritative milestone for that category.

Item-level CFO review can happen before final category approval, but the category is not considered complete until all active items in that category are resolved.

## 15. Change Requests

Change Requests happen after approval but before `PRE_CLOSING`.

Department users cannot directly modify approved budgets.

Instead, they submit a Change Request.

Examples:

- add item
- increase quantity
- decrease quantity
- modify existing item

The request goes to:

- CFO
- relevant Category Budget Manager

The Category Budget Manager reviews the technical impact.

The CFO reviews the financial impact.

If accepted, only the affected items reopen.

The rest of the approved budget remains unchanged.

The CFO returns the approved category budget only for the affected item or items. The approved category budget does not fully restart.

The Category Budget Manager may handle the change directly if department input is not required.

If department input is required, the Category Budget Manager returns only the affected item or items to the Department User.

The normal review workflow then repeats for the affected items:

```text
Department User
-> Category Budget Manager
-> CFO
```

### Change Request Example

Laboratory IT Budget is approved.

Approved item:

```text
Laptop
Approved Quantity: 4
```

Later, before `PRE_CLOSING`, Laboratory needs one additional laptop.

Laboratory submits:

```text
Change Request
Item: Laptop
Request Type: Increase Quantity
Current Approved Quantity: 4
Requested New Quantity: 5
Reason: New staff member assigned to Laboratory reception.
```

The request goes to IT Category Budget Manager and CFO.

If accepted:

```text
Only Laptop reopens.
Printer remains approved and locked.
Other IT items remain unchanged.
```

IT Category Budget Manager updates the laptop recommendation.

CFO reviews the revised item.

If approved:

```text
Laptop Approved Quantity becomes 5.
```

### Change Request Reopen Rule

Accepted Change Requests do not reopen the entire category budget.

They reopen only the affected item or items.

Scenario:

```text
Approved IT Budget:
Laptop
Printer
Network Switch

Change Request:
Increase Laptop quantity
```

Result:

```text
Laptop reopens.
Printer stays approved.
Network Switch stays approved.
```

This prevents unnecessary rework.

## 16. PRE-CLOSING

`PRE_CLOSING` means the budgeting phase is complete.

When the Financial Year enters `PRE_CLOSING`:

- budget editing stops
- Department Users can no longer modify budgets
- normal Change Requests stop
- transfers become active
- PO Linking becomes active

### What Department Users Can No Longer Do

After `PRE_CLOSING`, Department Users cannot:

- add budget items
- modify approved budget items
- increase quantities
- decrease quantities
- submit normal Change Requests

### What Category Budget Managers Continue To Do

After `PRE_CLOSING`, Category Budget Managers continue with execution-related actions:

- transfers
- PO Linking support

Transfers are created by Category Budget Managers.

PO Linking targets approved sub-items.

### PRE-CLOSING Scenario

Before `PRE_CLOSING`:

```text
Laboratory can submit a Change Request for one additional laptop.
```

After `PRE_CLOSING`:

```text
Laboratory cannot submit a normal Change Request for one additional laptop.
```

There is no emergency budget modification workflow after `PRE_CLOSING` in Version 1.

All budget modifications must be completed before `PRE_CLOSING`.

If a department misses the modification window, the approved budget remains unchanged.

## 17. Transfers

Only Category Budget Managers can create transfers.

Department users do not create transfers after `PRE_CLOSING`.

Transfers occur only at the Parent Item level.

Sub Items are not transferred.

Transfer approval goes to CFO.

Cross-department transfers are not allowed.

Cross-category transfers are not allowed.

Categories are independent budget domains.

Allowed examples:

```text
IT -> IT
Biomedical -> Biomedical
General -> General
```

Not allowed examples:

```text
IT -> Biomedical
Biomedical -> General
General -> IT
```

### Transfer Example

IT Category Budget Manager creates a transfer:

```text
From Parent Item: Printer
To Parent Item: Laptop
Amount: 10,000
Reason: Printer requirement reduced. Laptop requirement needs support.
```

The transfer goes to CFO.

```text
IT Category Budget Manager
-> CFO
```

CFO approves or rejects the transfer.

### Sub Items Are Not Transferred

Example:

Parent Item:

```text
Laptop
```

Sub Items:

```text
Dell Latitude
HP EliteBook
Generic Laptop
```

The transfer is not:

```text
Dell Latitude -> HP EliteBook
```

The transfer is at the parent level:

```text
Printer -> Laptop
```

This keeps budget control at the parent item level.

## 18. PO Linking

PO Linking targets Sub Items.

This is because purchase order lines are specific.

A PO line usually refers to a specific item, model, supplier, or description.

The approved budget parent item may be generic.

Example:

```text
Parent Item:
Laptop

Sub Items:
Dell Latitude
HP EliteBook
Generic Laptop
```

PO Link should target:

```text
Dell Latitude
```

not:

```text
Laptop
```

### PO Linking Example

Approved Sub Item:

```text
Dell Latitude
Approved Quantity: 30
Unit Cost: 4,500
```

PO Line:

```text
Dell Latitude Laptop
Quantity: 10
Supplier: Example Supplier
```

PO Link:

```text
PO Line -> Dell Latitude Sub Item
```

This makes the link clear and auditable.

### Procurement Role

Procurement participates only in this phase for Version 1.

PO Link approval is permission-based.

The system must not hardcode PO Link approval to a specific role name.

Whoever has the PO Link Approval permission can approve or reject PO Links.

For Version 1, this permission will normally be assigned to the Finance Department role.

This design keeps the workflow flexible. In the future, the permission could be assigned to Procurement, Finance, a special PO approval team, or another approved role without changing the business workflow.

Example:

```text
User: Finance Reviewer
Permission: PO Link Approval

Allowed actions:
- approve PO Link
- reject PO Link
```

Another example:

```text
User: Procurement Officer
Permission: no PO Link Approval

Allowed actions:
- participate in PO Linking work if given related permissions

Not allowed:
- approve PO Link
- reject PO Link
```

## 19. Financial Year Closing

The CFO cannot close the Financial Year while pending execution activities exist.

The CFO cannot close the Financial Year if:

- pending Transfer Requests exist
- pending PO Linking Requests exist

The year can only be closed after all required activities are resolved or rejected.

### Closing Example

Financial Year status:

```text
PRE_CLOSING
```

Pending activities:

```text
Pending Transfers: 2
Pending PO Links: 1
```

CFO cannot close the year.

Required action:

```text
Approve or reject the 2 pending transfers.
Approve or reject the 1 pending PO link.
```

After all pending activities are resolved:

```text
Pending Transfers: 0
Pending PO Links: 0
```

CFO can close the year.

```text
Financial Year Status: CLOSED
```

## 20. Complete End-to-End Example

This example follows Laboratory Department through the full workflow.

### Step 1: Laboratory Creates IT Budget

Financial Year is open.

```text
Financial Year: 2027
Status: OPEN
```

Laboratory starts its IT Budget.

```text
Department: Laboratory
Category: IT
Status: Draft
```

### Step 2: Laboratory Requests 5 Laptops

Laboratory enters:

```text
Item: Laptop
Quantity: 5
Distribution Method: Annual
```

Laboratory does not enter:

```text
Unit Cost
Total Amount
Technical Specification
Vendor
Model
```

Laboratory is simply saying:

```text
We need 5 laptops.
```

### Step 3: Laboratory Submits IT Budget

Laboratory submits the IT Budget.

```text
Laboratory IT Budget
Status: Submitted
Next Role: IT Category Budget Manager
```

Flow:

```text
Laboratory
-> IT Category Budget Manager
```

### Step 4: IT Category Budget Manager Reviews

IT Category Budget Manager opens Laboratory IT Budget.

```text
Item: Laptop
Requested Quantity: 5
Approved Quantity: blank
Reviewed: No
```

IT Category Budget Manager reviews the request.

IT Category Budget Manager decides that only 4 laptops should be approved because one existing laptop can be reused.

```text
Item: Laptop
Requested Quantity: 5
Approved Quantity: 4
Note: One existing laptop can be reassigned.
Reviewed: Yes
```

Only 4 laptops continue to the next stage.

### Step 5: IT Category Budget Manager Creates Sub Items

The department requested generic laptops.

IT Category Budget Manager creates actual specifications.

```text
Parent Item: Laptop
Approved Quantity: 4

Sub Items:
Dell Latitude: 3
Generic Laptop: 1
```

The sub-item quantities match the approved quantity:

```text
3 + 1 = 4
```

### Step 6: IT Category Budget Manager Adds Pricing

IT Category Budget Manager enters pricing at the sub-item level.

```text
Dell Latitude
Quantity: 3
Unit Cost: 4,500
Total: 13,500

Generic Laptop
Quantity: 1
Unit Cost: 4,000
Total: 4,000
```

Parent Item Total:

```text
13,500 + 4,000 = 17,500
```

Laptop total becomes:

```text
17,500
```

Laboratory never entered this price.

### Step 7: IT Category Budget Manager Attaches Quotations

IT Category Budget Manager attaches supporting documents.

Parent item documents:

```text
Laptop Recommendation.pdf
Laptop Consolidation Analysis.xlsx
```

Sub-item documents:

```text
Dell Latitude Quotation.pdf
Dell Latitude Specification.pdf
Generic Laptop Quotation.pdf
```

These documents help CFO understand the recommendation.

### Step 8: IT Category Budget Manager Submits to CFO

IT Category Budget Manager submits the IT Budget package to CFO.

```text
Laboratory IT Budget
Status: Submitted to CFO
```

Flow:

```text
IT Category Budget Manager
-> CFO
```

### Step 9: CFO Reviews

CFO sees:

```text
Parent Item: Laptop
Requested Quantity: 5
Approved Quantity: 4
Total Amount: 17,500
```

CFO also sees:

```text
Department Breakdown:
Laboratory: 4

Sub Item Breakdown:
Dell Latitude: 3 x 4,500 = 13,500
Generic Laptop: 1 x 4,000 = 4,000

Notes:
One existing laptop can be reassigned.

Supporting Documents:
Laptop Recommendation.pdf
Dell Latitude Quotation.pdf
Generic Laptop Quotation.pdf
```

### Step 10: CFO Returns One Item

CFO has a question about another IT item, for example Printer.

```text
Laptop: Accepted
Printer: Returned
```

CFO returns the budget to IT Category Budget Manager.

```text
CFO
-> IT Category Budget Manager
```

CFO does not return directly to Laboratory.

### Step 11: IT Category Budget Manager Updates

IT Category Budget Manager reviews the CFO comment.

Example CFO comment:

```text
Please clarify whether this printer is shared or department-only.
```

IT Category Budget Manager may answer directly if IT has the information.

If Laboratory input is needed, IT Category Budget Manager returns only Printer to Laboratory.

```text
IT Category Budget Manager
-> Laboratory
```

### Step 12: Laboratory Edits Only the Unchecked Item

Laboratory sees:

```text
Item      Status     Editable
Laptop    Accepted   No
Printer   Returned   Yes
```

Laboratory cannot modify Laptop because it was already reviewed and accepted.

Laboratory can modify Printer because it was returned.

Laboratory updates Printer information and resubmits.

```text
Laboratory
-> IT Category Budget Manager
```

### Step 13: IT Category Budget Manager Reviews Again

IT Category Budget Manager reviews the updated Printer item.

If acceptable:

```text
Printer: Reviewed
```

IT Category Budget Manager resubmits the corrected package to CFO.

```text
IT Category Budget Manager
-> CFO
```

### Step 14: CFO Approves IT Budget

CFO reviews the corrected item.

If all active IT items are resolved:

```text
Laboratory IT Budget
Status: Approved
```

The IT Budget is approved independently.

Laboratory Biomedical or General budgets may still be draft, under review, returned, or not used.

### Step 15: Department Later Requests One Additional Laptop

Before `PRE_CLOSING`, Laboratory needs one additional laptop.

Laboratory cannot directly edit the approved IT Budget.

Laboratory submits a Change Request.

```text
Change Request
Item: Laptop
Request Type: Increase Quantity
Current Approved Quantity: 4
Requested New Quantity: 5
Reason: New staff member assigned.
```

The request goes to:

```text
IT Category Budget Manager
CFO
```

If accepted:

```text
Only Laptop reopens.
Printer remains approved and locked.
```

IT Category Budget Manager updates the laptop sub-items and pricing if needed.

CFO reviews the revised laptop item.

If approved:

```text
Laptop Approved Quantity: 5
```

### Step 16: PRE-CLOSING

When the budgeting phase is complete, CFO moves the Financial Year to `PRE_CLOSING`.

```text
Financial Year 2027
Status: PRE_CLOSING
```

At this stage:

- Department Users cannot modify budgets
- normal Change Requests stop
- transfers can begin
- PO Linking can begin

### Step 17: Transfer

After `PRE_CLOSING`, IT Category Budget Manager creates a transfer.

Example:

```text
From Parent Item: Printer
To Parent Item: Laptop
Amount: 5,000
Reason: Printer cost reduced; laptop budget needs support.
```

Transfer flow:

```text
IT Category Budget Manager
-> CFO
```

CFO approves or rejects the transfer.

Sub-items are not transferred.

The transfer is at the parent item level.

### Step 18: PO Linking

PO Linking targets sub-items.

Approved budget:

```text
Parent Item: Laptop
Sub Item: Dell Latitude
Approved Quantity: 3
```

PO line:

```text
Dell Latitude Laptop
Quantity: 2
```

PO Link:

```text
PO Line
-> Dell Latitude Sub Item
```

The PO is not linked to the generic parent item Laptop.

It is linked to the approved detailed specification.

Procurement may participate through PO Linking permissions.

### Step 19: Financial Year Closed

Before closing, CFO checks pending activities.

If there are pending transfers or pending PO links:

```text
Financial Year cannot be closed.
```

All pending activities must be approved, rejected, or otherwise resolved.

After pending activities are resolved:

```text
Pending Transfers: 0
Pending PO Links: 0
```

CFO closes the year.

```text
Financial Year 2027
Status: CLOSED
```

## 21. Confirmed Governance Rules

This section records final business decisions that must be treated as confirmed requirements.

### Official Category Role Names

The official hospital-wide category role family is:

```text
Category Budget Manager
```

The standard role names are:

```text
IT Category Budget Manager
Biomedical Category Budget Manager
General Category Budget Manager
```

These names distinguish hospital-wide category management responsibility from normal department management.

The system should treat these as workspace display names, not as three separate permission models.

The preferred access model is:

```text
Role Family: Category Budget Manager
Scope: Budget Category
```

Example:

```text
User: John
Assigned Role: Category Budget Manager
Assigned Scope: IT Category
Displayed Workspace / Acting As: IT Category Budget Manager
```

This means the user experience can still show clear names such as `IT Category Budget Manager`, but the security model should avoid duplicating the same permissions across three separate roles when the only difference is category scope.

The same pattern applies to department work:

```text
Assigned Role: Department User
Assigned Scope: IT Department
Displayed Workspace / Acting As: Department User for IT Department
```

Therefore, a user may have multiple contextual role assignments.

Example:

```text
User: John

Assignment 1:
Role: Department User
Scope: IT Department
Workspace: Department Budget - IT Department

Assignment 2:
Role: Category Budget Manager
Scope: IT Category
Workspace: IT Category Budget Management
```

This is required because one person may legitimately act in different business capacities.

The system must not merge these capacities into one combined role such as:

```text
IT Department Head + IT Category Budget Manager
```

Combined roles make permissions harder to manage, make audit history less clear, and do not scale when users hold more than one responsibility.

If one user later manages more than one category, the system should create multiple scoped assignments rather than creating a new combined role.

Example:

```text
User: Sara

Assignment 1:
Role: Category Budget Manager
Scope: Biomedical Category
Workspace: Biomedical Category Budget Management

Assignment 2:
Role: Category Budget Manager
Scope: General Category
Workspace: General Category Budget Management
```

The active workspace determines which category scope is currently being used.

Example:

```text
Head of IT Department
```

This person acts as a Department User for the IT Department's own budget.

Example:

```text
IT Category Budget Manager
```

This person reviews all IT requests from every department across the hospital.

The same person may hold both responsibilities, but the system must keep the responsibilities separate through Workspace Context Switching.

### Role-Based Delegation

Delegation is role-based.

There is no separate delegation workflow in Version 1.

If a Category Budget Manager is unavailable, an Administrator assigns the same role to another user.

Example:

```text
IT Category Budget Manager is unavailable.
Administrator assigns Category Budget Manager role with IT Category scope to another user.
The new user receives the IT Category Budget Management workspace.
```

### Permission-Based PO Link Approval

PO Link approval is permission-based.

The workflow must not hardcode approval to a specific role.

Whoever has the PO Link Approval permission can approve or reject PO Links.

For Version 1, this permission will normally be assigned to the Finance Department role.

Example:

```text
Finance Department Role
Permission: PO Link Approval

Allowed:
- approve PO Links
- reject PO Links
```

If the permission is later assigned to another role, the workflow remains the same.

### Cross-Category Transfers Are Not Allowed

Cross-category transfers are not allowed.

Allowed:

```text
IT -> IT
Biomedical -> Biomedical
General -> General
```

Not allowed:

```text
IT -> Biomedical
Biomedical -> General
General -> IT
```

Categories are independent budget domains.

### Approved Quantity May Exceed Requested Quantity

The Category Budget Manager may approve a quantity greater than the requested quantity.

Example:

```text
Department requested:
Laptop = 5

IT Category Budget Manager approves:
Laptop = 7
```

This is allowed because the Category Budget Manager is the technical expert and may determine that additional units are required based on operational analysis.

The reason must be documented in notes.

The CFO still performs final review and approval.

### No Budget Modifications After PRE-CLOSING

There is no emergency modification workflow after `PRE_CLOSING` in Version 1.

All normal budget modifications must happen before `PRE_CLOSING`.

After `PRE_CLOSING`:

- Department Users cannot submit normal Change Requests.
- Category Budget Managers cannot reopen approved budget items for normal budget editing.
- execution workflows continue through Transfers and PO Linking only.

### Change Requests Before PRE-CLOSING

If an approved category budget needs changes before `PRE_CLOSING`, the Department User submits a Change Request.

Examples:

- new item
- quantity increase
- quantity decrease
- item modification

The request goes to:

- CFO
- relevant Category Budget Manager

If accepted:

- the affected item reopens
- unaffected items remain approved and locked
- the normal review workflow repeats only for the affected item

Example:

```text
Approved IT Budget:
Laptop
Printer
Network Switch

Change Request:
Increase Laptop quantity

Result:
Laptop reopens.
Printer remains approved.
Network Switch remains approved.
```

### Review Checkbox Locking Rule

The review checkbox is a workflow control.

Checked items are accepted at the current review stage.

Unchecked items require modification.

When a budget is returned:

```text
Checked items become read-only.
Unchecked items remain editable.
```

Example:

```text
Laptop  checked
Printer checked
Monitor unchecked
Scanner unchecked
```

Returned result:

```text
Laptop  read-only
Printer read-only
Monitor editable
Scanner editable
```

### Supporting Documents

Supporting documents may be attached to:

- Parent Items
- Sub Items

Parent Item documents may include:

- business justification
- consolidation analysis
- technical recommendation
- market study

Sub Item documents may include:

- vendor quotation
- product specification sheet
- technical comparison
- manufacturer documentation

After CFO approval, supporting documents become part of the approval package and audit history.

Approved documents must not be silently replaced. If a newer document is needed, it should be added as a new version.

### Audit Context Requirement

Audit history must include the user's active workspace or acting context when the action was performed.

Example:

```text
User: John
Acting As: IT Category Budget Manager
Action: Submitted Laboratory IT Budget package to CFO
```

Different example:

```text
User: John
Acting As: Department User for IT Department
Action: Submitted IT Department budget request
```

The same person may perform both actions, but the business meaning is different.

The audit trail must make that difference visible.

### Single Source of Truth for Amounts

Department Users never enter prices.

The official source of budget amount is Sub Item pricing.

```text
Sub Item Quantity x Unit Cost
-> Sub Item Total
-> Parent Item Total
-> Category Budget Total
```

Parent Item totals and Category Budget totals are derived values.

They must not be manually entered by Department Users.
