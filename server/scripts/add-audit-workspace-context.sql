SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.BS_audit_logs', 'workspace_id') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_audit_logs
      ADD workspace_id NVARCHAR(100) NULL;
  END;

  IF COL_LENGTH('dbo.BS_audit_logs', 'workspace_type') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_audit_logs
      ADD workspace_type NVARCHAR(100) NULL;
  END;

  IF COL_LENGTH('dbo.BS_audit_logs', 'workspace_label') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_audit_logs
      ADD workspace_label NVARCHAR(200) NULL;
  END;

  IF COL_LENGTH('dbo.BS_audit_logs', 'acting_as') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_audit_logs
      ADD acting_as NVARCHAR(200) NULL;
  END;

  IF COL_LENGTH('dbo.BS_audit_logs', 'workspace_category') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_audit_logs
      ADD workspace_category NVARCHAR(100) NULL;
  END;

  IF COL_LENGTH('dbo.BS_audit_logs', 'workspace_department_id') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_audit_logs
      ADD workspace_department_id INT NULL;
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
  BEGIN
    ROLLBACK TRANSACTION;
  END;

  THROW;
END CATCH;
