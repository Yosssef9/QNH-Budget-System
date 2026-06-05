# QNH Budget Management System

## User Guide & Functional Documentation

Version 1.0

---

# 1. Introduction

## Purpose

The QNH Budget Management System is the official platform used to plan, approve, monitor, and control departmental budgets throughout the financial year.

The system provides a complete budgeting lifecycle from annual planning through approval, spending control, transfer management, purchase order tracking, reporting, and financial year closure.

The system integrates with CareWare while maintaining independent budget governance and approval workflows.

---

# 2. System Features

The system provides the following capabilities.

## Financial Year Management

- Open Financial Year
- Manage Financial Year Statuses
- PRE_CLOSING Workflow
- Financial Year Closing
- Historical Financial Year Access
- Financial Year Reporting

---

## Budget Management

### Budget Creation

Departments can create budgets using:

- Manual Entry
- Excel Import
- Copy From Previous Budget
- Copy From Previous Financial Year
- Copy From Historical Budget Versions

---

### Budget Editing

- Create Draft Budgets
- Save Drafts
- Edit Draft Budgets
- Edit Returned Budgets
- Budget Version History
- Budget Change Tracking

---

### Budget Submission

- Submit Budget For Approval
- Resubmit Returned Budget
- View Submission History
- View Approval Status

---

### Budget Approval Workflow

- Budget Review
- Budget Approval
- Budget Return
- General Approval Notes
- Item Specific Approval Notes
- General Return Notes
- Item Specific Return Notes

---

### Budget Distribution Planning

Each budget item supports:

- Annual Distribution
- Monthly Distribution
- Quarterly Distribution
- Custom Monthly Distribution
- Custom Quarterly Distribution

Distribution planning allows departments to forecast expected spending throughout the year.

---

## Budget Monitoring

The system automatically tracks:

- Approved Budget Amount
- Planned Quantities
- Purchase Order Consumption
- Transfer Adjustments
- Remaining Balance
- Remaining Quantity
- Exceeded Budget Items
- Department Utilization

---

## Purchase Order Linking

The system integrates with CareWare approved Purchase Orders.

Features include:

- Approved PO Retrieval
- PO Line Selection
- PO Line Linking
- Budget Consumption Tracking
- Duplicate Link Prevention
- Remaining Balance Updates
- Over Budget Detection

---

## Transfer Management

The system supports:

### Existing Item To Existing Item Transfer

Example:

```text
PC Budget → Printer Budget
```

### Existing Item To New Item Transfer

Example:

```text
PC Budget → AI Server
```

### Transfer Methods

- Transfer By Amount
- Transfer By Quantity

### Transfer Workflow

- Submit Transfer Request
- Approver Review
- Approve Transfer
- Reject Transfer
- Balance Recalculation

---

## Item & Category Requests

Departments may request:

- New Categories
- New Budget Items
- New Item Types

Workflow:

```text
Submit Request
↓
Admin Review
↓
Approve / Reject
↓
Item Available For Budgeting
```

---

## Dashboards

### HOD Dashboard

Provides:

- Current Budget Status
- Budget Summary
- Remaining Budget
- Pending Requests
- Budget Utilization
- Recent Activities

---

### Budget Approver Dashboard

Provides:

- Pending Budgets
- Pending Transfers
- Pending Item Requests
- Approval Workload
- Financial Year Status

---

### Admin Dashboard

Provides:

- User Management
- Role Management
- Permission Management
- Financial Year Management
- Category Management
- Item Management

---

## Reporting

Available reports include:

- Budget Summary Report
- Department Budget Report
- Budget Utilization Report
- Remaining Balance Report
- Exceeded Budget Report
- Transfer History Report
- Purchase Order Consumption Report
- Financial Year Summary Report

---

## Audit Trail

The system records all major activities including:

- Budget Creation
- Budget Updates
- Budget Submission
- Budget Approval
- Budget Return
- Transfer Requests
- Transfer Approvals
- Item Requests
- PO Linking
- User Administration

---

## Notifications

The system supports notifications for:

- Budget Submitted
- Budget Approved
- Budget Returned
- Transfer Submitted
- Transfer Approved
- Transfer Rejected
- Item Request Approved
- Financial Year Opened
- Financial Year PRE_CLOSING
- Financial Year Closed

---

# 3. User Roles

## Head of Department (HOD)

Responsible for preparing and managing department budgets.

### Responsibilities

- Create Budgets
- Edit Draft Budgets
- Import Budgets
- Copy Historical Budgets
- Submit Budgets
- Create Transfer Requests
- Create Item Requests
- Link Approved Purchase Orders
- Monitor Budget Utilization

---

## Budget Approver

Responsible for budget governance and approvals.

### Responsibilities

- Review Budgets
- Approve Budgets
- Return Budgets
- Approve Transfers
- Reject Transfers
- Review Item Requests
- Manage Financial Years

---

## Administrator

Responsible for system configuration and security.

### Responsibilities

- Manage Users
- Manage Roles
- Manage Permissions
- Manage Categories
- Manage Items
- Review Audit Logs

---

# 4. Financial Year Lifecycle

The Financial Year passes through four main stages.

```text
OPEN
↓
Budget Preparation
↓
Budget Approval
↓
PRE_CLOSING
↓
PO Linking
↓
Transfer Management
↓
CLOSING
↓
CLOSED
```

The following sections explain each stage in detail.
