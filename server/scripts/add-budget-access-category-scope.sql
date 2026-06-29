SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF COL_LENGTH('dbo.BS_budget_user_roles', 'category_id') IS NULL
BEGIN
  ALTER TABLE dbo.BS_budget_user_roles
    ADD category_id INT NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_BS_budget_user_roles_category'
    AND parent_object_id = OBJECT_ID('dbo.BS_budget_user_roles')
)
BEGIN
  ALTER TABLE dbo.BS_budget_user_roles
    ADD CONSTRAINT FK_BS_budget_user_roles_category
      FOREIGN KEY (category_id)
      REFERENCES dbo.BS_budget_categories(id);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_BS_budget_user_roles_category'
    AND object_id = OBJECT_ID('dbo.BS_budget_user_roles')
)
BEGIN
  CREATE INDEX IX_BS_budget_user_roles_category
    ON dbo.BS_budget_user_roles(category_id, role_id, is_active);
END;

DECLARE @CategoryBudgetManagerRoleId INT;

SELECT @CategoryBudgetManagerRoleId = id
FROM dbo.BS_budget_roles
WHERE UPPER(name) = 'CATEGORY BUDGET MANAGER';

IF @CategoryBudgetManagerRoleId IS NULL
BEGIN
  INSERT INTO dbo.BS_budget_roles (name, description)
  VALUES (
    'Category Budget Manager',
    'Hospital-wide category budget manager scoped to one budget category.'
  );

  SET @CategoryBudgetManagerRoleId = SCOPE_IDENTITY();
END;

IF NOT EXISTS (
  SELECT 1
  FROM dbo.BS_budget_role_permissions
  WHERE role_id = @CategoryBudgetManagerRoleId
)
BEGIN
  INSERT INTO dbo.BS_budget_role_permissions (
    role_id,
    can_view_budget,
    can_edit_budget,
    can_request_transfer,
    can_approve_budget,
    can_approve_transfer,
    can_manage_users,
    can_manage_categories,
    can_view_reports,
    can_manage_financial_years,
    can_view_po_links,
    can_request_po_links,
    can_view_all_po_link_requests,
    can_approve_po_links,
    can_manage_po_item_mappings
  )
  VALUES (
    @CategoryBudgetManagerRoleId,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    0,
    0
  );
END;

COMMIT TRANSACTION;
GO
