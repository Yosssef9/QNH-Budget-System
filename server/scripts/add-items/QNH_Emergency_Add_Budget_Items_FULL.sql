/*
 QNH BUDGET SYSTEM - EMERGENCY ADMINISTRATIVE INSERT (COMPLETE PATH)
 SQL Server 2019+ / QNHDB schema export 2026-10-19

 PURPOSE
  Add one or more EXISTING catalog items directly to ONE department's already
  CATEGORY_REVIEW_COMPLETED budget, without reopening the budget or resetting
  other reviewed items. The admin explicitly approves each NEW item at its
  requested quantity. This is an exceptional BYPASS of normal user review.

 INSERTS / UPDATES (atomically)
  * New department item and requested distribution (one period per item)
  * Explicit category approval metadata (admin as reviewer)
  * Shared category package item, if absent (with catalog snapshot)
  * GENERAL catalog sub-item, if absent (optional/configured)
  * One GENERAL package model, if absent; keeps existing model/price
  * New department's model allocation; recalculates model quantity
  * Reconciliation status from ALL approved department demand
  * Workflow history audit row with the full requested insert details

 DOES NOT recreate existing items, alter existing allocations, invent a price,
 modify old approvals, create Purchasing/CFO approvals, or send notifications.
 REFUSES multi-model packages, invalid preexisting allocations, downstream
 Purchasing/CFO/PO/transfer activity, and duplicate items.

 MUST: PREVIEW -> review blockers & exact IDs -> FULL DB BACKUP -> APPLY.
 A successful PREVIEW does not guarantee that data will remain unchanged.
 The APPLY transaction rechecks everything under SERIALIZABLE isolation.

 NURSING / DEFIBRILLATOR ALREADY EXISTS: DO NOT ADD IT AGAIN.
 To test, enter a DIFFERENT item code NOT in that department's budget.
*/
USE [QNHDB];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- =========================== CONFIGURATION ==============================
DECLARE @Mode varchar(10) = 'PREVIEW';  -- PREVIEW / APPLY
DECLARE @DepartmentCode varchar(50) = 'NURSING';
DECLARE @CategoryCode varchar(30) = 'BIOMEDICAL';
DECLARE @FinancialYear int = 2027;
DECLARE @ExpectedBudgetId bigint = NULL;   -- Set from PREVIEW for APPLY
DECLARE @ExpectedPackageId bigint = NULL;  -- Set from PREVIEW for APPLY
DECLARE @ActorAdminUserId int = 1080;     -- dbo.users.USER_ID, active IS_ADMIN=1
DECLARE @ConfirmAdministrativeApproval bit = 0; -- Set to 1 ONLY for APPLY
DECLARE @CreateMissingCatalogGeneral bit = 1;  -- 1=create a missing GENERAL catalog model
DECLARE @Reason nvarchar(1000) =
 N'Authorized emergency direct addition of catalog items and category approval';

/* Input rows: ItemCode, Quantity, Requested distribution, single period, optional
   Category Manager unit price. A NULL price is intentionally NOT CONFIGURED;
   set it later in the app. Period numbers:
      ANNUAL    -> 1  (YEAR 1)
      QUARTERLY -> 1..4 (entire quantity in that quarter)
      MONTHLY   -> 1..12 (entire quantity in that month)
   To spread quantity across several months/quarters, use the application
   instead. Approved schedule is AUTO (no custom approved distribution rows).
*/
DECLARE @NewItems TABLE
(
 ItemCode varchar(80) NOT NULL PRIMARY KEY,
 RequestedQuantity decimal(18,4) NOT NULL,
 DistributionMethod varchar(20) NOT NULL,
 PeriodNo int NOT NULL,
 CategoryManagerUnitPrice decimal(18,6) NULL
);
INSERT INTO @NewItems
(ItemCode, RequestedQuantity, DistributionMethod, PeriodNo, CategoryManagerUnitPrice)
VALUES
 ('REPLACE_WITH_REAL_ITEM_CODE', 5, 'ANNUAL', 1, NULL);
 -- ,('ANOTHER_ITEM_CODE', 2, 'QUARTERLY', 2, NULL)
-- =======================================================================

IF DB_NAME() <> N'QNHDB' THROW 55001, 'Wrong database: expected QNHDB.', 1;
IF @Mode NOT IN ('PREVIEW','APPLY') THROW 55002, 'Mode must be PREVIEW or APPLY.', 1;
IF @@TRANCOUNT <> 0 THROW 55003, 'Open a new query connection with no transaction.', 1;
IF NOT EXISTS (SELECT 1 FROM @NewItems) THROW 55004, 'No item codes configured.', 1;
IF @CreateMissingCatalogGeneral IS NULL THROW 55019, 'CreateMissingCatalogGeneral cannot be NULL.', 1;

DECLARE @BudgetId bigint = NULL, @BudgetCount int = 0,
        @PackageId bigint = NULL, @PackageCount int = 0,
        @YearId int = NULL, @CategoryId int = NULL,
        @YearStatus varchar(20) = NULL, @BudgetStatus varchar(40) = NULL,
        @PackageStatus varchar(40) = NULL,
        @PackagePurchasingAt datetime2(3) = NULL,
        @PackageCfoAt datetime2(3) = NULL,
        @PackageCompletedAt datetime2(3) = NULL,
        @BlockerCount int = 0, @InputCount int = 0,
        @NewDepartmentItemId bigint, @CatalogItemId int,
        @GeneralCatalogId int, @GeneralModelId bigint,
        @PackageItemId bigint, @Quantity decimal(18,4),
        @UnitPrice decimal(18,6), @RequestedMethod varchar(20),
        @PeriodNo int, @ItemCode varchar(80),
        @GeneralName nvarchar(300), @GeneralSpec nvarchar(2000),
        @GeneralUnitId int, @OtherCount int,
        @Corr uniqueidentifier = NEWID(), @AuditId bigint = NULL,
        @NewJson nvarchar(max), @NewCount int = 0,
        @PackageCreatedCount int = 0, @ModelCreatedCount int = 0,
        @GeneralCreatedCount int = 0, @AllocationCount int = 0;

DECLARE @Blockers TABLE (Reason nvarchar(500) NOT NULL);
DECLARE @Applied TABLE
(
 ItemCode varchar(80) NOT NULL PRIMARY KEY,
 DepartmentItemId bigint NOT NULL,
 PackageItemId bigint NOT NULL,
 GeneralCatalogId int NOT NULL,
 GeneralModelId bigint NOT NULL,
 Quantity decimal(18,4) NOT NULL,
 PeriodType varchar(20) NOT NULL,
 PeriodNo int NOT NULL,
 ModelPrice decimal(18,6) NULL
);

DROP TABLE IF EXISTS #Prepared;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRY
 BEGIN TRANSACTION;

 SELECT @BudgetCount=COUNT(*), @BudgetId=MIN(cb.id)
 FROM dbo.BS_department_category_budgets cb WITH (UPDLOCK,HOLDLOCK)
 JOIN dbo.BS_department_budgets db ON db.id=cb.department_budget_id
 JOIN dbo.BS_departments dep ON dep.id=db.department_id
 JOIN dbo.BS_financial_years fy ON fy.id=db.financial_year_id
 JOIN dbo.BS_budget_categories cat ON cat.id=cb.budget_category_id
 WHERE dep.department_code=@DepartmentCode
   AND cat.category_code=@CategoryCode AND fy.year=@FinancialYear;

 IF @BudgetCount <> 1
  INSERT INTO @Blockers VALUES
   (N'Expected exactly one department/category/year budget. Verify codes and year.');
 ELSE
 BEGIN
  SELECT @YearId=db.financial_year_id, @CategoryId=cb.budget_category_id,
         @YearStatus=fy.status, @BudgetStatus=cb.status
  FROM dbo.BS_department_category_budgets cb WITH (UPDLOCK,HOLDLOCK)
  JOIN dbo.BS_department_budgets db ON db.id=cb.department_budget_id
  JOIN dbo.BS_financial_years fy ON fy.id=db.financial_year_id
  WHERE cb.id=@BudgetId;

  SELECT @PackageCount=COUNT(*), @PackageId=MIN(p.id)
  FROM dbo.BS_category_budget_packages p WITH (UPDLOCK,HOLDLOCK)
  WHERE p.financial_year_id=@YearId AND p.budget_category_id=@CategoryId;

  IF @PackageCount = 1
   SELECT @PackageStatus=status,
          @PackagePurchasingAt=submitted_to_purchasing_at,
          @PackageCfoAt=submitted_to_cfo_at,
          @PackageCompletedAt=cfo_review_completed_at
   FROM dbo.BS_category_budget_packages WITH (UPDLOCK,HOLDLOCK)
   WHERE id=@PackageId;

  IF @YearStatus <> 'OPEN'
   INSERT INTO @Blockers VALUES (N'Financial year must be OPEN.');
  IF @BudgetStatus <> 'CATEGORY_REVIEW_COMPLETED'
   INSERT INTO @Blockers VALUES
   (N'Target budget must already be CATEGORY_REVIEW_COMPLETED. This script does not reopen or submit budgets.');
  IF @PackageCount <> 1
   INSERT INTO @Blockers VALUES (N'Expected exactly one category package.');
  IF @PackageCount=1 AND
      (@PackageStatus <> 'DRAFT' OR @PackagePurchasingAt IS NOT NULL
       OR @PackageCfoAt IS NOT NULL OR @PackageCompletedAt IS NOT NULL)
   INSERT INTO @Blockers VALUES
    (N'Category package is beyond DRAFT or has Purchasing/CFO timestamps.');

  IF @PackageCount=1 AND
    (EXISTS (
       SELECT 1 FROM dbo.BS_category_budget_package_items pi WITH (UPDLOCK,HOLDLOCK)
       WHERE pi.category_budget_package_id=@PackageId
         AND (pi.cfo_review_status IS NOT NULL OR pi.cfo_reviewed_at IS NOT NULL
              OR pi.cfo_reviewed_by IS NOT NULL)
     ) OR EXISTS (
       SELECT 1 FROM dbo.BS_category_budget_package_sub_item_price_reviews pr WITH (UPDLOCK,HOLDLOCK)
       WHERE pr.category_budget_package_id=@PackageId
     ) OR EXISTS (
       SELECT 1 FROM dbo.BS_category_po_links pol WITH (UPDLOCK,HOLDLOCK)
       JOIN dbo.BS_category_budget_package_sub_items psi ON psi.id=pol.category_budget_package_sub_item_id
       JOIN dbo.BS_category_budget_package_items pi ON pi.id=psi.category_budget_package_item_id
       WHERE pi.category_budget_package_id=@PackageId
     ) OR EXISTS (
       SELECT 1 FROM dbo.BS_category_budget_transfers tr WITH (UPDLOCK,HOLDLOCK)
       WHERE EXISTS (
         SELECT 1 FROM dbo.BS_category_budget_package_sub_items psi
         JOIN dbo.BS_category_budget_package_items pi ON pi.id=psi.category_budget_package_item_id
         WHERE pi.category_budget_package_id=@PackageId
           AND psi.id IN (tr.from_package_sub_item_id,tr.to_package_sub_item_id)
       )
     ))
   INSERT INTO @Blockers VALUES
    (N'Downstream CFO/Purchasing/PO/transfer activity exists. Use the application workflow.');
 END;

 SELECT n.ItemCode, n.RequestedQuantity, n.DistributionMethod, n.PeriodNo,
        n.CategoryManagerUnitPrice,
        ci.id AS CatalogItemId, ci.name AS ItemName, ci.is_active AS CatalogIsActive,
        ci.budget_category_id AS ItemCategoryId,
        ci.unit_of_measure_id AS UnitId,
        u.name AS UnitName, u.unit_code AS UnitCode, u.is_active AS UnitActive,
        ci.expense_type AS ExpenseType,
        di.id AS ExistingDepartmentItemId,
        pi.id AS ExistingPackageItemId, pi.is_active AS ExistingPackageItemActive,
        gen.id AS GeneralCatalogId, gen.is_active AS GeneralActive,
        gen.is_default_general AS GeneralIsDefault,
        (SELECT COUNT(*) FROM dbo.BS_budget_catalog_sub_items x WITH (UPDLOCK,HOLDLOCK)
         WHERE x.catalog_item_id=ci.id AND x.sub_item_code='GENERAL') AS GeneralCodeCount,
        (SELECT COUNT(*) FROM dbo.BS_budget_catalog_sub_items x WITH (UPDLOCK,HOLDLOCK)
         WHERE x.catalog_item_id=ci.id AND x.name=N'General' AND x.sub_item_code<>'GENERAL') AS GeneralNameConflictCount,
        (SELECT COUNT(*) FROM dbo.BS_budget_catalog_sub_items x WITH (UPDLOCK,HOLDLOCK)
         WHERE x.catalog_item_id=ci.id AND x.is_default_general=1 AND x.sub_item_code<>'GENERAL') AS OtherGeneralCount,
        (SELECT COUNT(*) FROM dbo.BS_category_budget_package_sub_items si WITH (UPDLOCK,HOLDLOCK)
         WHERE si.category_budget_package_item_id=pi.id AND si.is_active=1) AS ActiveModelCount,
        (SELECT COUNT(*) FROM dbo.BS_category_budget_package_sub_items si WITH (UPDLOCK,HOLDLOCK)
         WHERE si.category_budget_package_item_id=pi.id AND si.is_active=1
           AND si.catalog_sub_item_id=gen.id) AS ActiveGeneralModelCount,
        CASE WHEN n.DistributionMethod='ANNUAL' THEN 'YEAR'
             WHEN n.DistributionMethod='QUARTERLY' THEN 'QUARTER'
             ELSE 'MONTH' END AS PeriodType
 INTO #Prepared
 FROM @NewItems n
 LEFT JOIN dbo.BS_budget_catalog_items ci WITH (UPDLOCK,HOLDLOCK)
   ON ci.item_code=n.ItemCode
 LEFT JOIN dbo.BS_units_of_measure u ON u.id=ci.unit_of_measure_id
 LEFT JOIN dbo.BS_department_category_budget_items di WITH (UPDLOCK,HOLDLOCK)
   ON di.department_category_budget_id=@BudgetId AND di.catalog_item_id=ci.id
 LEFT JOIN dbo.BS_category_budget_package_items pi WITH (UPDLOCK,HOLDLOCK)
   ON pi.category_budget_package_id=@PackageId AND pi.catalog_item_id=ci.id
 LEFT JOIN dbo.BS_budget_catalog_sub_items gen WITH (UPDLOCK,HOLDLOCK)
   ON gen.catalog_item_id=ci.id AND gen.sub_item_code='GENERAL';

 IF EXISTS (SELECT 1 FROM #Prepared WHERE ItemCode='REPLACE_WITH_REAL_ITEM_CODE')
  INSERT INTO @Blockers VALUES (N'Replace the example item code with a real catalog ItemCode.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE RequestedQuantity<=0 OR RequestedQuantity IS NULL)
  INSERT INTO @Blockers VALUES (N'All quantities must be greater than zero.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE CategoryManagerUnitPrice <= 0)
  INSERT INTO @Blockers VALUES (N'Price, when supplied, cannot be negative.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE
  DistributionMethod NOT IN ('ANNUAL','QUARTERLY','MONTHLY')
  OR (DistributionMethod='ANNUAL' AND PeriodNo<>1)
  OR (DistributionMethod='QUARTERLY' AND PeriodNo NOT BETWEEN 1 AND 4)
  OR (DistributionMethod='MONTHLY' AND PeriodNo NOT BETWEEN 1 AND 12))
  INSERT INTO @Blockers VALUES (N'Invalid distribution method or period number.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE CatalogItemId IS NULL)
  INSERT INTO @Blockers VALUES (N'One or more catalog item codes were not found.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE CatalogItemId IS NOT NULL AND
  (CatalogIsActive<>1 OR ItemCategoryId<>@CategoryId OR UnitId IS NULL OR UnitName IS NULL OR UnitActive<>1))
  INSERT INTO @Blockers VALUES (N'Catalog item inactive, in wrong category, or unit missing.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE ExistingDepartmentItemId IS NOT NULL)
  INSERT INTO @Blockers VALUES
  (N'One or more items already exist in this department budget (including inactive). Do not duplicate.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE
  GeneralCodeCount>1 OR OtherGeneralCount>0 OR GeneralNameConflictCount>0
  OR (GeneralCatalogId IS NOT NULL AND (GeneralActive<>1 OR GeneralIsDefault<>1)))
  INSERT INTO @Blockers VALUES (N'Conflicting, inactive or non-default GENERAL catalog sub-item.');
 IF @CreateMissingCatalogGeneral=0 AND EXISTS
   (SELECT 1 FROM #Prepared WHERE CatalogItemId IS NOT NULL AND GeneralCatalogId IS NULL)
  INSERT INTO @Blockers VALUES
   (N'Missing catalog GENERAL model. Enable @CreateMissingCatalogGeneral or correct it in catalog.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE
  ExistingPackageItemId IS NOT NULL AND ExistingPackageItemActive<>1)
  INSERT INTO @Blockers VALUES (N'Existing shared package item is inactive; manual reconciliation required.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE
  ExistingPackageItemId IS NOT NULL AND (ActiveModelCount>1 OR
       (ActiveModelCount=1 AND ActiveGeneralModelCount<>1)))
  INSERT INTO @Blockers VALUES
   (N'Existing package item uses multiple/custom models. Do not auto-allocate new department demand.');
 IF EXISTS (SELECT 1 FROM #Prepared WHERE
  ExistingPackageItemId IS NOT NULL AND CategoryManagerUnitPrice IS NOT NULL)
  INSERT INTO @Blockers VALUES
   (N'A price was specified for a shared existing package item. Keep its price unchanged; use NULL.');

 /* Validate all other approved department demand for shared package items.
    Never change another department's allocations or model selections. */
 IF @PackageCount=1 AND EXISTS
 (
   SELECT 1
   FROM #Prepared w
   JOIN dbo.BS_department_category_budget_items di WITH (UPDLOCK,HOLDLOCK)
     ON di.catalog_item_id=w.CatalogItemId AND di.is_active=1
   JOIN dbo.BS_department_category_budgets cb ON cb.id=di.department_category_budget_id
   JOIN dbo.BS_department_budgets db ON db.id=cb.department_budget_id
   WHERE db.financial_year_id=@YearId AND cb.budget_category_id=@CategoryId
     AND cb.status='CATEGORY_REVIEW_COMPLETED'
     AND di.review_status='CATEGORY_REVIEW_COMPLETED'
     AND di.category_approved_quantity>0 AND w.ExistingPackageItemId IS NOT NULL
     AND (SELECT COUNT(*) FROM dbo.BS_category_budget_package_sub_items psi
          WHERE psi.category_budget_package_item_id=w.ExistingPackageItemId
            AND psi.is_active=1)=0
 )
  INSERT INTO @Blockers VALUES
   (N'An existing package item has approved other-department demand but no active model. Resolve it in the app.');

 IF @PackageCount=1 AND EXISTS
 (
  SELECT 1 FROM #Prepared w
  JOIN dbo.BS_category_budget_package_sub_items psi WITH (UPDLOCK,HOLDLOCK)
    ON psi.category_budget_package_item_id=w.ExistingPackageItemId
   AND psi.is_active=1
  WHERE w.ActiveGeneralModelCount=1 AND
    ROUND(COALESCE(psi.quantity,0),4) <> ROUND(COALESCE((
      SELECT SUM(a.allocated_quantity)
      FROM dbo.BS_category_budget_package_sub_item_allocations a WITH (UPDLOCK,HOLDLOCK)
      WHERE a.category_budget_package_sub_item_id=psi.id
    ),0),4)
 )
  INSERT INTO @Blockers VALUES
   (N'Existing General package model quantity does not equal its allocations. Repair in application first.');

 IF @PackageCount=1 AND EXISTS
 (
  SELECT 1
  FROM #Prepared w
  JOIN dbo.BS_department_category_budget_items di WITH (UPDLOCK,HOLDLOCK)
    ON di.catalog_item_id=w.CatalogItemId AND di.is_active=1
  JOIN dbo.BS_department_category_budgets cb ON cb.id=di.department_category_budget_id
  JOIN dbo.BS_department_budgets db ON db.id=cb.department_budget_id
  WHERE db.financial_year_id=@YearId AND cb.budget_category_id=@CategoryId
    AND cb.status='CATEGORY_REVIEW_COMPLETED' AND di.review_status='CATEGORY_REVIEW_COMPLETED'
    AND w.ExistingPackageItemId IS NOT NULL AND w.ActiveGeneralModelCount=1
    AND ROUND(COALESCE(di.category_approved_quantity,0),4) <> ROUND(COALESCE((
      SELECT SUM(a.allocated_quantity)
      FROM dbo.BS_category_budget_package_sub_item_allocations a WITH (UPDLOCK,HOLDLOCK)
      JOIN dbo.BS_category_budget_package_sub_items psi ON psi.id=a.category_budget_package_sub_item_id
      WHERE psi.category_budget_package_item_id=w.ExistingPackageItemId
        AND psi.is_active=1 AND a.department_category_budget_item_id=di.id
    ),0),4)
 )
  INSERT INTO @Blockers VALUES
   (N'An existing General package has department allocations different from approved quantities.');

 IF @PackageCount=1 AND EXISTS
 (
   SELECT 1 FROM #Prepared w
   JOIN dbo.BS_category_budget_package_sub_items psi ON psi.category_budget_package_item_id=w.ExistingPackageItemId
   JOIN dbo.BS_category_budget_package_sub_item_allocations a ON a.category_budget_package_sub_item_id=psi.id
   LEFT JOIN dbo.BS_department_category_budget_items di ON di.id=a.department_category_budget_item_id
   LEFT JOIN dbo.BS_department_category_budgets cb ON cb.id=di.department_category_budget_id
   LEFT JOIN dbo.BS_department_budgets db ON db.id=cb.department_budget_id
   WHERE w.ExistingPackageItemId IS NOT NULL AND
    (di.id IS NULL OR di.catalog_item_id<>w.CatalogItemId OR di.is_active<>1
     OR cb.budget_category_id<>@CategoryId OR cb.status<>'CATEGORY_REVIEW_COMPLETED'
     OR db.financial_year_id<>@YearId OR di.review_status<>'CATEGORY_REVIEW_COMPLETED'
     OR psi.is_active<>1)
 )
  INSERT INTO @Blockers VALUES
   (N'An existing package has orphan/inactive/unreviewed model allocation rows.');

 SELECT @InputCount=COUNT(*) FROM #Prepared;
 SELECT @BlockerCount=COUNT(*) FROM @Blockers;

 SELECT @Mode AS ScriptMode, @DepartmentCode AS DepartmentCode,
        @CategoryCode AS CategoryCode, @FinancialYear AS FinancialYear,
        @BudgetId AS TargetBudgetId, @PackageId AS TargetPackageId,
        @BudgetStatus AS BudgetStatus, @PackageStatus AS PackageStatus,
        @InputCount AS InputItemCount, @BlockerCount AS BlockerCount,
        'ADMIN_APPROVED' AS NewItemsReviewStatus;
 SELECT w.ItemCode, w.ItemName, w.RequestedQuantity,
        w.DistributionMethod, w.PeriodType, w.PeriodNo,
        w.CategoryManagerUnitPrice, w.CatalogItemId,
        w.ExistingDepartmentItemId, w.ExistingPackageItemId,
        w.GeneralCatalogId, w.ActiveModelCount,
        CASE WHEN w.ExistingDepartmentItemId IS NOT NULL THEN 'DUPLICATE - STOP'
             WHEN w.CatalogItemId IS NULL THEN 'UNKNOWN ITEM - STOP'
             WHEN w.CatalogIsActive<>1 OR w.ItemCategoryId<>@CategoryId THEN 'INVALID CATALOG - STOP'
             WHEN w.ExistingPackageItemId IS NOT NULL AND w.ActiveModelCount>1 THEN 'CUSTOM MODELS - STOP'
             WHEN w.GeneralCatalogId IS NULL THEN 'CREATE GENERAL CATALOG + PACKAGE MODEL'
             WHEN w.ExistingPackageItemId IS NULL THEN 'CREATE PACKAGE ITEM + GENERAL MODEL'
             ELSE 'REUSE EXISTING PACKAGE GENERAL' END AS PlannedAction
 FROM #Prepared w ORDER BY w.ItemCode;
 SELECT Reason AS BlockingReason FROM @Blockers;

 IF @Mode='PREVIEW'
 BEGIN
  ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  PRINT 'PREVIEW ONLY - NO CHANGES. Check BlockerCount, exact IDs, then back up and APPLY.';
  RETURN;
 END;

 IF @BlockerCount<>0
  THROW 55005, 'APPLY STOPPED. Review BlockingReason result set. Rolled back.', 1;
 IF @ExpectedBudgetId IS NULL OR @ExpectedBudgetId<>@BudgetId
    OR @ExpectedPackageId IS NULL OR @ExpectedPackageId<>@PackageId
  THROW 55006, 'APPLY STOPPED. Confirm exact BudgetId and PackageId from PREVIEW.', 1;
 IF @ConfirmAdministrativeApproval<>1
  THROW 55007, 'APPLY STOPPED. Set ConfirmAdministrativeApproval=1 to acknowledge bypassing ordinary review.', 1;
 IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL
  THROW 55008, 'APPLY STOPPED. A written administrative reason is required.', 1;
 IF NOT EXISTS (SELECT 1 FROM dbo.users WITH (UPDLOCK,HOLDLOCK)
   WHERE USER_ID=@ActorAdminUserId AND IS_ACTIVE=1 AND IS_ADMIN=1)
  THROW 55009, 'APPLY STOPPED. ActorAdminUserId must be an active administrator USER_ID.', 1;

 DECLARE items_cursor CURSOR LOCAL FAST_FORWARD FOR
 SELECT ItemCode, CatalogItemId, RequestedQuantity,
        DistributionMethod, PeriodNo, CategoryManagerUnitPrice
 FROM #Prepared ORDER BY ItemCode;
 OPEN items_cursor;
 FETCH NEXT FROM items_cursor INTO
   @ItemCode, @CatalogItemId, @Quantity, @RequestedMethod, @PeriodNo, @UnitPrice;

 WHILE @@FETCH_STATUS=0
 BEGIN
  -- Create catalog General only if ABSENT; never fix an existing conflicting row.
  SELECT @GeneralCatalogId=MIN(id)
  FROM dbo.BS_budget_catalog_sub_items WITH (UPDLOCK,HOLDLOCK)
  WHERE catalog_item_id=@CatalogItemId AND sub_item_code='GENERAL';

  IF @GeneralCatalogId IS NULL
  BEGIN
    INSERT INTO dbo.BS_budget_catalog_sub_items
    (catalog_item_id,sub_item_code,name,default_specification,
     default_unit_of_measure_id,is_default_general,is_active,created_by,created_at)
    SELECT id,'GENERAL',N'General',NULL,unit_of_measure_id,
           1,1,@ActorAdminUserId,SYSUTCDATETIME()
    FROM dbo.BS_budget_catalog_items WHERE id=@CatalogItemId;
    IF @@ROWCOUNT<>1 THROW 55010, 'GENERAL catalog insertion failed.', 1;
    SET @GeneralCatalogId=CONVERT(int,SCOPE_IDENTITY());
    SET @GeneralCreatedCount=@GeneralCreatedCount+1;
  END;

  SET @GeneralName=NULL; SET @GeneralSpec=NULL; SET @GeneralUnitId=NULL;
  SELECT @GeneralName=name, @GeneralSpec=default_specification,
         @GeneralUnitId=default_unit_of_measure_id
  FROM dbo.BS_budget_catalog_sub_items WITH (UPDLOCK,HOLDLOCK)
  WHERE id=@GeneralCatalogId AND is_active=1 AND is_default_general=1;
  IF @GeneralName IS NULL OR @GeneralUnitId IS NULL
   THROW 55020, 'GENERAL catalog row invalid. Rolled back.', 1;

  -- Fresh department item, direct admin approval, snapshots.
  INSERT INTO dbo.BS_department_category_budget_items
  (department_category_budget_id,catalog_item_id,requested_quantity,
   category_approved_quantity,distribution_method,review_status,
   reviewed_by,reviewed_at,review_note,is_active,created_by,created_at,
   catalog_item_name_snapshot,catalog_item_code_snapshot,expense_type_snapshot,
   unit_of_measure_id_snapshot,unit_name_snapshot,unit_code_snapshot,is_project)
  SELECT @BudgetId,ci.id,@Quantity,@Quantity,@RequestedMethod,
         'CATEGORY_REVIEW_COMPLETED',@ActorAdminUserId,SYSUTCDATETIME(),
         N'Exceptional administrator-approved direct addition. See workflow history.',
         1,@ActorAdminUserId,SYSUTCDATETIME(),
         ci.name,ci.item_code,ci.expense_type,ci.unit_of_measure_id,
         u.name,u.unit_code,0
  FROM dbo.BS_budget_catalog_items ci
  JOIN dbo.BS_units_of_measure u ON u.id=ci.unit_of_measure_id
  WHERE ci.id=@CatalogItemId;
  IF @@ROWCOUNT<>1 THROW 55011, 'Department item insertion failed.', 1;
  SET @NewDepartmentItemId=CONVERT(bigint,SCOPE_IDENTITY());

  INSERT INTO dbo.BS_department_category_budget_item_distributions
  (department_budget_item_id,period_type,period_no,quantity,created_at)
  VALUES
  (@NewDepartmentItemId,
   CASE @RequestedMethod WHEN 'ANNUAL' THEN 'YEAR'
      WHEN 'QUARTERLY' THEN 'QUARTER' ELSE 'MONTH' END,
   @PeriodNo,@Quantity,SYSUTCDATETIME());
  IF @@ROWCOUNT<>1 THROW 55012, 'Requested distribution insertion failed.', 1;
  -- Approved-distribution mode is AUTO: there are intentionally NO CUSTOM rows.

  SELECT @PackageItemId=MIN(id)
  FROM dbo.BS_category_budget_package_items WITH (UPDLOCK,HOLDLOCK)
  WHERE category_budget_package_id=@PackageId AND catalog_item_id=@CatalogItemId;

  IF @PackageItemId IS NULL
  BEGIN
   INSERT INTO dbo.BS_category_budget_package_items
   (category_budget_package_id,catalog_item_id,cfo_review_status,
    needs_reconciliation,is_active,created_by,created_at,
    catalog_item_name_snapshot,catalog_item_code_snapshot,expense_type_snapshot,
    unit_of_measure_id_snapshot,unit_name_snapshot,unit_code_snapshot)
   SELECT @PackageId,ci.id,NULL,1,1,@ActorAdminUserId,SYSUTCDATETIME(),
          ci.name,ci.item_code,ci.expense_type,ci.unit_of_measure_id,
          u.name,u.unit_code
   FROM dbo.BS_budget_catalog_items ci
   JOIN dbo.BS_units_of_measure u ON u.id=ci.unit_of_measure_id
   WHERE ci.id=@CatalogItemId;
   IF @@ROWCOUNT<>1 THROW 55013, 'Package item insertion failed.', 1;
   SET @PackageItemId=CONVERT(bigint,SCOPE_IDENTITY());
   SET @PackageCreatedCount=@PackageCreatedCount+1;
  END;

  SELECT @GeneralModelId=MIN(psi.id)
  FROM dbo.BS_category_budget_package_sub_items psi WITH (UPDLOCK,HOLDLOCK)
  WHERE psi.category_budget_package_item_id=@PackageItemId
    AND psi.catalog_sub_item_id=@GeneralCatalogId AND psi.is_active=1;

  IF @GeneralModelId IS NULL
  BEGIN
   INSERT INTO dbo.BS_category_budget_package_sub_items
   (category_budget_package_item_id,catalog_sub_item_id,name,specification,
    unit_of_measure_id,quantity,unit_price,category_manager_unit_price,note,
    is_active,created_by,created_at)
   VALUES
   (@PackageItemId,@GeneralCatalogId,@GeneralName,@GeneralSpec,
    @GeneralUnitId,NULL,NULL,@UnitPrice,NULL,1,@ActorAdminUserId,SYSUTCDATETIME());
   IF @@ROWCOUNT<>1 THROW 55014, 'General package model insertion failed.', 1;
   SET @GeneralModelId=CONVERT(bigint,SCOPE_IDENTITY());
   SET @ModelCreatedCount=@ModelCreatedCount+1;
  END;

  -- Never rewrite another department's allocations.
  INSERT INTO dbo.BS_category_budget_package_sub_item_allocations
  (category_budget_package_sub_item_id,department_category_budget_item_id,
   allocated_quantity,created_by,created_at)
  VALUES
  (@GeneralModelId,@NewDepartmentItemId,@Quantity,
   @ActorAdminUserId,SYSUTCDATETIME());
  IF @@ROWCOUNT<>1 THROW 55015, 'General model allocation insertion failed.', 1;
  SET @AllocationCount=@AllocationCount+1;

  -- Same recalculation as application: total of ALL model allocations.
  UPDATE psi SET psi.quantity=COALESCE((
       SELECT SUM(a.allocated_quantity)
       FROM dbo.BS_category_budget_package_sub_item_allocations a
       WHERE a.category_budget_package_sub_item_id=psi.id),0),
       psi.updated_by=@ActorAdminUserId, psi.updated_at=SYSUTCDATETIME()
  FROM dbo.BS_category_budget_package_sub_items psi
  WHERE psi.id=@GeneralModelId AND psi.is_active=1;
  IF @@ROWCOUNT<>1 THROW 55016, 'General model quantity recalculation failed.', 1;

  -- Same reconciliation formula as CategoryPackage repository; completed
  -- department budgets/items only. Ensure this item is fully reconciled.
  DECLARE @ExpectedApproved decimal(38,4)=0, @ActualModel decimal(38,4)=0;
  SELECT @ExpectedApproved=COALESCE(SUM(di.category_approved_quantity),0)
  FROM dbo.BS_department_category_budget_items di
  JOIN dbo.BS_department_category_budgets cb ON cb.id=di.department_category_budget_id
  JOIN dbo.BS_department_budgets db ON db.id=cb.department_budget_id
  WHERE db.financial_year_id=@YearId AND cb.budget_category_id=@CategoryId
    AND cb.status='CATEGORY_REVIEW_COMPLETED' AND di.review_status='CATEGORY_REVIEW_COMPLETED'
    AND di.catalog_item_id=@CatalogItemId AND di.is_active=1;
  SELECT @ActualModel=COALESCE(SUM(quantity),0)
  FROM dbo.BS_category_budget_package_sub_items
  WHERE category_budget_package_item_id=@PackageItemId AND is_active=1;
  IF ROUND(@ExpectedApproved,4)<>ROUND(@ActualModel,4)
    THROW 55017, 'Approved demand does not match package model quantity. Rolled back.', 1;

  UPDATE dbo.BS_category_budget_package_items
  SET needs_reconciliation=0, updated_by=@ActorAdminUserId,
      updated_at=SYSUTCDATETIME()
  WHERE id=@PackageItemId AND is_active=1;
  IF @@ROWCOUNT<>1 THROW 55018, 'Package reconciliation update failed.', 1;

  INSERT INTO @Applied
  (ItemCode,DepartmentItemId,PackageItemId,GeneralCatalogId,
   GeneralModelId,Quantity,PeriodType,PeriodNo,ModelPrice)
  VALUES
  (@ItemCode,@NewDepartmentItemId,@PackageItemId,@GeneralCatalogId,
   @GeneralModelId,@Quantity,
   CASE @RequestedMethod WHEN 'ANNUAL' THEN 'YEAR'
        WHEN 'QUARTERLY' THEN 'QUARTER' ELSE 'MONTH' END,
   @PeriodNo,(SELECT category_manager_unit_price
              FROM dbo.BS_category_budget_package_sub_items WHERE id=@GeneralModelId));
  SET @NewCount=@NewCount+1;

  FETCH NEXT FROM items_cursor INTO
    @ItemCode, @CatalogItemId, @Quantity, @RequestedMethod, @PeriodNo, @UnitPrice;
 END;
 CLOSE items_cursor;
 DEALLOCATE items_cursor;

 SET @NewJson=(SELECT @DepartmentCode AS departmentCode,@CategoryCode AS categoryCode,
              @FinancialYear AS financialYear,@BudgetId AS budgetId,
              @PackageId AS packageId,@ActorAdminUserId AS adminUserId,
              @Reason AS reason,'AUTO' AS approvedDistributionMode,
              ORIGINAL_LOGIN() AS sqlLogin,
              JSON_QUERY((SELECT a.ItemCode AS itemCode,a.DepartmentItemId AS departmentItemId,
                           a.PackageItemId AS packageItemId,a.GeneralModelId AS modelId,
                           a.Quantity AS approvedQuantity,a.PeriodType AS requestedPeriodType,
                           a.PeriodNo AS requestedPeriodNo,a.ModelPrice AS modelPrice
                          FROM @Applied a ORDER BY a.ItemCode FOR JSON PATH)) AS items
              FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);

 INSERT INTO dbo.BS_budget_workflow_history
 (financial_year_id,entity_type,entity_id,action,old_status,new_status,
  note,old_values_json,new_values_json,correlation_id,created_by)
 VALUES
 (@YearId,'DEPARTMENT_CATEGORY_BUDGET',@BudgetId,
  'ADMIN_EMERGENCY_ADD_APPROVED_ITEMS',@BudgetStatus,@BudgetStatus,
  LEFT(CONCAT(@Reason,N'. SQL login: ',ORIGINAL_LOGIN()),1000),
  NULL,@NewJson,@Corr,@ActorAdminUserId);
 SET @AuditId=CONVERT(bigint,SCOPE_IDENTITY());

 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 DROP TABLE IF EXISTS #Prepared;

 SELECT 'APPLIED' AS Result,@BudgetId AS BudgetId,@PackageId AS PackageId,
        @NewCount AS DepartmentItemsAdded,@PackageCreatedCount AS NewPackageItems,
        @ModelCreatedCount AS NewGeneralModels,
        @GeneralCreatedCount AS NewCatalogGeneralModels,
        @AllocationCount AS NewDepartmentModelAllocations,
        @AuditId AS AuditHistoryId,@Corr AS CorrelationId;
 SELECT * FROM @Applied ORDER BY ItemCode;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 IF CURSOR_STATUS('local','items_cursor') >= 0 CLOSE items_cursor;
 IF CURSOR_STATUS('local','items_cursor') >= -1 DEALLOCATE items_cursor;
 THROW;
END CATCH;
