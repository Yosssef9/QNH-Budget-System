SET XACT_ABORT ON;

IF OBJECT_ID(
  'dbo.BS_department_category_budget_item_approved_distributions',
  'U'
) IS NULL
BEGIN 
  CREATE TABLE dbo.BS_department_category_budget_item_approved_distributions
  (
    id BIGINT IDENTITY(1,1) NOT NULL
      CONSTRAINT PK_BS_dcb_item_approved_distributions PRIMARY KEY,

    department_budget_item_id BIGINT NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    period_no INT NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,

    created_by INT NULL,
    created_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_BS_dcb_item_approved_dist_created_at
      DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    updated_at DATETIME2(0) NOT NULL
      CONSTRAINT DF_BS_dcb_item_approved_dist_updated_at
      DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_BS_dcb_item_approved_dist_item
      FOREIGN KEY (department_budget_item_id)
      REFERENCES dbo.BS_department_category_budget_items(id),

    CONSTRAINT UQ_BS_dcb_item_approved_dist_period
      UNIQUE (department_budget_item_id, period_type, period_no),

    CONSTRAINT CK_BS_dcb_item_approved_dist_quantity
      CHECK (quantity >= 0),

    CONSTRAINT CK_BS_dcb_item_approved_dist_period
      CHECK (
        (period_type = 'MONTH' AND period_no BETWEEN 1 AND 12)
        OR
        (period_type = 'QUARTER' AND period_no BETWEEN 1 AND 4)
      )
  );
END;
