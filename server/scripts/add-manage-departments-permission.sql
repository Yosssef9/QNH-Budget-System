SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @PermissionCode VARCHAR(150) = 'can_manage_departments';
  DECLARE @AdminRoleCode VARCHAR(100) = 'BUDGET_SYSTEM_ADMIN';
  DECLARE @PermissionId INT;
  DECLARE @AdminRoleId INT;

  IF NOT EXISTS
  (
    SELECT 1
    FROM dbo.BS_budget_permissions
    WHERE permission_code = @PermissionCode
  )
  BEGIN
    INSERT INTO dbo.BS_budget_permissions
    (
      permission_code,
      name,
      description,
      permission_group,
      sort_order,
      is_active
    )
    VALUES
    (
      @PermissionCode,
      'Manage Departments',
      'Create, activate, deactivate, and maintain hospital departments.',
      'ADMIN_REPORTING',
      ISNULL((SELECT MAX(sort_order) FROM dbo.BS_budget_permissions), 0) + 1,
      1
    );
  END
  ELSE
  BEGIN
    UPDATE dbo.BS_budget_permissions
    SET name = 'Manage Departments',
        description = 'Create, activate, deactivate, and maintain hospital departments.',
        permission_group = 'ADMIN_REPORTING',
        is_active = 1
    WHERE permission_code = @PermissionCode;
  END;

  SELECT @PermissionId = id
  FROM dbo.BS_budget_permissions
  WHERE permission_code = @PermissionCode;

  SELECT @AdminRoleId = id
  FROM dbo.BS_budget_roles
  WHERE role_code = @AdminRoleCode;

  IF @AdminRoleId IS NULL
    THROW 53030, 'BUDGET_SYSTEM_ADMIN role was not found.', 1;

  IF NOT EXISTS
  (
    SELECT 1
    FROM dbo.BS_budget_role_permissions
    WHERE role_id = @AdminRoleId
      AND permission_id = @PermissionId
  )
  BEGIN
    INSERT INTO dbo.BS_budget_role_permissions
    (
      role_id,
      permission_id
    )
    VALUES
    (
      @AdminRoleId,
      @PermissionId
    );
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
