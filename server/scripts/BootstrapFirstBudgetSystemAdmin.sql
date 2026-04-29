/* =========================================================
   Bootstrap First Budget System Admin
   ========================================================= */

DECLARE @UserId INT = 1080; -- change this to your portal user id
DECLARE @CreatedBy INT = 1080; -- same admin user id

DECLARE @AdminRoleId INT;

SELECT @AdminRoleId = id
FROM BS_budget_roles
WHERE name = 'ADMIN';

IF @AdminRoleId IS NULL
BEGIN
    THROW 50001, 'ADMIN role does not exist. Seed roles first.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM BS_budget_user_roles
    WHERE user_id = @UserId
      AND role_id = @AdminRoleId
      AND department_id IS NULL
)
BEGIN
    PRINT 'Admin user role already exists.';
END
ELSE
BEGIN
    INSERT INTO BS_budget_user_roles (
        user_id,
        department_id,
        role_id,

        can_view_budget,
        can_edit_budget,
        can_link_po,
        can_request_transfer,
        can_approve_budget,
        can_approve_transfer,
        can_manage_users,
        can_manage_categories,
        can_view_reports,

        is_active,
        created_by
    )
    VALUES (
        @UserId,
        4,
        @AdminRoleId,

        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,

        1,
        @CreatedBy
    );

    PRINT 'First admin user role inserted successfully.';
END;