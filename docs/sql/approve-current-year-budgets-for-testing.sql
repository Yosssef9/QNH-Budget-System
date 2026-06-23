/*
  TESTING ONLY
  ------------
  Purpose:
    Add test budget items to all active budgets in the current active
    financial year, then mark those budgets as APPROVED.

  Use case:
    Fast local/UAT testing when you need every current-year budget approved
    before moving the financial year to the next lifecycle status.

  Important:
    - This bypasses the normal approval workflow.
    - This does not create approval notifications.
    - This does not create approval audit-log records.
    - Do not use in production unless explicitly approved by Finance/System Admin.

  Optional:
    Set @ApprovedByUserId to a valid user id if you want approved_by/submitted_by
    populated where those columns exist and are currently NULL.

    Set @SeedCreatedByUserId to a valid user id if BS_budget_items.created_by
    is required in your database. The existing project testing script uses 1080.

    Set @ItemsPerBudget to control how many active item types are seeded into
    each budget. Existing active item types in a budget are skipped.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ApprovedByUserId BIGINT = NULL;
DECLARE @SeedCreatedByUserId INT = 1080;
DECLARE @FinancialYearIdOverride INT = NULL;
DECLARE @ItemsPerBudget INT = 3;

DECLARE @FinancialYearId INT;
DECLARE @FinancialYearLabel NVARCHAR(50);
DECLARE @FinancialYearStatus NVARCHAR(50);

SELECT TOP (1)
    @FinancialYearId = fy.id,
    @FinancialYearLabel = CAST(fy.[year] AS NVARCHAR(50)),
    @FinancialYearStatus = fy.status
FROM dbo.BS_financial_years fy
WHERE fy.id = COALESCE(@FinancialYearIdOverride, fy.id)
  AND fy.status IN ('OPEN', 'PRE_CLOSING')
ORDER BY
    CASE fy.status
        WHEN 'OPEN' THEN 1
        WHEN 'PRE_CLOSING' THEN 2
        ELSE 3
    END,
    fy.[year] DESC,
    fy.id DESC;

IF @FinancialYearId IS NULL
BEGIN
    THROW 51000, 'No OPEN or PRE_CLOSING financial year found. Set @FinancialYearIdOverride if needed.', 1;
END;

IF @ItemsPerBudget <= 0
BEGIN
    THROW 51001, '@ItemsPerBudget must be greater than 0.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.BS_budget_types t
    WHERE t.is_active = 1
)
BEGIN
    THROW 51002, 'No active budget item types found. Add active budget types before running this test script.', 1;
END;

PRINT 'Target financial year id: ' + CAST(@FinancialYearId AS NVARCHAR(20));
PRINT 'Target financial year: ' + COALESCE(@FinancialYearLabel, '(unknown)');
PRINT 'Target financial year status: ' + COALESCE(@FinancialYearStatus, '(unknown)');
PRINT 'Items to seed per budget: ' + CAST(@ItemsPerBudget AS NVARCHAR(20));

SELECT
    b.status,
    COUNT(*) AS budget_count_before
FROM dbo.BS_budgets b
WHERE b.financial_year_id = @FinancialYearId
  AND b.is_active = 1
GROUP BY b.status
ORDER BY b.status;

BEGIN TRANSACTION;

CREATE TABLE #SeededBudgetItems (
    budget_item_id BIGINT NOT NULL PRIMARY KEY,
    quantity DECIMAL(18,2) NOT NULL
);

DECLARE @ItemInsertColumns NVARCHAR(MAX) = N'
    budget_id,
    type_id';

DECLARE @ItemSelectColumns NVARCHAR(MAX) = N'
    b.id,
    seed.type_id';

IF COL_LENGTH('dbo.BS_budget_items', 'category_id') IS NOT NULL
BEGIN
    SET @ItemInsertColumns = @ItemInsertColumns + N',
    category_id';
    SET @ItemSelectColumns = @ItemSelectColumns + N',
    seed.category_id';
END;

SET @ItemInsertColumns = @ItemInsertColumns + N',
    quantity,
    unit_price,
    total_amount';

SET @ItemSelectColumns = @ItemSelectColumns + N',
    CAST(12 * seed.seed_no AS DECIMAL(18,2)) AS quantity,
    CAST(100 * seed.seed_no AS DECIMAL(18,2)) AS unit_price,
    CAST((12 * seed.seed_no) * (100 * seed.seed_no) AS DECIMAL(18,2)) AS total_amount';

IF COL_LENGTH('dbo.BS_budget_items', 'expense_type') IS NOT NULL
BEGIN
    SET @ItemInsertColumns = @ItemInsertColumns + N',
    expense_type';

    IF COL_LENGTH('dbo.BS_budget_types', 'expense_type') IS NOT NULL
    BEGIN
        SET @ItemSelectColumns = @ItemSelectColumns + N',
    COALESCE(seed.expense_type, ''OPEX'') AS expense_type';
    END;
    ELSE
    BEGIN
        SET @ItemSelectColumns = @ItemSelectColumns + N',
    ''OPEX'' AS expense_type';
    END;
END;

SET @ItemInsertColumns = @ItemInsertColumns + N',
    distribution_method,
    distribution_level';

SET @ItemSelectColumns = @ItemSelectColumns + N',
    ''MONTHLY'' AS distribution_method,
    ''MONTH'' AS distribution_level';

IF COL_LENGTH('dbo.BS_budget_items', 'is_project') IS NOT NULL
BEGIN
    SET @ItemInsertColumns = @ItemInsertColumns + N',
    is_project';
    SET @ItemSelectColumns = @ItemSelectColumns + N',
    CAST(0 AS BIT) AS is_project';
END;

IF COL_LENGTH('dbo.BS_budget_items', 'created_by') IS NOT NULL
BEGIN
    SET @ItemInsertColumns = @ItemInsertColumns + N',
    created_by';
    SET @ItemSelectColumns = @ItemSelectColumns + N',
    @SeedCreatedByUserId AS created_by';
END;

DECLARE @SeedExpenseTypeColumn NVARCHAR(MAX) = N'';

IF COL_LENGTH('dbo.BS_budget_types', 'expense_type') IS NOT NULL
BEGIN
    SET @SeedExpenseTypeColumn = N',
        t.expense_type';
END;

DECLARE @SeedSql NVARCHAR(MAX) = N'
;WITH SeedTypes AS (
    SELECT TOP (@ItemsPerBudget)
        ROW_NUMBER() OVER (ORDER BY t.id) AS seed_no,
        t.id AS type_id,
        t.category_id' + @SeedExpenseTypeColumn + N'
    FROM dbo.BS_budget_types t
    WHERE t.is_active = 1
    ORDER BY t.id
),
TargetBudgets AS (
    SELECT b.id
    FROM dbo.BS_budgets b
    WHERE b.financial_year_id = @FinancialYearId
      AND b.is_active = 1
)
INSERT INTO dbo.BS_budget_items (
' + @ItemInsertColumns + N'
)
OUTPUT INSERTED.id, INSERTED.quantity
INTO #SeededBudgetItems (budget_item_id, quantity)
SELECT
' + @ItemSelectColumns + N'
FROM TargetBudgets b
CROSS JOIN SeedTypes seed
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.BS_budget_items existing
    WHERE existing.budget_id = b.id
      AND existing.type_id = seed.type_id
      AND existing.is_active = 1
);';

EXEC sp_executesql
    @SeedSql,
    N'@FinancialYearId INT, @ItemsPerBudget INT, @SeedCreatedByUserId INT',
    @FinancialYearId = @FinancialYearId,
    @ItemsPerBudget = @ItemsPerBudget,
    @SeedCreatedByUserId = @SeedCreatedByUserId;

DECLARE @ItemsSeeded INT = (
    SELECT COUNT(*)
    FROM #SeededBudgetItems
);

PRINT 'Budget items seeded: ' + CAST(@ItemsSeeded AS NVARCHAR(20));

INSERT INTO dbo.BS_budget_item_distribution (
    budget_item_id,
    period_type,
    period_no,
    quantity
)
SELECT
    seeded.budget_item_id,
    'MONTH',
    months.month_no,
    seeded.quantity / 12
FROM #SeededBudgetItems seeded
CROSS JOIN (
    VALUES
        (1),(2),(3),(4),(5),(6),
        (7),(8),(9),(10),(11),(12)
) months(month_no)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.BS_budget_item_distribution existing
    WHERE existing.budget_item_id = seeded.budget_item_id
      AND existing.period_type = 'MONTH'
      AND existing.period_no = months.month_no
);

PRINT 'Monthly distribution rows seeded: ' + CAST(@@ROWCOUNT AS NVARCHAR(20));

DECLARE @SetClause NVARCHAR(MAX) = N'
    status = ''APPROVED'',
    approved_at = COALESCE(approved_at, GETUTCDATE()),
    returned_at = NULL';

IF COL_LENGTH('dbo.BS_budgets', 'approved_by') IS NOT NULL
BEGIN
    SET @SetClause = @SetClause + N',
    approved_by = COALESCE(approved_by, @ApprovedByUserId)';
END;

IF COL_LENGTH('dbo.BS_budgets', 'returned_by') IS NOT NULL
BEGIN
    SET @SetClause = @SetClause + N',
    returned_by = NULL';
END;

IF COL_LENGTH('dbo.BS_budgets', 'submitted_at') IS NOT NULL
BEGIN
    SET @SetClause = @SetClause + N',
    submitted_at = COALESCE(submitted_at, GETUTCDATE())';
END;

IF COL_LENGTH('dbo.BS_budgets', 'submitted_by') IS NOT NULL
BEGIN
    SET @SetClause = @SetClause + N',
    submitted_by = COALESCE(submitted_by, @ApprovedByUserId)';
END;

DECLARE @BudgetsUpdated INT;

DECLARE @Sql NVARCHAR(MAX) = N'
UPDATE b
SET ' + @SetClause + N'
FROM dbo.BS_budgets b
WHERE b.financial_year_id = @FinancialYearId
  AND b.is_active = 1
  AND b.status <> ''APPROVED'';

SET @RowsUpdatedOut = @@ROWCOUNT;';

EXEC sp_executesql
    @Sql,
    N'@FinancialYearId INT, @ApprovedByUserId BIGINT, @RowsUpdatedOut INT OUTPUT',
    @FinancialYearId = @FinancialYearId,
    @ApprovedByUserId = @ApprovedByUserId,
    @RowsUpdatedOut = @BudgetsUpdated OUTPUT;

PRINT 'Budgets updated: ' + CAST(@BudgetsUpdated AS NVARCHAR(20));

SELECT
    b.status,
    COUNT(*) AS budget_count_after
FROM dbo.BS_budgets b
WHERE b.financial_year_id = @FinancialYearId
  AND b.is_active = 1
GROUP BY b.status
ORDER BY b.status;

COMMIT TRANSACTION;

/*
  After this script succeeds, the financial-year pre-closing check for
  "all active budgets approved" should pass, assuming there are no other
  blockers such as pending transfers or pending PO link requests.
*/
