SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF EXISTS
  (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_BS_category_budget_transfers_no_self_approval'
      AND parent_object_id = OBJECT_ID('dbo.BS_category_budget_transfers')
  )
  BEGIN
    ALTER TABLE dbo.BS_category_budget_transfers
      DROP CONSTRAINT CK_BS_category_budget_transfers_no_self_approval;
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
