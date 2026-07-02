import { poolPromise, sql } from "../../config/db.js";

function bindNullableInt(request, name, value) {
  return request.input(name, sql.Int, value === undefined ? null : value);
}

export async function getActiveAssignmentsByUserIdRepo(userId) {
  const pool = await poolPromise;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT
      bur.id AS user_role_id,
      bur.user_id,
      bur.role_id,
      br.name AS role_name,
      br.role_code,
      bur.department_id,
      d.name AS department_name,
      d.department_code,
      bur.budget_category_id,
      bc.name AS budget_category_name,
      bc.category_code,
      bur.is_active,
      bur.created_at,
      bur.updated_at
    FROM dbo.BS_budget_user_roles AS bur
    INNER JOIN dbo.BS_budget_roles AS br
      ON br.id = bur.role_id
      AND br.is_active = 1
    LEFT JOIN dbo.BS_departments AS d
      ON d.id = bur.department_id
    LEFT JOIN dbo.BS_budget_categories AS bc
      ON bc.id = bur.budget_category_id
    WHERE bur.user_id = @userId
      AND bur.is_active = 1
    ORDER BY bur.id DESC
  `);

  return result.recordset || [];
}

export async function getEffectivePermissionCodesByUserRoleIdRepo(userRoleId) {
  const pool = await poolPromise;

  const result = await pool.request().input("userRoleId", sql.Int, userRoleId)
    .query(`
      WITH selected_role AS
      (
        SELECT role_id
        FROM dbo.BS_budget_user_roles
        WHERE id = @userRoleId
          AND is_active = 1
      ),
      base_permissions AS
      (
        SELECT p.permission_code
        FROM selected_role AS sr
        INNER JOIN dbo.BS_budget_role_permissions AS rp
          ON rp.role_id = sr.role_id
        INNER JOIN dbo.BS_budget_permissions AS p
          ON p.id = rp.permission_id
          AND p.is_active = 1
      ),
      grant_overrides AS
      (
        SELECT p.permission_code
        FROM dbo.BS_budget_user_permission_overrides AS o
        INNER JOIN dbo.BS_budget_permissions AS p
          ON p.id = o.permission_id
          AND p.is_active = 1
        WHERE o.user_role_id = @userRoleId
          AND o.is_active = 1
          AND o.action = 'GRANT'
      ),
      deny_overrides AS
      (
        SELECT p.permission_code
        FROM dbo.BS_budget_user_permission_overrides AS o
        INNER JOIN dbo.BS_budget_permissions AS p
          ON p.id = o.permission_id
          AND p.is_active = 1
        WHERE o.user_role_id = @userRoleId
          AND o.is_active = 1
          AND o.action = 'DENY'
      ),
      allowed_permissions AS
      (
        SELECT permission_code
        FROM base_permissions

        UNION

        SELECT permission_code
        FROM grant_overrides
      )
      SELECT DISTINCT
        ap.permission_code
      FROM allowed_permissions AS ap
      WHERE NOT EXISTS
      (
        SELECT 1
        FROM deny_overrides AS dp
        WHERE dp.permission_code = ap.permission_code
      )
      ORDER BY ap.permission_code
    `);

  return (result.recordset || []).map((row) => row.permission_code);
}

export async function getAssignmentPermissionMatrixRepo(userRoleId) {
  const pool = await poolPromise;

  const result = await pool.request().input("userRoleId", sql.Int, userRoleId)
    .query(`
      WITH selected_assignment AS
      (
        SELECT role_id
        FROM dbo.BS_budget_user_roles
        WHERE id = @userRoleId
      )
      SELECT
        p.id AS permission_id,
        p.permission_code,
        p.name,
        p.description,
        p.permission_group,
        p.sort_order,
        CAST
        (
          CASE
            WHEN rp.id IS NULL THEN 0
            ELSE 1
          END
          AS bit
        ) AS role_default,
        o.action AS override_action
      FROM dbo.BS_budget_permissions AS p
      CROSS JOIN selected_assignment AS sa
      LEFT JOIN dbo.BS_budget_role_permissions AS rp
        ON rp.role_id = sa.role_id
        AND rp.permission_id = p.id
      LEFT JOIN dbo.BS_budget_user_permission_overrides AS o
        ON o.user_role_id = @userRoleId
        AND o.permission_id = p.id
        AND o.is_active = 1
      WHERE p.is_active = 1
      ORDER BY
        p.permission_group,
        p.sort_order,
        p.permission_code
    `);

  return result.recordset || [];
}

export async function getBudgetRolesRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      id,
      name,
      description,
      role_code,
      is_active
    FROM dbo.BS_budget_roles
    WHERE is_active = 1
    ORDER BY name
  `);

  return result.recordset || [];
}

export async function getBudgetAccessUsersRepo({
  search = "",
  page = 1,
  pageSize = 50,
}) {
  const pool = await poolPromise;

  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.min(Math.max(Number(pageSize) || 50, 1), 100);
  const offset = (safePage - 1) * safePageSize;

  const result = await pool
    .request()
    .input("search", sql.NVarChar, `%${search}%`)
    .input("offset", sql.Int, offset)
    .input("pageSize", sql.Int, safePageSize).query(`
      SELECT
        USER_ID AS id,
        USER_CODE AS userCode,
        USER_NAME AS userName
      FROM dbo.users
      WHERE
        @search = '%%'
        OR USER_CODE LIKE @search
        OR USER_NAME LIKE @search
      ORDER BY USER_NAME
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY;

      SELECT
        COUNT(*) AS total
      FROM dbo.users
      WHERE
        @search = '%%'
        OR USER_CODE LIKE @search
        OR USER_NAME LIKE @search;
    `);

  const total = result.recordsets?.[1]?.[0]?.total || 0;

  return {
    users: result.recordsets?.[0] || [],
    total,
    page: safePage,
    pageSize: safePageSize,
    hasMore: safePage * safePageSize < total,
  };
}

export async function getBudgetAccessDepartmentsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      id,
      name
    FROM dbo.BS_departments
    ORDER BY name
  `);

  return result.recordset || [];
}

export async function findBudgetRoleByIdRepo(roleId) {
  const pool = await poolPromise;

  const result = await pool.request().input("roleId", sql.Int, roleId).query(`
      SELECT TOP (1)
        id,
        name,
        description,
        role_code,
        is_active
      FROM dbo.BS_budget_roles
      WHERE id = @roleId
    `);

  return result.recordset?.[0] || null;
}

export async function getBudgetAccessAssignmentsRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      bur.id,
      bur.user_id,
      u.USER_CODE AS user_code,
      u.USER_NAME AS user_name,
      bur.department_id,
      d.name AS department_name,
      d.department_code,
      bur.budget_category_id,
      bc.name AS budget_category_name,
      bc.category_code,
      bur.role_id,
      r.name AS role_name,
      r.role_code,
      bur.is_active,
      bur.created_by,
      bur.updated_by,
      bur.created_at,
      bur.updated_at
    FROM dbo.BS_budget_user_roles AS bur
    LEFT JOIN dbo.users AS u
      ON u.USER_ID = bur.user_id
    LEFT JOIN dbo.BS_departments AS d
      ON d.id = bur.department_id
    LEFT JOIN dbo.BS_budget_categories AS bc
      ON bc.id = bur.budget_category_id
    LEFT JOIN dbo.BS_budget_roles AS r
      ON r.id = bur.role_id
    ORDER BY bur.created_at DESC
  `);

  return result.recordset || [];
}

export async function findBudgetAccessAssignmentByIdRepo(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.Int, id).query(`
      SELECT TOP (1)
        bur.id,
        bur.user_id,
        u.USER_CODE AS user_code,
        u.USER_NAME AS user_name,
        bur.department_id,
        d.name AS department_name,
        d.department_code,
        bur.budget_category_id,
        bc.name AS budget_category_name,
        bc.category_code,
        bur.role_id,
        bur.is_active,
        bur.created_by,
        bur.updated_by,
        bur.created_at,
        bur.updated_at,
        r.name AS role_name,
        r.role_code
      FROM dbo.BS_budget_user_roles AS bur
      LEFT JOIN dbo.users AS u
        ON u.USER_ID = bur.user_id
      LEFT JOIN dbo.BS_departments AS d
        ON d.id = bur.department_id
      LEFT JOIN dbo.BS_budget_categories AS bc
        ON bc.id = bur.budget_category_id
      LEFT JOIN dbo.BS_budget_roles AS r
        ON r.id = bur.role_id
      WHERE bur.id = @id
    `);

  return result.recordset?.[0] || null;
}

export async function findDuplicateBudgetAccessAssignmentRepo({
  user_id,
  department_id,
  budget_category_id,
  role_id,
  excludeId = null,
}) {
  const pool = await poolPromise;

  const request = pool
    .request()
    .input("user_id", sql.Int, user_id)
    .input("role_id", sql.Int, role_id)
    .input("department_id", sql.Int, department_id ?? null)
    .input("budget_category_id", sql.Int, budget_category_id ?? null)
    .input("excludeId", sql.Int, excludeId);

  const result = await request.query(`
    SELECT TOP (1)
      id
    FROM dbo.BS_budget_user_roles
    WHERE user_id = @user_id
      AND role_id = @role_id
      AND
      (
        department_id = @department_id
        OR
        (
          department_id IS NULL
          AND @department_id IS NULL
        )
      )
      AND
      (
        budget_category_id = @budget_category_id
        OR
        (
          budget_category_id IS NULL
          AND @budget_category_id IS NULL
        )
      )
      AND
      (
        @excludeId IS NULL
        OR id <> @excludeId
      )
  `);

  return result.recordset?.[0] || null;
}

export async function createBudgetAccessAssignmentRepo(payload) {
  const pool = await poolPromise;

  const request = pool
    .request()
    .input("user_id", sql.Int, payload.user_id)
    .input("role_id", sql.Int, payload.role_id)
    .input("is_active", sql.Bit, payload.is_active ?? true)
    .input("created_by", sql.Int, payload.created_by ?? null);

  bindNullableInt(request, "department_id", payload.department_id);
  bindNullableInt(request, "budget_category_id", payload.budget_category_id);

  const result = await request.query(`
    DECLARE @InsertedAssignment TABLE
    (
      id INT NOT NULL
    );

    INSERT INTO dbo.BS_budget_user_roles
    (
      user_id,
      department_id,
      budget_category_id,
      role_id,
      is_active,
      created_by
    )
    OUTPUT INSERTED.id
      INTO @InsertedAssignment (id)
    VALUES
    (
      @user_id,
      @department_id,
      @budget_category_id,
      @role_id,
      @is_active,
      @created_by
    );

    SELECT
      bur.id,
      bur.user_id,
      bur.department_id,
      bur.budget_category_id,
      bur.role_id,
      bur.is_active,
      bur.created_at,
      bur.updated_at,
      bur.created_by,
      bur.updated_by
    FROM dbo.BS_budget_user_roles AS bur
    INNER JOIN @InsertedAssignment AS insertedAssignment
      ON insertedAssignment.id = bur.id;
  `);

  return result.recordset?.[0] || null;
}

export async function updateBudgetAccessAssignmentRepo(id, payload) {
  const pool = await poolPromise;

  const request = pool
    .request()
    .input("id", sql.Int, id)
    .input("role_id", sql.Int, payload.role_id)
    .input("updated_by", sql.Int, payload.updated_by ?? null);

  bindNullableInt(request, "department_id", payload.department_id);
  bindNullableInt(request, "budget_category_id", payload.budget_category_id);

  const result = await request.query(`
    DECLARE @UpdatedAssignment TABLE
    (
      id INT NOT NULL
    );

    UPDATE dbo.BS_budget_user_roles
    SET
      department_id = @department_id,
      budget_category_id = @budget_category_id,
      role_id = @role_id,
      updated_by = @updated_by,
      updated_at = SYSUTCDATETIME()
    OUTPUT INSERTED.id
      INTO @UpdatedAssignment (id)
    WHERE id = @id;

    SELECT
      bur.id,
      bur.user_id,
      bur.department_id,
      bur.budget_category_id,
      bur.role_id,
      bur.is_active,
      bur.created_at,
      bur.updated_at,
      bur.created_by,
      bur.updated_by
    FROM dbo.BS_budget_user_roles AS bur
    INNER JOIN @UpdatedAssignment AS updatedAssignment
      ON updatedAssignment.id = bur.id;
  `);

  return result.recordset?.[0] || null;
}

export async function updateBudgetAccessAssignmentStatusRepo(
  id,
  isActive,
  updatedBy = null,
) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("is_active", sql.Bit, isActive)
    .input("updated_by", sql.Int, updatedBy).query(`
      DECLARE @UpdatedAssignment TABLE
      (
        id INT NOT NULL
      );

      UPDATE dbo.BS_budget_user_roles
      SET
        is_active = @is_active,
        updated_by = @updated_by,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
        INTO @UpdatedAssignment (id)
      WHERE id = @id;

      SELECT
        bur.id,
        bur.user_id,
        bur.department_id,
        bur.budget_category_id,
        bur.role_id,
        bur.is_active,
        bur.created_at,
        bur.updated_at,
        bur.created_by,
        bur.updated_by
      FROM dbo.BS_budget_user_roles AS bur
      INNER JOIN @UpdatedAssignment AS updatedAssignment
        ON updatedAssignment.id = bur.id;
    `);

  return result.recordset?.[0] || null;
}

export async function deleteBudgetAccessAssignmentRepo(id) {
  const pool = await poolPromise;

  const result = await pool.request().input("id", sql.Int, id).query(`
      DECLARE @DeletedAssignment TABLE
      (
        id INT NOT NULL,
        user_id INT NOT NULL,
        department_id INT NULL,
        budget_category_id INT NULL,
        role_id INT NOT NULL,
        is_active BIT NOT NULL,
        created_at DATETIME2(3) NOT NULL,
        updated_at DATETIME2(3) NULL,
        created_by INT NULL,
        updated_by INT NULL
      );

      DELETE FROM dbo.BS_budget_user_roles
      OUTPUT
        DELETED.id,
        DELETED.user_id,
        DELETED.department_id,
        DELETED.budget_category_id,
        DELETED.role_id,
        DELETED.is_active,
        DELETED.created_at,
        DELETED.updated_at,
        DELETED.created_by,
        DELETED.updated_by
      INTO @DeletedAssignment
      (
        id,
        user_id,
        department_id,
        budget_category_id,
        role_id,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      )
      WHERE id = @id;

      SELECT
        id,
        user_id,
        department_id,
        budget_category_id,
        role_id,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM @DeletedAssignment;
    `);

  return result.recordset?.[0] || null;
}

export async function findActivePermissionIdsRepo(permissionIds = []) {
  if (!permissionIds.length) {
    return [];
  }

  const pool = await poolPromise;
  const request = pool.request();

  const parameterNames = permissionIds.map((permissionId, index) => {
    const parameterName = `permissionId${index}`;

    request.input(parameterName, sql.Int, permissionId);

    return `@${parameterName}`;
  });

  const result = await request.query(`
    SELECT
      id
    FROM dbo.BS_budget_permissions
    WHERE is_active = 1
      AND id IN (${parameterNames.join(", ")})
  `);

  return (result.recordset || []).map((row) => Number(row.id));
}

export async function replaceAssignmentPermissionOverridesRepo(
  transaction,
  userRoleId,
  overrides,
  updatedBy = null,
) {
  const deactivateRequest = new sql.Request(transaction);

  await deactivateRequest
    .input("userRoleId", sql.Int, userRoleId)
    .input("updatedBy", sql.Int, updatedBy).query(`
      UPDATE dbo.BS_budget_user_permission_overrides
      SET
        is_active = 0,
        updated_by = @updatedBy,
        updated_at = SYSUTCDATETIME()
      WHERE user_role_id = @userRoleId
        AND is_active = 1
    `);

  for (const override of overrides) {
    const request = new sql.Request(transaction);

    await request
      .input("userRoleId", sql.Int, userRoleId)
      .input("permissionId", sql.Int, override.permission_id)
      .input("action", sql.VarChar(10), override.action)
      .input("updatedBy", sql.Int, updatedBy).query(`
        MERGE dbo.BS_budget_user_permission_overrides AS target
        USING
        (
          SELECT
            @userRoleId AS user_role_id,
            @permissionId AS permission_id
        ) AS source
          ON target.user_role_id = source.user_role_id
          AND target.permission_id = source.permission_id

        WHEN MATCHED THEN
          UPDATE SET
            action = @action,
            is_active = 1,
            updated_by = @updatedBy,
            updated_at = SYSUTCDATETIME()

        WHEN NOT MATCHED THEN
          INSERT
          (
            user_role_id,
            permission_id,
            action,
            is_active,
            created_by
          )
          VALUES
          (
            @userRoleId,
            @permissionId,
            @action,
            1,
            @updatedBy
          );
      `);
  }
}

