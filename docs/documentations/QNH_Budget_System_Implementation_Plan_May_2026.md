# 🏥 QNH Budget System Plan

## 📅 Delivery Plan (May 5 → May 31, 2026)

---

## 🎯 Objective

Deliver a structured and fully functional hospital budget system through clearly defined, testable phases.  
Each phase introduces a complete part of the system that can be reviewed and validated before moving to the next stage.

---

<!--
## 🧠 System Overview

The Budget System is designed to support hospital financial planning and control by enabling:

- Department budget preparation
- Structured approval workflow
- Tracking of actual spending based on CareWare data
- Monitoring of remaining and exceeded budgets
- Budget adjustments through transfers
- Generation of clear and reliable reports

### 🔗 Integration Scope

- **CareWare remains responsible for:**
  - Purchase Order (PO) creation and approval

- **Budget System is responsible for:**
  - Budget planning and approval
  - Linking approved PO lines
  - Budget tracking and reporting

--- -->

## ✅ Completed Features

### 🔐 Access and Permissions

- User authentication is implemented
- Role-based access is enforced (HOD, Approver, Admin)
- Permissions are applied based on user role

### 📝 Budget Entry

- Budget items can be added, edited, and removed
- Draft saving is supported
- Input validation ensures:
  - Required fields are completed
  - No duplicate items are allowed
  - Quantities and distributions are consistent
- Users are warned before leaving unsaved changes
- Data is preserved during page refresh

### 📊 Budget Planning Logic

- Supports multiple distribution methods:
  - Annual
  - Monthly
  - Quarterly
  - Custom distribution
- Automatic calculations ensure accuracy of totals and summaries

### 🎨 User Experience

- Clear status indicators for saved and unsaved changes
- Clean and consistent interface behavior
- Safe user interactions with confirmation where required

---

## ❗ Features Still to Be Implemented

The following features are required to complete the system:

- Budget submission workflow
- Budget approval and return process
- Notes between approver and departments
- Excel-based budget import
- Copying budgets from previous periods
- Integration with CareWare for PO tracking
- Budget balance calculation
- Budget transfers between items
- Reporting and analytics

---

## 🚀 Delivery Approach

The implementation is divided into four phases.  
Each phase delivers a complete, testable functionality to ensure stability and continuous progress.

---

## 🟢 Phase 1 — Budget Entry (May 5 → May 7)

### Scope

- Connect budgets page to real database
- Enable full draft management
- Allow submission of budgets for approval

### Key Capabilities

- Open and manage department budgets
- Add, update, and remove items
- Save draft multiple times
- Submit budget for review

### Outcome

Departments can fully prepare and submit their budgets within the system.

---

## 🟡 Phase 2 — Approval Workflow (May 8 → May 12)

### Scope

- Implement approval and return process
- Introduce communication through notes

### Key Capabilities

- Approver can review submitted budgets
- Approve or return budgets with comments
- Departments can update and resubmit returned budgets

### Outcome

A complete approval cycle is established with clear accountability and communication.

---

## 🔵 Phase 3 — Data Efficiency and Administration (May 13 → May 20)

### Scope

- Improve data entry efficiency
- Enable administrative control over system structure

### Key Capabilities

#### Excel Import

- Upload and validate budget data from Excel
- Preview data before saving

#### Budget Copy

- Copy budgets from previous versions or years
- Modify copied data before submission

#### Administrative Setup

- Manage categories and item types
- Control available budget items
- Handle item requests

### Outcome

Data entry becomes faster and more flexible while maintaining consistency and control.

---

## 🔴 Phase 4 — Budget Control and Monitoring (May 21 → May 31)

### Scope

- Enable real-time budget tracking and financial control

### Key Capabilities

#### PO Linking

- Link approved CareWare purchase orders to budget items
- Track actual spending

#### Balance Monitoring

- Display current budget status
- Identify exceeded budgets

#### Transfers

- Allow budget reallocation between items
- Require approval for transfers

#### Reporting

- Provide visibility into:
  - Budget vs actual spending
  - Remaining balances
  - Transfer activity

### Outcome

The system provides full visibility and control over departmental budgets and spending.

---

## 🧪 Testing Strategy

Each phase is independently testable:

- Phase 1: Budget entry and submission
- Phase 2: Approval workflow and notes
- Phase 3: Excel import, copying, and admin setup
- Phase 4: PO linking, balance tracking, transfers, and reporting

---

## 🏁 Final Outcome

By the end of May, the system will provide:

- A complete budgeting workflow from entry to approval
- Integration with actual spending data
- Real-time visibility of budget status
- Controlled adjustment mechanisms
- Structured reporting for management

---

<!--
## 📌 Summary

The delivery plan ensures a gradual transition from budget preparation to full financial control.
Each phase introduces meaningful functionality that supports real hospital operations and allows continuous validation. -->
