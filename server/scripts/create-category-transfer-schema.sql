SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID('dbo.BS_category_budget_transfers', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_category_budget_transfers (
      id BIGINT IDENTITY(1,1) NOT NULL,

      financial_year_id INT NOT NULL,
      category_id INT NOT NULL,
      from_category_type_review_id BIGINT NOT NULL,
      to_category_type_review_id BIGINT NOT NULL,

      amount DECIMAL(18, 6) NOT NULL,
      reason NVARCHAR(2000) NOT NULL,

      status VARCHAR(30) NOT NULL
        CONSTRAINT DF_BS_category_budget_transfers_status
        DEFAULT 'PENDING_APPROVAL',

      requested_by INT NOT NULL,
      requested_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_category_budget_transfers_requested_at
        DEFAULT SYSUTCDATETIME(),

      approved_by INT NULL,
      approved_at DATETIME2 NULL,

      rejected_by INT NULL,
      rejected_at DATETIME2 NULL,
      rejection_note NVARCHAR(1000) NULL,

      CONSTRAINT PK_BS_category_budget_transfers
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_category_budget_transfers_financial_year
        FOREIGN KEY (financial_year_id)
        REFERENCES dbo.BS_financial_years(id),

      CONSTRAINT FK_BS_category_budget_transfers_category
        FOREIGN KEY (category_id)
        REFERENCES dbo.BS_budget_categories(id),

      CONSTRAINT FK_BS_category_budget_transfers_from_review
        FOREIGN KEY (from_category_type_review_id)
        REFERENCES dbo.BS_category_type_reviews(id),

      CONSTRAINT FK_BS_category_budget_transfers_to_review
        FOREIGN KEY (to_category_type_review_id)
        REFERENCES dbo.BS_category_type_reviews(id),

      CONSTRAINT FK_BS_category_budget_transfers_requested_by
        FOREIGN KEY (requested_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_budget_transfers_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_budget_transfers_rejected_by
        FOREIGN KEY (rejected_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_category_budget_transfers_amount
        CHECK (amount > 0),

      CONSTRAINT CK_BS_category_budget_transfers_distinct_items
        CHECK (from_category_type_review_id <> to_category_type_review_id),

      CONSTRAINT CK_BS_category_budget_transfers_status
        CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'))
    );

    CREATE INDEX IX_BS_category_budget_transfers_year_category_status
      ON dbo.BS_category_budget_transfers (
        financial_year_id,
        category_id,
        status,
        requested_at
      );

    CREATE INDEX IX_BS_category_budget_transfers_from_review_status
      ON dbo.BS_category_budget_transfers (
        from_category_type_review_id,
        status
      )
      INCLUDE (amount);

    CREATE INDEX IX_BS_category_budget_transfers_to_review_status
      ON dbo.BS_category_budget_transfers (
        to_category_type_review_id,
        status
      )
      INCLUDE (amount);
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
