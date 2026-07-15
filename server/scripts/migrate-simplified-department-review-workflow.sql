/*
  Simplified department review workflow migration.

  Development-only migration for the revised workflow:
  - Category Managers no longer return department budgets to HOD.
  - Department item review status is DRAFT -> PENDING_CATEGORY_REVIEW -> CATEGORY_REVIEW_COMPLETED.
  - Approved quantity 0 represents a reviewed item with no approved demand.

  Review before running in any shared environment.
*/

BEGIN TRANSACTION;

UPDATE dbo.BS_department_category_budget_items
SET review_status = 'CATEGORY_REVIEW_COMPLETED'
WHERE review_status IN ('CATEGORY_ACCEPTED', 'NEEDS_MODIFICATION');

UPDATE dbo.BS_department_category_budgets
SET status = 'IN_CATEGORY_REVIEW'
WHERE status = 'RETURNED_TO_DEPARTMENT';

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'CK_BS_department_category_budget_items_review_note'
    AND parent_object_id = OBJECT_ID('dbo.BS_department_category_budget_items')
)
BEGIN
  ALTER TABLE dbo.BS_department_category_budget_items
    DROP CONSTRAINT CK_BS_department_category_budget_items_review_note;
END;

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'CK_BS_department_category_budget_items_review_status'
    AND parent_object_id = OBJECT_ID('dbo.BS_department_category_budget_items')
)
BEGIN
  ALTER TABLE dbo.BS_department_category_budget_items
    DROP CONSTRAINT CK_BS_department_category_budget_items_review_status;
END;

ALTER TABLE dbo.BS_department_category_budget_items
  ADD CONSTRAINT CK_BS_department_category_budget_items_review_status
  CHECK (
    [review_status] = 'CATEGORY_REVIEW_COMPLETED'
    OR [review_status] = 'PENDING_CATEGORY_REVIEW'
    OR [review_status] = 'DRAFT'
  );

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'CK_BS_department_category_budgets_status'
    AND parent_object_id = OBJECT_ID('dbo.BS_department_category_budgets')
)
BEGIN
  ALTER TABLE dbo.BS_department_category_budgets
    DROP CONSTRAINT CK_BS_department_category_budgets_status;
END;

ALTER TABLE dbo.BS_department_category_budgets
  ADD CONSTRAINT CK_BS_department_category_budgets_status
  CHECK (
    [status] = 'CATEGORY_REVIEW_COMPLETED'
    OR [status] = 'IN_CATEGORY_REVIEW'
    OR [status] = 'DRAFT'
  );

COMMIT TRANSACTION;
