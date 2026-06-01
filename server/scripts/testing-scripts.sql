-- ============================================================
-- QNH Budget System
-- Testing Scripts
-- Purpose:
-- Quick data setup scripts for development and testing.
-- ============================================================

-- ============================================================
-- SECTION 1
-- BUDGET ITEMS TEST DATA
-- ============================================================

---

-- Ensure every budget has at least one active budget item
-- Safe to run multiple times (will not create duplicates)

---

INSERT INTO BS_budget_items
(
budget_id,
type_id,
quantity,
unit_price,
total_amount,
distribution_method,
distribution_level,
created_by
)
SELECT
b.id,
1,
12,
100,
1200,
'MONTHLY',
'MONTH',
1080
FROM BS_budgets b
WHERE NOT EXISTS
(
SELECT 1
FROM BS_budget_items bi
WHERE bi.budget_id = b.id
AND bi.is_active = 1
);

---

-- Ensure every budget item has monthly distribution rows
-- Creates 12 months distribution if missing
-- Safe to run multiple times

---

INSERT INTO BS_budget_item_distribution
(
budget_item_id,
period_type,
period_no,
quantity
)
SELECT
bi.id,
'MONTH',
m.MonthNo,
1
FROM BS_budget_items bi
CROSS JOIN
(
VALUES
(1),(2),(3),(4),(5),(6),
(7),(8),(9),(10),(11),(12)
) m(MonthNo)
WHERE NOT EXISTS
(
SELECT 1
FROM BS_budget_item_distribution d
WHERE d.budget_item_id = bi.id
);

-- ============================================================
-- SECTION 2
-- BUDGET STATUS TESTING
-- ============================================================

---

-- Set all budgets to DRAFT
-- Clears submission, approval and return information

---

UPDATE BS_budgets
SET
status = 'DRAFT',
submitted_by = NULL,
submitted_at = NULL,
approved_by = NULL,
approved_at = NULL,
returned_by = NULL,
returned_at = NULL,
updated_at = GETUTCDATE();

---

-- Set all budgets to PENDING
-- Simulates submitted budgets waiting for approval

---

UPDATE BS_budgets
SET
status = 'PENDING',
submitted_by = 1080,
submitted_at = GETUTCDATE(),
approved_by = NULL,
approved_at = NULL,
returned_by = NULL,
returned_at = NULL,
updated_at = GETUTCDATE();

---

-- Set all budgets to APPROVED
-- Simulates completed approval workflow

---

UPDATE BS_budgets
SET
status = 'APPROVED',
submitted_by = 1080,
submitted_at = GETUTCDATE(),
approved_by = 1080,
approved_at = GETUTCDATE(),
returned_by = NULL,
returned_at = NULL,
updated_at = GETUTCDATE();

---

-- Set all budgets to RETURNED
-- Simulates approver returning budgets for correction

---

UPDATE BS_budgets
SET
status = 'RETURNED',
submitted_by = 1080,
submitted_at = GETUTCDATE(),
returned_by = 1080,
returned_at = GETUTCDATE(),
approved_by = NULL,
approved_at = NULL,
updated_at = GETUTCDATE();

-- ============================================================
-- SECTION 3
-- FINANCIAL YEAR STATUS TESTING
-- ============================================================

---

-- Set latest financial year to OPEN
-- Closes all other years first

---

UPDATE BS_financial_years
SET
status = 'CLOSED',
pre_closed_by = NULL,
pre_closed_at = NULL,
closed_by = 1080,
closed_at = GETUTCDATE();

UPDATE BS_financial_years
SET
status = 'OPEN',
closed_by = NULL,
closed_at = NULL,
pre_closed_by = NULL,
pre_closed_at = NULL
WHERE id =
(
SELECT TOP 1 id
FROM BS_financial_years
ORDER BY year DESC
);

---

-- Set latest financial year to PRE_CLOSING
-- Closes all other years first

---

UPDATE BS_financial_years
SET
status = 'CLOSED';

UPDATE BS_financial_years
SET
status = 'PRE_CLOSING',
pre_closed_by = 1080,
pre_closed_at = GETUTCDATE(),
closed_by = NULL,
closed_at = NULL
WHERE id =
(
SELECT TOP 1 id
FROM BS_financial_years
ORDER BY year DESC
);

---

-- Set latest financial year to CLOSED
-- Simulates final year-end close

---

UPDATE BS_financial_years
SET
status = 'CLOSED',
closed_by = 1080,
closed_at = GETUTCDATE()
WHERE id =
(
SELECT TOP 1 id
FROM BS_financial_years
ORDER BY year DESC
);

-- ============================================================
-- SECTION 4
-- QUICK TEST SCENARIOS
-- ============================================================

---

-- Scenario:
-- Open latest year and approve all budgets
-- Useful for Transfers / PO Linking testing

---

UPDATE BS_budgets
SET
status = 'APPROVED',
submitted_by = 1080,
submitted_at = GETUTCDATE(),
approved_by = 1080,
approved_at = GETUTCDATE();

UPDATE BS_financial_years
SET
status = 'CLOSED';

UPDATE BS_financial_years
SET
status = 'OPEN'
WHERE id =
(
SELECT TOP 1 id
FROM BS_financial_years
ORDER BY year DESC
);

---

-- Scenario:
-- Move latest year to PRE_CLOSING and approve all budgets
-- Useful for Transfers and PO Linking workflow testing

---

UPDATE BS_budgets
SET
status = 'APPROVED',
approved_by = 1080,
approved_at = GETUTCDATE();

UPDATE BS_financial_years
SET
status = 'CLOSED';

UPDATE BS_financial_years
SET
status = 'PRE_CLOSING',
pre_closed_by = 1080,
pre_closed_at = GETUTCDATE()
WHERE id =
(
SELECT TOP 1 id
FROM BS_financial_years
ORDER BY year DESC
);

---

-- Scenario:
-- Reset system for budget entry testing
-- Latest year OPEN + all budgets DRAFT

---

UPDATE BS_budgets
SET
status = 'DRAFT',
submitted_by = NULL,
submitted_at = NULL,
approved_by = NULL,
approved_at = NULL,
returned_by = NULL,
returned_at = NULL;

UPDATE BS_financial_years
SET
status = 'CLOSED';

UPDATE BS_financial_years
SET
status = 'OPEN'
WHERE id =
(
SELECT TOP 1 id
FROM BS_financial_years
ORDER BY year DESC
);
