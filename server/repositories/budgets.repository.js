import { poolPromise, sql } from "../config/db.js";


export async function getMyBudgetsRepo({ departmentId, canSeeAll }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("canSeeAll", sql.Bit, canSeeAll)
    .input("departmentId", sql.Int, departmentId)
    .query(`
      SELECT
        b.id,
        b.financial_year_id,
        fy.year,
        fy.status AS financial_year_status,
        b.department_id,
        d.name AS department_name,
        b.status,
        b.created_by,
        b.created_at,
        b.updated_at,
        b.submitted_by,
        b.submitted_at,
        b.approved_by,
        b.approved_at,
        b.returned_by,
        b.returned_at,
        COUNT(bi.id) AS items_count,
        ISNULL(SUM(bi.total_amount), 0) AS total_amount
      FROM BS_budgets b
      JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      JOIN BS_departments d
        ON d.id = b.department_id
      LEFT JOIN BS_budget_items bi
        ON bi.budget_id = b.id
       AND bi.is_active = 1
      WHERE
        @canSeeAll = 1
        OR b.department_id = @departmentId
      GROUP BY
        b.id, b.financial_year_id, fy.year, fy.status,
        b.department_id, d.name, b.status,
        b.created_by, b.created_at, b.updated_at,
        b.submitted_by, b.submitted_at,
        b.approved_by, b.approved_at,
        b.returned_by, b.returned_at
      ORDER BY fy.year DESC, d.name ASC
    `);

  return result.recordset;
}