SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID('dbo.BS_budget_change_requests', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_budget_change_requests (
      id BIGINT IDENTITY(1,1) NOT NULL,
      financial_year_id INT NOT NULL,
      department_id INT NOT NULL,
      category_id INT NOT NULL,
      category_review_package_id BIGINT NOT NULL,

      request_type VARCHAR(40) NOT NULL,
      status VARCHAR(50) NOT NULL
        CONSTRAINT DF_BS_budget_change_requests_status DEFAULT 'SUBMITTED',

      reason NVARCHAR(2000) NOT NULL,

      category_decision VARCHAR(40) NULL,
      category_decision_note NVARCHAR(1000) NULL,
      category_decided_by INT NULL,
      category_decided_at DATETIME2 NULL,

      cfo_decision VARCHAR(40) NULL,
      cfo_decision_note NVARCHAR(1000) NULL,
      cfo_decided_by INT NULL,
      cfo_decided_at DATETIME2 NULL,

      applied_by INT NULL,
      applied_at DATETIME2 NULL,

      requested_by INT NOT NULL,
      requested_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_budget_change_requests_requested_at
        DEFAULT SYSUTCDATETIME(),

      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      CONSTRAINT PK_BS_budget_change_requests PRIMARY KEY (id),

      CONSTRAINT FK_BS_budget_change_requests_financial_year
        FOREIGN KEY (financial_year_id)
        REFERENCES dbo.BS_financial_years(id),

      CONSTRAINT FK_BS_budget_change_requests_department
        FOREIGN KEY (department_id)
        REFERENCES dbo.BS_departments(id),

      CONSTRAINT FK_BS_budget_change_requests_category
        FOREIGN KEY (category_id)
        REFERENCES dbo.BS_budget_categories(id),

      CONSTRAINT FK_BS_budget_change_requests_package
        FOREIGN KEY (category_review_package_id)
        REFERENCES dbo.BS_category_review_packages(id),

      CONSTRAINT FK_BS_budget_change_requests_requested_by
        FOREIGN KEY (requested_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_budget_change_requests_category_decided_by
        FOREIGN KEY (category_decided_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_budget_change_requests_cfo_decided_by
        FOREIGN KEY (cfo_decided_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_budget_change_requests_applied_by
        FOREIGN KEY (applied_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_budget_change_requests_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_budget_change_requests_type
        CHECK (
          request_type IN (
            'ADD_ITEM',
            'INCREASE_QUANTITY',
            'DECREASE_QUANTITY',
            'MODIFY_ITEM'
          )
        ),

      CONSTRAINT CK_BS_budget_change_requests_status
        CHECK (
          status IN (
            'SUBMITTED',
            'CATEGORY_REVIEWED',
            'CFO_REVIEWED',
            'ACCEPTED',
            'REJECTED',
            'APPLIED',
            'CANCELLED',
            'CLOSED_BY_PRE_CLOSING'
          )
        ),

      CONSTRAINT CK_BS_budget_change_requests_category_decision
        CHECK (
          category_decision IS NULL
          OR category_decision IN ('ACCEPTED', 'REJECTED')
        ),

      CONSTRAINT CK_BS_budget_change_requests_cfo_decision
        CHECK (
          cfo_decision IS NULL
          OR cfo_decision IN ('ACCEPTED', 'REJECTED')
        ),

      CONSTRAINT CK_BS_budget_change_requests_reason
        CHECK (LEN(LTRIM(RTRIM(reason))) > 0)
    );

    CREATE INDEX IX_BS_budget_change_requests_status
      ON dbo.BS_budget_change_requests (
        status,
        financial_year_id,
        category_id
      );

    CREATE INDEX IX_BS_budget_change_requests_department
      ON dbo.BS_budget_change_requests (
        department_id,
        financial_year_id,
        status
      );
  END;

  IF OBJECT_ID('dbo.BS_budget_change_request_items', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_budget_change_request_items (
      id BIGINT IDENTITY(1,1) NOT NULL,
      change_request_id BIGINT NOT NULL,
      budget_type_id INT NOT NULL,

      existing_department_request_item_id BIGINT NULL,
      target_department_category_budget_id BIGINT NULL,
      category_type_review_id BIGINT NULL,

      current_requested_quantity DECIMAL(18, 4) NULL,
      current_approved_quantity DECIMAL(18, 4) NULL,
      requested_quantity DECIMAL(18, 4) NULL,
      quantity_delta DECIMAL(18, 4) NULL,

      description NVARCHAR(1000) NULL,

      is_applied BIT NOT NULL
        CONSTRAINT DF_BS_budget_change_request_items_is_applied DEFAULT 0,
      applied_department_request_item_id BIGINT NULL,
      applied_at DATETIME2 NULL,

      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_budget_change_request_items_created_at
        DEFAULT SYSUTCDATETIME(),

      CONSTRAINT PK_BS_budget_change_request_items PRIMARY KEY (id),

      CONSTRAINT FK_BS_budget_change_request_items_request
        FOREIGN KEY (change_request_id)
        REFERENCES dbo.BS_budget_change_requests(id),

      CONSTRAINT FK_BS_budget_change_request_items_budget_type
        FOREIGN KEY (budget_type_id)
        REFERENCES dbo.BS_budget_types(id),

      CONSTRAINT FK_BS_budget_change_request_items_existing_item
        FOREIGN KEY (existing_department_request_item_id)
        REFERENCES dbo.BS_department_budget_request_items(id),

      CONSTRAINT FK_BS_budget_change_request_items_target_category_budget
        FOREIGN KEY (target_department_category_budget_id)
        REFERENCES dbo.BS_department_category_budgets(id),

      CONSTRAINT FK_BS_budget_change_request_items_type_review
        FOREIGN KEY (category_type_review_id)
        REFERENCES dbo.BS_category_type_reviews(id),

      CONSTRAINT FK_BS_budget_change_request_items_applied_item
        FOREIGN KEY (applied_department_request_item_id)
        REFERENCES dbo.BS_department_budget_request_items(id),

      CONSTRAINT CK_BS_budget_change_request_items_requested_quantity
        CHECK (requested_quantity IS NULL OR requested_quantity > 0)
    );

    CREATE INDEX IX_BS_budget_change_request_items_request
      ON dbo.BS_budget_change_request_items (change_request_id);

    CREATE INDEX IX_BS_budget_change_request_items_type
      ON dbo.BS_budget_change_request_items (
        budget_type_id,
        category_type_review_id
      );
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  THROW;
END CATCH;
