# QNH Budget Management System

## Executive Overview

The QNH Budget Management System creates one controlled process connecting:

```text
Financial Year
→ Department Planning
→ Budget Submission
→ Approval or Return
→ Transfers and PO Linking
→ Consumption Tracking
→ Analytics and Reporting
→ Financial Year Closing
```

- **Business purpose:** replace fragmented budget preparation, review, procurement tracking, and audit evidence with one governed workflow.
- **Main financial controls:** financial year status, budget approval, return feedback, transfer approval, PO link approval, permissions, and audit logs.
- **Primary users:** Department Heads, Approvers / CFO, Finance, PO Approval Team, Budget Administrators, and System Administrators.
- **Executive value:** clearer budget status, stronger approval discipline, procurement-to-budget visibility, and better evidence for price decisions.
- **Demonstration focus:** how a department budget moves from planning to approval, then into controlled transfers, PO consumption, analytics, and audit visibility.

---

# 1. Why the System Exists

Hospital budgeting requires more than entering numbers. Finance leadership needs a controlled process showing who requested what, who approved it, how spending consumes the approved budget, and whether requested prices are reasonable.

| Before                        | With the QNH Budget System              |
| ----------------------------- | --------------------------------------- |
| Manual and fragmented         | One controlled workflow                 |
| Limited approval visibility   | Clear statuses and action queues        |
| Informal return feedback      | Documented general and item-level notes |
| Uncontrolled balance movement | Approved transfer workflow              |
| PO activity disconnected      | PO activity linked to approved budget   |
| Manual price investigation    | Historical price benchmarks             |
| Scattered evidence            | Central audit trail                     |

The system reduces dependency on spreadsheets, email follow-up, and personal knowledge. It gives Finance a consistent way to govern planning, approvals, procurement linkage, and year-end closure.

---

# 2. Who Uses the System

The system has four main user roles. Each role has a clear responsibility within the budget lifecycle.

| Role                       | Main Responsibility                                    | Main Actions and Decisions                                                      |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| HOD                        | Prepare and manage the department budget               | Decide what the department needs, submit the budget, and correct returned items |
| Approver / CFO             | Control financial years and approve department budgets | Open and close financial years, approve budgets, or return them for correction  |
| Finance / PO Approval Team | Control PO linking and budget consumption              | Approve valid PO links and monitor consumed and remaining balances              |
| Administrator              | Manage system setup and user access                    | Manage users, permissions, budget items, categories, and PO mappings            |

## Department Head — HOD

The HOD prepares and manages the department budget.

### Main activities

- Create and edit budget items.
- Enter the quantity and unit price.
- Select the item distribution method.
- Save the budget as a draft.
- Copy items from an approved historical budget.
- Import multiple budget items from Excel.
- Request a new item type when the required item does not exist.
- Mark important budget items as project items.
- Submit the completed budget for approval.
- Review general and item-level return notes.
- Correct and resubmit returned budgets.
- Request budget transfers where permitted.
- Monitor the department budget status, consumption, and remaining balance.

### Main responsibility

The HOD decides **what the department needs** and provides the required budget information.

---

## Approver / CFO

The Approver or CFO controls the financial-year lifecycle and reviews submitted department budgets.

### Financial-year activities

- Create a new financial year.
- Open the financial year for department budget preparation.
- Monitor the progress of department budget submissions and approvals.
- Move the financial year from **OPEN** to **PRE-CLOSING** after all department budgets are approved.
- Confirm that pending transfers, PO links, and required activities are resolved.
- Move the financial year from **PRE-CLOSING** to **CLOSED** when all closing conditions are complete.

### Budget-approval activities

- Review department budget totals.
- Review individual budget items.
- Review quantities, unit prices, and total amounts.
- Clearly distinguish the unit price from the total item amount.
- Review item distribution across the year.
- Review project-item classifications.
- Use Price Intelligence to compare requested prices with historical purchasing data.
- Review benchmark variance and potential overspend.
- Use dashboards and analytics to compare departments and identify risks.
- Approve acceptable budgets.
- Return budgets that require correction, clarification, or justification.
- Add general feedback or notes for specific items.

### Main responsibility

The Approver or CFO decides:

- **Whether a submitted department budget is acceptable.**
- **When all department budgets have completed the approval process.**
- **When the financial year should move to PRE-CLOSING.**
- **When the financial year is ready to be CLOSED.**

---

## Finance Department / PO Approval Team

Finance and the PO Approval Team control how approved purchase orders consume approved budgets.

### Main activities

- Review submitted PO link requests.
- Confirm that the PO is linked to the correct approved budget item.
- Check the requested PO quantity.
- Check the remaining available PO quantity.
- Check the available quantity and balance of the budget item.
- Approve valid PO links.
- Reject invalid PO links and provide a reason.
- Monitor approved, consumed, transferred, and remaining budget amounts.
- Review transfer activity where assigned.
- Resolve pending PO links and financial activities during PRE-CLOSING.
- Support the CFO in confirming financial-year closure readiness.
- Use dashboards, analytics, and reports for financial monitoring.

### Main responsibility

Finance decides **whether a PO link is valid and should consume the selected approved budget item**.

Finance supports the closing process, but the decision to move the financial year between **OPEN**, **PRE-CLOSING**, and **CLOSED** belongs to the Approver / CFO.

---

## Administrator

The Administrator manages the system setup and user access required for the budget process.

### Main activities

- Manage users and department access.
- Assign roles and permissions.
- Control who can view, edit, submit, approve, or administer each area.
- Manage budget categories.
- Manage budget item types.
- Review and approve or reject new budget-item requests.
- Maintain mappings between budget item types and PO item codes.
- Activate or deactivate categories, item types, and mappings where permitted.
- Review audit and access information where authorized.
- Maintain configuration required for budget entry, approval, PO linking, analytics, and reporting.
- Support users with access or configuration issues.

### Main responsibility

The Administrator decides:

- **Which users can access the system.**
- **Which roles and permissions each user receives.**
- **Which budget categories and item types are available.**
- **Which PO Item Mappings are active.**

# 3. End-to-End System Lifecycle

```text
1. Financial Year Opened
        ↓
2. Department Budgets Become Available
        ↓
3. HOD Creates, Copies, or Imports Budget Items
        ↓
4. HOD Reviews and Submits the Department Budget
        ↓
5. CFO / Budget Approver Reviews the Submitted Budget
        ↓
6. Budget Is Approved or Returned for Correction
        ↓
7. Returned Budget Is Corrected, Resubmitted, and Reviewed Again
        ↓
8. All Department Budgets Are Approved
        ↓
9. Financial Year Moves to PRE-CLOSING
        ↓
10. Approved Budgets Can Receive Transfer Requests and PO Link Requests
        ↓
11. Transfers and PO Links Are Reviewed and Approved or Rejected
        ↓
12. Approved Transfers Update Budget Item Balances
        ↓
13. Approved PO Links Update Budget Consumption and Remaining Balances
        ↓
14. Dashboards, Analytics, Reports, Emails, and Audit Logs Monitor Activity
        ↓
15. All Pending Transfers, PO Links, and Required Activities Are Resolved
        ↓
16. Financial Year Is CLOSED and Preserved for Historical Reporting
```

Example:

Radiology opens its current budget, adds ultrasound equipment and related items, imports other planned items from Excel, and submits the budget. The CFO reviews the item prices and Price Intelligence indicators. If a price needs explanation, the budget is returned with notes. After correction and approval, future PO links consume the approved budget, and Finance can monitor remaining balance and closure readiness.

---

# 4. Financial Year Lifecycle

| Status      | Main Purpose                 | What Happens                                 |
| ----------- | ---------------------------- | -------------------------------------------- |
| OPEN        | Active planning and approval | Budgets are created, submitted, and reviewed |
| PRE-CLOSING | Resolve remaining activity   | Pending transfers and PO links are addressed |
| CLOSED      | Preserve final history       | New active changes are restricted            |

Why this matters to the CFO:

- Creates a clear annual control period.
- Prevents uncontrolled activity after closure.
- Requires unresolved transfer and PO-link activity to be addressed.
- Supports historical reporting and audit.

---

# 5. Department Budget Preparation

Normal HOD workflow:

```text
Open Current Budget
→ Add or Reuse Items
→ Enter Quantity and Unit Price
→ Select Distribution
→ Save Draft
→ Review Total
→ Submit
```

## Manual Budget Entry

Each budget item includes the main financial planning details:

| Field               | Meaning                                               |
| ------------------- | ----------------------------------------------------- |
| Category            | Budget grouping.                                      |
| Item type           | Specific requested item or service.                   |
| Quantity            | Number of units requested.                            |
| Unit price          | Expected cost per unit.                               |
| Total amount        | Quantity multiplied by unit price.                    |
| Distribution method | How quantity is planned during the year.              |
| Project item        | Marks the item for elevated visibility and reporting. |

## Distribution Methods

| Method    | Meaning                                         |
| --------- | ----------------------------------------------- |
| Annual    | One annual quantity.                            |
| Monthly   | Quantity distributed across months.             |
| Quarterly | Quantity distributed across quarters.           |
| Custom    | User-defined monthly or quarterly distribution. |

Control:

```text
Total distributed quantity must equal the requested item quantity.
```

## Copy Budget From History

Users can copy items from an approved historical budget and adjust them for the new financial year.

Business value:

- Faster annual planning.
- Less repetitive entry.
- Reuse of previously approved items.

## Excel Import

```text
Download Template
→ Complete Excel File
→ Import
→ Review Valid Rows and Errors
→ Correct if Needed
```

Business value:

- Faster entry for large budgets.
- Standardized template.
- Clear error feedback.

## Budget Item Requests

```text
Required Item Does Not Exist
→ HOD Submits Item Request
→ Administrator Reviews
→ Approves or Rejects
→ Approved Item Becomes Available
```

This allows departments to request new item types without bypassing administrator control.

## Project Items

```text
Project = Budget item marked for elevated visibility and reporting.
```

This is not currently a full project-management platform. It is a budget-driven way to highlight important budget items.

---

# 6. Budget Submission, Approval, and Return

| Status           | Meaning                              |
| ---------------- | ------------------------------------ |
| DRAFT            | Editable by the department           |
| PENDING_APPROVAL | Submitted and locked                 |
| RETURNED         | Editable again for correction        |
| APPROVED         | Accepted as the approved budget plan |

Workflow:

```text
HOD Submits
→ Budget Is Locked
→ Approver Reviews
→ Approve or Return
```

The Approver reviews:

- Item.
- Quantity.
- Unit price.
- Total amount.
- Distribution.
- Project classification.
- Benchmark and variance.
- Potential overspend.
- Supporting notes.

Return loop:

```text
Approver Returns Budget
→ General and/or Item Notes Are Recorded
→ HOD Corrects Budget
→ HOD Resubmits
→ Approver Reviews Again
```

Example:

If Office Chair is requested at SAR 420 while historical benchmark is SAR 390, the CFO may return the item asking the department to confirm specification or revise the unit price.

---

# 7. Budget Transfers

Approved budget value can be moved in a controlled way when business priorities change.

```text
Source Budget Item
→ Transfer Request
→ Approval or Rejection
→ Destination Budget Item
→ Balances Updated
```

| Item              |      Before |       Change |       After |
| ----------------- | ----------: | -----------: | ----------: |
| Furniture         | SAR 100,000 | - SAR 20,000 |  SAR 80,000 |
| Medical Equipment | SAR 300,000 | + SAR 20,000 | SAR 320,000 |

Controls:

- Valid source item.
- Valid destination item, or approved creation of a new budget item.
- Available transferable balance.
- Approval required.
- Full audit history.

Verified capability:

The transfer process supports existing-item transfers and new-item transfers. When an approved transfer is for a new item, the approved process creates the new budget item and allocates the requested amount.

---

# 8. Purchase Order Linking and Approval

PO Linking connects actual purchasing activity to the approved budget item it consumes.

```text
PO Record
→ User Selects Approved Budget Item
→ PO Link Request
→ Finance / PO Approval Review
→ Approve or Reject
→ Approved Consumption Updated
```

| Measure          |      Amount |
| ---------------- | ----------: |
| Approved Budget  | SAR 100,000 |
| Approved PO Link |  SAR 30,000 |
| Consumed         |  SAR 30,000 |
| Remaining        |  SAR 70,000 |

Key controls:

- Budget item must be eligible and approved.
- Requested quantity is validated.
- PO available quantity is validated.
- Budget item available quantity is validated.
- Approval is required.
- Rejection reason can be captured.
- Pending requests are considered before approval and closing.

This gives Finance a clear connection between procurement activity and approved budget consumption.

---

# 9. PO Item Mapping

PO Item Mapping tells the system which procurement item codes belong to each budget item type.

```text
Budget Item Type
→ One or More Mapped PO Item Codes
→ Historical Purchase Records
→ PO Suggestions and Price Intelligence
```

Example:

```text
Budget Item Type: Laptop
Mapped PO Item Code: 17819
Result: historical purchases for item 17819 can support Laptop analysis.
```

Mapping sources:

- **Manual mapping:** maintained by an administrator.
- **Approved-link mapping:** learned from an approved PO link.

Why mappings matter:

- Better PO suggestions.
- Better historical comparisons.
- More reliable benchmark evidence.
- Reduced dependence on free-text descriptions.

---

# 10. Budget Consumption and Remaining Balance

| Value           | Meaning                             |
| --------------- | ----------------------------------- |
| Approved Amount | Budget value approved for the item  |
| PO Consumed     | Value consumed by approved PO links |
| Transfer In     | Approved value added                |
| Transfer Out    | Approved value removed              |
| Remaining       | Value still available               |

Formula:

```text
Remaining Budget
=
Approved Budget
- Approved PO Consumption
+ Approved Transfer In
- Approved Transfer Out
```

Example:

| Measure                 |      Amount |
| ----------------------- | ----------: |
| Approved Budget         | SAR 250,000 |
| Approved PO Consumption |  SAR 90,000 |
| Approved Transfer In    |  SAR 20,000 |
| Approved Transfer Out   |       SAR 0 |
| Remaining Budget        | SAR 180,000 |

This is the financial bridge between planning and actual budget usage.

---

# 11. Price Intelligence

> Price Intelligence does not automatically approve or reject an item. It gives the approver historical procurement evidence for a better-informed decision.

Data flow:

```text
Budget Item
→ PO Item Mappings
→ Historical PO Records
→ Benchmark Calculations
→ Approval Indicators
```

| Metric               | Meaning                       | Simple Calculation                     |
| -------------------- | ----------------------------- | -------------------------------------- |
| Historical Benchmark | Typical historical unit price | Median historical unit cost            |
| Variance Amount      | Unit-price difference         | Budget Unit Price - Benchmark          |
| Variance %           | Difference as a percentage    | Variance / Benchmark x 100             |
| Potential Impact     | Total difference for quantity | Variance x Quantity                    |
| Potential Overspend  | Positive risk amount only     | max(0, Variance) x Quantity            |
| Evidence Strength    | Reliability of evidence       | Purchase count, suppliers, and recency |

Complete example:

```text
Requested Quantity: 50
Budget Unit Price: SAR 420
Historical Benchmark: SAR 390

Variance Amount:
SAR 420 - SAR 390 = SAR 30

Variance Percentage:
SAR 30 / SAR 390 x 100 = 7.7%

Potential Overspend:
SAR 30 x 50 = SAR 1,500
```

Why median is used:

```text
Historical Prices:
90, 95, 100, 105, 500

Average: 178
Median Benchmark: 100
```

The median is less distorted by the unusual SAR 500 purchase.

Price Intelligence statuses:

- Within Benchmark.
- Review Price.
- Significant Variance.
- High Overspend Risk.
- No Benchmark Available.

Approver use:

The CFO should treat these indicators as decision support. A high variance does not automatically reject an item, but it gives a clear reason to ask for justification, revised pricing, or specification clarification.

---

# 12. Dashboards, Analytics, and Reports

| Capability | Main Purpose                                         |
| ---------- | ---------------------------------------------------- |
| Dashboard  | Shows current status and actions requiring attention |
| Analytics  | Lets users filter, compare, and investigate          |
| Reports    | Provides formal operational and management outputs   |

## Dashboards

Dashboards provide role-based visibility:

- HOD view: budget status, returned items, department actions.
- Approver / CFO view: pending approvals, workload, financial exposure, and high-risk items.
- Operational panels: transfers, PO links, item requests, and other workflow actions.

## Budget Analytics

Analytics helps answer:

- Which departments have the largest budgets?
- Which budgets are approved, returned, or pending?
- Which items have high variance?
- Which items have missing benchmarks?
- Which categories drive the largest values?

## Reports

Current state:

- The dedicated **Reports module is not implemented yet**.
- Advanced reporting remains a planned feature.
- The Approver / CFO can export the currently displayed data or filtered view to Excel from supported system pages.
- Excel export can be used for additional review, analysis, sharing, or offline records.
- Planned report categories include budget reports, approval reports, transfer reports, PO linking reports, consumption reports, Price Intelligence reports, and audit reports.

The current Excel export capability should not be treated as a complete Reports module.

Planned reports should not be presented as fully operational until the dedicated Reports module is implemented.

---

# 13. Email Notifications

| Trigger                                      | Recipient         | Purpose                       |
| -------------------------------------------- | ----------------- | ----------------------------- |
| Budget submitted                             | Approver          | Review required               |
| Budget approved                              | HOD / owner       | Approval confirmed            |
| Budget returned                              | HOD / owner       | Correction required           |
| Transfer submitted                           | Transfer approver | Review required               |
| Transfer approved or rejected                | Requester         | Outcome communicated          |
| PO link submitted                            | PO approver       | Review required               |
| PO link approved or rejected                 | Requester         | Outcome communicated          |
| Item request created                         | Administrator     | Setup review required         |
| Item request approved or rejected            | Requester         | Outcome communicated          |
| Financial year opened, pre-closed, or closed | Relevant users    | Lifecycle status communicated |

Notifications reduce manual follow-up and keep users aware of required actions.

---

# 14. Permissions and Segregation of Duties

> Users only see and perform actions appropriate to their assigned responsibilities.

| Action                   |                HOD |      Approver / CFO | Finance / PO Approver |               Admin |
| ------------------------ | -----------------: | ------------------: | --------------------: | ------------------: |
| Create department budget |                Yes | According to access |   According to access | According to access |
| Submit budget            |                Yes | According to access |   According to access | According to access |
| Approve or return budget |                 No |                 Yes |      Only if assigned |    Only if assigned |
| Request transfer         |       If permitted |        If permitted |          If permitted |        If permitted |
| Approve transfer         | No unless assigned |        If permitted |          If permitted |        If permitted |
| Approve PO link          | No unless assigned |        If permitted |       Yes if assigned |        If permitted |
| Manage configuration     |                 No |                  No |               Limited |   Yes if authorized |
| Manage user access       |                 No |                  No |                    No |                 Yes |

CFO value:

- Segregation of duties.
- Controlled authority.
- Restricted visibility.
- Reduced unauthorized changes.
- Clear ownership of approvals and administration.

---

# 15. Audit Logs and Governance

Audit logs help answer:

- Who performed the action?
- When did it happen?
- What changed?
- What was the decision?
- Why was an item returned or rejected?

Tracked areas include:

- Financial years.
- Budget submission, approval, and return.
- Transfers.
- PO links.
- Item requests.
- Access or configuration actions where implemented.

Governance model:

```text
Permissions
→ Authorized Actions
→ Approval Workflows
→ Email Notifications
→ Audit Logs
→ Management Visibility
```

Together, these features improve accountability and reduce reliance on informal records.

---

# 16. Current Capabilities and Roadmap

| Capability                    | Status                |
| ----------------------------- | --------------------- |
| Financial Years               | Implemented           |
| Budget Entry and Submission   | Implemented           |
| Copy From History             | Implemented           |
| Excel Import                  | Implemented           |
| Item Requests                 | Implemented           |
| Approval and Return Feedback  | Implemented           |
| Budget Transfers              | Implemented           |
| Transfers to New Budget Items | Implemented           |
| PO Linking and Approval       | Implemented           |
| PO Item Mapping               | Implemented           |
| Consumption Tracking          | Implemented           |
| Price Intelligence            | Implemented           |
| Dashboards and Analytics      | Implemented           |
| Notifications                 | Implemented           |
| Permissions and Audit Logs    | Implemented           |
| Project-item foundation       | Implemented / Partial |
| Advanced Reporting            | Partial / Planned     |
| Companies and Vendors         | Planned               |
| Smart Analytics Filters       | Planned               |

Roadmap items are not presented as current operational functionality.

---



# 17. Executive Conclusion

- One controlled budget lifecycle from financial year opening to closure.
- Clear responsibility for every major role.
- Stronger approval, return, transfer, and PO-link controls.
- Procurement activity connected to budget consumption and remaining balance.
- Better decisions through historical evidence, analytics, notifications, permissions, and auditability.
