DECLARE @FinancialYearId INT;

SELECT @FinancialYearId = id
FROM BS_financial_years
WHERE status = 'OPEN';

-- Add 4 items to DRAFT budgets only

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
    v.type_id,
    10,
    100,
    1000,
    'MONTHLY',
    'MONTH',
    1080
FROM BS_budgets b
CROSS JOIN
(
    VALUES
        (6),   -- Desktop Computer
        (7),   -- Laptop
        (10),  -- Syringes
        (14)   -- Software License
) v(type_id)
WHERE b.financial_year_id = @FinancialYearId
AND b.status = 'DRAFT'
AND NOT EXISTS
(
    SELECT 1
    FROM BS_budget_items bi
    WHERE bi.budget_id = b.id
      AND bi.type_id = v.type_id
      AND bi.is_active = 1
);

-- Approve all budgets in current OPEN year

UPDATE BS_budgets
SET
    status = 'APPROVED',
    submitted_by = ISNULL(submitted_by, 1080),
    submitted_at = ISNULL(submitted_at, GETUTCDATE()),
    approved_by = 1080,
    approved_at = GETUTCDATE(),
    returned_by = NULL,
    returned_at = NULL,
    updated_at = GETUTCDATE()
WHERE financial_year_id = @FinancialYearId;