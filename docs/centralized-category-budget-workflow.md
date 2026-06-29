# QNH Budget Management System
# Centralized Category-Based Budget Workflow Specification

## 1. Executive Summary

The QNH Budget Management System is being redesigned from a department-to-CFO approval model into a centralized category-based hospital budgeting model.

Current model:

```text
Department User
-> Budget Approver / CFO
-> Approval
-> Execution
```

New model:

```text
Department User
-> Category Responsible
-> CFO
-> Execution
```

The three fixed hospital-wide responsibility categories are:

- IT
- Biomedical
- General

Each department submits only the category budgets it needs. Empty categories are not required.

The redesign separates operational demand from technical specification and pricing:

- Department users define what they need and how many.
- Category Responsible users define specifications, sub-items, prices, recommendations, and supporting documents.
- CFO reviews the complete financial and technical approval package.
- Procurement participates later through PO Linking, not during budget creation in Version 1.

The workflow is intended to support:

- consolidated demand review across departments
- better technical validation
- improved pricing justification
- stronger CFO decision support
- sub-item-level procurement alignment
- clearer audit history
- controlled post-approval changes
- tighter financial year closing governance

This workflow applies to a new financial year only. Existing historical budgets are not migrated.

## 2. Roles & Responsibilities

### Department User

Department users represent department-level operational demand.

Responsibilities:

- Create budget requests for needed categories only.
- Select items from the item master.
- Enter requested quantity.
- Enter distribution method.
- Respond to returned items.
- Submit change requests before `PRE_CLOSING`.

Department users do not enter:

- technical specifications
- model numbers
- vendor names
- unit prices
- total amounts
- sub-items

### Category Responsible

There are three fixed Category Responsible roles:

- IT Responsible
- Biomedical Responsible
- General Responsible

Each Category Responsible user can only review budget requests within their assigned category.

Responsibilities:

- Review submitted department-category budgets immediately after submission.
- View requests by department.
- View consolidated item demand across departments.
- Approve or reduce requested quantities.
- Mark items as reviewed or needing modification.
- Add item notes.
- Return items to department users when clarification or modification is needed.
- Create and manage sub-items.
- Enter sub-item quantities and unit costs.
- Attach supporting documents at parent item and sub-item level.
- Submit reviewed category budget packages to CFO.
- Review CFO-returned items.
- Create transfers after `PRE_CLOSING`.

### CFO

The CFO is the final budget approval authority.

Responsibilities:

- Review category budget packages.
- Review parent items, approved quantities, totals, department breakdowns, sub-items, pricing, notes, documents, and history.
- Approve category budget packages.
- Partially approve reviewed items where appropriate.
- Return problematic items to Category Responsible.
- Move financial year to `PRE_CLOSING`.
- Resolve remaining change requests during `PRE_CLOSING`.
- Close financial year when all closure conditions are satisfied.

The CFO cannot directly edit:

- quantities
- sub-items
- pricing
- specifications
- department request data

If changes are needed, the CFO returns the item or package to Category Responsible.

### Administrator

Administrators govern master data and access.

Responsibilities:

- Maintain item master.
- Assign each item to one of the fixed responsibility categories.
- Reassign incorrectly classified items for future financial years.
- Manage user access and category responsibility permissions.
- Manage delegation rules where approved.

Category Responsible users cannot directly change item ownership category.

### Procurement

For Version 1, Procurement participates through PO Linking approval permissions.

Procurement does not participate in:

- department budget creation
- category review
- CFO budget approval

Recommended future role:

- validate vendor quotations
- validate sourcing compliance
- review commercial terms
- support high-value procurement decisions

## 3. Major Entities

### Financial Year

Represents the annual budgeting cycle.

Primary lifecycle:

```text
OPEN
-> PRE_CLOSING
-> CLOSED
```

### Department Budget

Represents a department's annual budget container for a financial year.

Recommended business model:

```text
Department Budget
  -> Category Budget Sections
      -> Parent Items
          -> Sub Items
```

This preserves department-level reporting while allowing independent category workflows.

### Category Budget Section

Represents one department's submitted budget section for one fixed category.

Example:

```text
Laboratory Department
  -> IT Category Budget
  -> Biomedical Category Budget
```

A department does not need to submit unused categories.

### Parent Item

Represents the department-facing demand item.

Example:

```text
Laptop
Requested Quantity: 50
Approved Quantity: 40
```

Parent items are selected from the item master.

The parent item category is determined by the item master.

### Sub Item

Represents the detailed specification and pricing defined by Category Responsible.

Example:

```text
Parent Item: Laptop

Sub Items:
- Dell Latitude, Qty 25, Unit Cost 4,500
- HP EliteBook, Qty 10, Unit Cost 4,200
- Generic Laptop, Qty 5, Unit Cost 4,000
```

Rules:

```text
Sum of Sub Item Quantities = Parent Approved Quantity
Parent Item Total = Sum of Sub Item Totals
Sub Item Total = Sub Item Quantity x Unit Cost
```

Sub-items are visible to Category Responsible and CFO.

Department users do not see or manage sub-items.

### Supporting Document

Documents may be attached at two levels.

Parent item attachments:

- business justification
- consolidation analysis
- market study
- technical recommendation

Sub-item attachments:

- vendor quotation
- product specification sheet
- technical comparison
- manufacturer documentation

Attachments are optional in Version 1.

After CFO approval, attachments become part of the immutable approval history. New versions must be uploaded rather than replacing historical evidence.

### Change Request

A controlled request to modify an approved or in-review category item before `PRE_CLOSING`.

Supported examples:

- add item
- increase quantity
- decrease quantity
- modify existing item

Accepted change requests reopen only affected items, not the whole category budget.

### Transfer

A post-`PRE_CLOSING` budget movement request.

Version 1 rules:

- created only by Category Responsible users
- approved or rejected by CFO
- cross-department transfers are not allowed
- transfers operate at parent item level
- transfers do not operate at sub-item level

### PO Link

A request to link a purchase order line to an approved budget sub-item.

PO linking targets sub-items, not generic parent items.

Example:

```text
PO Line -> Dell Latitude
not
PO Line -> Laptop
```

## 4. Budget Lifecycle

### High-Level Lifecycle

```text
Financial Year OPEN
    |
    v
Department creates category budget section
    |
    v
Department submits category budget section
    |
    v
Category Responsible reviews
    |
    v
Category Responsible submits to CFO
    |
    v
CFO reviews
    |
    v
CFO approves category budget
    |
    v
Financial Year PRE_CLOSING
    |
    v
Transfers and PO Linking
    |
    v
Financial Year CLOSED
```

### Department Budget Entry

Department users submit only required categories.

Example:

```text
Laboratory Department

IT: Submitted
Biomedical: Submitted
General: Not Used
```

Department user fields:

- item
- requested quantity
- distribution method

Department users do not enter price.

### Category Determination

Item category is controlled by item master.

Examples:

```text
Laptop -> IT
Patient Monitor -> Biomedical
Office Chair -> General
```

Users do not manually classify items into IT, Biomedical, or General.

If classification is incorrect, Administrator updates item master for future financial years.

Historical budgets are not changed by later item master category changes.

## 5. Category Review Lifecycle

Category Responsible review starts immediately after a department-category submission.

There is no requirement to wait for all departments to submit.

### Category Responsible Views

Category Responsible users need two primary views.

Department View:

```text
Laboratory
- Laptop: 10
- Printer: 3

Radiology
- Laptop: 15
```

Consolidated Item View:

```text
Laptop
Total Requested: 50

Breakdown:
- Laboratory: 10
- Radiology: 15
- ER: 25
```

### Review Actions

For each parent item, Category Responsible can:

- review item
- approve quantity
- reduce quantity
- mark item accepted
- mark item needing modification
- add notes
- create sub-items
- enter sub-item quantity
- enter sub-item unit cost
- attach supporting documents
- return item to department if needed

### Checked / Unchecked Logic

Checked means:

```text
Reviewed and accepted at the current review stage
```

Unchecked means:

```text
Needs modification or further review
```

If a category budget is returned:

- checked items become read-only for Department User
- unchecked items remain editable
- checked items remain visible but locked

This reduces rework and protects accepted items.

### Sub Item Reconciliation

Before Category Responsible can submit to CFO:

```text
Sum of Sub Item Quantities must equal Parent Approved Quantity
```

Example:

```text
Parent Item: Laptop
Approved Quantity: 40

Sub Items:
- Dell: 25
- HP: 10
- Generic: 5

Total Sub Item Quantity: 40
Valid
```

Invalid example:

```text
Parent Approved Quantity: 40
Sub Item Quantity Total: 38

Invalid
```

## 6. CFO Review Lifecycle

### CFO Review Package

CFO must review from a single workflow:

- department
- category
- parent items
- requested quantities
- approved quantities
- parent item totals
- department breakdown
- sub-item breakdown
- sub-item pricing
- parent item attachments
- sub-item attachments
- notes
- review history
- change history

### CFO Actions

CFO can:

- approve reviewed items
- mark items needing modification
- return items to Category Responsible
- approve final category budget when ready

CFO cannot:

- directly edit quantities
- directly edit prices
- directly edit sub-items
- return directly to Department User

Return path must remain:

```text
CFO
-> Category Responsible
-> Department User, if needed
```

### CFO Partial Approval Recommendation

Recommended enterprise-grade approach:

CFO should be allowed to approve individual items within a category, but the category budget should not become final until all items reach a terminal state.

Terminal item states:

- CFO approved
- removed / cancelled
- rejected by approved governance process

The category budget reaches final approval only when:

```text
All active parent items in the category are CFO approved
```

or

```text
Problematic items are formally removed/cancelled and remaining active items are CFO approved
```

This approach balances:

- efficiency: CFO does not repeatedly review accepted items
- auditability: item-level decisions are recorded
- governance: category budget final approval remains a clear milestone
- usability: returned items do not force rework on all items

Recommended status behavior:

```text
CFO Approved Item
- locked from further normal editing
- not final for execution until category final approval

CFO Returned Item
- returned to Category Responsible
- may be returned to Department User if department input is required

Category Final Approval
- occurs only when all active items are resolved
- becomes authoritative approval milestone
```

## 7. Change Request Lifecycle

Change requests are allowed before `PRE_CLOSING`.

Departments cannot directly modify approved budget items.

They submit a change request for:

- new item
- quantity increase
- quantity decrease
- item modification

### Recommended Flow

```text
Department User submits Change Request
    |
    v
Category Responsible reviews technical/category impact
    |
    v
CFO reviews financial impact
    |
    v
If accepted, affected item is reopened
    |
    v
Department / Category Responsible modifies affected item
    |
    v
Category Responsible resubmits to CFO
    |
    v
CFO approves
```

### Reopen Scope

Only affected items reopen.

The whole category budget does not reopen.

Unaffected approved items remain unchanged and locked.

### PRE_CLOSING Behavior

Pending change requests do not permanently block `PRE_CLOSING`.

During transition to `PRE_CLOSING`, CFO must be able to:

- approve remaining change requests
- reject remaining change requests
- close remaining change requests

Once in `PRE_CLOSING`:

- no new normal change requests are accepted
- budget editing is locked
- ordinary budget modification workflow ends

### Recommended Controlled Exception

A future emergency amendment process may be useful after `PRE_CLOSING`, but it should be separate from normal change requests.

Recommended only for exceptional cases:

- urgent regulatory requirement
- critical patient safety need
- executive-approved operational emergency

Such exceptions should require:

- CFO approval
- Category Responsible review
- strong audit trail
- explicit emergency reason
- optional executive approval threshold

## 8. Transfer Lifecycle

Transfers occur after financial year reaches `PRE_CLOSING`.

### Transfer Rules

Confirmed Version 1 rules:

- Department users cannot create transfers.
- Only Category Responsible users can create transfers.
- CFO approves or rejects transfers.
- Cross-department transfers are not allowed.
- Transfers operate at parent item level.
- Transfers do not operate at sub-item level.

### Transfer Flow

```text
Category Responsible creates Transfer Request
    |
    v
CFO reviews
    |
    v
CFO approves or rejects
```

### Cross-Category Transfer Recommendation

Recommended rule:

- Same-category transfers: allowed with CFO approval.
- Cross-department transfers: prohibited.
- Cross-category transfers: restricted by default.
- Cross-category transfers should require special approval if introduced.

Recommended special approval path:

```text
Source Category Responsible
-> Target Category Responsible
-> CFO
```

Reason:

Cross-category transfers can distort responsibility budgets and weaken category accountability. They may be valid in exceptional cases, but should not be normal workflow.

### Transfer Valuation Risk

Because transfers operate at parent item level while pricing exists at sub-item level, the system must define parent-level transfer value.

Recommended approach:

- Parent item available amount is derived from total approved sub-item amount.
- Transfers reduce parent-level available amount.
- Quantity-based transfer should be carefully controlled because parent items may contain multiple sub-item prices.
- Amount-based transfer is safer for parent-level budget control.

## 9. PO Linking Lifecycle

PO linking occurs after `PRE_CLOSING`.

Procurement participation in Version 1 begins through PO Linking approval permissions.

### PO Link Target

PO links must target sub-items.

Example:

```text
Parent Item:
Laptop

Sub Items:
- Dell Latitude
- HP EliteBook

PO Link Target:
Dell Latitude
```

This improves procurement traceability because PO lines are specification-specific.

### PO Link Flow

```text
Requester selects approved Sub Item
    |
    v
Requester selects PO line
    |
    v
Requester submits PO Link request
    |
    v
PO Link approver reviews
    |
    v
Approve or reject
```

### PO Link Review Should Show

- PO line details
- supplier
- item code
- item description
- requested PO quantity
- approved sub-item quantity
- remaining sub-item quantity
- linked amount
- parent item context
- department
- category
- financial year
- prior PO links
- supporting documents where relevant

### Procurement Future Value

Future Procurement involvement would add value for:

- high-value quotations
- vendor compliance
- sourcing policy compliance
- duplicate vendor comparison
- contract pricing validation
- commercial term validation
- framework agreement alignment

Recommended future enhancement:

```text
Category Responsible validates technical match
Procurement validates sourcing/commercial compliance
CFO oversees financial control where required
```

## 10. Financial Year Lifecycle

### OPEN

During `OPEN`:

- departments submit category budgets
- Category Responsible users review
- CFO approves category budgets
- change requests are allowed before `PRE_CLOSING`

### PRE_CLOSING

CFO moves financial year to `PRE_CLOSING` when budgeting phase is complete.

Before or during transition, CFO must resolve remaining change requests by:

- approving
- rejecting
- closing

Once in `PRE_CLOSING`:

- normal budget editing is locked
- new normal change requests are not allowed
- transfers are enabled
- PO linking is enabled

### CLOSED

CFO cannot close the financial year if unresolved operational activities remain.

Closing is blocked by:

- pending transfers
- pending PO links

Recommended additional closure checks:

- no unresolved category budget sections
- no unresolved CFO-returned items
- no pending emergency amendments, if introduced
- no pending PO link approvals
- no pending transfer approvals

## 11. Approval Rules

### Department Submission Rules

A department may submit only categories where it has requested items.

Submission requires:

- at least one active parent item
- valid item master category assignment
- positive requested quantity
- valid distribution method

### Category Review Rules

Category Responsible can submit to CFO only when:

- all active parent items have been reviewed
- approved quantity is defined
- approved quantity is not negative
- required notes are provided for reductions or returns
- sub-items exist where pricing is required
- sum of sub-item quantities equals parent approved quantity
- sub-item unit costs are valid
- parent totals can be derived from sub-items

### CFO Approval Rules

CFO can approve item-level decisions.

Final category approval requires:

- all active items are CFO approved
- or unresolved items are formally removed/cancelled through controlled process
- all derived totals are valid
- approval package history is complete
- supporting documents are locked into approval history

### Return Rules

Category Responsible may return items to Department User.

CFO may return items only to Category Responsible.

CFO cannot bypass Category Responsible.

### Finalization Rule

Item-level CFO approval does not make the item executable by itself.

The authoritative milestone is final category budget approval.

## 12. Validation Rules

### Quantity Validation

- Requested quantity must be positive.
- Approved quantity must be zero or positive, depending on whether zero approval is allowed.
- Approved quantity should not exceed requested quantity unless explicitly allowed by business rule.
- Sub-item quantity total must equal parent approved quantity.

### Pricing Validation

- Unit cost exists only at sub-item level.
- Unit cost must be positive when sub-item quantity is greater than zero.
- Sub-item total is calculated.
- Parent item total is derived.
- Manual parent total entry is not allowed.

### Attachment Validation

Recommended:

- file type whitelist
- file size limit
- uploader tracking
- upload timestamp
- parent item or sub-item association
- version tracking
- immutable after CFO approval
- no replacement of approved evidence

### Category Validation

- Item category comes from item master.
- Department users cannot manually assign major category.
- Category Responsible cannot reassign item category.
- Admin category reassignment affects future financial years only.

### Change Request Validation

- allowed only before `PRE_CLOSING`
- must identify affected item
- must identify request type
- must include reason
- accepted change request reopens only affected item
- unaffected approved items remain locked

### Transfer Validation

- allowed only in `PRE_CLOSING`
- requester must be Category Responsible
- same department only
- parent item level only
- cross-category transfers restricted by default
- sufficient available amount required
- CFO approval required

### PO Link Validation

- allowed only in `PRE_CLOSING`
- target must be approved sub-item
- requested PO quantity must be positive
- requested PO quantity must not exceed available PO quantity
- requested PO quantity must not exceed available approved sub-item quantity
- duplicate pending PO link should be blocked

## 13. Reporting Requirements

The redesigned workflow requires reporting across multiple dimensions.

### Department Reports

Must show:

- department budget by category
- submitted categories
- unused categories
- requested quantity
- approved quantity
- approved amount
- returned items
- change request history

### Category Reports

Must show:

- all requests within category
- department breakdown
- consolidated item demand
- approved quantities
- sub-item breakdown
- category total
- pending review items
- returned items
- CFO approval status

### CFO Reports

Must show:

- financial year approval readiness
- categories pending CFO review
- categories partially reviewed
- categories fully approved
- high-value items
- items without supporting documents
- change requests pending CFO action
- total approved budget by department/category

### Procurement / PO Reports

Must show:

- PO links by sub-item
- PO utilization by parent item
- PO utilization by department
- PO utilization by category
- remaining quantity
- remaining amount
- linked PO history

### Audit Reports

Must show:

- who submitted
- who reviewed
- who returned
- who approved
- what changed
- when it changed
- previous and new quantities
- previous and new pricing
- attachment versions
- approval package snapshots

## 14. Notifications

Notifications should support the new workflow stages.

Recommended notification events:

- Category budget submitted by department
- Item returned to department
- Department resubmitted returned item
- Category budget submitted to CFO
- CFO approved item
- CFO returned item to Category Responsible
- Category budget fully approved
- Change request submitted
- Change request accepted
- Change request rejected
- Change request closed during pre-closing
- Financial year moved to `PRE_CLOSING`
- Transfer submitted
- Transfer approved
- Transfer rejected
- PO link submitted
- PO link approved
- PO link rejected
- Financial year closed

Notification recipients should respect category scope.

Example:

```text
IT budget submitted
-> IT Responsible only

Biomedical budget submitted
-> Biomedical Responsible only
```

## 15. Audit Requirements

Audit logging is critical because the redesign introduces multiple review layers, partial approvals, sub-item pricing, documents, and change requests.

Audit must capture:

- department submission
- category review actions
- item checked/unchecked status changes
- requested quantity changes
- approved quantity changes
- sub-item creation
- sub-item update
- sub-item deletion
- pricing changes
- attachment upload
- attachment versioning
- category submission to CFO
- CFO item approval
- CFO return
- final category approval
- change request lifecycle
- transfer lifecycle
- PO link lifecycle
- financial year status changes

Approved packages should preserve a historical snapshot of:

- parent item
- requested quantity
- approved quantity
- sub-items
- unit costs
- totals
- notes
- attachments
- approvers
- timestamps

This prevents later edits from changing the meaning of historical approvals.

## 16. Open Questions / Recommendations

### Open Question 1: Can Approved Quantity Exceed Requested Quantity?

Default recommendation:

```text
No, unless explicitly allowed through a documented justification.
```

A category responsible may identify a higher need than requested, but that should probably require a change request or special justification.

### Open Question 2: Can Approved Quantity Be Zero?

Recommendation:

```text
Yes, but treat it as item rejection / no approval.
```

A zero-approved item should require a reason and should not require sub-items.

### Open Question 3: Should Final Category Approval Allow Removed Items?

Recommendation:

```text
Yes.
```

A category can be finalized if unresolved items are formally removed, cancelled, or rejected with audit reason.

### Open Question 4: Should Parent Item Attachments Be Mandatory Above Thresholds?

Version 1 says optional.

Future recommendation:

```text
Require supporting documents above configurable amount thresholds.
```

Example future thresholds:

- any item above 50,000 SAR
- all Biomedical CAPEX items
- all software licenses above annual threshold
- all sole-source vendor recommendations

### Open Question 5: Should Procurement Be Added Before CFO Approval?

Version 1 excludes Procurement from budget creation.

Future recommendation:

Procurement should eventually participate before CFO approval for selected high-value or vendor-backed items.

Suggested future model:

```text
Department Demand
-> Category Technical Review
-> Procurement Commercial Review, if threshold applies
-> CFO Approval
```

### Open Question 6: Delegation Model

Recommended enterprise-grade model:

- each category has primary responsible user
- each category can have delegates
- delegation may be permanent or date-bound
- delegate actions are audited under the delegate user
- audit should indicate delegated category authority
- emergency delegation can be activated by Admin or CFO
- delegation scope is category-specific, not global

Example:

```text
User A acts as IT Responsible Delegate
from 2026-01-01 to 2026-01-15
```

### Open Question 7: Cross-Category Transfers

Recommendation:

```text
Restrict by default.
Allow only through special approval if business requires it.
```

Special approval should require:

- source Category Responsible
- target Category Responsible
- CFO approval
- reason
- audit trail

### Open Question 8: Parent-Level Transfers With Sub-Item Pricing

Since transfers operate at parent item level but pricing exists at sub-item level, the system needs a clear valuation method.

Recommendation:

- amount-based parent transfers are safest
- quantity-based parent transfers should either be avoided or require a defined weighted-average calculation
- PO linking should remain sub-item-level for procurement accuracy

## Final Recommendation

The proposed workflow is viable and stronger than the current workflow for hospital budgeting because it separates department demand from technical specification and CFO financial approval.

The most important design principle is to avoid creating three completely separate top-level department budgets. The better long-term model is:

```text
One Department Budget per Financial Year
-> Multiple Category Budget Sections
-> Parent Items
-> Sub Items
```

This preserves department-level accountability while enabling independent IT, Biomedical, and General review workflows.

The system should treat final category approval as the authoritative milestone, while allowing item-level CFO review to reduce rework and improve approval efficiency.
