# QNH Budget System

# Multi-Company / Multi-Tenant Architecture Plan

## Executive Summary

The current Budget System operates as a single-company application.

The objective is to transform it into a multi-company platform where:

- Multiple companies can exist within the same system.
- Users only see companies they have access to.
- Data is completely isolated between companies.
- Permissions are enforced per company.
- Financial years, budgets, transfers, PO links, notifications, reports, and audit logs are company-specific.
- Users select a company after login.
- Administrators can create and manage companies.

This architecture follows a standard SaaS multi-tenant model using a shared database with tenant isolation through `company_id`.

---

# Goals

## Functional Goals

### Company Management

System administrators can:

- Create companies
- Disable companies
- Edit company information
- View company statistics

### User Access

Users:

- Can belong to one company
- Can belong to multiple companies
- Can have different roles in different companies

### Company Selection

After authentication:

1. User sees accessible companies only
2. User selects a company
3. System enters company context

### Data Isolation

Users from Company A must never see:

- Budgets from Company B
- Transfers from Company B
- PO Links from Company B
- Notifications from Company B
- Reports from Company B

---

# Recommended Architecture

## Recommended Pattern

### Shared Database + Company Isolation

Use:

```text
One Application
One Database
Multiple Companies
```

Every business record belongs to a company.

Example:

```text
Company A
  Budget 1
  Budget 2

Company B
  Budget 3
  Budget 4
```

All data remains in the same database but is isolated through company ownership.

---

# Architecture Options Considered

## Option 1 — Separate Database Per Company

Example:

```text
QNH_Budget_Company_A
QNH_Budget_Company_B
QNH_Budget_Company_C
```

### Advantages

- Maximum isolation
- Easier company-specific backup

### Disadvantages

- Difficult migrations
- High operational complexity
- More infrastructure
- More maintenance

### Recommendation

Not recommended for this project.

---

## Option 2 — Duplicate Tables Per Company

Example:

```text
BS_BUDGETS_COMPANY_A
BS_BUDGETS_COMPANY_B
```

### Advantages

- None significant

### Disadvantages

- Massive maintenance burden
- Difficult upgrades
- Not scalable

### Recommendation

Strongly rejected.

---

## Option 3 — Shared Database + Company ID

Example:

```sql
company_id
```

added to business tables.

### Advantages

- Simple deployment
- Scalable
- Easy maintenance
- Common SaaS pattern

### Recommendation

Recommended.

---

# Database Design

## New Table: BS_COMPANIES

```sql
CREATE TABLE BS_COMPANIES (
    id BIGINT IDENTITY PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    code NVARCHAR(50) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
```

---

## New Table: BS_USER_COMPANIES

```sql
CREATE TABLE BS_USER_COMPANIES (
    id BIGINT IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    department_id BIGINT NULL,
    is_active BIT NOT NULL DEFAULT 1
);
```

Purpose:

```text
User
 -> Company
 -> Role
 -> Department
```

Example:

```text
Yasser

Company A
  HOD

Company B
  Approver
```

---

# Required Schema Changes

Add:

```sql
company_id BIGINT NOT NULL
```

to:

- BS_BUDGETS
- BS_BUDGET_ITEMS
- BS_BUDGET_TRANSFERS
- BS_PO_LINKS
- BS_NOTIFICATIONS
- BS_AUDIT_LOGS
- BS_FINANCIAL_YEARS
- BS_CATEGORIES

## Budget Types

Decision Required:

### Option A

Global

### Option B

Company Specific

### Recommendation

Keep Budget Types Global unless companies require different purchasing catalogs.

---

# Authentication Flow

## Current

```text
Login
  ↓
Dashboard
```

## Proposed

```text
Login
  ↓
Company Selection Page
  ↓
Dashboard
```

---

# Company Selection Page

Example:

```text
Select Company

[ QNH Hospital ]
[ QNH Pharmacy ]
[ QNH Medical Center ]
```

Only companies assigned to the user appear.

If the user has no company access:

```text
No company access assigned.
Please contact administrator.
```

---

# JWT Changes

## Current

```json
{
  "userId": 573,
  "roleId": 4,
  "departmentId": 30
}
```

## Proposed

```json
{
  "userId": 573,
  "companyId": 2,
  "roleId": 4,
  "departmentId": 30
}
```

The selected company becomes part of every request.

---

# Permission Model

## Current

```text
User
 -> Role
 -> Permissions
```

## Proposed

```text
User
 -> Company
 -> Role
 -> Permissions
```

Permissions become company-specific.

Example:

```text
Yasser

Company A
  can_approve_budget = true

Company B
  can_approve_budget = false
```

---

# Middleware Changes

## verifyBudgetAccess

Must validate:

- User belongs to company
- Company active
- Role active
- Permission available

---

# Repository Changes

Current:

```sql
SELECT *
FROM BS_BUDGETS
WHERE id = @budgetId
```

Proposed:

```sql
SELECT *
FROM BS_BUDGETS
WHERE id = @budgetId
  AND company_id = @companyId
```

Every repository query must become company-aware.

---

# Security Requirements

## Critical Rule

Never trust `company_id` from:

- URL
- Query String
- Request Body

Always use the authenticated company context.

Example:

```text
JWT
→ verifyBudgetAccess
→ company_id
→ repository
```

Never:

```text
Request Body
→ company_id
→ repository
```

---

# Notifications

Current notifications are global.

Future notifications must include:

```sql
company_id
```

Example:

```text
Budget Approved
Company A
```

must never appear for Company B users.

---

# Audit Logs

Every audit record should include:

```sql
company_id
```

Example:

```text
Company A
Budget Approved
```

must only be visible inside Company A.

---

# Financial Years

## Option A

One Financial Year For All Companies

Example:

```text
2028
```

Problems:

- Company A closing the year impacts Company B

## Option B

Financial Years Per Company

Example:

```text
Company A
  2028 OPEN

Company B
  2028 CLOSED
```

### Recommendation

Strongly recommended.

---

# Reporting

All reports must automatically filter by:

```sql
company_id
```

Cross-company reporting should only be available to authorized global administrators.

---

# Migration Strategy

## Phase 1

Create:

```text
BS_COMPANIES
```

Insert default company:

```text
QNH Hospital
```

```text
ID = 1
```

## Phase 2

Add:

```sql
company_id
```

to all business tables.

Initially:

```sql
NULL
```

allowed.

## Phase 3

Populate Existing Data

```sql
UPDATE ...
SET company_id = 1
```

## Phase 4

Add Constraints

```sql
company_id NOT NULL
```

## Phase 5

Update Repositories

Every query becomes company-scoped.

## Phase 6

Implement Company Selection UI

## Phase 7

Implement Middleware Validation

## Phase 8

Enable Multi-Company Administration

---

# Risks

## High Risk

Missing company filter in repository query.

Impact:

```text
Cross-company data leak
```

## Medium Risk

Background jobs without company context.

Impact:

```text
Incorrect notifications
```

## Medium Risk

Audit logs missing company IDs.

Impact:

```text
Cross-company audit visibility
```

---

# Recommended Implementation Order

## Phase 1

Database Foundation

## Phase 2

Company Selection

## Phase 3

Authentication Updates

## Phase 4

Permission Updates

## Phase 5

Repository Isolation

## Phase 6

Notification Updates

## Phase 7

Audit Updates

## Phase 8

Reporting Updates

## Phase 9

Testing & Security Audit

---

# Final Recommendation

Implement a true multi-company architecture using:

```text
Shared Database
+
BS_COMPANIES
+
BS_USER_COMPANIES
+
company_id on business tables
+
Company Selection Page
+
Company-Aware Permissions
+
Company-Aware Middleware
```

This provides:

- Strong company isolation
- Lower operational complexity
- Easier maintenance
- Better scalability
- Consistent architecture across the entire Budget System

while avoiding the long-term maintenance burden of separate databases or duplicated tables.
