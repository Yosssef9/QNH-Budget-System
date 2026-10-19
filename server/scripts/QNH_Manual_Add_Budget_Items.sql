/*
 QNH Budget System -- emergency manual ADD of EXISTING catalog items.
 Based on QNHDB schema export 2026-10-19. Not executed on a live database.

 What this script does:
  - Adds only the requested, previously absent catalog items for ONE department/year/category.
  - Adds ONE requested ANNUAL distribution (YEAR/1 = requested quantity) per item.
  - Keeps all existing items, approvals, approved distributions, and model allocations unchanged.
  - By default, reopens ONLY the target category budget to IN_CATEGORY_REVIEW (NOT DRAFT)
    when it was CATEGORY_REVIEW_COMPLETED, and adds new items PENDING_CATEGORY_REVIEW.
  - Records a budget workflow-history audit row.
  - DOES NOT fabricate approvals or create/allocate package models.

 PREVIEW first. On APPLY, set @Mode='APPLY' and @ConfirmBudgetId to the previewed ID.
 Back up QNHDB first. Review downstream package reconciliation in the application.
*/
USE [QNHDB];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- =========================== EDIT THESE ===========================
DECLARE @Mode varchar(10) = 'PREVIEW';      -- PREVIEW / APPLY
DECLARE @DepartmentCode varchar(50) = 'BIO_MEDICAL_ENGINEERING';
DECLARE @CategoryCode varchar(30) = 'BIOMEDICAL';
DECLARE @FinancialYear int = 2027;
DECLARE @ActorAdminUserId int = 1080;     -- Existing active administrator USER_ID
DECLARE @ConfirmBudgetId bigint = 2;      -- Must equal BudgetId in PREVIEW when APPLY
DECLARE @ReopenCategoryReview bit = 1;    -- 1: COMPLETED -> IN_CATEGORY_REVIEW (never DRAFT)
DECLARE @Reason nvarchar(1000) = N'Urgent manual addition of missing Biomedical Engineering items';

-- Find the correct item codes using the FIRST result set (CatalogLookup) from PREVIEW.
-- Add one or more existing catalog item codes with DIFFERENT quantities.
DECLARE @NewItems TABLE (
    ItemCode varchar(80) NOT NULL PRIMARY KEY,
    RequestedQuantity decimal(18,4) NOT NULL
);
INSERT INTO @NewItems (ItemCode, RequestedQuantity)
VALUES
    ('REPLACE_WITH_REAL_ITEM_CODE', 5.0000);
    -- ,('SECOND_REAL_ITEM_CODE', 2.0000)   -- Move the semicolon to the last row.
-- ===================================================================

IF DB_NAME() <> N'QNHDB' THROW 53001, 'Wrong database: must be QNHDB.', 1;
IF @Mode NOT IN ('PREVIEW','APPLY') THROW 53002, 'Mode must be PREVIEW or APPLY.', 1;
IF @@TRANCOUNT <> 0 THROW 53003, 'Open a fresh query window outside any transaction.', 1;
IF NOT EXISTS (SELECT 1 FROM @NewItems) THROW 53004, 'Add at least one catalog item to @NewItems.', 1;

DECLARE @BudgetId bigint, @BudgetCount int, @CategoryId int, @YearId int,
        @BudgetStatus varchar(40), @YearStatus varchar(20), @PackageId bigint,
        @PackageStatus varchar(40), @PackageCount int, @PackagePurchasingAt datetime2(3),
        @PackageCfoAt datetime2(3), @PackageCompletedAt datetime2(3),
        @InvalidCount int, @InsertedCount int, @DistributionCount int, @AuditId bigint,
        @DownstreamActivity bit = 0,
        @OldJson nvarchar(max), @NewJson nvarchar(max), @OldStatus varchar(40),
        @NewStatus varchar(40), @CorrelationId uniqueidentifier = NEWID();
DECLARE @Inserted TABLE (NewBudgetItemId bigint PRIMARY KEY, CatalogItemId int, RequestedQuantity decimal(18,4));

DROP TABLE IF EXISTS #CheckedItems;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRY
    BEGIN TRANSACTION;

    SELECT @BudgetCount=COUNT(*), @BudgetId=MIN(dcb.id)
    FROM dbo.BS_department_category_budgets AS dcb WITH (UPDLOCK, HOLDLOCK)
    JOIN dbo.BS_department_budgets AS db ON db.id=dcb.department_budget_id
    JOIN dbo.BS_departments AS d ON d.id=db.department_id
    JOIN dbo.BS_financial_years AS fy ON fy.id=db.financial_year_id
    JOIN dbo.BS_budget_categories AS c ON c.id=dcb.budget_category_id
    WHERE d.department_code=@DepartmentCode
      AND c.category_code=@CategoryCode AND fy.year=@FinancialYear;

    IF @BudgetCount=1
    BEGIN
        SELECT @BudgetStatus=dcb.status, @CategoryId=dcb.budget_category_id,
               @YearId=db.financial_year_id, @YearStatus=fy.status
        FROM dbo.BS_department_category_budgets AS dcb WITH (UPDLOCK, HOLDLOCK)
        JOIN dbo.BS_department_budgets AS db ON db.id=dcb.department_budget_id
        JOIN dbo.BS_financial_years AS fy ON fy.id=db.financial_year_id
        WHERE dcb.id=@BudgetId;

        SELECT @PackageCount=COUNT(*), @PackageId=MIN(p.id)
        FROM dbo.BS_category_budget_packages AS p WITH (UPDLOCK, HOLDLOCK)
        WHERE p.budget_category_id=@CategoryId AND p.financial_year_id=@YearId;

        IF @PackageCount=1
            SELECT @PackageStatus=p.status, @PackagePurchasingAt=p.submitted_to_purchasing_at,
                   @PackageCfoAt=p.submitted_to_cfo_at,
                   @PackageCompletedAt=p.cfo_review_completed_at
            FROM dbo.BS_category_budget_packages AS p WITH (UPDLOCK, HOLDLOCK)
            WHERE p.id=@PackageId;

        -- Model allocations for existing items are allowed and never touched.
        -- Actual Purchasing/CFO/PO/transfer activity is NOT safe for this direct edit.
        IF @PackageCount=1 AND (
            EXISTS (SELECT 1 FROM dbo.BS_category_budget_package_items AS pi
                    WHERE pi.category_budget_package_id=@PackageId
                      AND (pi.cfo_review_status IS NOT NULL OR pi.cfo_reviewed_at IS NOT NULL
                           OR pi.cfo_reviewed_by IS NOT NULL))
            OR EXISTS (SELECT 1 FROM dbo.BS_category_budget_package_sub_item_price_reviews AS pr
                       WHERE pr.category_budget_package_id=@PackageId)
            OR EXISTS (SELECT 1 FROM dbo.BS_category_po_links AS pol
                       JOIN dbo.BS_category_budget_package_sub_items AS psi
                         ON psi.id=pol.category_budget_package_sub_item_id
                       JOIN dbo.BS_category_budget_package_items AS pi
                         ON pi.id=psi.category_budget_package_item_id
                       WHERE pi.category_budget_package_id=@PackageId)
            OR EXISTS (SELECT 1 FROM dbo.BS_category_budget_transfers AS t
                       WHERE t.from_package_sub_item_id IN (
                          SELECT psi.id FROM dbo.BS_category_budget_package_sub_items AS psi
                          JOIN dbo.BS_category_budget_package_items AS pi
                            ON pi.id=psi.category_budget_package_item_id
                          WHERE pi.category_budget_package_id=@PackageId)
                       OR t.to_package_sub_item_id IN (
                          SELECT psi.id FROM dbo.BS_category_budget_package_sub_items AS psi
                          JOIN dbo.BS_category_budget_package_items AS pi
                            ON pi.id=psi.category_budget_package_item_id
                          WHERE pi.category_budget_package_id=@PackageId))
        ) SET @DownstreamActivity=1;
    END;

    -- Discovery / lookup (never inserts catalog items; add to catalog separately if absent).
    SELECT c.id AS CatalogItemId, c.item_code AS ItemCode,
           c.name AS ItemName, c.expense_type AS ExpenseType,
           u.unit_code AS UnitCode,
           CASE WHEN i.id IS NULL THEN 'AVAILABLE' ELSE 'ALREADY_IN_BUDGET' END AS ItemAvailability
    FROM dbo.BS_budget_catalog_items AS c
    JOIN dbo.BS_budget_categories AS cat ON cat.id=c.budget_category_id
    JOIN dbo.BS_units_of_measure AS u ON u.id=c.unit_of_measure_id
    LEFT JOIN dbo.BS_department_category_budget_items AS i
      ON i.department_category_budget_id=@BudgetId AND i.catalog_item_id=c.id
    WHERE cat.category_code=@CategoryCode AND c.is_active=1
    ORDER BY c.name;

    -- Every input must resolve to EXACTLY one active catalog item in the specified category
    -- and be absent from the budget (inactive duplicates are deliberately rejected).
    SELECT n.ItemCode, n.RequestedQuantity, ci.id AS CatalogItemId,
           ci.name AS CatalogItemName,
           CASE
              WHEN @BudgetCount<>1 THEN 'INVALID TARGET: expected one department/category/year budget'
              WHEN @YearStatus<>'OPEN' THEN 'BLOCKED: financial year is not OPEN'
              WHEN @BudgetStatus NOT IN ('DRAFT','IN_CATEGORY_REVIEW','CATEGORY_REVIEW_COMPLETED')
                   THEN 'BLOCKED: target budget status does not allow this operation'
              WHEN @PackageCount<>1 THEN 'BLOCKED: expected one category package'
              WHEN @PackageStatus<>'DRAFT' OR @PackagePurchasingAt IS NOT NULL
                   OR @PackageCfoAt IS NOT NULL OR @PackageCompletedAt IS NOT NULL
                   THEN 'BLOCKED: category package progressed downstream'
              WHEN @DownstreamActivity=1 THEN 'BLOCKED: Purchasing/CFO/PO/transfer activity exists'
              WHEN n.RequestedQuantity<=0 THEN 'INVALID QUANTITY: must be positive'
              WHEN ci.id IS NULL THEN 'UNKNOWN ITEM CODE'
              WHEN ci.is_active<>1 THEN 'INACTIVE CATALOG ITEM'
              WHEN ci.budget_category_id<>@CategoryId THEN 'WRONG CATALOG CATEGORY'
              WHEN existing.id IS NOT NULL THEN 'ALREADY IN BUDGET (even if inactive)'
              ELSE 'READY'
           END AS ValidationStatus
    INTO #CheckedItems
    FROM @NewItems AS n
    LEFT JOIN dbo.BS_budget_catalog_items AS ci ON ci.item_code=n.ItemCode
    LEFT JOIN dbo.BS_department_category_budget_items AS existing WITH (UPDLOCK, HOLDLOCK)
       ON existing.department_category_budget_id=@BudgetId AND existing.catalog_item_id=ci.id;

    SELECT @Mode AS RunMode, @DepartmentCode AS DepartmentCode,
           @CategoryCode AS CategoryCode, @FinancialYear AS FinancialYear,
           @BudgetCount AS MatchedBudgets, @BudgetId AS BudgetId,
           @BudgetStatus AS CurrentBudgetStatus,
           CASE WHEN @ReopenCategoryReview=1 AND @BudgetStatus='CATEGORY_REVIEW_COMPLETED'
                THEN 'IN_CATEGORY_REVIEW' ELSE @BudgetStatus END AS ResultBudgetStatus,
           @PackageStatus AS PackageStatus,
           (SELECT COUNT(*) FROM #CheckedItems WHERE ValidationStatus='READY') AS ReadyItemCount,
           (SELECT COUNT(*) FROM #CheckedItems WHERE ValidationStatus<>'READY') AS ProblemItemCount;
    SELECT * FROM #CheckedItems ORDER BY ItemCode;

    SELECT @InvalidCount=COUNT(*) FROM #CheckedItems WHERE ValidationStatus<>'READY';
    IF @Mode='PREVIEW'
    BEGIN
        ROLLBACK TRANSACTION;
        SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
        PRINT 'PREVIEW ONLY. No changes were made. Resolve all problems, then select APPLY.';
        RETURN;
    END;

    IF @InvalidCount>0 THROW 53005, 'APPLY STOPPED: see ValidationStatus in Results. All rolled back.', 1;
    IF @ConfirmBudgetId IS NULL OR @ConfirmBudgetId<>@BudgetId
        THROW 53006, 'APPLY STOPPED: ConfirmBudgetId does not match resolved BudgetId.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.users
                   WHERE USER_ID=@ActorAdminUserId AND IS_ACTIVE=1 AND IS_ADMIN=1)
        THROW 53007, 'APPLY requires active administrator USER_ID.', 1;
    IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL
        THROW 53008, 'APPLY requires an audit reason.', 1;

    SET @OldStatus=@BudgetStatus;
    SET @NewStatus=CASE WHEN @ReopenCategoryReview=1 AND @BudgetStatus='CATEGORY_REVIEW_COMPLETED'
                        THEN 'IN_CATEGORY_REVIEW' ELSE @BudgetStatus END;
    SELECT @OldJson=(SELECT dcb.* FROM dbo.BS_department_category_budgets AS dcb
                     WHERE dcb.id=@BudgetId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);

    INSERT INTO dbo.BS_department_category_budget_items
    (department_category_budget_id, catalog_item_id, requested_quantity,
     distribution_method, review_status, is_active, created_by, created_at,
     catalog_item_name_snapshot, catalog_item_code_snapshot, expense_type_snapshot,
     unit_of_measure_id_snapshot, unit_name_snapshot, unit_code_snapshot, is_project)
    OUTPUT inserted.id, inserted.catalog_item_id, inserted.requested_quantity
           INTO @Inserted (NewBudgetItemId, CatalogItemId, RequestedQuantity)
    SELECT @BudgetId, ci.id, ck.RequestedQuantity,
           'ANNUAL',
           CASE WHEN @BudgetStatus='DRAFT' THEN 'DRAFT' ELSE 'PENDING_CATEGORY_REVIEW' END,
           1, @ActorAdminUserId, SYSUTCDATETIME(),
           ci.name, ci.item_code, ci.expense_type,
           u.id, u.name, u.unit_code, 0
    FROM #CheckedItems AS ck
    JOIN dbo.BS_budget_catalog_items AS ci ON ci.id=ck.CatalogItemId
    JOIN dbo.BS_units_of_measure AS u ON u.id=ci.unit_of_measure_id;
    SET @InsertedCount=@@ROWCOUNT;

    IF @InsertedCount<>(SELECT COUNT(*) FROM @NewItems)
        THROW 53009, 'Insert count mismatch. Rolled back.', 1;

    -- The simple safe default: all requested quantity in YEAR, period 1.
    INSERT INTO dbo.BS_department_category_budget_item_distributions
        (department_budget_item_id, period_type, period_no, quantity, created_at)
    SELECT NewBudgetItemId, 'YEAR', 1, RequestedQuantity, SYSUTCDATETIME()
    FROM @Inserted;
    SET @DistributionCount=@@ROWCOUNT;
    IF @DistributionCount<>@InsertedCount
        THROW 53010, 'Distribution count mismatch. Rolled back.', 1;

    IF @NewStatus<>@OldStatus
    BEGIN
        UPDATE dbo.BS_department_category_budgets
        SET status='IN_CATEGORY_REVIEW',
            category_review_completed_by=NULL,
            category_review_completed_at=NULL,
            updated_by=@ActorAdminUserId,
            updated_at=SYSUTCDATETIME()
        WHERE id=@BudgetId AND status='CATEGORY_REVIEW_COMPLETED';
        IF @@ROWCOUNT<>1 THROW 53011, 'Budget status changed concurrently. Rolled back.', 1;
    END;

    SELECT @NewJson=(
        SELECT @BudgetId AS budgetId, @Reason AS reason, @ReopenCategoryReview AS reviewReopened,
               JSON_QUERY((SELECT i.NewBudgetItemId AS id, c.item_code AS itemCode,
                       i.RequestedQuantity AS quantity, 'ANNUAL' AS distributionMethod,
                       'YEAR' AS periodType, 1 AS periodNo
                FROM @Inserted AS i JOIN dbo.BS_budget_catalog_items AS c
                  ON c.id=i.CatalogItemId
                FOR JSON PATH)) AS items
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.BS_budget_workflow_history
      (financial_year_id, entity_type, entity_id, action, old_status, new_status,
       note, old_values_json, new_values_json, correlation_id, created_by)
    VALUES
      (@YearId, 'DEPARTMENT_CATEGORY_BUDGET', @BudgetId, 'ADMIN_MANUAL_ADD_ITEMS',
       @OldStatus, @NewStatus, @Reason, @OldJson, @NewJson,
       @CorrelationId, @ActorAdminUserId);
    SET @AuditId=SCOPE_IDENTITY();

    COMMIT TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT 'APPLIED' AS Result, @BudgetId AS BudgetId,
           @InsertedCount AS NewItemsCount, @DistributionCount AS NewAnnualDistributions,
           @OldStatus AS OldBudgetStatus, @NewStatus AS NewBudgetStatus,
           @AuditId AS AuditHistoryId, @CorrelationId AS CorrelationId;
    SELECT i.NewBudgetItemId, c.item_code, c.name AS ItemName,
           i.RequestedQuantity, 'ANNUAL' AS DistributionMethod,
           'YEAR' AS PeriodType, 1 AS PeriodNo
    FROM @Inserted AS i
    JOIN dbo.BS_budget_catalog_items AS c ON c.id=i.CatalogItemId
    ORDER BY c.name;
    DROP TABLE IF EXISTS #CheckedItems;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    THROW;
END CATCH;
