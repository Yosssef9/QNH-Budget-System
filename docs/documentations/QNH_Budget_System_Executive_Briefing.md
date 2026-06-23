# QNH Budget Management System

## Executive Summary

QNH Budget Management System is a hospital finance governance platform that manages the budgeting lifecycle from annual planning through approval, transfer control, procurement linkage, budget consumption tracking, analytics, reporting, and audit visibility.

The system exists because hospital budgeting requires more than collecting numbers. Finance leadership needs controlled workflows, clear accountability, reliable approval evidence, procurement visibility, and timely insight into financial risk. Department leaders need a structured way to prepare budgets, respond to feedback, and understand the status of their requests. Approvers need enough context to judge whether a request is reasonable before approving it.

Before this system, budgeting could depend heavily on spreadsheets, manual follow-up, email-based feedback, and disconnected procurement records. That made it difficult to know which budgets were pending, why items were returned, how purchase orders consumed approved budgets, whether prices were reasonable, and whether financial year closure risks remained unresolved.

The system addresses these challenges through a controlled digital process:

```text
Financial Year
↓
Budget Planning
↓
Budget Approval
↓
Return & Feedback
↓
Transfers
↓
Purchase Order Linking
↓
Consumption Tracking
↓
Analytics, Dashboards, Reporting, Audit
```

Key capabilities include:

| Capability | Executive Value |
|---|---|
| Financial Year Governance | Defines when budgets can be planned, reviewed, prepared for closure, and closed. |
| Budget Creation | Standardizes department budget planning using approved categories and item types. |
| Budget Approval | Provides structured review, approval, and return workflows. |
| Return & Feedback | Creates a controlled correction cycle with documented approver feedback. |
| Budget Transfers | Allows controlled movement of approved budget value between items. |
| PO Linking | Connects procurement usage to approved budget items. |
| Budget Consumption Tracking | Shows approved, consumed, and remaining budget value. |
| PO Item Mapping | Connects budget item types with historical procurement item codes. |
| Price Intelligence | Compares proposed unit prices against historical procurement benchmarks. |
| Dashboards & Analytics | Gives role-based visibility into budget status, workload, risks, and trends. |
| Audit & Permissions | Enforces accountability, segregation of duties, and traceable decisions. |

The most important executive outcome is not automation alone. It is stronger financial governance. The system improves the quality of budget decisions by making the process visible, controlled, explainable, and auditable.

For the CFO, the system provides:

- Clear visibility into where budgets are in the approval lifecycle.
- Better evidence for approving, returning, or challenging budget requests.
- Stronger control over budget transfers and procurement consumption.
- Historical price benchmarks to identify potential overspend before approval.
- Audit-ready records of who acted, when, and why.
- A foundation for future enhancements such as projects, vendor visibility, advanced reporting, smart analytics filters, and executive intelligence.

The system should be viewed as a financial control platform for hospital budgeting: it strengthens planning discipline, approval quality, procurement transparency, and executive oversight.

# 1. Business Challenges

Hospital budgeting involves many stakeholders, multiple departments, annual financial controls, approval rules, procurement activity, and audit expectations. Without a controlled system, these activities can become fragmented.

## Key Challenges

| Challenge | Business Impact |
|---|---|
| Manual budget preparation | Inconsistent formats, repeated follow-up, and limited visibility. |
| Unclear approval status | Departments and Finance may not know where action is required. |
| Informal feedback loops | Return reasons can be lost or handled outside the official process. |
| Limited price context | Approvers may not know whether requested unit prices are reasonable. |
| Weak procurement linkage | Purchase orders may not clearly show their budget impact. |
| Limited consumption visibility | Approved, consumed, and remaining balances can be difficult to track. |
| Audit difficulty | Evidence may be scattered across emails, spreadsheets, and manual records. |
| Closure risk | Unresolved transfers or PO links may delay financial year closure. |

## Before / After Comparison

| Area | Before | With QNH Budget Management System |
|---|---|---|
| Budget Planning | Manual and fragmented | Structured by financial year, department, category, and item type |
| Approval Review | Dependent on manual context | Central queue with item details, feedback, and benchmarks |
| Returned Budgets | Informal feedback | Documented return reasons and resubmission flow |
| Transfers | Difficult to govern consistently | Request, approval, and balance impact are controlled |
| Procurement Linkage | PO usage may be disconnected | PO links connect procurement activity to budget items |
| Price Review | Limited historical context | Historical procurement benchmarks support decisions |
| Dashboards | Manual status tracking | Role-based workload and status visibility |
| Audit | Dispersed evidence | Central action history and traceability |

# 2. System Overview

## Purpose

The purpose of QNH Budget Management System is to provide one controlled workspace for hospital budget planning, approval, budget consumption, procurement linkage, reporting, and governance.

## Scope

The system covers the main budgeting lifecycle:

```text
Financial Year
↓
Department Budget Creation
↓
Budget Item Entry
↓
Budget Submission
↓
Approval Review
↓
Approve or Return
↓
Transfers and PO Linking
↓
Consumption Tracking
↓
Analytics, Reporting, Dashboards, Audit
```

## Core Capabilities

| Capability | Purpose |
|---|---|
| Financial Years | Establish and control the annual budget period. |
| Budget Creation | Allow departments to prepare budget requests. |
| Budget Approval | Enable Finance review, approval, and return. |
| Return Feedback | Document required corrections and explanations. |
| Budget Transfers | Move approved budget between items under approval control. |
| PO Linking | Link purchase orders to approved budget items. |
| PO Item Mapping | Connect budget items to procurement history. |
| Price Intelligence | Benchmark proposed unit prices against historical purchases. |
| Analytics | Compare budgets, departments, categories, and trends. |
| Dashboards | Provide role-based visibility and action queues. |
| Notifications | Notify users when action is required. |
| Permissions | Enforce who can view, edit, approve, and administer. |
| Audit Logs | Preserve evidence of key actions and decisions. |

# 3. Stakeholders

| Stakeholder | Main Responsibilities | System Value |
|---|---|---|
| Department Heads | Create budgets, submit requests, respond to returns, monitor status. | Clear planning process and feedback visibility. |
| Budget Approvers | Review budgets, approve, return, compare, and challenge items. | Better decision support and controlled approval actions. |
| Finance Leadership | Monitor budget status, risk, controls, and financial exposure. | Stronger oversight and governance. |
| Procurement / Purchasing | Link purchase orders and support procurement visibility. | Clear relationship between purchasing activity and budgets. |
| Administrators | Manage users, roles, permissions, financial years, categories, and mappings. | Controlled configuration and access governance. |
| CFO | Oversee financial discipline, risk, accountability, and executive reporting. | Strategic visibility and audit-ready control. |

# 4. Financial Year Governance

Financial year status is one of the strongest controls in the system. It defines when departments can plan, when approvals must be complete, and when the year can be closed.

```text
OPEN
↓
PRE-CLOSING
↓
CLOSED
```

| Status | Purpose | Allowed Actions | Restricted Actions | Business Value |
|---|---|---|---|---|
| OPEN | Active planning and approval period. | Create budgets, edit drafts, submit budgets, approve budgets. | Closure is not yet final. | Enables active annual planning under control. |
| PRE-CLOSING | Closure preparation period. | Resolve final pending items and prepare for closure. | New open-ended budget activity is restricted. | Ensures unresolved approvals, transfers, and PO links are addressed. |
| CLOSED | Finalized financial year. | Historical visibility and reporting. | New budget changes and active workflow activity are restricted. | Preserves approved financial history and supports audit. |

## Lifecycle Control

```text
Financial Year Opened
↓
Department Budgets Created
↓
Budgets Submitted and Approved
↓
All Required Items Resolved
↓
Pre-Closing
↓
No Pending Transfers or PO Links
↓
Closed
```

# 5. Budget Creation

## Purpose

Budget creation allows departments to plan annual needs in a structured and controlled way.

## Workflow

```text
Department Head
↓
Open Current Budget
↓
Add Budget Items
↓
Enter Quantity and Unit Price
↓
Review Total Amount
↓
Submit for Approval
```

## Business Value

- Standardizes budget planning across departments.
- Ensures budget requests are tied to the correct financial year.
- Uses configured categories and item types to improve consistency.
- Gives departments clear ownership of submitted requests.

## Example

Radiology prepares a budget item:

| Field | Value |
|---|---:|
| Item | Ultrasound Machine |
| Quantity | 2 |
| Unit Price | SAR 180,000 |
| Total Budget Request | SAR 360,000 |

The item becomes part of Radiology's annual budget submission and enters the approval workflow.

# 6. Budget Approval

## Purpose

Budget approval ensures that department budget requests are reviewed before they become approved financial plans.

## Workflow

```text
Submitted Budget
↓
Approval Queue
↓
Item Review
↓
Price Intelligence Review
↓
Approve or Return
```

## Business Value

- Creates a formal review gate before budget approval.
- Gives approvers visibility into quantities, unit prices, totals, and benchmarks.
- Supports consistent treatment of department submissions.
- Preserves approval decisions for governance and audit.

## Example

An approver reviews:

| Item | Quantity | Budget Unit Price | Historical Benchmark | Status |
|---|---:|---:|---:|---|
| Office Chair | 50 | SAR 420 | SAR 390 | Review Price |

The approver can approve if justified or return the budget for clarification.

# 7. Return & Feedback

## Purpose

Return and feedback allow approvers to request changes or clarification without losing workflow control.

## Workflow

```text
Approver Reviews Budget
↓
Identifies Issue
↓
Returns Budget with Feedback
↓
Department Revises
↓
Department Resubmits
↓
Approver Reviews Again
```

## Business Value

- Converts informal review comments into documented feedback.
- Gives departments clear correction instructions.
- Preserves the reason for return.
- Improves auditability of approval decisions.

## Example

An approver returns a budget with the note:

> Laptop unit price is 22% above historical benchmark. Please confirm specification or revise pricing.

The department can revise and resubmit with a clear understanding of the issue.

# 8. Budget Transfers

Budget transfers allow approved budget value to move between items when operational needs change.

## Workflow

```text
Source Budget Item
↓
Transfer Request
↓
Approval Review
↓
Destination Budget Item
↓
Balances Updated
```

## Amount Example

| Item | Before Transfer | Transfer | After Transfer |
|---|---:|---:|---:|
| Office Furniture | SAR 100,000 | -SAR 20,000 | SAR 80,000 |
| Medical Equipment | SAR 300,000 | +SAR 20,000 | SAR 320,000 |

## Business Value

- Provides flexibility while preserving Finance oversight.
- Prevents informal reallocations outside approval control.
- Creates traceability for why balances moved.
- Supports changing operational priorities without weakening governance.

# 9. Purchase Order Linking

## Purpose

Purchase Order Linking connects procurement activity to approved budget items.

## Workflow

```text
Purchase Order Record
↓
Linked to Budget Item
↓
PO Link Request Submitted
↓
Approver Reviews
↓
Approved Link
↓
Budget Consumption Updated
↓
Remaining Balance Updated
```

## Financial Example

| Measure | Amount |
|---|---:|
| Approved Budget | SAR 100,000 |
| Linked PO | SAR 30,000 |
| Consumed Budget | SAR 30,000 |
| Remaining Budget | SAR 70,000 |

## Business Value

- Makes procurement activity visible against approved budgets.
- Helps Finance understand how approved budgets are being used.
- Supports closure control by identifying unfinished PO link activity.
- Improves transparency between Budgeting and Procurement.

# 10. PO Item Mapping

## Purpose

PO Item Mapping connects budget item types to procurement item codes from historical purchase records.

## Mapping Process

```text
Budget Item Type
↓
Mapped to Procurement Item Code
↓
Historical PO Records Identified
↓
PO Suggestions and Price Benchmarks Generated
```

## Example

| Budget Item Type | Mapped Procurement Item Code | Result |
|---|---|---|
| Laptop | 17819 | Historical laptop purchase records support future laptop benchmarking. |
| Office Chair | 2102030060 | Chair purchase history supports approval review and PO suggestions. |

## Business Value

- Creates a reliable bridge between budgeting and procurement history.
- Supports suggested PO records during PO linking.
- Enables Price Intelligence by identifying comparable historical purchases.
- Allows Finance and administrators to maintain procurement knowledge over time.

# 11. Budget Consumption Tracking

Budget consumption tracking shows how approved budget value is being used.

```text
Approved Budget
-
Consumed through PO Links
+ / -
Approved Transfers
=
Remaining Budget
```

## Example

| Measure | Amount |
|---|---:|
| Approved Item Budget | SAR 250,000 |
| Approved PO Links | SAR 90,000 |
| Approved Transfer In | SAR 20,000 |
| Available Budget | SAR 180,000 |

## Business Value

- Shows whether approved budgets remain available.
- Helps prevent over-commitment.
- Connects planning decisions with purchasing activity.
- Supports stronger year-end review and closure.

# 12. Price Intelligence

Price Intelligence is a historical procurement benchmarking feature used during Budget Approval. It compares proposed budget unit prices against QNH's own historical purchasing behavior.

It does not use external market data in the current phase. It uses mapped procurement item codes and historical purchase records to create explainable benchmarks.

## Price Intelligence Flow

```text
Budget Item
↓
Budget Item Type
↓
PO Item Mappings
↓
Mapped Procurement Item Codes
↓
Historical PO Records
↓
Benchmark and Variance Calculations
↓
Approval Indicators
```

## Metric Reference

### Historical Benchmark / Benchmark Price

| Topic | Explanation |
|---|---|
| Definition | The typical historical unit price for comparable procurement records. |
| Calculation Logic | Median historical unit cost. |
| Business Meaning | Provides a stable reference point for whether a requested unit price appears reasonable. |
| Example | Historical prices: 90, 95, 100, 105, 500. Benchmark = 100. |

Why median is used:

| Average | Median |
|---:|---:|
| SAR 178 | SAR 100 |

The SAR 500 outlier increases the average, but the median better represents typical historical purchasing behavior.

### Median Historical Price

| Topic | Explanation |
|---|---|
| Definition | The middle value after historical unit prices are sorted. |
| Calculation Logic | Sort prices from lowest to highest and select the middle value. |
| Business Meaning | Reduces the effect of unusual one-time purchases. |
| Example | 90, 95, 100, 105, 500 -> median = 100. |

### Variance Amount

| Topic | Explanation |
|---|---|
| Definition | Unit price difference between the requested budget price and the benchmark. |
| Calculation Logic | Budget Unit Price - Benchmark Price. |
| Business Meaning | Shows how much higher or lower the requested unit price is. |
| Example | SAR 420 - SAR 390 = SAR 30 above benchmark. |

### Variance %

| Topic | Explanation |
|---|---|
| Definition | Percentage difference between requested unit price and benchmark. |
| Formula | ((Budget Unit Price - Benchmark Price) / Benchmark Price) x 100. |
| Business Meaning | Normalizes price difference so items of different values can be compared. |
| Example | ((420 - 390) / 390) x 100 = 7.7%. |

### Potential Impact

| Topic | Explanation |
|---|---|
| Definition | Total financial difference across the requested quantity. |
| Formula | (Budget Unit Price - Benchmark Price) x Quantity. |
| Business Meaning | Converts unit-price variance into total budget exposure. |
| Example | (420 - 390) x 50 = SAR 1,500. |

### Potential Overspend

| Topic | Explanation |
|---|---|
| Definition | Positive potential impact when the requested price is above benchmark. |
| Formula | max(0, Budget Unit Price - Benchmark Price) x Quantity. |
| Business Meaning | Highlights avoidable budget exposure if the benchmark is a valid reference. |
| Example | SAR 1,500 potential overspend for 50 chairs at SAR 30 above benchmark. |

### Evidence Strength

| Topic | Explanation |
|---|---|
| Definition | A business indicator of how reliable the benchmark evidence is. |
| Calculation Logic | Based on available historical purchase count, supplier count, and recency of evidence. |
| Business Meaning | Helps approvers know whether the benchmark is strong or should be interpreted cautiously. |
| Example | 37 purchases from 4 suppliers gives stronger evidence than 1 purchase from 1 supplier. |

## Status Interpretation

| Status | Meaning | Recommended Action |
|---|---|---|
| Within Benchmark | Price is aligned with historical procurement behavior. | Review normally. |
| Review Price | Price is moderately above benchmark. | Check justification or specification. |
| Significant Variance | Price is materially above benchmark. | Challenge price, specification, or supplier assumptions. |
| High Overspend Risk | Price is far above benchmark. | Require strong justification before approval. |
| No Benchmark Available | No usable mapped procurement history exists. | Use manual review and consider improving mappings. |

## CFO-Friendly Example

| Field | Value |
|---|---:|
| Budget Item | Office Chair |
| Quantity | 50 |
| Budget Unit Price | SAR 420 |
| Historical Benchmark | SAR 390 |
| Unit Variance | SAR 30 |
| Variance % | 7.7% |
| Potential Overspend | SAR 1,500 |
| Status | Review Price |

Interpretation:

The item is not automatically rejected. The system highlights that approving the requested unit price may create SAR 1,500 of additional budget exposure compared with historical purchasing behavior.

# 13. Analytics

## Purpose

Analytics supports deeper budget investigation beyond daily dashboards.

## Users

| User | Analytics Use |
|---|---|
| CFO | Review financial exposure, high-risk areas, and department patterns. |
| Finance Leadership | Compare budget submissions and identify outliers. |
| Approvers | Investigate departments, categories, item costs, and variances. |
| Department Directors | Understand department-level budget behavior. |

## Business Value

- Compares budgets across departments and periods.
- Supports investigation of cost patterns and outliers.
- Helps Finance focus attention on areas needing review.
- Provides a foundation for smart analytics filters in the roadmap.

## Examples

- Compare Radiology and Laboratory budget requests.
- Identify departments with large year-over-year increases.
- Review items with high benchmark variance.
- Explore budgets with missing procurement benchmarks.

# 14. Dashboards

## Purpose

Dashboards provide role-based visibility into budget status, workload, and action requirements.

[SCREENSHOT: Budget Dashboard]

## Users and Decisions Supported

| User | Dashboard Visibility | Decisions Supported |
|---|---|---|
| Department Head | Budget status, returned items, action needs. | What needs revision or submission. |
| Approver | Pending budgets, transfers, PO links, workload. | What requires review. |
| CFO | Financial visibility, approval progress, risk indicators. | Where management attention is needed. |
| Administrator | Access and configuration-related activity. | Where governance setup is required. |

## Business Value

- Reduces dependency on manual follow-up.
- Makes pending work visible.
- Helps leaders identify bottlenecks.
- Supports quicker action on approvals, transfers, and PO links.

[SCREENSHOT: Approval Workload Dashboard]

# 15. Reporting Framework

Reporting is separate from analytics. Analytics supports exploration; reporting supports formal review, management packs, and audit evidence.

Current status: the reports area exists as a foundation, while the advanced reporting framework is a planned enhancement.

| Report Category | Users | Decisions Supported | Business Value |
|---|---|---|---|
| Budget Status Reports | CFO, Finance, Department Heads | Which budgets are draft, returned, pending, or approved. | Improves lifecycle visibility. |
| Department Reports | CFO, Finance Leadership, Directors | Department budget allocation and progress. | Supports department accountability. |
| Approval Reports | CFO, Approvers, Auditors | Approval workload, decisions, and turnaround. | Supports governance monitoring. |
| Transfer Reports | Finance, Approvers, Auditors | Balance movement between budget items. | Explains approved reallocations. |
| PO Linking Reports | Finance, Procurement, Auditors | PO activity connected to budget items. | Improves procurement transparency. |
| Consumption Reports | CFO, Finance, Department Heads | Approved, consumed, and remaining budget. | Supports budget control. |
| Price Intelligence Reports | CFO, Approvers, Procurement | Variance, missing benchmarks, and overspend risk. | Supports evidence-based review. |
| Audit Reports | Auditors, Admins, Finance Leadership | User actions and governance evidence. | Supports audit readiness. |
| Executive Reports | CFO, Hospital Executives | High-level financial position and key risks. | Supports leadership decisions. |

# 16. Email Notifications

Email notifications help ensure that the right stakeholders know when action is needed.

| Trigger | Primary Recipient | Business Purpose |
|---|---|---|
| Budget Submitted | Budget Approvers | Notify reviewers that a department budget is ready for approval. |
| Budget Approved | Budget Owner / Department | Confirm the budget has been approved. |
| Budget Returned | Budget Owner / Department | Notify the department that revisions or clarification are required. |
| Transfer Submitted | Transfer Approvers | Request approval for balance movement. |
| Transfer Approved | Transfer Requester | Confirm transfer approval and balance impact. |
| Transfer Rejected | Transfer Requester | Communicate that transfer was not accepted. |
| PO Link Submitted | PO Link Approvers | Notify approvers that a PO link requires review. |
| PO Link Approved | PO Link Requester | Confirm approved procurement linkage. |
| PO Link Rejected | PO Link Requester | Communicate rejected PO link and reason. |
| Financial Year Opened | Relevant Users | Notify users that the new planning cycle is available. |

Business value:

- Reduces manual follow-up.
- Speeds up workflow response.
- Helps users act at the right time.
- Improves accountability across departments and Finance.

# 17. Security & Permissions

Security is based on business responsibilities. Users are granted access according to what they need to view, edit, approve, or administer.

| Role / Responsibility | Typical Capabilities |
|---|---|
| Department Head | View department budget, create/edit budget, submit budget, view feedback. |
| Budget Approver | View pending budgets, approve budgets, return budgets, access analytics. |
| Transfer Approver | Review and approve or reject budget transfer requests. |
| PO Link Requester | Submit PO links for approved budget items. |
| PO Link Approver | Approve or reject PO link requests. |
| Administrator | Manage users, roles, permissions, categories, mappings, and financial years. |
| Report Viewer | Access budget and governance reporting. |

## Governance Value

- Enforces segregation of duties.
- Limits sensitive actions to authorized users.
- Ensures approvals are performed by designated roles.
- Supports accountability for configuration and access management.

# 18. Audit & Governance

Audit and governance features preserve evidence of important decisions and workflow actions.

## What Is Tracked

- Financial year creation, pre-closing, and closure.
- Budget creation, submission, approval, and return.
- Budget transfer creation, approval, and rejection.
- PO link creation, approval, and rejection.
- Item request activity.
- Access and administrative actions.

## Example Scenarios

| Scenario | Governance Question Answered |
|---|---|
| Budget returned for revision | Who returned it, when, and why? |
| Transfer approved | Who approved the transfer and what balance changed? |
| PO link approved | Which PO was linked to which budget item? |
| Financial year closed | Were required workflows resolved before closure? |
| Access changed | Who had permission to perform key actions? |

## Business Value

- Supports internal and external audit review.
- Reduces reliance on informal records.
- Preserves accountability for financial decisions.
- Helps Finance explain historical budget changes.

# 19. Benefits

## Department Heads

| Outcome | Benefit |
|---|---|
| Structured Budget Planning | Easier budget entry and fewer format inconsistencies. |
| Clear Status Visibility | Departments can see whether budgets are draft, returned, pending, or approved. |
| Actionable Feedback | Return notes make required corrections clear. |
| Better Budget Awareness | PO links and transfers make budget usage more transparent. |

## Approvers

| Outcome | Benefit |
|---|---|
| Central Approval Queue | Faster identification of budgets requiring review. |
| Item-Level Detail | Better understanding of quantity, price, and total amount. |
| Price Intelligence | Stronger evidence for challenging or accepting prices. |
| Controlled Return Flow | Clear documentation of required changes. |
| Analytics | Better ability to compare departments and identify outliers. |

## CFO

| Outcome | Benefit |
|---|---|
| Financial Visibility | Clearer view of approval status, budget exposure, and consumption. |
| Governance | Stronger approval, transfer, closure, and permission controls. |
| Procurement Transparency | PO activity becomes connected to approved budgets. |
| Overspend Risk Reduction | Benchmarking highlights high-variance items before approval. |
| Audit Readiness | Key actions are traceable and explainable. |

# 20. Financial Control Improvements

| Control Area | Improvement |
|---|---|
| Budget Control | Budgets are tied to financial years, departments, item types, and approval status. |
| Approval Discipline | Submitted budgets require approver action before final approval. |
| Return Discipline | Returned budgets include documented feedback and resubmission. |
| Transfer Control | Balance movement requires request and approval. |
| Procurement Control | PO links connect purchasing activity to approved budgets. |
| Consumption Visibility | Approved, consumed, transferred, and remaining values are visible. |
| Closure Control | Financial year closure considers unresolved approval, transfer, and PO link activity. |

The result is a stronger control environment where budget changes and consumption are visible, governed, and explainable.

# 21. Transparency & Accountability

## Before / After

| Area | Before | After |
|---|---|---|
| Budget Status | Required manual follow-up. | Visible through dashboards and budget pages. |
| Approval Decisions | Could be difficult to reconstruct. | Approve and return actions are captured. |
| Feedback | Could be scattered across messages. | Return feedback is part of the workflow. |
| PO Consumption | Could be disconnected from budget items. | Linked POs show budget consumption. |
| Price Reasonableness | Depended on individual experience. | Benchmarks provide shared evidence. |
| Accountability | Depended on informal records. | Audit logs preserve key actions. |

## Business Impact

- Departments understand what Finance needs from them.
- Approvers have better evidence for decisions.
- Finance can explain budget movement and consumption.
- Executives gain confidence in the control environment.

# 22. Risk Reduction

| Risk Type | Example Risk | System Control | Business Outcome |
|---|---|---|---|
| Financial Risk | Budgets approved without price context. | Price Intelligence and approval review. | Better challenge of high-variance requests. |
| Approval Risk | Budgets bypass formal review. | Approval workflow and permissions. | Stronger approval discipline. |
| Procurement Risk | PO usage not connected to budgets. | PO Linking and consumption tracking. | Better spend visibility. |
| Transfer Risk | Budget value moved informally. | Transfer request and approval workflow. | Controlled reallocations. |
| Closure Risk | Year closed with unresolved actions. | Financial year status and closure checks. | More reliable year-end governance. |
| Audit Risk | Decisions cannot be explained later. | Audit logs and workflow history. | Improved audit readiness. |
| Data Quality Risk | Historical procurement data not comparable. | PO Item Mapping. | Better benchmarking and PO suggestions. |

# 23. Current Capabilities

| Capability | Status | Business Value |
|---|---|---|
| Financial Year Management | Implemented | Controls the official budget planning and closure cycle. |
| Budget Creation | Implemented | Enables structured department budget preparation. |
| Budget Approval | Implemented | Provides formal review, approval, and return workflow. |
| Return & Feedback | Implemented | Documents revision requests and supports resubmission. |
| Budget Transfers | Implemented | Controls movement of budget value between items. |
| PO Linking | Implemented | Connects purchase orders to approved budget items. |
| PO Item Mapping | Implemented | Creates source-of-truth mapping for PO suggestions and benchmarking. |
| Budget Consumption Tracking | Implemented | Shows budget usage and remaining value through linked POs and transfers. |
| Price Intelligence | Implemented | Provides historical procurement benchmarks during approval. |
| Dashboards | Implemented | Gives role-based visibility into actions and status. |
| Budget Analytics | Implemented | Supports comparison and investigation of budget data. |
| Email Notifications | Implemented | Alerts users when workflow action is required. |
| Security & Permissions | Implemented | Enforces role-based access and segregation of duties. |
| Audit Logs | Implemented | Preserves traceability of key business actions. |
| Projects Visibility Foundation | Implemented / Partial | Shows project budget items and provides a foundation for future tracking. |
| Reporting Framework | Partial | Reports area exists; advanced report catalog is planned. |
| Companies / Vendors | Planned | Future supplier and multi-company visibility. |
| Smart Analytics Filters | Planned | Future easier exploration of Budget Analytics. |
| AI-Assisted Budget Discovery | Planned | Future executive intelligence capability, not current operation. |

# 24. Roadmap

The roadmap should be understood as a controlled evolution of the current governance platform. Planned items should not be presented as already operational unless implemented.

## Near-Term

| Roadmap Item | Status | Purpose |
|---|---|---|
| Projects | Planned / Foundation Present | Provide elevated visibility for important budget items. |
| Companies / Vendors | Planned | Improve supplier visibility and support future multi-company governance. |
| Advanced Reporting | Planned | Provide formal operational, financial, executive, and audit reports. |

## Future Vision

| Roadmap Item | Status | Purpose |
|---|---|---|
| Smart Analytics Filters | Planned | Let users filter analytics using business-language queries. |
| AI-Assisted Budget Discovery | Future Vision | Help users discover insights, clearly governed and not used as uncontrolled decision automation. |
| Executive Intelligence Enhancements | Future Vision | Expand dashboards, risk views, and procurement intelligence. |
| Additional Procurement Intelligence | Future Vision | Supplier benchmarking, market references, and historical benchmark snapshots. |

# 25. Projects Roadmap

Status: Planned / Foundation Present

## Business Definition

Project = Budget Item with elevated visibility and tracking.

Project does not mean full project management software.

## Purpose

Some budget items represent important initiatives that need more executive visibility than standard items.

Examples:

- HIS Upgrade Project
- Patient Portal Phase 2
- PACS Migration
- MRI Expansion Project
- New Laboratory Setup

## Current Direction

- Projects remain part of the budget process.
- Projects consume budget balances like other budget items.
- Projects participate in approval workflows.
- Projects belong to a department budget and financial year.
- Project name is represented by the budget item type.

## Future Benefits

| Benefit | Executive Value |
|---|---|
| Project Visibility | Important initiatives are easier to identify. |
| Project Reporting | Finance can report on strategic budget items separately. |
| Project Dashboards | Executives can monitor key initiatives. |
| Project Tracking | Future phases may add milestones, risks, documents, and procurement tracking. |

# 26. Companies & Vendors Roadmap

Status: Planned

## Purpose

Companies and vendor visibility would expand the platform's ability to analyze organizational and supplier-related budget activity.

## Potential Business Benefits

| Capability | Business Value |
|---|---|
| Supplier Spending Analysis | Understand how much budget and procurement activity goes to each supplier. |
| Vendor Concentration Reporting | Identify dependency on specific vendors. |
| Procurement Transparency | Make supplier relationships more visible to Finance and leadership. |
| Supplier-Based Budget Reporting | Support budget reviews by vendor or procurement category. |
| Strategic Sourcing Visibility | Support future sourcing and negotiation discussions. |
| Multi-Company Governance | Support company-specific data visibility and controls where required. |

## Executive Value

Vendor and company visibility would strengthen procurement governance and improve Finance's ability to monitor spend patterns across the organization.

# 27. Future Vision

The future direction should build on the current system without weakening governance or introducing unexplained decision-making.

## Principles

- Keep financial controls explainable.
- Maintain permission-based access.
- Preserve auditability of decisions.
- Avoid presenting future capabilities as current operations.
- Use intelligence features to support decisions, not replace accountability.

## Future Direction

| Area | Future Opportunity |
|---|---|
| Smart Analytics Filters | Allow users to type business-language filters such as "approved radiology budgets above SAR 500,000". |
| Advanced Reporting | Create CFO-ready reports for status, consumption, price intelligence, PO links, transfers, and audit. |
| Procurement Intelligence | Expand from item benchmarks into supplier, trend, and market-reference analysis. |
| AI-Assisted Discovery | Future guided insight discovery, clearly governed and labeled as future capability. |
| Benchmark Snapshots | Preserve benchmark values shown at approval time for historical audit review. |

# 28. Conclusion

QNH Budget Management System provides a strong foundation for hospital budget governance. It supports the full lifecycle from financial year opening to budget planning, approval, return feedback, transfers, PO linking, consumption tracking, analytics, reporting, notifications, permissions, and audit evidence.

The system improves financial control by making budget actions structured and traceable. It improves procurement visibility by connecting purchase orders to approved budget items. It improves decision support by showing historical procurement benchmarks during approval. It improves transparency by giving each stakeholder a clearer view of status, actions, and responsibilities.

For Finance Leadership and the CFO, the system provides:

- Stronger budget governance.
- Better approval discipline.
- Better visibility into budget consumption.
- Better procurement transparency.
- Better evidence for price review.
- Better audit readiness.
- A practical roadmap for future executive intelligence.

The strategic value is clear: the system helps QNH move from manual budget coordination toward controlled, transparent, evidence-based financial management.
