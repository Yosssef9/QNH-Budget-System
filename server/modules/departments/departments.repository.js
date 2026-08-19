import { poolPromise, sql } from "../../config/db.js";
import { createRequest } from "../../utils/createRequest.js";

function departmentSelect() {
  return `
    SELECT
      department.id,
      department.name,
      department.department_code,
      department.description,
      department.is_active,
      department.created_by,
      creator.USER_NAME AS created_by_name,
      department.created_at,
      department.updated_by,
      updater.USER_NAME AS updated_by_name,
      department.updated_at,
      (
        SELECT COUNT(1)
        FROM dbo.BS_budget_user_roles AS userRole
        WHERE userRole.department_id = department.id
          AND userRole.is_active = 1
      ) AS active_user_role_count,
      (
        SELECT COUNT(1)
        FROM dbo.BS_department_budgets AS budget
        WHERE budget.department_id = department.id
      ) AS budget_count
    FROM dbo.BS_departments AS department
    LEFT JOIN dbo.users AS creator ON creator.USER_ID = department.created_by
    LEFT JOIN dbo.users AS updater ON updater.USER_ID = department.updated_by
  `;
}

export async function listDepartmentsRepo({ status, search }) {
  const pool = await poolPromise;
  const request = pool.request().input("status", sql.VarChar(10), status);
  const conditions = [
    "(@status = 'ALL' OR (@status = 'ACTIVE' AND department.is_active = 1) OR (@status = 'INACTIVE' AND department.is_active = 0))",
  ];

  if (search) {
    request.input("search", sql.NVarChar(200), `%${search}%`);
    conditions.push(
      "(department.name LIKE @search OR department.department_code LIKE @search)",
    );
  }

  const result = await request.query(`
    ${departmentSelect()}
    WHERE ${conditions.join(" AND ")}
    ORDER BY department.is_active DESC, department.name;
  `);

  return result.recordset;
}

export async function findDepartmentByIdRepo(id, transaction = null, lock = false) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const lockHint = lock ? "WITH (UPDLOCK, HOLDLOCK)" : "";
  const result = await request.input("id", sql.Int, id).query(`
    SELECT
      id,
      name,
      department_code,
      description,
      is_active,
      created_by,
      created_at,
      updated_by,
      updated_at
    FROM dbo.BS_departments ${lockHint}
    WHERE id = @id;
  `);

  return result.recordset[0] || null;
}

export async function createDepartmentRepo(transaction, payload) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("name", sql.NVarChar(200), payload.name)
    .input("departmentCode", sql.VarChar(50), payload.department_code)
    .input("description", sql.NVarChar(500), payload.description)
    .input("isActive", sql.Bit, payload.is_active)
    .input("createdBy", sql.Int, payload.created_by).query(`
      DECLARE @Inserted TABLE (id INT NOT NULL);

      INSERT INTO dbo.BS_departments
      (
        name,
        department_code,
        description,
        is_active,
        created_by
      )
      OUTPUT INSERTED.id INTO @Inserted (id)
      VALUES
      (
        @name,
        @departmentCode,
        @description,
        @isActive,
        @createdBy
      );

      SELECT department.*
      FROM dbo.BS_departments AS department
      INNER JOIN @Inserted AS inserted ON inserted.id = department.id;
    `);

  return result.recordset[0] || null;
}

export async function updateDepartmentDescriptionRepo(transaction, payload) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("id", sql.Int, payload.id)
    .input("description", sql.NVarChar(500), payload.description)
    .input("updatedBy", sql.Int, payload.updated_by).query(`
      UPDATE dbo.BS_departments
      SET description = @description,
          updated_by = @updatedBy,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id;

      SELECT * FROM dbo.BS_departments WHERE id = @id;
    `);

  return result.recordset[0] || null;
}

export async function updateDepartmentStatusRepo(transaction, payload) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("id", sql.Int, payload.id)
    .input("isActive", sql.Bit, payload.is_active)
    .input("updatedBy", sql.Int, payload.updated_by).query(`
      UPDATE dbo.BS_departments
      SET is_active = @isActive,
          updated_by = @updatedBy,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id;

      SELECT * FROM dbo.BS_departments WHERE id = @id;
    `);

  return result.recordset[0] || null;
}

export async function findActiveFinancialYearForDepartmentSetupRepo(transaction) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.query(`
    SELECT TOP 1 id, year, status
    FROM dbo.BS_financial_years WITH (UPDLOCK, HOLDLOCK)
    WHERE status IN ('OPEN', 'PRE_CLOSING')
    ORDER BY year DESC, id DESC;
  `);

  return result.recordset[0] || null;
}

export async function findDepartmentBudgetForYearRepo(
  transaction,
  financialYearId,
  departmentId,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request
    .input("financialYearId", sql.Int, financialYearId)
    .input("departmentId", sql.Int, departmentId).query(`
      SELECT TOP 1
        budget.id,
        (
          SELECT COUNT(1)
          FROM dbo.BS_department_category_budgets AS categoryBudget
          WHERE categoryBudget.department_budget_id = budget.id
        ) AS category_budget_count
      FROM dbo.BS_department_budgets AS budget WITH (UPDLOCK, HOLDLOCK)
      WHERE budget.financial_year_id = @financialYearId
        AND budget.department_id = @departmentId;
    `);

  return result.recordset[0] || null;
}

export async function getOpenYearOnboardingReadinessRepo(
  transaction,
  financialYearId,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("financialYearId", sql.Int, financialYearId)
    .query(`
      SELECT
        (
          SELECT COUNT(1)
          FROM dbo.BS_category_submission_windows AS window
          INNER JOIN dbo.BS_budget_categories AS category
            ON category.id = window.budget_category_id
          WHERE window.financial_year_id = @financialYearId
            AND category.category_code IN ('IT', 'BIOMEDICAL', 'GENERAL')
        ) AS submission_window_count,
        (
          SELECT COUNT(1)
          FROM dbo.BS_category_submission_windows AS window
          INNER JOIN dbo.BS_budget_categories AS category
            ON category.id = window.budget_category_id
          WHERE window.financial_year_id = @financialYearId
            AND category.category_code IN ('IT', 'BIOMEDICAL', 'GENERAL')
            AND window.status = 'OPEN'
        ) AS open_submission_window_count,
        (
          SELECT COUNT(1)
          FROM dbo.BS_category_budget_packages AS package
          INNER JOIN dbo.BS_budget_categories AS category
            ON category.id = package.budget_category_id
          WHERE package.financial_year_id = @financialYearId
            AND category.category_code IN ('IT', 'BIOMEDICAL', 'GENERAL')
        ) AS category_package_count,
        (
          SELECT COUNT(1)
          FROM dbo.BS_category_budget_packages AS package
          INNER JOIN dbo.BS_budget_categories AS category
            ON category.id = package.budget_category_id
          WHERE package.financial_year_id = @financialYearId
            AND category.category_code IN ('IT', 'BIOMEDICAL', 'GENERAL')
            AND package.status = 'DRAFT'
            AND package.submitted_to_purchasing_at IS NULL
        ) AS untouched_draft_package_count;
    `);

  return result.recordset[0] || null;
}

export async function countActiveDepartmentAssignmentsRepo(
  transaction,
  departmentId,
) {
  const pool = await poolPromise;
  const request = createRequest(pool, transaction);
  const result = await request.input("departmentId", sql.Int, departmentId)
    .query(`
      SELECT COUNT(1) AS assignment_count
      FROM dbo.BS_budget_user_roles
      WHERE department_id = @departmentId
        AND is_active = 1;
    `);

  return Number(result.recordset[0]?.assignment_count || 0);
}
