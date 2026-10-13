USE [QNHDB];
GO

/*
  QNH Budget System - CFO Demo Reset + Seed
  ==========================================

  PURPOSE
  -------
  Creates a realistic, internally consistent demo budget cycle using the
  EXISTING master/setup data (departments, categories, catalog, units, users,
  roles and permissions), and leaves all three category packages ready for
  CFO review.

  FINAL WORKFLOW STATE
  --------------------
    Department budgets/categories  -> CATEGORY_REVIEW_COMPLETED
    Department items               -> CATEGORY_REVIEW_COMPLETED
    Category packages              -> IN_CFO_REVIEW
    Package items                  -> PENDING_CFO_REVIEW
    Purchasing price reviews       -> ACCEPTED

  SAFETY
  ------
  - Default mode is PREVIEW: no data is changed.
  - To execute, change @Mode to 'APPLY'.
  - The script refuses to run outside QNHDB.
  - Only budget/workflow TRANSACTIONAL data is reset.
  - Master/setup data is preserved:
      dbo.BS_departments
      dbo.BS_budget_categories
      dbo.BS_budget_catalog_items
      dbo.BS_budget_catalog_sub_items
      dbo.BS_units_of_measure
      dbo.BS_budget_roles / permissions / assignments
      dbo.users
      dbo.BS_Purchase_Invoices_For_Budget
      imported/manual PO catalog mappings
      system-health tables
  - Everything is wrapped in one transaction with XACT_ABORT ON.
  - Any validation failure rolls the whole seed back.

  NOTE ABOUT ATTACHMENTS
  ----------------------
  Database attachment rows are removed with the demo reset. Physical files
  already stored on disk are not deleted by this SQL script.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Mode VARCHAR(10) = 'PREVIEW'; -- PREVIEW | APPLY
DECLARE @ExpectedDatabase SYSNAME = N'QNHDB';
DECLARE @ConfirmReset NVARCHAR(50) = N'RESET_CFO_DEMO';
DECLARE @RequiredConfirmation NVARCHAR(50) = N'RESET_CFO_DEMO';
DECLARE @TargetFinancialYearId INT = NULL; -- NULL = latest OPEN financial year
DECLARE @MaxCatalogItemsPerCategory INT = 12;
DECLARE @FallbackUserId INT = NULL; -- NULL = first active user

IF DB_NAME() <> @ExpectedDatabase
BEGIN
  THROW 50000, 'Wrong database. CFO demo seed is restricted to QNHDB.', 1;
END;

IF @Mode NOT IN ('PREVIEW', 'APPLY')
BEGIN
  THROW 50001, '@Mode must be PREVIEW or APPLY.', 1;
END;

IF OBJECT_ID('dbo.BS_department_category_budget_item_approved_distributions', 'U') IS NULL
BEGIN
  THROW 50002, 'Required table BS_department_category_budget_item_approved_distributions is missing. Apply the Category Manager approved-distribution migration first.', 1;
END;

IF OBJECT_ID('dbo.BS_department_category_budget_items', 'U') IS NULL
   OR OBJECT_ID('dbo.BS_category_budget_packages', 'U') IS NULL
   OR OBJECT_ID('dbo.BS_category_budget_package_sub_item_price_reviews', 'U') IS NULL
BEGIN
  THROW 50003, 'Required QNH Budget workflow tables are missing.', 1;
END;

DECLARE
  @FinancialYearId INT,
  @FinancialYear INT,
  @Now DATETIME2(3) = SYSUTCDATETIME(),
  @BudgetCreatedAt DATETIME2(3),
  @HodSubmitAt DATETIME2(3),
  @CategoryReviewAt DATETIME2(3),
  @WindowClosedAt DATETIME2(3),
  @PurchasingSubmitAt DATETIME2(3),
  @PurchasingReviewAt DATETIME2(3),
  @CfoSubmitAt DATETIME2(3),
  @PurchasingUserId INT,
  @PurchasingUserRoleId INT;

SELECT TOP (1)
  @FinancialYearId = fy.id,
  @FinancialYear = fy.year
FROM dbo.BS_financial_years AS fy
WHERE fy.status = 'OPEN'
  AND (@TargetFinancialYearId IS NULL OR fy.id = @TargetFinancialYearId)
ORDER BY fy.year DESC, fy.id DESC;

IF @FinancialYearId IS NULL
BEGIN
  THROW 50004, 'No OPEN financial year was found. CFO review demo data requires an OPEN financial year.', 1;
END;

IF @FallbackUserId IS NULL
BEGIN
  SELECT TOP (1) @FallbackUserId = u.USER_ID
  FROM dbo.users AS u
  WHERE u.is_active = 1
  ORDER BY u.USER_ID;
END;

IF @FallbackUserId IS NULL
BEGIN
  THROW 50005, 'No active user exists in dbo.users to own demo records.', 1;
END;

SET @BudgetCreatedAt = DATEADD(DAY, -21, @Now);
SET @HodSubmitAt = DATEADD(DAY, -16, @Now);
SET @CategoryReviewAt = DATEADD(DAY, -11, @Now);
SET @WindowClosedAt = DATEADD(DAY, -8, @Now);
SET @PurchasingSubmitAt = DATEADD(DAY, -7, @Now);
SET @PurchasingReviewAt = DATEADD(DAY, -4, @Now);
SET @CfoSubmitAt = DATEADD(DAY, -2, @Now);

/* ================================================================
   MASTER DATA / ACTOR DISCOVERY
   ================================================================ */

IF OBJECT_ID('tempdb..#Categories') IS NOT NULL DROP TABLE #Categories;

SELECT
  category.id,
  category.category_code,
  category.name,
  COALESCE(categoryActor.user_id, @FallbackUserId) AS category_manager_user_id,
  categoryActor.user_role_id AS category_manager_user_role_id
INTO #Categories
FROM dbo.BS_budget_categories AS category
OUTER APPLY
(
  SELECT TOP (1)
    assignment.user_id,
    assignment.id AS user_role_id
  FROM dbo.BS_budget_user_roles AS assignment
  INNER JOIN dbo.BS_budget_roles AS role
    ON role.id = assignment.role_id
   AND role.role_code = 'CATEGORY_BUDGET_MANAGER'
   AND role.is_active = 1
  INNER JOIN dbo.users AS assignedUser
    ON assignedUser.USER_ID = assignment.user_id
   AND assignedUser.is_active = 1
  WHERE assignment.is_active = 1
    AND assignment.budget_category_id = category.id
  ORDER BY assignment.id
) AS categoryActor
WHERE category.is_active = 1
  AND category.category_code IN ('IT', 'BIOMEDICAL', 'GENERAL');

IF (SELECT COUNT(*) FROM #Categories) <> 3
BEGIN
  THROW 50006, 'The active IT, BIOMEDICAL and GENERAL categories are all required.', 1;
END;

IF OBJECT_ID('tempdb..#Departments') IS NOT NULL DROP TABLE #Departments;

SELECT
  department.id,
  department.department_code,
  department.name,
  COALESCE(hodActor.user_id, @FallbackUserId) AS hod_user_id,
  hodActor.user_role_id AS hod_user_role_id
INTO #Departments
FROM dbo.BS_departments AS department
OUTER APPLY
(
  SELECT TOP (1)
    assignment.user_id,
    assignment.id AS user_role_id
  FROM dbo.BS_budget_user_roles AS assignment
  INNER JOIN dbo.BS_budget_roles AS role
    ON role.id = assignment.role_id
   AND role.role_code = 'DEPARTMENT_BUDGET_MANAGER'
   AND role.is_active = 1
  INNER JOIN dbo.users AS assignedUser
    ON assignedUser.USER_ID = assignment.user_id
   AND assignedUser.is_active = 1
  WHERE assignment.is_active = 1
    AND assignment.department_id = department.id
  ORDER BY assignment.id
) AS hodActor
WHERE department.is_active = 1;

IF NOT EXISTS (SELECT 1 FROM #Departments)
BEGIN
  THROW 50007, 'No active departments were found.', 1;
END;

SELECT TOP (1)
  @PurchasingUserId = assignment.user_id,
  @PurchasingUserRoleId = assignment.id
FROM dbo.BS_budget_user_roles AS assignment
INNER JOIN dbo.BS_budget_roles AS role
  ON role.id = assignment.role_id
 AND role.role_code = 'PURCHASING_PRICE_REVIEWER'
 AND role.is_active = 1
INNER JOIN dbo.users AS assignedUser
  ON assignedUser.USER_ID = assignment.user_id
 AND assignedUser.is_active = 1
WHERE assignment.is_active = 1
ORDER BY assignment.id;

SET @PurchasingUserId = COALESCE(@PurchasingUserId, @FallbackUserId);

IF OBJECT_ID('tempdb..#CatalogPool') IS NOT NULL DROP TABLE #CatalogPool;

;WITH CatalogRanked AS
(
  SELECT
    category.id AS category_id,
    category.category_code,
    catalog.id AS catalog_item_id,
    catalog.item_code,
    catalog.name AS catalog_item_name,
    catalog.expense_type,
    catalog.unit_of_measure_id,
    unit.name AS unit_name,
    unit.unit_code,
    ROW_NUMBER() OVER
    (
      PARTITION BY category.id
      ORDER BY catalog.sort_order, catalog.id
    ) AS catalog_rank
  FROM #Categories AS category
  INNER JOIN dbo.BS_budget_catalog_items AS catalog
    ON catalog.budget_category_id = category.id
   AND catalog.is_active = 1
  INNER JOIN dbo.BS_units_of_measure AS unit
    ON unit.id = catalog.unit_of_measure_id
   AND unit.is_active = 1
  WHERE EXISTS
  (
    SELECT 1
    FROM dbo.BS_budget_catalog_sub_items AS subItem
    WHERE subItem.catalog_item_id = catalog.id
      AND subItem.is_active = 1
  )
)
SELECT *
INTO #CatalogPool
FROM CatalogRanked
WHERE catalog_rank <= @MaxCatalogItemsPerCategory;

IF EXISTS
(
  SELECT category.id
  FROM #Categories AS category
  LEFT JOIN #CatalogPool AS pool
    ON pool.category_id = category.id
  GROUP BY category.id
  HAVING COUNT(pool.catalog_item_id) < 3
)
BEGIN
  THROW 50008, 'Each category needs at least 3 active catalog items with at least one active catalog sub-item.', 1;
END;

/* ================================================================
   PREVIEW
   ================================================================ */

IF @Mode = 'PREVIEW'
BEGIN
  SELECT
    DB_NAME() AS database_name,
    @FinancialYearId AS financial_year_id,
    @FinancialYear AS financial_year,
    (SELECT COUNT(*) FROM #Departments) AS active_departments,
    (SELECT COUNT(*) FROM #Categories) AS active_demo_categories,
    (SELECT COUNT(*) FROM #CatalogPool WHERE category_code = 'IT') AS it_catalog_pool,
    (SELECT COUNT(*) FROM #CatalogPool WHERE category_code = 'BIOMEDICAL') AS biomedical_catalog_pool,
    (SELECT COUNT(*) FROM #CatalogPool WHERE category_code = 'GENERAL') AS general_catalog_pool,
    @FallbackUserId AS fallback_user_id,
    @PurchasingUserId AS purchasing_actor_user_id,
    @PurchasingUserRoleId AS purchasing_actor_user_role_id;

  SELECT
    'CURRENT_TRANSACTIONAL_ROWS_TO_REMOVE' AS preview_section,
    (SELECT COUNT(*) FROM dbo.BS_department_budgets) AS department_budgets,
    (SELECT COUNT(*) FROM dbo.BS_department_category_budgets) AS department_category_budgets,
    (SELECT COUNT(*) FROM dbo.BS_department_category_budget_items) AS department_items,
    (SELECT COUNT(*) FROM dbo.BS_category_budget_packages) AS category_packages,
    (SELECT COUNT(*) FROM dbo.BS_category_budget_package_items) AS package_items,
    (SELECT COUNT(*) FROM dbo.BS_category_budget_package_sub_items) AS package_models,
    (SELECT COUNT(*) FROM dbo.BS_category_budget_package_sub_item_price_reviews) AS price_reviews;

  SELECT
    category_code,
    COUNT(*) AS catalog_items_available_for_demo
  FROM #CatalogPool
  GROUP BY category_code
  ORDER BY category_code;

  PRINT 'PREVIEW ONLY - no data changed.';
  PRINT 'To execute: change @Mode from PREVIEW to APPLY and run the script again.';
  RETURN;
END;

IF @ConfirmReset <> @RequiredConfirmation
BEGIN
  THROW 50009, 'Destructive reset confirmation token is invalid.', 1;
END;

/* ================================================================
   APPLY
   ================================================================ */

BEGIN TRY
  BEGIN TRANSACTION;

  /* --------------------------------------------------------------
     1. Reset transactional Budget System data in FK-safe order
     -------------------------------------------------------------- */

  DELETE FROM dbo.BS_budget_workflow_history;
  DELETE FROM dbo.BS_Notifications;
  DELETE FROM dbo.BS_audit_logs;
  DELETE FROM dbo.BS_budget_item_requests;

  DELETE FROM dbo.BS_budget_change_request_items;
  DELETE FROM dbo.BS_budget_change_requests;

  DELETE FROM dbo.BS_category_budget_transfers;

  /* Learned mappings sourced from PO-link transactions cannot outlive
     the PO-link rows. Imported/manual mappings are preserved. */
  DELETE FROM dbo.BS_PO_CATALOG_MAPPINGS
  WHERE source_po_link_id IS NOT NULL;

  DELETE FROM dbo.BS_category_po_links;
  DELETE FROM dbo.BS_cfo_package_item_return_snapshots;

  DELETE FROM dbo.BS_category_budget_package_sub_item_price_reviews;
  DELETE FROM dbo.BS_category_budget_package_sub_item_attachments;
  DELETE FROM dbo.BS_category_budget_package_sub_item_allocations;
  DELETE FROM dbo.BS_category_budget_package_sub_items;
  DELETE FROM dbo.BS_category_budget_package_items;
  DELETE FROM dbo.BS_category_budget_packages;

  DELETE FROM dbo.BS_department_category_budget_item_approved_distributions;
  DELETE FROM dbo.BS_department_category_budget_item_distributions;
  DELETE FROM dbo.BS_department_category_budget_items;
  DELETE FROM dbo.BS_department_category_budgets;
  DELETE FROM dbo.BS_department_budgets;
  DELETE FROM dbo.BS_category_submission_windows;

  /* --------------------------------------------------------------
     2. Department budget headers - one budget for every department
     -------------------------------------------------------------- */

  INSERT INTO dbo.BS_department_budgets
  (
    financial_year_id,
    department_id,
    created_by,
    created_at,
    updated_by,
    updated_at
  )
  SELECT
    @FinancialYearId,
    department.id,
    department.hod_user_id,
    @BudgetCreatedAt,
    department.hod_user_id,
    @HodSubmitAt
  FROM #Departments AS department;

  /* --------------------------------------------------------------
     3. All three department category budgets - already through review
     -------------------------------------------------------------- */

  INSERT INTO dbo.BS_department_category_budgets
  (
    department_budget_id,
    budget_category_id,
    status,
    submitted_by,
    submitted_at,
    returned_by,
    returned_at,
    return_reason,
    category_review_completed_by,
    category_review_completed_at,
    created_by,
    created_at,
    updated_by,
    updated_at
  )
  SELECT
    departmentBudget.id,
    category.id,
    'CATEGORY_REVIEW_COMPLETED',
    department.hod_user_id,
    @HodSubmitAt,
    NULL,
    NULL,
    NULL,
    category.category_manager_user_id,
    @CategoryReviewAt,
    department.hod_user_id,
    @BudgetCreatedAt,
    category.category_manager_user_id,
    @CategoryReviewAt
  FROM dbo.BS_department_budgets AS departmentBudget
  INNER JOIN #Departments AS department
    ON department.id = departmentBudget.department_id
  CROSS JOIN #Categories AS category
  WHERE departmentBudget.financial_year_id = @FinancialYearId;

  IF OBJECT_ID('tempdb..#DepartmentCategoryBudgets') IS NOT NULL
    DROP TABLE #DepartmentCategoryBudgets;

  SELECT
    categoryBudget.id AS department_category_budget_id,
    departmentBudget.id AS department_budget_id,
    department.id AS department_id,
    department.department_code,
    department.name AS department_name,
    department.hod_user_id,
    department.hod_user_role_id,
    category.id AS category_id,
    category.category_code,
    category.name AS category_name,
    category.category_manager_user_id,
    category.category_manager_user_role_id
  INTO #DepartmentCategoryBudgets
  FROM dbo.BS_department_category_budgets AS categoryBudget
  INNER JOIN dbo.BS_department_budgets AS departmentBudget
    ON departmentBudget.id = categoryBudget.department_budget_id
   AND departmentBudget.financial_year_id = @FinancialYearId
  INNER JOIN #Departments AS department
    ON department.id = departmentBudget.department_id
  INNER JOIN #Categories AS category
    ON category.id = categoryBudget.budget_category_id;

  /* --------------------------------------------------------------
     4. Realistic HOD requests + Category Manager decisions

     Selection strategy:
       - first 2 items in every category are common hospital-wide needs
       - remaining catalog-pool items rotate by department
       - this creates realistic cross-department consolidation
     -------------------------------------------------------------- */

  INSERT INTO dbo.BS_department_category_budget_items
  (
    department_category_budget_id,
    catalog_item_id,
    requested_quantity,
    category_approved_quantity,
    distribution_method,
    review_status,
    review_note,
    reviewed_by,
    reviewed_at,
    is_active,
    created_by,
    created_at,
    updated_by,
    updated_at,
    catalog_item_name_snapshot,
    catalog_item_code_snapshot,
    expense_type_snapshot,
    unit_of_measure_id_snapshot,
    unit_name_snapshot,
    unit_code_snapshot,
    hod_item_note,
    is_project
  )
  SELECT
    budget.department_category_budget_id,
    pool.catalog_item_id,
    requested.requested_quantity,
    approved.approved_quantity,
    'MONTHLY',
    'CATEGORY_REVIEW_COMPLETED',
    CASE
      WHEN approved.approved_quantity < requested.requested_quantity
        THEN N'Category Manager adjusted the quantity after consolidating hospital-wide demand.'
      ELSE N'Category Manager approved the requested quantity for the demo budget cycle.'
    END,
    budget.category_manager_user_id,
    @CategoryReviewAt,
    1,
    budget.hod_user_id,
    @BudgetCreatedAt,
    budget.category_manager_user_id,
    @CategoryReviewAt,
    pool.catalog_item_name,
    pool.item_code,
    pool.expense_type,
    pool.unit_of_measure_id,
    pool.unit_name,
    pool.unit_code,
    CONCAT(
      N'Demo CFO presentation request for ',
      pool.catalog_item_name,
      N' - ',
      budget.department_name,
      N'.'
    ),
    CASE
      WHEN budget.category_code = 'GENERAL'
       AND ABS(CHECKSUM(budget.department_id, pool.catalog_item_id) % 9) = 0
      THEN 1 ELSE 0
    END
  FROM #DepartmentCategoryBudgets AS budget
  INNER JOIN #CatalogPool AS pool
    ON pool.category_id = budget.category_id
  CROSS APPLY
  (
    SELECT CAST(
      CASE budget.category_code
        WHEN 'IT' THEN 3 + ABS(CHECKSUM(budget.department_id, pool.catalog_item_id, 11) % 20)
        WHEN 'BIOMEDICAL' THEN 1 + ABS(CHECKSUM(budget.department_id, pool.catalog_item_id, 23) % 8)
        ELSE 4 + ABS(CHECKSUM(budget.department_id, pool.catalog_item_id, 37) % 28)
      END
      AS DECIMAL(18,4)
    ) AS requested_quantity
  ) AS requested
  CROSS APPLY
  (
    SELECT CAST(
      CASE
        WHEN ABS(CHECKSUM(budget.department_id, pool.catalog_item_id, 53) % 4) = 0
        THEN
          CASE
            WHEN requested.requested_quantity >= 18 THEN requested.requested_quantity - 3
            WHEN requested.requested_quantity >= 8 THEN requested.requested_quantity - 2
            WHEN requested.requested_quantity > 1 THEN requested.requested_quantity - 1
            ELSE requested.requested_quantity
          END
        ELSE requested.requested_quantity
      END
      AS DECIMAL(18,4)
    ) AS approved_quantity
  ) AS approved
  WHERE
    pool.catalog_rank <= 2
    OR ABS((pool.catalog_rank + budget.department_id) % 3) = 0;

  IF OBJECT_ID('tempdb..#SeedItems') IS NOT NULL DROP TABLE #SeedItems;

  SELECT
    item.id AS department_item_id,
    item.department_category_budget_id,
    item.catalog_item_id,
    item.requested_quantity,
    item.category_approved_quantity,
    item.unit_name_snapshot AS unit_name,
    item.unit_code_snapshot AS unit_code,
    budget.department_id,
    budget.department_name,
    budget.hod_user_id,
    budget.hod_user_role_id,
    budget.category_id,
    budget.category_code,
    budget.category_name,
    budget.category_manager_user_id,
    budget.category_manager_user_role_id
  INTO #SeedItems
  FROM dbo.BS_department_category_budget_items AS item
  INNER JOIN #DepartmentCategoryBudgets AS budget
    ON budget.department_category_budget_id = item.department_category_budget_id;

  /* --------------------------------------------------------------
     5. HOD monthly distributions - exact requested total
     -------------------------------------------------------------- */

  IF OBJECT_ID('tempdb..#Months') IS NOT NULL DROP TABLE #Months;
  CREATE TABLE #Months (period_no INT NOT NULL PRIMARY KEY);
  INSERT INTO #Months (period_no)
  VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12);

  INSERT INTO dbo.BS_department_category_budget_item_distributions
  (
    department_budget_item_id,
    period_type,
    period_no,
    quantity,
    created_at,
    updated_at
  )
  SELECT
    item.department_item_id,
    'MONTH',
    month.period_no,
    CAST(
      FLOOR(item.requested_quantity / 12)
      + CASE
          WHEN month.period_no <= (CAST(item.requested_quantity AS INT) % 12)
          THEN 1 ELSE 0
        END
      AS DECIMAL(18,4)
    ),
    @BudgetCreatedAt,
    @HodSubmitAt
  FROM #SeedItems AS item
  CROSS JOIN #Months AS month;

  /* --------------------------------------------------------------
     6. Category Manager manual approved distributions for a subset

     About 20% of department items get a deliberate custom pattern:
       Jan / Mar / Jun / Sep / Dec
     Other items keep the application's automatic approved distribution.
     -------------------------------------------------------------- */

  IF OBJECT_ID('tempdb..#ApprovedMonthPattern') IS NOT NULL
    DROP TABLE #ApprovedMonthPattern;

  CREATE TABLE #ApprovedMonthPattern
  (
    period_no INT NOT NULL PRIMARY KEY,
    allocation_slot INT NULL
  );

  INSERT INTO #ApprovedMonthPattern (period_no, allocation_slot)
  VALUES
    (1,1),(2,NULL),(3,2),(4,NULL),(5,NULL),(6,3),
    (7,NULL),(8,NULL),(9,4),(10,NULL),(11,NULL),(12,5);

  INSERT INTO dbo.BS_department_category_budget_item_approved_distributions
  (
    department_budget_item_id,
    period_type,
    period_no,
    quantity,
    created_by,
    created_at,
    updated_by,
    updated_at
  )
  SELECT
    item.department_item_id,
    'MONTH',
    pattern.period_no,
    CAST(
      CASE
        WHEN pattern.allocation_slot IS NULL THEN 0
        ELSE
          FLOOR(item.category_approved_quantity / 5)
          + CASE
              WHEN pattern.allocation_slot <= (CAST(item.category_approved_quantity AS INT) % 5)
              THEN 1 ELSE 0
            END
      END
      AS DECIMAL(18,4)
    ),
    item.category_manager_user_id,
    @CategoryReviewAt,
    item.category_manager_user_id,
    @CategoryReviewAt
  FROM #SeedItems AS item
  CROSS JOIN #ApprovedMonthPattern AS pattern
  WHERE ABS(CHECKSUM(item.department_item_id) % 5) = 0;

  /* --------------------------------------------------------------
     7. Close category submission windows
     -------------------------------------------------------------- */

  INSERT INTO dbo.BS_category_submission_windows
  (
    financial_year_id,
    budget_category_id,
    status,
    closed_by,
    closed_at,
    close_reason,
    reopened_by,
    reopened_at,
    reopen_reason,
    created_at,
    updated_at
  )
  SELECT
    @FinancialYearId,
    category.id,
    'CLOSED',
    category.category_manager_user_id,
    @WindowClosedAt,
    N'Demo cycle: all department submissions received and Category Manager review completed.',
    NULL,
    NULL,
    NULL,
    @BudgetCreatedAt,
    @WindowClosedAt
  FROM #Categories AS category;

  /* --------------------------------------------------------------
     8. Create the 3 category packages in their final CFO-review state
     -------------------------------------------------------------- */

  INSERT INTO dbo.BS_category_budget_packages
  (
    financial_year_id,
    budget_category_id,
    status,
    submitted_to_cfo_by,
    submitted_to_cfo_at,
    returned_by_cfo,
    returned_at,
    return_reason,
    cfo_review_completed_by,
    cfo_review_completed_at,
    created_by,
    created_at,
    updated_by,
    updated_at,
    submitted_to_purchasing_by,
    submitted_to_purchasing_user_role_id,
    submitted_to_purchasing_at,
    purchasing_review_round
  )
  SELECT
    @FinancialYearId,
    category.id,
    'IN_CFO_REVIEW',
    @PurchasingUserId,
    @CfoSubmitAt,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    category.category_manager_user_id,
    @CategoryReviewAt,
    @PurchasingUserId,
    @CfoSubmitAt,
    category.category_manager_user_id,
    category.category_manager_user_role_id,
    @PurchasingSubmitAt,
    1
  FROM #Categories AS category;

  IF OBJECT_ID('tempdb..#Packages') IS NOT NULL DROP TABLE #Packages;

  SELECT
    package.id AS package_id,
    package.budget_category_id AS category_id,
    category.category_code,
    category.name AS category_name,
    category.category_manager_user_id,
    category.category_manager_user_role_id
  INTO #Packages
  FROM dbo.BS_category_budget_packages AS package
  INNER JOIN #Categories AS category
    ON category.id = package.budget_category_id
  WHERE package.financial_year_id = @FinancialYearId;

  /* --------------------------------------------------------------
     9. Consolidated package items
     -------------------------------------------------------------- */

  INSERT INTO dbo.BS_category_budget_package_items
  (
    category_budget_package_id,
    catalog_item_id,
    cfo_review_status,
    cfo_review_note,
    cfo_reviewed_by,
    cfo_reviewed_at,
    needs_reconciliation,
    is_active,
    created_by,
    created_at,
    updated_by,
    updated_at,
    catalog_item_name_snapshot,
    catalog_item_code_snapshot,
    expense_type_snapshot,
    unit_of_measure_id_snapshot,
    unit_name_snapshot,
    unit_code_snapshot
  )
  SELECT DISTINCT
    package.package_id,
    catalog.id,
    'PENDING_CFO_REVIEW',
    NULL,
    NULL,
    NULL,
    0,
    1,
    package.category_manager_user_id,
    @CategoryReviewAt,
    @PurchasingUserId,
    @CfoSubmitAt,
    catalog.name,
    catalog.item_code,
    catalog.expense_type,
    catalog.unit_of_measure_id,
    unit.name,
    unit.unit_code
  FROM #Packages AS package
  INNER JOIN #SeedItems AS item
    ON item.category_id = package.category_id
  INNER JOIN dbo.BS_budget_catalog_items AS catalog
    ON catalog.id = item.catalog_item_id
  INNER JOIN dbo.BS_units_of_measure AS unit
    ON unit.id = catalog.unit_of_measure_id;

  /* --------------------------------------------------------------
     10. Package models/sub-items

     Up to 2 active catalog sub-items are used per package item.
     General/default model is preferred, then one additional model if present.
     -------------------------------------------------------------- */

  ;WITH RankedModels AS
  (
    SELECT
      packageItem.id AS package_item_id,
      packageItem.catalog_item_id,
      packageItem.category_budget_package_id,
      package.category_code,
      package.category_manager_user_id,
      subItem.id AS catalog_sub_item_id,
      subItem.name,
      subItem.default_specification,
      subItem.default_unit_of_measure_id,
      ROW_NUMBER() OVER
      (
        PARTITION BY packageItem.id
        ORDER BY subItem.is_default_general DESC, subItem.id
      ) AS model_no
    FROM dbo.BS_category_budget_package_items AS packageItem
    INNER JOIN #Packages AS package
      ON package.package_id = packageItem.category_budget_package_id
    INNER JOIN dbo.BS_budget_catalog_sub_items AS subItem
      ON subItem.catalog_item_id = packageItem.catalog_item_id
     AND subItem.is_active = 1
    WHERE packageItem.is_active = 1
  )
  INSERT INTO dbo.BS_category_budget_package_sub_items
  (
    category_budget_package_item_id,
    catalog_sub_item_id,
    name,
    specification,
    unit_of_measure_id,
    quantity,
    unit_price,
    note,
    is_active,
    created_by,
    created_at,
    updated_by,
    updated_at,
    category_manager_unit_price
  )
  SELECT
    model.package_item_id,
    model.catalog_sub_item_id,
    model.name,
    COALESCE(
      model.default_specification,
      CONCAT(N'Demo specification for ', model.name)
    ),
    model.default_unit_of_measure_id,
    NULL,
    NULL,
    N'Demo package model prepared by Category Manager.',
    1,
    model.category_manager_user_id,
    @CategoryReviewAt,
    model.category_manager_user_id,
    @CategoryReviewAt,
    CAST(
      CASE model.category_code
        WHEN 'IT' THEN
          1200 + (ABS(CHECKSUM(model.catalog_item_id) % 10) * 425) + ((model.model_no - 1) * 175)
        WHEN 'BIOMEDICAL' THEN
          6500 + (ABS(CHECKSUM(model.catalog_item_id) % 10) * 2650) + ((model.model_no - 1) * 900)
        ELSE
          450 + (ABS(CHECKSUM(model.catalog_item_id) % 10) * 240) + ((model.model_no - 1) * 120)
      END
      AS DECIMAL(18,6)
    )
  FROM RankedModels AS model
  WHERE model.model_no <= 2;

  /* --------------------------------------------------------------
     11. Allocate every approved department quantity to a package model

     If two models exist, departments alternate between them.
     -------------------------------------------------------------- */

  IF OBJECT_ID('tempdb..#RankedPackageModels') IS NOT NULL
    DROP TABLE #RankedPackageModels;

  SELECT
    packageSubItem.id AS package_sub_item_id,
    packageSubItem.category_budget_package_item_id AS package_item_id,
    ROW_NUMBER() OVER
    (
      PARTITION BY packageSubItem.category_budget_package_item_id
      ORDER BY packageSubItem.id
    ) AS model_no,
    COUNT(*) OVER
    (
      PARTITION BY packageSubItem.category_budget_package_item_id
    ) AS model_count
  INTO #RankedPackageModels
  FROM dbo.BS_category_budget_package_sub_items AS packageSubItem
  WHERE packageSubItem.is_active = 1;

  INSERT INTO dbo.BS_category_budget_package_sub_item_allocations
  (
    category_budget_package_sub_item_id,
    department_category_budget_item_id,
    allocated_quantity,
    created_by,
    created_at,
    updated_by,
    updated_at
  )
  SELECT
    model.package_sub_item_id,
    item.department_item_id,
    item.category_approved_quantity,
    item.category_manager_user_id,
    @CategoryReviewAt,
    item.category_manager_user_id,
    @CategoryReviewAt
  FROM #SeedItems AS item
  INNER JOIN #Packages AS package
    ON package.category_id = item.category_id
  INNER JOIN dbo.BS_category_budget_package_items AS packageItem
    ON packageItem.category_budget_package_id = package.package_id
   AND packageItem.catalog_item_id = item.catalog_item_id
   AND packageItem.is_active = 1
  INNER JOIN #RankedPackageModels AS model
    ON model.package_item_id = packageItem.id
   AND model.model_no =
     CASE
       WHEN model.model_count > 1 AND (item.department_id % 2) = 0 THEN 2
       ELSE 1
     END
  WHERE item.category_approved_quantity > 0;

  UPDATE packageSubItem
  SET
    packageSubItem.quantity = allocationTotal.allocated_quantity,
    packageSubItem.updated_at = @CategoryReviewAt
  FROM dbo.BS_category_budget_package_sub_items AS packageSubItem
  INNER JOIN
  (
    SELECT
      allocation.category_budget_package_sub_item_id,
      SUM(allocation.allocated_quantity) AS allocated_quantity
    FROM dbo.BS_category_budget_package_sub_item_allocations AS allocation
    GROUP BY allocation.category_budget_package_sub_item_id
  ) AS allocationTotal
    ON allocationTotal.category_budget_package_sub_item_id = packageSubItem.id;

  /* Remove any unused second model. Normally every model is used, but this keeps
     the package internally clean if a very small demo data set is used. */
  DELETE packageSubItem
  FROM dbo.BS_category_budget_package_sub_items AS packageSubItem
  WHERE NOT EXISTS
  (
    SELECT 1
    FROM dbo.BS_category_budget_package_sub_item_allocations AS allocation
    WHERE allocation.category_budget_package_sub_item_id = packageSubItem.id
  );

  /* --------------------------------------------------------------
     12. Purchasing price review - all prices accepted
     -------------------------------------------------------------- */

  INSERT INTO dbo.BS_category_budget_package_sub_item_price_reviews
  (
    category_budget_package_id,
    category_budget_package_sub_item_id,
    review_round,
    catalog_sub_item_id_snapshot,
    quantity_snapshot,
    specification_snapshot,
    unit_of_measure_id_snapshot,
    category_manager_unit_price_snapshot,
    previous_purchasing_unit_price,
    purchasing_unit_price,
    status,
    decision_source,
    reviewed_by,
    reviewed_user_role_id,
    reviewed_at,
    created_at,
    updated_at
  )
  SELECT
    packageItem.category_budget_package_id,
    packageSubItem.id,
    1,
    packageSubItem.catalog_sub_item_id,
    COALESCE(packageSubItem.quantity, 0),
    packageSubItem.specification,
    packageSubItem.unit_of_measure_id,
    packageSubItem.category_manager_unit_price,
    NULL,
    CAST(
      ROUND(
        packageSubItem.category_manager_unit_price
        * (0.95 + (ABS(CHECKSUM(packageSubItem.id) % 7) * 0.01)),
        2
      )
      AS DECIMAL(18,6)
    ),
    'ACCEPTED',
    'MANUAL',
    @PurchasingUserId,
    @PurchasingUserRoleId,
    @PurchasingReviewAt,
    @PurchasingSubmitAt,
    @PurchasingReviewAt
  FROM dbo.BS_category_budget_package_sub_items AS packageSubItem
  INNER JOIN dbo.BS_category_budget_package_items AS packageItem
    ON packageItem.id = packageSubItem.category_budget_package_item_id
   AND packageItem.is_active = 1
  INNER JOIN #Packages AS package
    ON package.package_id = packageItem.category_budget_package_id
  WHERE packageSubItem.is_active = 1
    AND packageSubItem.quantity > 0
    AND packageSubItem.category_manager_unit_price >= 1;

  UPDATE packageSubItem
  SET
    packageSubItem.unit_price = review.purchasing_unit_price,
    packageSubItem.updated_by = @PurchasingUserId,
    packageSubItem.updated_at = @CfoSubmitAt
  FROM dbo.BS_category_budget_package_sub_items AS packageSubItem
  INNER JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
    ON review.category_budget_package_sub_item_id = packageSubItem.id
   AND review.review_round = 1
   AND review.status = 'ACCEPTED';

  /* --------------------------------------------------------------
     13. Workflow history - enough history for realistic UI/history views
     -------------------------------------------------------------- */

  INSERT INTO dbo.BS_budget_workflow_history
  (
    financial_year_id,
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    note,
    old_values_json,
    new_values_json,
    user_role_id,
    acting_workspace,
    created_by,
    created_at
  )
  SELECT
    @FinancialYearId,
    'DEPARTMENT_CATEGORY_BUDGET',
    budget.department_category_budget_id,
    'DEPARTMENT_CATEGORY_SUBMITTED',
    'DRAFT',
    'IN_CATEGORY_REVIEW',
    CONCAT(budget.category_name, N' demo budget submitted to Category Manager'),
    NULL,
    NULL,
    budget.hod_user_role_id,
    'DEPARTMENT',
    budget.hod_user_id,
    @HodSubmitAt
  FROM #DepartmentCategoryBudgets AS budget;

  INSERT INTO dbo.BS_budget_workflow_history
  (
    financial_year_id,
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    note,
    old_values_json,
    new_values_json,
    user_role_id,
    acting_workspace,
    created_by,
    created_at
  )
  SELECT
    @FinancialYearId,
    'DEPARTMENT_CATEGORY_BUDGET',
    budget.department_category_budget_id,
    'DEPARTMENT_CATEGORY_REVIEW_COMPLETED',
    'IN_CATEGORY_REVIEW',
    'CATEGORY_REVIEW_COMPLETED',
    CONCAT(budget.category_name, N' demo review completed for ', budget.department_name),
    NULL,
    NULL,
    budget.category_manager_user_role_id,
    'CATEGORY',
    budget.category_manager_user_id,
    @CategoryReviewAt
  FROM #DepartmentCategoryBudgets AS budget;

  INSERT INTO dbo.BS_budget_workflow_history
  (
    financial_year_id,
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    note,
    old_values_json,
    new_values_json,
    user_role_id,
    acting_workspace,
    created_by,
    created_at
  )
  SELECT
    @FinancialYearId,
    'CATEGORY_SUBMISSION_WINDOW',
    window.id,
    'CATEGORY_SUBMISSION_WINDOW_CLOSED',
    'OPEN',
    'CLOSED',
    N'Demo category submission window closed after all department reviews.',
    NULL,
    NULL,
    category.category_manager_user_role_id,
    'CATEGORY',
    category.category_manager_user_id,
    @WindowClosedAt
  FROM dbo.BS_category_submission_windows AS window
  INNER JOIN #Categories AS category
    ON category.id = window.budget_category_id
  WHERE window.financial_year_id = @FinancialYearId;

  INSERT INTO dbo.BS_budget_workflow_history
  (
    financial_year_id,
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    note,
    old_values_json,
    new_values_json,
    user_role_id,
    acting_workspace,
    created_by,
    created_at
  )
  SELECT
    @FinancialYearId,
    'CATEGORY_BUDGET_PACKAGE',
    package.package_id,
    'CATEGORY_PACKAGE_SUBMITTED_TO_PURCHASING',
    'DRAFT',
    'IN_PURCHASING_REVIEW',
    N'Demo category package submitted to Purchasing for price review.',
    NULL,
    N'{"reviewRound":1}',
    package.category_manager_user_role_id,
    'CATEGORY',
    package.category_manager_user_id,
    @PurchasingSubmitAt
  FROM #Packages AS package;

  INSERT INTO dbo.BS_budget_workflow_history
  (
    financial_year_id,
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    note,
    old_values_json,
    new_values_json,
    user_role_id,
    acting_workspace,
    created_by,
    created_at
  )
  SELECT
    @FinancialYearId,
    'CATEGORY_BUDGET_PACKAGE',
    package.package_id,
    'PURCHASING_PRICES_ACCEPTED_ALL',
    NULL,
    NULL,
    N'Demo Purchasing review accepted all current-round prices.',
    NULL,
    CONCAT(
      N'{"acceptedCount":',
      COUNT(review.id),
      N',"reviewRound":1}'
    ),
    @PurchasingUserRoleId,
    'GLOBAL',
    @PurchasingUserId,
    @PurchasingReviewAt
  FROM #Packages AS package
  INNER JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
    ON review.category_budget_package_id = package.package_id
   AND review.review_round = 1
   AND review.status = 'ACCEPTED'
  GROUP BY package.package_id;

  INSERT INTO dbo.BS_budget_workflow_history
  (
    financial_year_id,
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    note,
    old_values_json,
    new_values_json,
    user_role_id,
    acting_workspace,
    created_by,
    created_at
  )
  SELECT
    @FinancialYearId,
    'CATEGORY_BUDGET_PACKAGE',
    package.package_id,
    'CATEGORY_PACKAGE_SUBMITTED_TO_CFO_BY_PURCHASING',
    'IN_PURCHASING_REVIEW',
    'IN_CFO_REVIEW',
    N'Demo Purchasing price review completed and package submitted to CFO.',
    NULL,
    CONCAT(
      N'{"reviewRound":1,"acceptedPriceCount":',
      COUNT(review.id),
      N'}'
    ),
    @PurchasingUserRoleId,
    'GLOBAL',
    @PurchasingUserId,
    @CfoSubmitAt
  FROM #Packages AS package
  INNER JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
    ON review.category_budget_package_id = package.package_id
   AND review.review_round = 1
   AND review.status = 'ACCEPTED'
  GROUP BY package.package_id;

  /* --------------------------------------------------------------
     14. Validation - abort/rollback if the demo is not internally sound
     -------------------------------------------------------------- */

  IF (SELECT COUNT(*) FROM dbo.BS_department_budgets WHERE financial_year_id = @FinancialYearId)
     <> (SELECT COUNT(*) FROM #Departments)
  BEGIN
    THROW 50020, 'Validation failed: not every active department has a department budget.', 1;
  END;

  IF EXISTS
  (
    SELECT departmentBudget.department_id
    FROM dbo.BS_department_budgets AS departmentBudget
    INNER JOIN #Departments AS department
      ON department.id = departmentBudget.department_id
    LEFT JOIN dbo.BS_department_category_budgets AS categoryBudget
      ON categoryBudget.department_budget_id = departmentBudget.id
     AND categoryBudget.status = 'CATEGORY_REVIEW_COMPLETED'
    WHERE departmentBudget.financial_year_id = @FinancialYearId
    GROUP BY departmentBudget.department_id
    HAVING COUNT(categoryBudget.id) <> 3
  )
  BEGIN
    THROW 50021, 'Validation failed: each department must have all 3 category reviews completed.', 1;
  END;

  IF EXISTS
  (
    SELECT item.id
    FROM dbo.BS_department_category_budget_items AS item
    INNER JOIN dbo.BS_department_category_budget_item_distributions AS distribution
      ON distribution.department_budget_item_id = item.id
    GROUP BY item.id, item.requested_quantity
    HAVING ABS(SUM(distribution.quantity) - item.requested_quantity) > 0.0001
  )
  BEGIN
    THROW 50022, 'Validation failed: one or more HOD distributions do not equal requested quantity.', 1;
  END;

  IF EXISTS
  (
    SELECT item.id
    FROM dbo.BS_department_category_budget_items AS item
    INNER JOIN dbo.BS_department_category_budget_item_approved_distributions AS distribution
      ON distribution.department_budget_item_id = item.id
    GROUP BY item.id, item.category_approved_quantity
    HAVING ABS(SUM(distribution.quantity) - item.category_approved_quantity) > 0.0001
  )
  BEGIN
    THROW 50023, 'Validation failed: one or more custom approved distributions do not equal approved quantity.', 1;
  END;

  IF (SELECT COUNT(*) FROM dbo.BS_category_budget_packages WHERE financial_year_id = @FinancialYearId AND status = 'IN_CFO_REVIEW') <> 3
  BEGIN
    THROW 50024, 'Validation failed: expected exactly 3 packages in CFO review.', 1;
  END;

  IF EXISTS
  (
    SELECT 1
    FROM dbo.BS_category_budget_package_items AS packageItem
    INNER JOIN dbo.BS_category_budget_packages AS package
      ON package.id = packageItem.category_budget_package_id
    WHERE package.financial_year_id = @FinancialYearId
      AND packageItem.is_active = 1
      AND
      (
        packageItem.cfo_review_status <> 'PENDING_CFO_REVIEW'
        OR packageItem.needs_reconciliation <> 0
      )
  )
  BEGIN
    THROW 50025, 'Validation failed: package items are not cleanly pending CFO review.', 1;
  END;

  IF EXISTS
  (
    SELECT
      packageItem.id
    FROM dbo.BS_category_budget_package_items AS packageItem
    INNER JOIN dbo.BS_category_budget_packages AS package
      ON package.id = packageItem.category_budget_package_id
    INNER JOIN dbo.BS_category_budget_package_sub_items AS packageSubItem
      ON packageSubItem.category_budget_package_item_id = packageItem.id
     AND packageSubItem.is_active = 1
    LEFT JOIN
    (
      SELECT
        item.catalog_item_id,
        categoryBudget.budget_category_id,
        SUM(item.category_approved_quantity) AS approved_quantity
      FROM dbo.BS_department_category_budget_items AS item
      INNER JOIN dbo.BS_department_category_budgets AS categoryBudget
        ON categoryBudget.id = item.department_category_budget_id
       AND categoryBudget.status = 'CATEGORY_REVIEW_COMPLETED'
      INNER JOIN dbo.BS_department_budgets AS departmentBudget
        ON departmentBudget.id = categoryBudget.department_budget_id
       AND departmentBudget.financial_year_id = @FinancialYearId
      WHERE item.review_status = 'CATEGORY_REVIEW_COMPLETED'
        AND item.is_active = 1
      GROUP BY item.catalog_item_id, categoryBudget.budget_category_id
    ) AS approved
      ON approved.catalog_item_id = packageItem.catalog_item_id
     AND approved.budget_category_id = package.budget_category_id
    WHERE package.financial_year_id = @FinancialYearId
    GROUP BY packageItem.id, approved.approved_quantity
    HAVING ABS(SUM(packageSubItem.quantity) - MAX(approved.approved_quantity)) > 0.0001
  )
  BEGIN
    THROW 50026, 'Validation failed: package model quantities do not reconcile to approved department quantities.', 1;
  END;

  IF EXISTS
  (
    SELECT 1
    FROM dbo.BS_category_budget_packages AS package
    INNER JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
      ON review.category_budget_package_id = package.id
     AND review.review_round = package.purchasing_review_round
    WHERE package.financial_year_id = @FinancialYearId
      AND
      (
        review.status <> 'ACCEPTED'
        OR review.purchasing_unit_price < 1
        OR review.reviewed_by IS NULL
        OR review.reviewed_at IS NULL
      )
  )
  BEGIN
    THROW 50027, 'Validation failed: one or more Purchasing prices are not accepted and ready.', 1;
  END;

  IF EXISTS
  (
    SELECT 1
    FROM dbo.BS_category_budget_package_sub_items AS packageSubItem
    INNER JOIN dbo.BS_category_budget_package_items AS packageItem
      ON packageItem.id = packageSubItem.category_budget_package_item_id
     AND packageItem.is_active = 1
    INNER JOIN dbo.BS_category_budget_packages AS package
      ON package.id = packageItem.category_budget_package_id
    LEFT JOIN dbo.BS_category_budget_package_sub_item_price_reviews AS review
      ON review.category_budget_package_sub_item_id = packageSubItem.id
     AND review.category_budget_package_id = package.id
     AND review.review_round = package.purchasing_review_round
    WHERE package.financial_year_id = @FinancialYearId
      AND packageSubItem.is_active = 1
      AND review.id IS NULL
  )
  BEGIN
    THROW 50028, 'Validation failed: an active package model is missing its current Purchasing price review.', 1;
  END;

  IF EXISTS
  (
    SELECT item.id
    FROM dbo.BS_department_category_budget_items AS item
    INNER JOIN dbo.BS_department_category_budgets AS categoryBudget
      ON categoryBudget.id = item.department_category_budget_id
     AND categoryBudget.status = 'CATEGORY_REVIEW_COMPLETED'
    INNER JOIN dbo.BS_department_budgets AS departmentBudget
      ON departmentBudget.id = categoryBudget.department_budget_id
     AND departmentBudget.financial_year_id = @FinancialYearId
    LEFT JOIN dbo.BS_category_budget_package_sub_item_allocations AS allocation
      ON allocation.department_category_budget_item_id = item.id
    WHERE item.is_active = 1
      AND item.review_status = 'CATEGORY_REVIEW_COMPLETED'
    GROUP BY item.id, item.category_approved_quantity
    HAVING ABS(COALESCE(SUM(allocation.allocated_quantity), 0) - item.category_approved_quantity) > 0.0001
  )
  BEGIN
    THROW 50029, 'Validation failed: a department item allocation does not equal its approved quantity.', 1;
  END;

  COMMIT TRANSACTION;

  /* --------------------------------------------------------------
     15. Final demo report
     -------------------------------------------------------------- */

  SELECT
    'CFO_DEMO_SEED_COMPLETED' AS result,
    DB_NAME() AS database_name,
    @FinancialYearId AS financial_year_id,
    @FinancialYear AS financial_year,
    (SELECT COUNT(*) FROM #Departments) AS departments_seeded,
    (SELECT COUNT(*)
       FROM dbo.BS_department_category_budgets AS dcb
       INNER JOIN dbo.BS_department_budgets AS db ON db.id = dcb.department_budget_id
      WHERE db.financial_year_id = @FinancialYearId) AS department_category_budgets,
    (SELECT COUNT(*) FROM #SeedItems) AS department_items,
    (SELECT COUNT(DISTINCT department_budget_item_id)
       FROM dbo.BS_department_category_budget_item_approved_distributions) AS custom_approved_distribution_items,
    (SELECT COUNT(*) FROM dbo.BS_category_budget_packages
      WHERE financial_year_id = @FinancialYearId AND status = 'IN_CFO_REVIEW') AS packages_in_cfo_review,
    (SELECT COUNT(*)
       FROM dbo.BS_category_budget_package_items AS pi
       INNER JOIN dbo.BS_category_budget_packages AS p ON p.id = pi.category_budget_package_id
      WHERE p.financial_year_id = @FinancialYearId AND pi.is_active = 1) AS package_items,
    (SELECT COUNT(*)
       FROM dbo.BS_category_budget_package_sub_items AS psi
       INNER JOIN dbo.BS_category_budget_package_items AS pi ON pi.id = psi.category_budget_package_item_id
       INNER JOIN dbo.BS_category_budget_packages AS p ON p.id = pi.category_budget_package_id
      WHERE p.financial_year_id = @FinancialYearId AND psi.is_active = 1) AS package_models,
    (SELECT COUNT(*)
       FROM dbo.BS_category_budget_package_sub_item_price_reviews AS pr
       INNER JOIN dbo.BS_category_budget_packages AS p ON p.id = pr.category_budget_package_id
      WHERE p.financial_year_id = @FinancialYearId
        AND pr.review_round = p.purchasing_review_round
        AND pr.status = 'ACCEPTED') AS accepted_purchasing_prices;

  SELECT
    category.category_code,
    category.name AS category_name,
    package.id AS package_id,
    package.status,
    COUNT(DISTINCT packageItem.id) AS package_items,
    COUNT(DISTINCT packageSubItem.id) AS models,
    SUM(packageSubItem.quantity) AS allocated_quantity,
    CAST(SUM(packageSubItem.quantity * packageSubItem.unit_price) AS DECIMAL(19,2)) AS purchasing_value_sar,
    package.submitted_to_purchasing_at,
    package.submitted_to_cfo_at
  FROM dbo.BS_category_budget_packages AS package
  INNER JOIN dbo.BS_budget_categories AS category
    ON category.id = package.budget_category_id
  LEFT JOIN dbo.BS_category_budget_package_items AS packageItem
    ON packageItem.category_budget_package_id = package.id
   AND packageItem.is_active = 1
  LEFT JOIN dbo.BS_category_budget_package_sub_items AS packageSubItem
    ON packageSubItem.category_budget_package_item_id = packageItem.id
   AND packageSubItem.is_active = 1
  WHERE package.financial_year_id = @FinancialYearId
  GROUP BY
    category.category_code,
    category.name,
    package.id,
    package.status,
    package.submitted_to_purchasing_at,
    package.submitted_to_cfo_at
  ORDER BY category.category_code;

  ;WITH DepartmentDemand AS
  (
    SELECT
      categoryBudget.budget_category_id,
      departmentItem.catalog_item_id,
      COUNT(DISTINCT categoryBudget.department_budget_id) AS requesting_departments,
      SUM(departmentItem.requested_quantity) AS total_requested_quantity,
      SUM(departmentItem.category_approved_quantity) AS total_approved_quantity
    FROM dbo.BS_department_category_budget_items AS departmentItem
    INNER JOIN dbo.BS_department_category_budgets AS categoryBudget
      ON categoryBudget.id = departmentItem.department_category_budget_id
     AND categoryBudget.status = 'CATEGORY_REVIEW_COMPLETED'
    INNER JOIN dbo.BS_department_budgets AS departmentBudget
      ON departmentBudget.id = categoryBudget.department_budget_id
     AND departmentBudget.financial_year_id = @FinancialYearId
    WHERE departmentItem.is_active = 1
      AND departmentItem.review_status = 'CATEGORY_REVIEW_COMPLETED'
    GROUP BY categoryBudget.budget_category_id, departmentItem.catalog_item_id
  ),
  PackageValue AS
  (
    SELECT
      packageItem.id AS package_item_id,
      CAST(SUM(packageSubItem.quantity * packageSubItem.unit_price) AS DECIMAL(19,2)) AS purchasing_value_sar
    FROM dbo.BS_category_budget_package_items AS packageItem
    INNER JOIN dbo.BS_category_budget_package_sub_items AS packageSubItem
      ON packageSubItem.category_budget_package_item_id = packageItem.id
     AND packageSubItem.is_active = 1
    WHERE packageItem.is_active = 1
    GROUP BY packageItem.id
  )
  SELECT TOP (20)
    category.category_code,
    packageItem.catalog_item_name_snapshot AS item_name,
    demand.requesting_departments,
    demand.total_requested_quantity,
    demand.total_approved_quantity,
    value.purchasing_value_sar
  FROM dbo.BS_category_budget_package_items AS packageItem
  INNER JOIN dbo.BS_category_budget_packages AS package
    ON package.id = packageItem.category_budget_package_id
  INNER JOIN dbo.BS_budget_categories AS category
    ON category.id = package.budget_category_id
  INNER JOIN DepartmentDemand AS demand
    ON demand.budget_category_id = package.budget_category_id
   AND demand.catalog_item_id = packageItem.catalog_item_id
  INNER JOIN PackageValue AS value
    ON value.package_item_id = packageItem.id
  WHERE package.financial_year_id = @FinancialYearId
    AND packageItem.is_active = 1
  ORDER BY value.purchasing_value_sar DESC, item_name;

  PRINT 'CFO demo data created successfully.';
  PRINT 'All 3 category packages are now IN_CFO_REVIEW with PENDING_CFO_REVIEW items.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
  DECLARE @ErrorNumber INT = ERROR_NUMBER();
  DECLARE @ErrorLine INT = ERROR_LINE();

  PRINT CONCAT('CFO demo seed FAILED. Error ', @ErrorNumber, ' at line ', @ErrorLine, ': ', @ErrorMessage);
  THROW;
END CATCH;
