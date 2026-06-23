# QNH Budget System User Guide

## 1. Introduction

### Purpose of the System

The QNH Budget Management System is a hospital budgeting and financial governance platform. It supports the full budget lifecycle from financial year opening through department budget creation, approval, budget transfers, purchase order linking, consumption tracking, analytics, dashboards, notifications, audit logs, and roadmap planning.

The system is designed for business users, not only technical users. It helps Department Heads, Approvers, Finance, Procurement, Administrators, and the CFO work from one controlled budget process.

### Business Problems Solved

Before a controlled budget system, hospital budgeting can depend on manual files, emails, informal approvals, and disconnected procurement records. This creates several problems:

| Problem | Business Impact |
|---|---|
| Budget requests are prepared manually | Inconsistent planning and more follow-up. |
| Approval status is unclear | Departments and Finance may not know who needs to act. |
| Returned budgets lack structured feedback | Corrections can be misunderstood or lost. |
| Budget transfers are hard to govern | Approved balances can move without clear evidence. |
| Purchase orders are disconnected from budgets | Finance cannot easily see budget consumption. |
| Price reasonableness is difficult to judge | Approvers rely on experience instead of historical evidence. |
| Audit evidence is scattered | It is harder to explain decisions later. |

### Key Benefits

| Benefit | What It Means |
|---|---|
| Better budget control | Budgets follow financial year status, approval rules, and permissions. |
| Clearer approval process | Submitted budgets move through a visible approval queue. |
| Stronger feedback loop | Returned budgets include general and item-level notes. |
| Procurement visibility | PO links show how purchasing consumes approved budget. |
| Better decision support | Price Intelligence compares requested prices with historical procurement data. |
| Audit readiness | Important actions are traceable. |
| Executive visibility | Dashboards and analytics help leadership monitor status and risk. |

### High-Level System Flow

```text
Financial Year Opened
↓
Department Budgets Created
↓
Budget Items Added
↓
Budget Submitted
↓
Approver Reviews
↓
Approved or Returned
↓
Transfers and PO Linking
↓
Budget Consumption Updated
↓
Analytics, Dashboards, Reports, Audit
```

---

## 2. User Roles

The system uses role-based responsibilities. Users should only perform the actions required for their business role.

### Department Head

Department Heads are usually responsible for preparing and submitting their department budgets.

| Area | Responsibility |
|---|---|
| Budget creation | Create or update department budget items. |
| Draft management | Save budget changes while the budget is still editable. |
| Submission | Submit the budget for approval. |
| Feedback response | Review returned budget notes and correct the budget. |
| Visibility | Track the status of department budgets and related activity. |

Typical activities:

- Open the current department budget.
- Add budget items.
- Enter quantity, unit price, and distribution method.
- Request a new budget item/type if it does not exist.
- Import budget items from Excel.
- Copy items from approved historical budgets.
- Submit the budget for approval.
- Respond to returned budget feedback.

### Approver / CFO

Approvers review submitted budgets and make approval decisions. In many business contexts, this role may include the CFO or Finance Leadership.

| Area | Responsibility |
|---|---|
| Budget review | Review submitted department budgets. |
| Approval | Approve budgets that are acceptable. |
| Return | Return budgets that need clarification or correction. |
| Price review | Use Price Intelligence to evaluate requested unit prices. |
| Analytics | Compare budgets, departments, and budget items. |
| Oversight | Monitor pending approvals and financial risk. |

Typical activities:

- Open the Budget Approval page.
- Review item quantities, unit prices, total amounts, and benchmark indicators.
- Open Price Intelligence details when a price needs explanation.
- Approve a budget.
- Return a budget with notes.
- Review analytics and dashboards.

### PO Approval Team

The PO Approval Team reviews purchase order link requests.

| Area | Responsibility |
|---|---|
| PO link review | Review pending PO link requests. |
| Approval | Approve valid PO links. |
| Rejection | Reject invalid PO links with a reason. |
| Control | Ensure PO usage is correctly linked to approved budget items. |

Typical activities:

- Review pending PO link requests.
- Check requested quantity and budget item relationship.
- Approve or reject PO link requests.
- Help maintain procurement-to-budget transparency.

### Finance Department

Finance uses the system for monitoring, governance, analysis, and control.

| Area | Responsibility |
|---|---|
| Budget monitoring | Track budget status and approvals. |
| Consumption visibility | Monitor consumed and remaining budget. |
| Transfers | Review transfer activity where assigned. |
| Reporting | Use analytics and reports for management review. |
| Governance | Ensure financial year and approval controls are followed. |

Typical activities:

- Monitor approval progress.
- Review transfer and PO link activity.
- Use analytics to investigate trends and exceptions.
- Review Price Intelligence indicators.
- Support financial year closure readiness.

### Budget Administrator

Budget Administrators maintain the budget configuration that users rely on.

| Area | Responsibility |
|---|---|
| Categories and item types | Manage budget setup. |
| Item requests | Review requested new budget item types. |
| PO item mappings | Manage mappings between budget item types and procurement item codes. |
| Financial years | Manage annual budget cycles when assigned. |

Typical activities:

- Add or disable budget categories and item types.
- Approve or reject requested new items.
- Maintain PO item mappings for suggestions and benchmarks.
- Support setup needed for accurate budgeting.

### System Administrator

System Administrators manage users, access, and governance settings.

| Area | Responsibility |
|---|---|
| User access | Assign users to roles and departments. |
| Permissions | Control who can view, edit, approve, or administer. |
| Audit | Review audit logs where assigned. |
| Administration | Maintain the system's governance setup. |

Typical activities:

- Assign budget access.
- Manage role permissions.
- Review user access.
- Review audit logs.

---

## 3. End-to-End Budget Lifecycle

The budget lifecycle begins with a financial year and ends with financial year closure and reporting.

```text
Financial Year
↓
Budget Creation
↓
Submission
↓
Approval
↓
Consumption
↓
Transfers
↓
Pre-Closing
↓
Closing
```

### Lifecycle Stages

| Stage | What Happens | Main Users |
|---|---|---|
| Financial Year | A new budget year is opened. Department budgets become available. | Admin, Finance |
| Budget Creation | Department Heads add budget items and save drafts. | Department Heads |
| Submission | Department submits budget for approval. | Department Heads |
| Approval | Approver reviews, approves, or returns the budget. | Approver, CFO |
| Consumption | Approved budget is consumed through linked PO activity. | Finance, Procurement, PO Users |
| Transfers | Budget value can move between items through approved transfer requests. | Department Heads, Finance, Approvers |
| Pre-Closing | Finance prepares the financial year for closure. | Finance, Admin |
| Closing | Financial year is locked after required activities are resolved. | Finance, Admin |

### Example

Radiology creates a budget for the open financial year. It adds ultrasound machines, submits the budget, and the approver reviews the request. If approved, future purchase orders can be linked to those approved items. The linked POs consume part of the approved budget, and Finance can see the remaining available amount.

---

## 4. Financial Year Management

Financial years control when users can create budgets, submit budgets, perform closing preparation, and preserve historical results.

```text
OPEN
↓
PRE-CLOSING
↓
CLOSED
```

### OPEN

| Topic | Explanation |
|---|---|
| Purpose | Active budget planning and approval period. |
| Users can do | Create budgets, edit draft or returned budgets, submit budgets, approve budgets. |
| Users cannot do | Treat the year as finalized. |
| Business value | Allows active budget preparation under a controlled year. |

Example:

The 2026 financial year is OPEN. Departments prepare and submit their budgets.

### PRE-CLOSING

| Topic | Explanation |
|---|---|
| Purpose | Prepare the year for final closure. |
| Users can do | Resolve remaining pending items required before closure. |
| Users cannot do | Continue open-ended planning as if the year were still fully active. |
| Business value | Forces unresolved activities to be addressed before the year is closed. |

Example:

Finance moves the year into PRE-CLOSING after budgets are approved. Pending transfer requests and unfinished PO links must be resolved before closing.

### CLOSED

| Topic | Explanation |
|---|---|
| Purpose | Preserve final financial year history. |
| Users can do | View historical information and reporting. |
| Users cannot do | Create new active budget workflow activity for the closed year. |
| Business value | Protects historical records and supports audit. |

Example:

After closure, 2026 becomes historical. Users can review it, but active budget changes are restricted.

---

## 5. Budget Creation

Budget creation is the process used by departments to prepare their annual budget requests.

### Creating a Budget

In normal use, a department works with its current budget for the open financial year. The budget may be:

| Status | Meaning |
|---|---|
| DRAFT | Editable and not yet submitted. |
| RETURNED | Sent back by approver and editable for correction. |
| PENDING_APPROVAL | Submitted and locked until approver decision. |
| APPROVED | Approved and no longer editable by the department. |

### Adding Budget Items

Each budget item usually includes:

| Field | Meaning |
|---|---|
| Category | Budget grouping, such as equipment or services. |
| Item / Type | Specific budget item type, such as Laptop or Office Chair. |
| Quantity | Number of units requested. |
| Unit Price | Expected cost per unit. |
| Total Amount | Quantity x Unit Price. |
| Distribution Method | How quantity is distributed over the year. |
| Project Item | Marks the item for project-level visibility. |

### Distribution Methods

Distribution controls how the item quantity is planned over time.

| Method | Meaning | Example |
|---|---|---|
| Annual | One annual total only. | 12 monitors planned as one annual request. |
| Monthly | Quantity is distributed across months. | 120 units distributed across 12 months. |
| Quarterly | Quantity is distributed across quarters. | 40 units across 4 quarters. |
| Custom | User defines distribution by month or quarter. | More quantity in Q1 and Q2 than Q3 and Q4. |

Important control:

The distributed quantity must equal the item quantity.

Example:

If the item quantity is 100, the total monthly or quarterly distribution must also equal 100.

### Draft Budgets

A draft budget can be saved before submission. This allows departments to prepare budgets over time.

Draft behavior:

- Users can add, edit, and remove items.
- Users can save the budget without submitting it.
- The budget remains editable until it is submitted.

### Submission

When the department is ready, the budget is submitted for approval.

```text
Draft or Returned Budget
↓
Submit for Approval
↓
Budget becomes Pending Approval
↓
Department editing is locked
↓
Approver reviews
```

A budget cannot be submitted without active budget items.

### Copy Budget From History

The Budget Entry page supports copying from approved historical budgets.

Business purpose:

- Speeds up annual planning.
- Helps departments reuse previous approved budgets.
- Reduces re-entry of common budget items.

Example:

Radiology can copy last year's approved budget items and adjust quantities or prices for the new year.

### Excel Import

The Budget Entry page includes Excel budget tools.

Business purpose:

- Allows departments to prepare multiple budget items outside the system and import them.
- Reduces manual entry for large budgets.
- Provides import results and error feedback.

Typical flow:

```text
Download Template
↓
Fill Budget Items in Excel
↓
Import File
↓
System Adds Valid Rows
↓
User Reviews Import Results
```

If some rows fail, the user reviews import errors and corrects the file or manual entries.

### Budget Item Requests

If a needed item type does not exist, a user can request a new item/type.

Request options:

| Option | Meaning |
|---|---|
| Existing category | Request a new item under an existing category. |
| New category | Request both a new category and a new item type. |
| Expense type | Mark the requested item type as OPEX or CAPEX where applicable. |

Workflow:

```text
Department Head
↓
Request New Budget Item
↓
Admin Reviews Request
↓
Approve or Reject
↓
Department Can Use Approved Item Type
```

### Project Item Flag

A budget item can be marked as a Project Item.

Business meaning:

Project = budget item with elevated visibility and tracking.

It is not full project management software.

Example:

A budget item type called "MRI Expansion Project" can be marked as Project Item so it appears in project-focused views and future reporting.

---

## 6. Budget Approval

Budget Approval is the formal review process for submitted department budgets.

### Approval Workflow

```text
Department Submits Budget
↓
Budget Enters Approval Queue
↓
Approver Reviews Budget Items
↓
Approver Reviews Price Intelligence
↓
Decision:
  - Approve
  - Return with Feedback
```

### Review Process

Approvers review:

| Area | What to Check |
|---|---|
| Item list | Are the requested items appropriate? |
| Quantity | Is the quantity reasonable? |
| Unit price | Is the price reasonable? |
| Total amount | What is the financial impact? |
| Project flag | Is the item an important project item? |
| Price Intelligence | Is the price above historical benchmark? |
| Notes | Are there any previous return comments? |

### Approval Decision

Approving a budget means Finance accepts the submitted budget as an approved plan.

Business effect:

- The budget status becomes approved.
- Department editing is no longer available.
- Approved items can be used for controlled execution and procurement linkage.

### Return Decision

Returning a budget means the approver needs clarification, correction, or justification.

Business effect:

- The budget returns to the department.
- The department can edit the budget.
- General and item-level feedback guide the correction.
- The department resubmits after changes.

Example:

An approver may return a budget because:

- A unit price is significantly above historical benchmark.
- Quantity appears too high.
- A project item needs more explanation.
- A requested item should be moved to a different category.

---

## 7. Return & Feedback

Return and feedback help departments understand what must be corrected before approval.

### Types of Feedback

| Feedback Type | Purpose |
|---|---|
| General notes | Comments about the overall budget. |
| Item notes | Comments attached to specific budget items. |

### Correction Process

```text
Approver Returns Budget
↓
Department Reviews Notes
↓
Department Updates Items
↓
Department Saves Draft
↓
Department Resubmits
↓
Approver Reviews Again
```

### Example: General Note

> Please reduce the overall request to align with the department target and resubmit.

### Example: Item Note

> Office Chair unit price is above historical benchmark. Please confirm specifications or revise price.

### Business Value

- Feedback is structured.
- Departments know exactly what to correct.
- Approvers can document the reason for return.
- The review history is easier to audit.

---

## 8. Budget Transfers

Budget transfers allow approved budget value to move from one item to another under control.

### Purpose

Transfers support operational flexibility when priorities change after budget approval.

### Process

```text
Source Budget Item
↓
Transfer Request
↓
Approval
↓
Destination Budget Item
↓
Balances Updated
```

### Controls

| Control | Meaning |
|---|---|
| Source item required | The system must know where value is coming from. |
| Destination item required | The system must know where value is going. |
| Approval required | Transfer does not become final without approval. |
| Audit trail | Transfer decision is traceable. |

### Financial Example

| Budget Item | Before Transfer | Transfer | After Transfer |
|---|---:|---:|---:|
| Office Furniture | SAR 100,000 | -SAR 20,000 | SAR 80,000 |
| Medical Equipment | SAR 300,000 | +SAR 20,000 | SAR 320,000 |

Business value:

- Finance controls balance movement.
- Departments can adapt to changing needs.
- The reason and approval of the movement are preserved.

---

## 9. Purchase Order Linking

Purchase Order Linking connects procurement activity to approved budget items.

### Purpose

The purpose is to show how actual purchase orders consume approved budget.

### Process

```text
PO Record
↓
Link Request
↓
Approval
↓
Budget Consumption Update
↓
Remaining Budget Update
```

### Controls

| Control | Meaning |
|---|---|
| Link request | A user requests to connect a PO to a budget item. |
| Quantity validation | Requested quantity must be valid. |
| Approval required | PO link must be approved before it becomes final. |
| Rejection reason | Rejected links can include explanation. |
| Closure control | Unfinished PO links can affect financial year closure readiness. |

### Financial Example

| Measure | Amount |
|---|---:|
| Approved Budget Item | SAR 100,000 |
| Approved Linked PO | SAR 30,000 |
| Consumed Budget | SAR 30,000 |
| Remaining Budget | SAR 70,000 |

### Business Value

- Procurement activity becomes visible against approved budgets.
- Finance can see remaining budget after PO consumption.
- PO usage is controlled and auditable.
- Budget closure is more reliable.

---

## 10. PO Item Mapping

PO Item Mapping connects budget item types with procurement item codes.

### Purpose

Mappings tell the system which historical PO records are comparable to a budget item type.

### How Mapping Works

```text
Budget Item Type
↓
Mapped PO Item Code
↓
Historical PO Records
↓
PO Suggestions and Price Intelligence
```

### Mapping Sources

| Source | Meaning |
|---|---|
| Manual | Administrator creates the mapping directly. |
| Approved Link | The system learns from an approved PO link. |

### Example

| Budget Item Type | PO Item Code | Result |
|---|---|---|
| Laptop | 17819 | Historical PO records for item code 17819 support Laptop benchmark calculations. |
| Office Chair | 2102030060 | Chair purchase history supports future suggestions and price review. |

### Why It Matters

PO Item Mapping is important because Price Intelligence depends on comparable historical purchase records. Without mappings, the system may not know which historical procurement records should be used for a budget item.

Example:

If Laptop is mapped to item codes 17819, 17820, and 17821, then all active mapped item codes can contribute historical purchase records for Laptop benchmarking.

---

## 11. Budget Consumption Tracking

Budget Consumption Tracking explains how much approved budget has been used and how much remains.

### Core Concepts

| Concept | Meaning |
|---|---|
| Allocated / Approved | Budget value approved for an item. |
| Consumed | Budget value used through approved PO links. |
| Remaining | Budget value still available after consumption and approved balance movements. |

### Basic Formula

```text
Remaining Budget
= Approved Budget
- Consumed Through PO Links
+ Approved Transfer In
- Approved Transfer Out
```

### Example

| Measure | Amount |
|---|---:|
| Approved Budget | SAR 250,000 |
| Approved PO Links | SAR 90,000 |
| Transfer In | SAR 20,000 |
| Remaining Budget | SAR 180,000 |

### Business Value

- Finance can monitor available budget.
- Departments can understand remaining balance.
- Procurement consumption becomes transparent.
- Budget execution is easier to control.

---

## 12. Price Intelligence

Price Intelligence is a decision-support feature used during Budget Approval. It helps approvers compare proposed budget prices against QNH historical procurement behavior.

It is not an automatic approval or rejection engine. It provides evidence to support human decision-making.

### Price Intelligence Data Flow

```text
Budget Item
↓
Budget Item Type
↓
Active PO Item Mappings
↓
Mapped PO Item Codes
↓
Historical PO Records
↓
Benchmark and Variance Calculations
↓
Approval Indicators
```

### What Approvers See

Approvers may see:

- Historical Benchmark.
- Unit Price Variance.
- Potential Impact / Potential Overspend.
- Status such as Within Benchmark or High Overspend Risk.
- Evidence details in a drawer.
- Recent historical purchases used in the calculation.

### Historical Benchmark

| Topic | Explanation |
|---|---|
| Definition | The historical reference unit price for comparable purchases. |
| Calculation | Median historical unit cost from mapped historical PO records. |
| Business meaning | Shows the typical historical unit price for similar items. |
| Example | Historical prices are 90, 95, 100, 105, 500. Benchmark = 100. |

Why it matters:

The benchmark gives approvers a reliable reference point before approving a requested price.

### Benchmark Price

Benchmark Price is the same primary value as Historical Benchmark.

| Topic | Explanation |
|---|---|
| Definition | Main price used to compare the budgeted unit price. |
| Calculation | Median historical unit cost. |
| Business meaning | Indicates what QNH has typically paid for comparable items. |
| Example | If comparable historical prices are 380, 390, 405, the benchmark is 390. |

### Median Historical Price

Median is the middle value after prices are sorted.

Example:

```text
Historical prices:
90, 95, 100, 105, 500

Median:
100
```

Why median is used:

| Average | Median |
|---:|---:|
| 178 | 100 |

The average is distorted by the unusual 500 price. The median better represents typical purchasing behavior.

### Variance Amount

| Topic | Explanation |
|---|---|
| Definition | Difference between budget unit price and benchmark. |
| Formula | Budget Unit Price - Benchmark Price. |
| Business meaning | Shows how much higher or lower the requested unit price is. |
| Example | 420 - 390 = 30 above benchmark. |

### Variance %

| Topic | Explanation |
|---|---|
| Definition | Percentage difference between requested unit price and benchmark. |
| Formula | ((Budget Unit Price - Benchmark Price) / Benchmark Price) x 100. |
| Business meaning | Helps compare price differences across low-value and high-value items. |
| Example | ((420 - 390) / 390) x 100 = 7.7%. |

### Potential Impact

| Topic | Explanation |
|---|---|
| Definition | Total financial difference across the requested quantity. |
| Formula | (Budget Unit Price - Benchmark Price) x Quantity. |
| Business meaning | Converts unit price difference into total budget exposure. |
| Example | (420 - 390) x 50 = 1,500. |

Potential Impact can be positive or negative:

- Positive means the item is above benchmark.
- Negative means the item is below benchmark.

### Potential Overspend

| Topic | Explanation |
|---|---|
| Definition | Positive potential impact when budget price is above benchmark. |
| Formula | max(0, Budget Unit Price - Benchmark Price) x Quantity. |
| Business meaning | Shows possible avoidable budget exposure. |
| Example | If unit variance is 30 and quantity is 50, potential overspend is SAR 1,500. |

### Evidence Strength

| Topic | Explanation |
|---|---|
| Definition | Indicator of how reliable the benchmark evidence is. |
| Calculation logic | Based on historical purchase count, supplier count, and recency. |
| Business meaning | Helps approvers know whether the benchmark is strong or should be used cautiously. |
| Example | 37 purchases from 4 suppliers is stronger evidence than 1 purchase from 1 supplier. |

### Statuses

| Status | Meaning | Typical Action |
|---|---|---|
| Within Benchmark | Price is close to historical benchmark. | Review normally. |
| Review Price | Price is moderately above benchmark. | Check justification or specification. |
| Significant Variance | Price is materially above benchmark. | Challenge assumptions or request correction. |
| High Overspend Risk | Price is far above benchmark. | Require strong justification before approval. |
| No Benchmark Available | No usable mapped historical data exists. | Review manually and consider improving mappings. |

### Complete Example

| Field | Value |
|---|---:|
| Budget Item | Office Chair |
| Quantity | 50 |
| Budget Unit Price | SAR 420 |
| Historical Benchmark | SAR 390 |
| Variance Amount | SAR 30 |
| Variance % | 7.7% |
| Potential Overspend | SAR 1,500 |
| Status | Review Price |

Approver interpretation:

The item is not automatically rejected. The system shows that approving the item at SAR 420 may create SAR 1,500 of additional budget exposure compared with historical procurement behavior.

### How Approvers Use Price Intelligence

Approvers should use Price Intelligence to ask better questions:

| Signal | Approver Question |
|---|---|
| Within Benchmark | Is the item otherwise appropriate? |
| Review Price | Is there a specification difference or supplier reason? |
| Significant Variance | Should the price be revised or justified? |
| High Overspend Risk | Is there a strong business reason to approve this price? |
| No Benchmark Available | Is manual review sufficient, or should mappings be improved? |

---

## 13. Budget Analytics

Budget Analytics helps Finance and Approvers explore budget information beyond a single budget.

### Purpose

Analytics answers business questions such as:

- Which departments have the highest budget requests?
- Which budgets are approved, returned, or pending?
- Which categories or items drive the largest totals?
- Which items have high benchmark variance?
- Which budgets have missing benchmarks?
- Which departments need attention?

### Users

| User | Use |
|---|---|
| CFO | Review overall financial exposure and risk. |
| Finance Leadership | Compare budgets and departments. |
| Approvers | Investigate submitted budgets and outliers. |
| Department Directors | Understand department budget patterns. |

### Filters and Comparisons

Analytics can support filtering and comparison by business dimensions such as:

- Status.
- Department.
- Financial year.
- Budget.
- Category.
- Item type.
- Amount.
- Price Intelligence indicators where available.

### Business Value

- Helps users investigate instead of only viewing dashboards.
- Supports review of trends and exceptions.
- Helps Finance find budgets requiring attention.
- Provides a foundation for future Smart Analytics Filters.

---

## 14. Dashboards

Dashboards provide immediate visibility into status, workload, and action items.

### Executive Dashboards

| Topic | Explanation |
|---|---|
| What it shows | High-level budget status, approval workload, financial year context, risk indicators, and key actions. |
| Users | CFO, Finance Leadership, Approvers. |
| Business value | Helps leaders quickly understand where attention is needed. |

Example questions:

- How many budgets are pending approval?
- Are there returned budgets?
- Are there high-risk items?
- Are there pending transfer or PO link approvals?

### Department Dashboards

| Topic | Explanation |
|---|---|
| What it shows | Department budget status, returned items, pending actions, and relevant budget activity. |
| Users | Department Heads. |
| Business value | Helps departments know what to submit, revise, or monitor. |

Example questions:

- Is my budget still draft?
- Was my budget returned?
- What feedback requires action?

### Operational Dashboards

| Topic | Explanation |
|---|---|
| What it shows | Work panels for item requests, transfers, PO links, and other workflow actions. |
| Users | Finance, Procurement, Administrators, Approvers. |
| Business value | Helps operational teams act on pending work. |

Example questions:

- Which PO link requests are pending?
- Which transfers need approval?
- Which item requests need administrator review?

---

## 15. Reporting

Reporting is separate from analytics. Analytics supports exploration. Reporting supports formal review, management packs, and audit evidence.

Current status:

The system has a Reports page foundation. Advanced reporting is a planned enhancement.

### Report Categories

| Report | Purpose | Audience | Decisions Supported |
|---|---|---|---|
| Budget Reports | Show budget status, totals, and department submissions. | CFO, Finance, Departments. | Which budgets are pending, approved, returned, or draft. |
| Approval Reports | Show approval workload and decisions. | CFO, Approvers, Auditors. | Where approval bottlenecks exist. |
| Transfer Reports | Show approved and rejected budget transfers. | Finance, Approvers, Auditors. | Why balances moved between items. |
| PO Linking Reports | Show PO links and approval status. | Finance, Procurement, Auditors. | Which POs consumed which budget items. |
| Consumption Reports | Show approved, consumed, and remaining budget. | CFO, Finance, Departments. | Whether budget remains available. |
| Price Intelligence Reports | Show benchmark variance and missing benchmarks. | CFO, Finance, Approvers, Procurement. | Which items may require price review. |
| Audit Reports | Show important user actions and state changes. | Auditors, Admins, Finance. | Who did what, when, and why. |

---

## 16. Email Notifications

Email notifications help users respond to workflow events without manual follow-up.

### Implemented Notification Types

| Notification | Trigger | Recipient | Purpose |
|---|---|---|---|
| Budget Submitted | Department submits budget. | Budget Approvers. | Notify approvers that review is required. |
| Budget Approved | Approver approves budget. | Budget owner / department. | Confirm approval. |
| Budget Returned | Approver returns budget. | Budget owner / department. | Notify department to revise and resubmit. |
| Transfer Submitted | User creates transfer request. | Transfer Approvers. | Request transfer review. |
| Transfer Approved | Approver approves transfer. | Transfer requester. | Confirm approved transfer. |
| Transfer Rejected | Approver rejects transfer. | Transfer requester. | Communicate rejection. |
| PO Link Submitted | User submits PO link request. | PO Link Approvers. | Request PO link review. |
| PO Link Approved | Approver approves PO link. | PO link requester. | Confirm approved PO link. |
| PO Link Rejected | Approver rejects PO link. | PO link requester. | Communicate rejection. |
| Financial Year Opened | New financial year is opened. | Relevant users. | Announce start of budget cycle. |
| Financial Year Pre-Closing | Year moves to pre-closing. | Relevant users. | Communicate closure preparation. |
| Financial Year Closed | Year is closed. | Relevant users. | Communicate final closure. |
| Item Request Created | User requests a new item/type. | Category or budget setup administrators. | Notify admin that review is needed. |
| Item Request Approved | Admin approves item request. | Requester. | Confirm item/type approval. |
| Item Request Rejected | Admin rejects item request. | Requester. | Communicate rejection. |

### Business Value

- Reduces manual follow-up.
- Keeps approvers and requesters informed.
- Speeds up workflow action.
- Improves accountability.

---

## 17. Security & Permissions

Security is based on what users are allowed to do in the budget process.

### Permission Areas

| Permission Area | Business Meaning |
|---|---|
| View Budget | User can view budget information. |
| Edit Budget | User can create or edit editable budgets. |
| Approve Budget | User can review, approve, or return budgets. |
| Request Transfer | User can create transfer requests. |
| Approve Transfer | User can approve or reject transfer requests. |
| View PO Links | User can view PO link information. |
| Request PO Links | User can submit PO link requests. |
| Approve PO Links | User can approve or reject PO link requests. |
| Manage Users | User can manage budget access assignments. |
| Manage Categories | User can manage budget setup and item requests. |
| Manage PO Item Mappings | User can maintain PO item mappings. |
| Manage Financial Years | User can manage financial year lifecycle. |
| View Reports | User can access reporting. |

### Governance Purpose

Permissions ensure that:

- Users only see what they are allowed to see.
- Users only act where they have authority.
- Approval duties are separated from entry duties where required.
- Administration is restricted to authorized users.

### Example

A Department Head may create and submit a budget, but only an Approver can approve or return it.

---

## 18. Audit Logs

Audit logs preserve evidence of important system actions.

### Actions Tracked

Audit logging covers important state-changing actions such as:

- Financial year creation, pre-closing, and closing.
- Budget creation, submission, approval, and return.
- Transfer creation, approval, and rejection.
- PO link creation, approval, and rejection.
- Item request activity.
- Administrative actions where applicable.

### Why Audit Logs Matter

Audit logs help answer:

- Who performed the action?
- When did it happen?
- What changed?
- Why was a budget returned or transfer rejected?
- Was the correct approval process followed?

### Business Value

- Supports internal control.
- Supports audit review.
- Reduces reliance on email evidence.
- Improves accountability.

---

## 19. Financial Controls

The system includes several financial governance controls.

### Approval Controls

| Control | Purpose |
|---|---|
| Budget submission lock | Submitted budgets cannot be edited unless returned. |
| Approver decision | Budgets require approval before they become approved plans. |
| Return feedback | Corrections are documented. |
| Price Intelligence | Approvers can challenge prices using historical evidence. |

### Transfer Controls

| Control | Purpose |
|---|---|
| Source and destination | Transfer must identify where budget moves from and to. |
| Approval required | Transfer does not become final without approval. |
| Balance impact | Approved transfer updates relevant budget availability. |

### PO Controls

| Control | Purpose |
|---|---|
| PO link request | PO consumption is requested before approval. |
| PO approval | Link must be reviewed. |
| Quantity validation | Requested PO quantity must be valid. |
| Consumption update | Approved link affects budget consumption visibility. |

### Financial Year Controls

| Control | Purpose |
|---|---|
| OPEN status | Allows active budget planning. |
| PRE-CLOSING status | Prepares for year-end closure. |
| CLOSED status | Locks historical year. |
| Closure checks | Pending transfers and PO links must be resolved. |

### Permission Controls

| Control | Purpose |
|---|---|
| Role-based access | Users act according to assigned responsibility. |
| Admin permissions | Sensitive setup is restricted. |
| Approval permissions | Approval authority is controlled. |

---

## 20. Frequently Asked Questions

### Why can I not edit my budget?

Your budget may be submitted, approved, cancelled, or locked by financial year status. Budgets are normally editable when they are DRAFT or RETURNED.

### Why was my budget returned?

The approver returned it because clarification, correction, or justification is required. Review the general notes and item notes.

### Can I submit a budget with no items?

No. A budget must have at least one active item before submission.

### What is a Project Item?

A Project Item is a budget item marked for elevated visibility and future tracking. It remains part of the budget and approval process.

### What if the item I need does not exist?

Use the item request process to request a new budget item/type. An administrator reviews and approves or rejects the request.

### What does No Benchmark Available mean?

It means the system does not have enough mapped historical procurement data to calculate a benchmark.

### Does Price Intelligence approve or reject items automatically?

No. It supports human review by showing historical evidence, variance, and potential impact.

### Why is benchmark different from average?

The benchmark uses median historical price because median is less affected by extreme outliers.

### How does PO Linking affect budget?

When a PO link is approved, it contributes to consumed budget visibility for the linked budget item.

### Can rejected PO links increase consumption?

No. Only approved PO links should count as approved consumption.

### Why are permissions important?

Permissions protect financial governance by ensuring users only perform actions they are authorized to perform.

---

## 21. Current Capabilities Summary

| Capability | Status | Business Value |
|---|---|---|
| Financial Year Management | Implemented | Controls annual budget cycle. |
| Budget Creation | Implemented | Enables department planning. |
| Budget Submission | Implemented | Moves budgets into approval workflow. |
| Budget Approval | Implemented | Controls approval and return decisions. |
| Return & Feedback | Implemented | Documents correction requests. |
| Budget Transfers | Implemented | Controls movement of budget value. |
| PO Linking | Implemented | Connects purchase orders to budget consumption. |
| PO Item Mapping | Implemented | Supports PO suggestions and Price Intelligence. |
| Budget Consumption Tracking | Implemented | Shows approved, consumed, and remaining budget. |
| Price Intelligence | Implemented | Provides historical procurement benchmarks. |
| Dashboards | Implemented | Shows role-based status and action visibility. |
| Budget Analytics | Implemented | Supports budget comparison and investigation. |
| Email Notifications | Implemented | Alerts users to workflow events. |
| Security & Permissions | Implemented | Controls access and actions. |
| Audit Logs | Implemented | Preserves action history. |
| Project Budget Item Visibility | Implemented / Partial | Provides project item visibility and foundation for future tracking. |
| Reporting Framework | Partial | Reports entry point exists; advanced reporting is planned. |

---

## 22. Roadmap

Roadmap items are future or partially implemented capabilities. They should not be treated as fully operational unless specifically marked implemented.

### Implemented Foundation

| Area | Current Status |
|---|---|
| Project Budget Items | Foundation exists for marking and viewing project budget items. |
| Budget Analytics | Current analytics workspace exists. |
| Reports | Basic reports entry point exists. |

### Planned: Projects Feature

Business objective:

Provide better visibility into important budget initiatives.

Business definition:

```text
Project = Budget Item with elevated visibility and tracking
```

Not intended as:

```text
Full project management software
```

Future benefits:

- Project dashboards.
- Project reports.
- Executive oversight of strategic initiatives.
- Future milestones, risks, documents, and procurement tracking.

### Planned: Companies / Vendors Feature

Business objective:

Provide better supplier, vendor, and company-level visibility.

Future benefits:

- Supplier spending analysis.
- Vendor concentration reporting.
- Procurement transparency.
- Supplier-based budget reporting.
- Multi-company governance where required.

### Planned: Advanced Reporting

Business objective:

Provide formal operational, financial, executive, and audit reports.

Potential report examples:

- Budget Status Reports.
- Department Reports.
- Approval Reports.
- Transfer Reports.
- PO Linking Reports.
- Consumption Reports.
- Price Intelligence Reports.
- Audit Reports.

### Planned: Smart Analytics Filters

Business objective:

Make Budget Analytics easier to explore.

Example future query:

```text
show approved radiology budgets above 500k with variance > 20%
```

The intended direction is structured filtering, not uncontrolled text-to-SQL.

### Future: AI-Assisted Analysis

Business objective:

Support future insight discovery and executive analysis.

Important principle:

Future AI-assisted capabilities should support decision-making, remain explainable, and preserve governance controls. They should not replace accountable human approval.

---

## Final Notes For New Users

The QNH Budget System is not only a data-entry application. It is a financial governance platform.

The most important ideas to understand are:

- Financial years control when budget activity is allowed.
- Departments create and submit budgets.
- Approvers approve or return budgets.
- Returned budgets include feedback and can be corrected.
- Transfers move approved budget value only through approval.
- PO links connect procurement activity to budget consumption.
- PO item mappings enable reliable historical benchmarking.
- Price Intelligence supports better approval decisions.
- Dashboards, analytics, reports, notifications, permissions, and audit logs support governance.

Used properly, the system gives QNH stronger budget discipline, procurement transparency, financial visibility, and audit-ready decision evidence.
