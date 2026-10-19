/*
QNH Budget System | Administrative RETURN TO DRAFT (reviewed items supported)
SQL Server 2019+ | Target database: QNHDB

DEFAULT: PREVIEW - no persistent changes.
APPLY: explicit budget ID, exact PREVIEW snapshot hash, reviewed-item consent,
       active QNHDB administrator USER_ID, and a reason required.

IN SCOPE: exactly one department + one category + one financial year.
Changes: reviewed/pending active department items -> DRAFT, clears review decision
fields, deletes ACTIVE ITEM approved-distribution records, clears submission and
review-completion fields on the category budget header, flags its active package
items for reconciliation, and writes a FULL JSON pre-change snapshot to
BS_budget_workflow_history.old_values_json.

OUT OF SCOPE: requested quantities, HOD distributions, catalog items, models,
pricing, inactive items, other departments, original audit records.

DO NOT RUN APPLY where this script reports BlockerCount > 0. In particular,
model allocations or Purchasing/CFO/PO/transfer activity require workflow-specific
reversal, not a blind SQL reset. Make a FULL QNHDB backup before APPLY.

Prepared from QNHDB schema export 2026-10-18. NOT executed against your live DB.
*/
USE [QNHDB];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- ========================= CONFIGURE HERE ===============================
DECLARE @Mode                    varchar(10)     = 'PREVIEW'; -- PREVIEW | APPLY
DECLARE @DepartmentName          nvarchar(200)   = N'Nursing';
DECLARE @DepartmentCode          varchar(50)     = NULL; -- optional; if filled, takes precedence over name
DECLARE @CategoryCode            varchar(30)     = 'BIOMED'; -- verify from dbo.BS_budget_categories
DECLARE @FinancialYear           int             = 2027;

-- Fill ONLY after reviewing PREVIEW output. KEEP NULL for first PREVIEW.
DECLARE @ConfirmBudgetId         bigint          = NULL;
DECLARE @ExpectedSnapshotHash    varchar(64)     = NULL; -- copy SnapshotSHA256 from PREVIEW
DECLARE @ConfirmResetReviewed    bit             = 0;    -- set 1 to acknowledge loss of ACTIVE review decisions
DECLARE @ActorUserId             int             = NULL; -- dbo.users.USER_ID, NOT USER_CODE
DECLARE @Reason                  nvarchar(400)   = N'Add missing department budget items and resubmit for category review';
-- =======================================================================

IF DB_NAME() <> N'QNHDB'
    THROW 52001, 'STOP: must run in QNHDB.', 1;
IF @Mode NOT IN ('PREVIEW','APPLY')
    THROW 52002, 'STOP: Mode must be PREVIEW or APPLY.', 1;
IF @@TRANCOUNT <> 0
    THROW 52003, 'STOP: run in a new query connection, outside other transactions.', 1;
IF NULLIF(LTRIM(RTRIM(@CategoryCode)), '') IS NULL
    THROW 52004, 'STOP: CategoryCode is required.', 1;
IF @DepartmentCode IS NULL AND NULLIF(LTRIM(RTRIM(@DepartmentName)), N'') IS NULL
    THROW 52005, 'STOP: DepartmentName or DepartmentCode is required.', 1;

IF @Mode = 'APPLY'
BEGIN
    IF @ActorUserId IS NULL OR NOT EXISTS
       (SELECT 1 FROM dbo.users WHERE USER_ID = @ActorUserId AND IS_ACTIVE = 1 AND IS_ADMIN = 1)
        THROW 52006, 'STOP: APPLY requires a valid active administrator dbo.users.USER_ID.', 1;
    IF @ConfirmBudgetId IS NULL OR @ExpectedSnapshotHash IS NULL OR LEN(@ExpectedSnapshotHash) <> 64
        THROW 52007, 'STOP: APPLY requires ConfirmBudgetId and PREVIEW SnapshotSHA256.', 1;
    IF @ConfirmResetReviewed <> 1
        THROW 52008, 'STOP: explicitly set ConfirmResetReviewed = 1 to reset already-reviewed items.', 1;
    IF NULLIF(LTRIM(RTRIM(@Reason)), N'') IS NULL
        THROW 52009, 'STOP: an audit reason is required.', 1;
END;

DECLARE
    @MatchCount int = 0,
    @BudgetId bigint = NULL,
    @ActualDepartment nvarchar(200),
    @ActualDeptCode varchar(50),
    @ActualCategory nvarchar(100),
    @YearStatus varchar(20),
    @FinancialYearId int,
    @CategoryId int,
    @BudgetStatus varchar(40),
    @SubmittedAt datetime2(3),
    @PackageCount int = 0,
    @PackageId bigint,
    @PackageStatus varchar(40),
    @PackagePurchasingAt datetime2(3),
    @PackageCfoAt datetime2(3),
    @PackageCompletedAt datetime2(3),
    @WindowCount int = 0,
    @WindowStatus varchar(20),
    @ActiveItems int = 0,
    @ReviewedItems int = 0,
    @ApprovedDistributionRows int = 0,
    @ModelAllocationRows int = 0,
    @CfoReviewedPackageItemRows int = 0,
    @PriceReviewRows int = 0,
    @PoLinkRows int = 0,
    @TransferRows int = 0,
    @ChangeRequestRows int = 0,
    @InvalidItemStatuses int = 0,
    @HistoricalReviewRows int = 0,
    @ResetItems int = 0,
    @RemovedApprovedRows int = 0,
    @FlaggedPackageItems int = 0,
    @SnapshotJson nvarchar(max),
    @SnapshotHash varchar(64),
    @NewValuesJson nvarchar(max),
    @AuditId bigint,
    @CorrelationId uniqueidentifier = NEWID();
DECLARE @Blockers TABLE (Reason nvarchar(500) NOT NULL);

SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRY
    BEGIN TRANSACTION;

    -- Resolve exactly ONE budget. No TOP(1) on ambiguous names.
    SELECT
        @MatchCount = COUNT(*),
        @BudgetId = MIN(dcb.id)
    FROM dbo.BS_department_category_budgets AS dcb WITH (UPDLOCK, HOLDLOCK)
    JOIN dbo.BS_department_budgets AS db ON db.id = dcb.department_budget_id
    JOIN dbo.BS_departments AS dept ON dept.id = db.department_id
    JOIN dbo.BS_budget_categories AS cat ON cat.id = dcb.budget_category_id
    JOIN dbo.BS_financial_years AS fy ON fy.id = db.financial_year_id
    WHERE fy.year = @FinancialYear
      AND cat.category_code = @CategoryCode
      AND (
            (@DepartmentCode IS NOT NULL AND dept.department_code = @DepartmentCode)
         OR (@DepartmentCode IS NULL AND dept.name = @DepartmentName)
      );

    IF @MatchCount <> 1
        INSERT INTO @Blockers VALUES (N'Expected exactly ONE department/category/year budget. Verify department name/code and category code.');

    IF @MatchCount = 1
    BEGIN
        SELECT
            @ActualDepartment = dept.name,
            @ActualDeptCode = dept.department_code,
            @ActualCategory = cat.name,
            @YearStatus = fy.status,
            @FinancialYearId = fy.id,
            @CategoryId = cat.id,
            @BudgetStatus = dcb.status,
            @SubmittedAt = dcb.submitted_at
        FROM dbo.BS_department_category_budgets AS dcb WITH (UPDLOCK, HOLDLOCK)
        JOIN dbo.BS_department_budgets AS db ON db.id = dcb.department_budget_id
        JOIN dbo.BS_departments AS dept ON dept.id = db.department_id
        JOIN dbo.BS_budget_categories AS cat ON cat.id = dcb.budget_category_id
        JOIN dbo.BS_financial_years AS fy ON fy.id = db.financial_year_id
        WHERE dcb.id = @BudgetId;

        IF @YearStatus <> 'OPEN'
            INSERT INTO @Blockers VALUES (N'Financial year is not OPEN.');
        IF @BudgetStatus NOT IN ('IN_CATEGORY_REVIEW','CATEGORY_REVIEW_COMPLETED')
            INSERT INTO @Blockers VALUES (N'Budget must be IN_CATEGORY_REVIEW or CATEGORY_REVIEW_COMPLETED; other states need their own workflow.');

        SELECT @WindowCount = COUNT(*)
        FROM dbo.BS_category_submission_windows WITH (UPDLOCK, HOLDLOCK)
        WHERE financial_year_id = @FinancialYearId AND budget_category_id = @CategoryId;
        SELECT @WindowStatus = status
        FROM dbo.BS_category_submission_windows WITH (UPDLOCK, HOLDLOCK)
        WHERE financial_year_id = @FinancialYearId AND budget_category_id = @CategoryId;
        IF @WindowCount <> 1 OR ISNULL(@WindowStatus, '') <> 'OPEN'
            INSERT INTO @Blockers VALUES (N'Category submission window must be OPEN so the department can resubmit.');

        SELECT @PackageCount = COUNT(*)
        FROM dbo.BS_category_budget_packages WITH (UPDLOCK, HOLDLOCK)
        WHERE financial_year_id = @FinancialYearId AND budget_category_id = @CategoryId;
        SELECT
            @PackageId = id,
            @PackageStatus = status,
            @PackagePurchasingAt = submitted_to_purchasing_at,
            @PackageCfoAt = submitted_to_cfo_at,
            @PackageCompletedAt = cfo_review_completed_at
        FROM dbo.BS_category_budget_packages WITH (UPDLOCK, HOLDLOCK)
        WHERE financial_year_id = @FinancialYearId AND budget_category_id = @CategoryId;
        IF @PackageCount <> 1
            INSERT INTO @Blockers VALUES (N'Expected exactly ONE category package for the selected year/category.');
        IF @PackageStatus IS NULL OR @PackageStatus <> 'DRAFT'
            INSERT INTO @Blockers VALUES (N'Category package is not DRAFT; downstream review may already have progressed.');
        IF @PackagePurchasingAt IS NOT NULL OR @PackageCfoAt IS NOT NULL OR @PackageCompletedAt IS NOT NULL
            INSERT INTO @Blockers VALUES (N'Package has Purchasing/CFO workflow metadata; manual workflow reversal required.');

        -- Lock target items, including inactive ones, before snapshot and mutation.
        SELECT
            @ActiveItems = COALESCE(SUM(CASE WHEN i.is_active = 1 THEN 1 ELSE 0 END),0),
            @ReviewedItems = COALESCE(SUM(CASE WHEN i.is_active = 1 AND
                (i.review_status = 'CATEGORY_REVIEW_COMPLETED' OR i.reviewed_by IS NOT NULL
                 OR i.reviewed_at IS NOT NULL OR i.category_approved_quantity IS NOT NULL)
                THEN 1 ELSE 0 END),0),
            @InvalidItemStatuses = COALESCE(SUM(CASE WHEN i.is_active = 1 AND
                i.review_status NOT IN ('DRAFT','PENDING_CATEGORY_REVIEW','CATEGORY_REVIEW_COMPLETED')
                THEN 1 ELSE 0 END),0)
        FROM dbo.BS_department_category_budget_items AS i WITH (UPDLOCK, HOLDLOCK)
        WHERE i.department_category_budget_id = @BudgetId;
        IF @ActiveItems = 0
            INSERT INTO @Blockers VALUES (N'The category budget has no active items.');
        IF @InvalidItemStatuses > 0
            INSERT INTO @Blockers VALUES (N'Unknown item review statuses detected.');

        SELECT @ApprovedDistributionRows = COUNT(*)
        FROM dbo.BS_department_category_budget_item_approved_distributions AS ad WITH (UPDLOCK, HOLDLOCK)
        JOIN dbo.BS_department_category_budget_items AS i ON i.id = ad.department_budget_item_id
        WHERE i.department_category_budget_id = @BudgetId AND i.is_active = 1;

        SELECT @ModelAllocationRows = COUNT(*)
        FROM dbo.BS_category_budget_package_sub_item_allocations AS a WITH (UPDLOCK, HOLDLOCK)
        JOIN dbo.BS_department_category_budget_items AS i ON i.id = a.department_category_budget_item_id
        WHERE i.department_category_budget_id = @BudgetId;
        IF @ModelAllocationRows > 0
            INSERT INTO @Blockers VALUES (N'Model allocations exist for this department; resetting reviews would leave linked model quantities inconsistent.');

        SELECT @CfoReviewedPackageItemRows = COUNT(*)
        FROM dbo.BS_category_budget_package_items AS pi WITH (UPDLOCK, HOLDLOCK)
        WHERE pi.category_budget_package_id = @PackageId
          AND (pi.cfo_review_status IS NOT NULL OR pi.cfo_reviewed_at IS NOT NULL OR pi.cfo_reviewed_by IS NOT NULL);
        IF @CfoReviewedPackageItemRows > 0
            INSERT INTO @Blockers VALUES (N'The category package has item-level CFO review activity.');

        SELECT @PriceReviewRows = COUNT(*)
        FROM dbo.BS_category_budget_package_sub_item_price_reviews AS pr WITH (UPDLOCK, HOLDLOCK)
        WHERE pr.category_budget_package_id = @PackageId;
        IF @PriceReviewRows > 0
            INSERT INTO @Blockers VALUES (N'Purchasing price-review rows exist for this category package.');

        SELECT @PoLinkRows = COUNT(*)
        FROM dbo.BS_category_po_links AS pol WITH (UPDLOCK, HOLDLOCK)
        JOIN dbo.BS_category_budget_package_sub_items AS psi ON psi.id = pol.category_budget_package_sub_item_id
        JOIN dbo.BS_category_budget_package_items AS pi ON pi.id = psi.category_budget_package_item_id
        WHERE pi.category_budget_package_id = @PackageId;
        IF @PoLinkRows > 0
            INSERT INTO @Blockers VALUES (N'PO links exist for this category package.');

        SELECT @TransferRows = COUNT(*)
        FROM dbo.BS_category_budget_transfers AS t WITH (UPDLOCK, HOLDLOCK)
        WHERE t.from_package_sub_item_id IN (
            SELECT psi.id FROM dbo.BS_category_budget_package_sub_items AS psi
            JOIN dbo.BS_category_budget_package_items AS pi ON pi.id = psi.category_budget_package_item_id
            WHERE pi.category_budget_package_id = @PackageId
        ) OR t.to_package_sub_item_id IN (
            SELECT psi.id FROM dbo.BS_category_budget_package_sub_items AS psi
            JOIN dbo.BS_category_budget_package_items AS pi ON pi.id = psi.category_budget_package_item_id
            WHERE pi.category_budget_package_id = @PackageId
        );
        IF @TransferRows > 0
            INSERT INTO @Blockers VALUES (N'Budget transfers exist for this category package.');

        SELECT @ChangeRequestRows = COUNT(*)
        FROM dbo.BS_budget_change_requests AS cr WITH (UPDLOCK, HOLDLOCK)
        WHERE cr.department_category_budget_id = @BudgetId;
        IF @ChangeRequestRows > 0
            INSERT INTO @Blockers VALUES (N'Existing budget change requests require separate workflow review.');

        SELECT @HistoricalReviewRows = COUNT(*)
        FROM dbo.BS_budget_workflow_history AS h
        WHERE (h.entity_type = 'DEPARTMENT_CATEGORY_BUDGET' AND h.entity_id = @BudgetId)
           OR (h.entity_type = 'DEPARTMENT_CATEGORY_BUDGET_ITEM' AND h.entity_id IN (
                SELECT i.id FROM dbo.BS_department_category_budget_items AS i
                WHERE i.department_category_budget_id = @BudgetId
           ));

        /* Capture complete pre-change values in a SINGLE valid JSON object. */
        SELECT @SnapshotJson = (
            SELECT
                JSON_QUERY((SELECT b.* FROM dbo.BS_department_category_budgets AS b
                            WHERE b.id = @BudgetId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)) AS budgetHeader,
                JSON_QUERY((SELECT i.* FROM dbo.BS_department_category_budget_items AS i
                            WHERE i.department_category_budget_id = @BudgetId
                            ORDER BY i.id FOR JSON PATH)) AS allDepartmentItems,
                JSON_QUERY((SELECT d.* FROM dbo.BS_department_category_budget_item_distributions AS d
                            JOIN dbo.BS_department_category_budget_items AS i ON i.id = d.department_budget_item_id
                            WHERE i.department_category_budget_id = @BudgetId
                            ORDER BY d.id FOR JSON PATH)) AS requestedDistributions,
                JSON_QUERY((SELECT ad.* FROM dbo.BS_department_category_budget_item_approved_distributions AS ad
                            JOIN dbo.BS_department_category_budget_items AS i ON i.id = ad.department_budget_item_id
                            WHERE i.department_category_budget_id = @BudgetId
                            ORDER BY ad.id FOR JSON PATH)) AS approvedDistributions,
                JSON_QUERY((SELECT pi.* FROM dbo.BS_category_budget_package_items AS pi
                            WHERE pi.category_budget_package_id = @PackageId
                              AND pi.catalog_item_id IN (
                                  SELECT i.catalog_item_id FROM dbo.BS_department_category_budget_items AS i
                                  WHERE i.department_category_budget_id = @BudgetId AND i.is_active = 1
                              ) ORDER BY pi.id FOR JSON PATH)) AS affectedPackageItems
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );
        SELECT @SnapshotHash = CONVERT(varchar(64), HASHBYTES('SHA2_256', @SnapshotJson), 2);
    END;

    -- PREVIEW includes possible identifier choices when the requested target is missing.
    SELECT
        @Mode AS ScriptMode,
        @DepartmentName AS RequestedDepartmentName,
        @DepartmentCode AS RequestedDepartmentCode,
        @CategoryCode AS RequestedCategoryCode,
        @FinancialYear AS RequestedFinancialYear,
        @MatchCount AS MatchedBudgets,
        @BudgetId AS BudgetId,
        @ActualDepartment AS MatchedDepartment,
        @ActualDeptCode AS MatchedDepartmentCode,
        @ActualCategory AS MatchedCategory,
        @BudgetStatus AS CurrentBudgetStatus,
        @SubmittedAt AS CurrentSubmittedAt,
        @YearStatus AS FinancialYearStatus,
        @WindowStatus AS SubmissionWindowStatus,
        @PackageStatus AS PackageStatus,
        @ActiveItems AS ActiveItemCount,
        @ReviewedItems AS AlreadyReviewedItems,
        @ApprovedDistributionRows AS ApprovedDistributionsToDelete,
        @ModelAllocationRows AS ModelAllocationRows,
        @CfoReviewedPackageItemRows AS CfoReviewedPackageItems,
        @PriceReviewRows AS PurchasingPriceReviews,
        @PoLinkRows AS POLinks,
        @TransferRows AS Transfers,
        @ChangeRequestRows AS ChangeRequests,
        @HistoricalReviewRows AS ExistingAuditRowsPreserved,
        @SnapshotHash AS SnapshotSHA256,
        (SELECT COUNT(*) FROM @Blockers) AS BlockerCount;

    SELECT Reason AS BlockingReason FROM @Blockers;

    IF @MatchCount = 1
    BEGIN
        SELECT i.id AS ItemId, i.catalog_item_name_snapshot AS ItemName,
               i.review_status, i.requested_quantity, i.category_approved_quantity,
               i.reviewed_by, i.reviewed_at, i.review_note,
               i.is_active
        FROM dbo.BS_department_category_budget_items AS i
        WHERE i.department_category_budget_id = @BudgetId
        ORDER BY i.is_active DESC, i.id;
    END
    ELSE
    BEGIN
        SELECT dept.department_code AS DepartmentCode, dept.name AS DepartmentName
        FROM dbo.BS_departments AS dept WHERE dept.name LIKE N'%' + @DepartmentName + N'%'
           OR (@DepartmentCode IS NOT NULL AND dept.department_code = @DepartmentCode);
        SELECT category_code AS CategoryCode, name AS CategoryName
        FROM dbo.BS_budget_categories ORDER BY category_code;
    END;

    IF @Mode = 'PREVIEW'
    BEGIN
        ROLLBACK TRANSACTION;
        SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
        PRINT 'PREVIEW ONLY: no changes made. Record BudgetId and SnapshotSHA256, then set APPLY confirmations.';
        RETURN;
    END;

    IF EXISTS (SELECT 1 FROM @Blockers)
        THROW 52010, 'STOP: APPLY has blocking conditions. See BlockingReason; all changes rolled back.', 1;
    IF @BudgetId <> @ConfirmBudgetId
        THROW 52011, 'STOP: Budget ID differs from explicitly confirmed ID.', 1;
    IF @SnapshotHash <> UPPER(@ExpectedSnapshotHash)
        THROW 52012, 'STOP: Snapshot changed since PREVIEW. Run PREVIEW again and recheck.', 1;

    -- Save a full, reconstructable pre-change snapshot in EXISTING workflow history.
    SELECT @NewValuesJson = (
        SELECT @ActiveItems AS resetItemCount,
               @ReviewedItems AS previouslyReviewedItems,
               @ApprovedDistributionRows AS deletedApprovedDistributionRows,
               @Reason AS reason,
               ORIGINAL_LOGIN() AS sqlLogin,
               SYSUTCDATETIME() AS executedAtUtc
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );
    INSERT INTO dbo.BS_budget_workflow_history
        (financial_year_id, entity_type, entity_id, action,
         old_status, new_status, note, old_values_json, new_values_json,
         user_role_id, acting_workspace, correlation_id, created_by)
    VALUES
        (@FinancialYearId, 'DEPARTMENT_CATEGORY_BUDGET', @BudgetId,
         'DEPARTMENT_CATEGORY_ADMIN_RETURN_TO_DRAFT',
         @BudgetStatus, 'DRAFT',
         CONCAT(N'Admin return to draft. Reason: ', @Reason, N'. SQL login: ', ORIGINAL_LOGIN()),
         @SnapshotJson, @NewValuesJson,
         NULL, NULL, @CorrelationId, @ActorUserId);
    SET @AuditId = SCOPE_IDENTITY();

    -- Remove only approvals for ACTIVE items of the selected department budget.
    DELETE ad
    FROM dbo.BS_department_category_budget_item_approved_distributions AS ad
    JOIN dbo.BS_department_category_budget_items AS i ON i.id = ad.department_budget_item_id
    WHERE i.department_category_budget_id = @BudgetId AND i.is_active = 1;
    SET @RemovedApprovedRows = @@ROWCOUNT;
    IF @RemovedApprovedRows <> @ApprovedDistributionRows
        THROW 52013, 'STOP: approved distribution row count changed. Rolled back.', 1;

    UPDATE dbo.BS_department_category_budget_items
       SET review_status = 'DRAFT',
           category_approved_quantity = NULL,
           reviewed_by = NULL,
           reviewed_at = NULL,
           review_note = NULL,
           updated_by = @ActorUserId,
           updated_at = SYSUTCDATETIME()
    WHERE department_category_budget_id = @BudgetId AND is_active = 1;
    SET @ResetItems = @@ROWCOUNT;
    IF @ResetItems <> @ActiveItems
        THROW 52014, 'STOP: active item count changed. Rolled back.', 1;

    UPDATE dbo.BS_department_category_budgets
       SET status = 'DRAFT',
           submitted_by = NULL, submitted_at = NULL,
           returned_by = NULL, returned_at = NULL, return_reason = NULL,
           category_review_completed_by = NULL, category_review_completed_at = NULL,
           updated_by = @ActorUserId, updated_at = SYSUTCDATETIME()
    WHERE id = @BudgetId
      AND status IN ('IN_CATEGORY_REVIEW','CATEGORY_REVIEW_COMPLETED');
    IF @@ROWCOUNT <> 1
        THROW 52015, 'STOP: category budget header changed. Rolled back.', 1;

    -- Reconciliation is a package-wide readout: mark ONLY affected package items,
    -- but do not delete shared package models or approvals belonging to others.
    UPDATE pi
       SET needs_reconciliation = 1,
           updated_by = @ActorUserId,
           updated_at = SYSUTCDATETIME()
    FROM dbo.BS_category_budget_package_items AS pi
    WHERE pi.category_budget_package_id = @PackageId
      AND pi.is_active = 1 AND pi.needs_reconciliation = 0
      AND pi.catalog_item_id IN (
          SELECT i.catalog_item_id FROM dbo.BS_department_category_budget_items AS i
          WHERE i.department_category_budget_id = @BudgetId AND i.is_active = 1
      );
    SET @FlaggedPackageItems = @@ROWCOUNT;

    COMMIT TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT 'APPLIED' AS Result, @BudgetId AS BudgetId,
           @ResetItems AS ActiveItemsReturnedToDraft,
           @ReviewedItems AS PreviouslyReviewedItemsReset,
           @RemovedApprovedRows AS ApprovedDistributionRowsDeleted,
           @FlaggedPackageItems AS PackageItemsFlaggedForReconciliation,
           @AuditId AS WorkflowHistoryAuditId,
           @CorrelationId AS CorrelationId,
           @SnapshotHash AS PreChangeSnapshotSHA256;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    THROW;
END CATCH;
