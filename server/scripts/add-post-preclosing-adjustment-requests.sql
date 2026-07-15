/*
  Phase 6 - Post-PRE_CLOSING Adjustment Requests

  This migration aligns the existing change-request tables with the revised
  workflow:
  - HODs submit category-scoped adjustment requests after PRE_CLOSING.
  - Category Managers approve for action or reject.
  - Approval does not mutate budgets; transfers later fulfill approved requests.
*/

IF OBJECT_ID('dbo.BS_budget_change_requests', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.BS_budget_change_requests (
    id BIGINT IDENTITY(1,1) NOT NULL
      CONSTRAINT PK_BS_budget_change_requests PRIMARY KEY,
    department_category_budget_id BIGINT NOT NULL,
    status VARCHAR(40) NOT NULL
      CONSTRAINT DF_BS_budget_change_requests_status DEFAULT ('PENDING'),
    reason NVARCHAR(2000) NOT NULL,
    submitted_by INT NULL,
    submitted_at DATETIME2(3) NULL,
    category_reviewed_by INT NULL,
    category_reviewed_at DATETIME2(3) NULL,
    category_note NVARCHAR(1000) NULL,
    cfo_reviewed_by INT NULL,
    cfo_reviewed_at DATETIME2(3) NULL,
    cfo_note NVARCHAR(1000) NULL,
    applied_by INT NULL,
    applied_at DATETIME2(3) NULL,
    created_by INT NOT NULL,
    created_at DATETIME2(3) NOT NULL
      CONSTRAINT DF_BS_budget_change_requests_created_at DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    updated_at DATETIME2(3) NULL,
    row_version ROWVERSION NOT NULL,
    CONSTRAINT FK_BS_budget_change_requests_department_category_budget
      FOREIGN KEY (department_category_budget_id)
      REFERENCES dbo.BS_department_category_budgets(id),
    CONSTRAINT FK_BS_budget_change_requests_submitted_by
      FOREIGN KEY (submitted_by) REFERENCES dbo.users(USER_ID),
    CONSTRAINT FK_BS_budget_change_requests_category_reviewed_by
      FOREIGN KEY (category_reviewed_by) REFERENCES dbo.users(USER_ID),
    CONSTRAINT FK_BS_budget_change_requests_created_by
      FOREIGN KEY (created_by) REFERENCES dbo.users(USER_ID)
  );
END;

IF OBJECT_ID('dbo.BS_budget_change_request_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.BS_budget_change_request_items (
    id BIGINT IDENTITY(1,1) NOT NULL
      CONSTRAINT PK_BS_budget_change_request_items PRIMARY KEY,
    change_request_id BIGINT NOT NULL,
    change_type VARCHAR(40) NOT NULL,
    existing_department_budget_item_id BIGINT NULL,
    catalog_item_id INT NOT NULL,
    current_requested_quantity DECIMAL(18,4) NULL,
    proposed_requested_quantity DECIMAL(18,4) NOT NULL,
    proposed_distribution_method VARCHAR(40) NULL,
    description NVARCHAR(1000) NULL,
    category_review_status VARCHAR(40) NULL,
    category_review_note NVARCHAR(1000) NULL,
    cfo_review_status VARCHAR(40) NULL,
    cfo_review_note NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL
      CONSTRAINT DF_BS_budget_change_request_items_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NULL,
    CONSTRAINT FK_BS_budget_change_request_items_request
      FOREIGN KEY (change_request_id)
      REFERENCES dbo.BS_budget_change_requests(id),
    CONSTRAINT FK_BS_budget_change_request_items_existing_item
      FOREIGN KEY (existing_department_budget_item_id)
      REFERENCES dbo.BS_department_category_budget_items(id),
    CONSTRAINT FK_BS_budget_change_request_items_catalog_item
      FOREIGN KEY (catalog_item_id)
      REFERENCES dbo.BS_budget_catalog_items(id)
  );
END;

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.BS_budget_change_request_items')
    AND name = 'proposed_requested_quantity'
    AND is_nullable = 1
)
BEGIN
  ALTER TABLE dbo.BS_budget_change_request_items
    ALTER COLUMN proposed_requested_quantity DECIMAL(18,4) NOT NULL;
END;

DECLARE @constraintName SYSNAME;

SELECT @constraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.BS_budget_change_requests')
  AND name = 'CK_BS_budget_change_requests_status';

IF @constraintName IS NOT NULL
  EXEC('ALTER TABLE dbo.BS_budget_change_requests DROP CONSTRAINT ' + QUOTENAME(@constraintName));

ALTER TABLE dbo.BS_budget_change_requests WITH CHECK
  ADD CONSTRAINT CK_BS_budget_change_requests_status
  CHECK (status IN (
    'PENDING',
    'APPROVED_FOR_ACTION',
    'REJECTED',
    'PARTIALLY_FULFILLED',
    'FULFILLED',
    'CANCELLED'
  ));

SELECT @constraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.BS_budget_change_request_items')
  AND name = 'CK_BS_budget_change_request_items_change_type';

IF @constraintName IS NOT NULL
  EXEC('ALTER TABLE dbo.BS_budget_change_request_items DROP CONSTRAINT ' + QUOTENAME(@constraintName));

ALTER TABLE dbo.BS_budget_change_request_items WITH CHECK
  ADD CONSTRAINT CK_BS_budget_change_request_items_change_type
  CHECK (change_type IN ('ADD_ITEM', 'INCREASE_QUANTITY'));

SELECT @constraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.BS_budget_change_request_items')
  AND name = 'CK_BS_budget_change_request_items_request_value';

IF @constraintName IS NOT NULL
  EXEC('ALTER TABLE dbo.BS_budget_change_request_items DROP CONSTRAINT ' + QUOTENAME(@constraintName));

ALTER TABLE dbo.BS_budget_change_request_items WITH CHECK
  ADD CONSTRAINT CK_BS_budget_change_request_items_request_value
  CHECK (
    proposed_requested_quantity > 0
  );

SELECT @constraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.BS_budget_change_request_items')
  AND name = 'CK_BS_budget_change_request_items_existing_item_rule';

IF @constraintName IS NOT NULL
  EXEC('ALTER TABLE dbo.BS_budget_change_request_items DROP CONSTRAINT ' + QUOTENAME(@constraintName));

ALTER TABLE dbo.BS_budget_change_request_items WITH CHECK
  ADD CONSTRAINT CK_BS_budget_change_request_items_existing_item_rule
  CHECK (
    (change_type = 'ADD_ITEM' AND existing_department_budget_item_id IS NULL)
    OR
    (change_type = 'INCREASE_QUANTITY' AND existing_department_budget_item_id IS NOT NULL)
  );

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.BS_budget_change_requests')
    AND name = 'IX_BS_budget_change_requests_department_status'
)
BEGIN
  CREATE INDEX IX_BS_budget_change_requests_department_status
  ON dbo.BS_budget_change_requests(department_category_budget_id, status)
  INCLUDE (submitted_by, submitted_at);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.BS_budget_change_request_items')
    AND name = 'IX_BS_budget_change_request_items_catalog'
)
BEGIN
  CREATE INDEX IX_BS_budget_change_request_items_catalog
  ON dbo.BS_budget_change_request_items(catalog_item_id, change_type)
  INCLUDE (change_request_id, existing_department_budget_item_id);
END;
