-- QNH CFO revision tracking. Execute once against QNHDB before deploying application changes.
-- Additive and re-runnable. Does not modify old package decisions or financial records.
USE [QNHDB];
GO
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF OBJECT_ID(N'dbo.BS_cfo_package_cm_review_progress', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_cfo_package_cm_review_progress (
      snapshot_id BIGINT NOT NULL PRIMARY KEY,
      is_reviewed BIT NOT NULL CONSTRAINT DF_BS_cfo_cm_reviewed DEFAULT (0),
      changed_by INT NULL,
      changed_at DATETIME2(3) NOT NULL CONSTRAINT DF_BS_cfo_cm_review_changed DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_BS_cfo_cm_review_snapshot FOREIGN KEY (snapshot_id)
        REFERENCES dbo.BS_cfo_package_item_return_snapshots(id)
    );
  END;
  IF OBJECT_ID(N'dbo.BS_cfo_package_return_totals', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_cfo_package_return_totals (
      id BIGINT IDENTITY(1,1) PRIMARY KEY,
      package_id BIGINT NOT NULL,
      total_before DECIMAL(19,4) NOT NULL,
      created_by INT NOT NULL,
      created_at DATETIME2(3) NOT NULL CONSTRAINT DF_BS_cfo_return_totals_created DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_BS_cfo_return_totals_package FOREIGN KEY (package_id)
        REFERENCES dbo.BS_category_budget_packages(id)
    );
    CREATE INDEX IX_BS_cfo_return_totals_package ON dbo.BS_cfo_package_return_totals(package_id, id DESC);
  END;
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
