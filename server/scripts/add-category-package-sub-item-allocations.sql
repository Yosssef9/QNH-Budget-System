/*
  Phase 5C - Category Package Department Allocations

  Adds the normalized relationship between a reviewed department category
  budget item and the year-specific package sub-item/model that will serve it.

  This script is intentionally idempotent for development database resets.
*/

IF OBJECT_ID(
  'dbo.BS_category_budget_package_sub_item_allocations',
  'U'
) IS NULL
BEGIN
  CREATE TABLE dbo.BS_category_budget_package_sub_item_allocations
  (
    id BIGINT IDENTITY(1,1) NOT NULL,
    category_budget_package_sub_item_id BIGINT NOT NULL,
    department_category_budget_item_id BIGINT NOT NULL,
    allocated_quantity DECIMAL(18,4) NOT NULL,
    created_by INT NULL,
    created_at DATETIME2(3) NOT NULL
      CONSTRAINT DF_BS_cbpsia_created_at DEFAULT SYSUTCDATETIME(),
    updated_by INT NULL,
    updated_at DATETIME2(3) NULL,
    row_version ROWVERSION NOT NULL,

    CONSTRAINT PK_BS_category_budget_package_sub_item_allocations
      PRIMARY KEY (id),

    CONSTRAINT FK_BS_cbpsia_package_sub_item
      FOREIGN KEY (category_budget_package_sub_item_id)
      REFERENCES dbo.BS_category_budget_package_sub_items(id),

    CONSTRAINT FK_BS_cbpsia_department_item
      FOREIGN KEY (department_category_budget_item_id)
      REFERENCES dbo.BS_department_category_budget_items(id),

    CONSTRAINT UQ_BS_cbpsia_sub_item_department_item
      UNIQUE
      (
        category_budget_package_sub_item_id,
        department_category_budget_item_id
      ),

    CONSTRAINT CK_BS_cbpsia_allocated_quantity
      CHECK (allocated_quantity > 0)
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_BS_cbpsia_department_item'
    AND object_id = OBJECT_ID('dbo.BS_category_budget_package_sub_item_allocations')
)
BEGIN
  CREATE INDEX IX_BS_cbpsia_department_item
  ON dbo.BS_category_budget_package_sub_item_allocations
  (
    department_category_budget_item_id,
    category_budget_package_sub_item_id
  )
  INCLUDE (allocated_quantity);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_BS_cbpsia_package_sub_item'
    AND object_id = OBJECT_ID('dbo.BS_category_budget_package_sub_item_allocations')
)
BEGIN
  CREATE INDEX IX_BS_cbpsia_package_sub_item
  ON dbo.BS_category_budget_package_sub_item_allocations
  (
    category_budget_package_sub_item_id,
    department_category_budget_item_id
  )
  INCLUDE (allocated_quantity);
END;
