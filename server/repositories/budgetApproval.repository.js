import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function getPendingBudgetsRepo(financialYearId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT
        b.id,
        b.department_id,
        d.name AS department_name,
        b.financial_year_id,
        fy.year AS financial_year,
        b.status,
        b.submitted_by,
        u.USER_NAME AS submitted_by_name,
        b.submitted_at,
        COUNT(bi.id) AS items_count,
        ISNULL(SUM(bi.total_amount), 0) AS total_amount
      FROM BS_budgets b
      INNER JOIN BS_departments d
        ON d.id = b.department_id
      INNER JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      LEFT JOIN users u
        ON u.USER_ID = b.submitted_by
      LEFT JOIN BS_budget_items bi
        ON bi.budget_id = b.id
       AND bi.is_active = 1
      WHERE b.status = 'PENDING_APPROVAL'
        AND b.is_active = 1
        AND b.financial_year_id = @financialYearId
      GROUP BY
        b.id,
        b.department_id,
        d.name,
        b.financial_year_id,
        fy.year,
        b.status,
        b.submitted_by,
        u.USER_NAME,
        b.submitted_at
      ORDER BY b.submitted_at DESC
    `);

  return result.recordset;
}

export async function getBudgetHeaderRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT TOP 1
        b.id,
        b.department_id,
        d.name AS department_name,
        b.financial_year_id,
        fy.year AS financial_year,
        fy.status AS financial_year_status,
        b.status,
        b.created_by,
        b.created_at,
        b.submitted_by,
        b.submitted_at,
        b.approved_by,
        b.approved_at,
        b.returned_by,
        b.returned_at
      FROM BS_budgets b
      INNER JOIN BS_departments d ON d.id = b.department_id
      INNER JOIN BS_financial_years fy ON fy.id = b.financial_year_id
      WHERE b.id = @budgetId
        AND b.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getBudgetItemsForReviewRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT
        bi.id,
        bi.budget_id,
        t.category_id,
        c.name AS category_name,
        bi.type_id,
        t.name AS type_name,
        t.expense_type,
        bi.quantity,
        bi.unit_price,
        bi.total_amount,
        bi.distribution_method,
        bi.distribution_level
      FROM BS_budget_items bi
      INNER JOIN BS_budget_types t
        ON t.id = bi.type_id
      INNER JOIN BS_budget_categories c
        ON c.id = t.category_id
      WHERE bi.budget_id = @budgetId
        AND bi.is_active = 1
      ORDER BY c.name, t.name
    `);

  return result.recordset;
}

export async function getBudgetItemPriceIntelligenceRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      DECLARE @evidenceWindowStart DATETIME2 = DATEADD(MONTH, -24, SYSUTCDATETIME());

      WITH budget_items AS (
        SELECT
          bi.id AS budget_item_id,
          bi.type_id
        FROM BS_budget_items bi
        WHERE bi.budget_id = @budgetId
          AND bi.is_active = 1
      ),
      active_mappings AS (
        SELECT DISTINCT
          bi.budget_item_id,
          LTRIM(RTRIM(m.po_item_code)) AS po_item_code
        FROM budget_items bi
        INNER JOIN BS_PO_ITEM_MAPPINGS m
          ON m.budget_type_id = bi.type_id
        WHERE m.is_active = 1
          AND m.po_item_code IS NOT NULL
          AND LTRIM(RTRIM(m.po_item_code)) <> ''
      ),
      all_history AS (
        SELECT
          am.budget_item_id,
          po.ID AS purchase_invoice_line_id,
          LTRIM(RTRIM(po.ITEM_CODE)) AS item_code,
          po.ITEM_DESC AS item_description,
          po.SUPPLIER_NAME_EN AS supplier_name,
          po.QTY AS quantity,
          CAST(po.UNIT_COST AS DECIMAL(18, 6)) AS unit_cost,
          po.CREATED_AT AS created_at
        FROM active_mappings am
        INNER JOIN BS_Purchase_Invoices_For_Budget po
          ON LTRIM(RTRIM(po.ITEM_CODE)) = am.po_item_code
        WHERE po.UNIT_COST IS NOT NULL
          AND po.UNIT_COST > 0
      ),
      recent_counts AS (
        SELECT
          budget_item_id,
          COUNT(*) AS recent_purchase_count
        FROM all_history
        WHERE created_at >= @evidenceWindowStart
        GROUP BY budget_item_id
      ),
      scoped_history AS (
        SELECT
          h.*,
          CASE
            WHEN ISNULL(rc.recent_purchase_count, 0) > 0
              THEN 'RECENT_24_MONTHS'
            ELSE 'ALL_HISTORY'
          END AS evidence_window_used
        FROM all_history h
        LEFT JOIN recent_counts rc
          ON rc.budget_item_id = h.budget_item_id
        WHERE
          (
            ISNULL(rc.recent_purchase_count, 0) > 0
            AND h.created_at >= @evidenceWindowStart
          )
          OR ISNULL(rc.recent_purchase_count, 0) = 0
      ),
      ordered_history AS (
        SELECT
          sh.*,
          ROW_NUMBER() OVER (
            PARTITION BY sh.budget_item_id
            ORDER BY sh.unit_cost ASC, sh.purchase_invoice_line_id ASC
          ) AS median_row_number,
          COUNT(*) OVER (
            PARTITION BY sh.budget_item_id
          ) AS median_row_count,
          ROW_NUMBER() OVER (
            PARTITION BY sh.budget_item_id
            ORDER BY sh.created_at DESC, sh.purchase_invoice_line_id DESC
          ) AS latest_row_number
        FROM scoped_history sh
      ),
      medians AS (
        SELECT
          budget_item_id,
          AVG(unit_cost) AS median_unit_cost
        FROM ordered_history
        WHERE median_row_number IN (
          (median_row_count + 1) / 2,
          (median_row_count + 2) / 2
        )
        GROUP BY budget_item_id
      ),
      aggregates AS (
        SELECT
          sh.budget_item_id,
          COUNT(*) AS purchase_count,
          COUNT(DISTINCT NULLIF(LTRIM(RTRIM(sh.supplier_name)), '')) AS supplier_count,
          AVG(sh.unit_cost) AS average_unit_cost,
          MIN(sh.unit_cost) AS min_unit_cost,
          MAX(sh.unit_cost) AS max_unit_cost,
          MAX(sh.evidence_window_used) AS evidence_window_used
        FROM scoped_history sh
        GROUP BY sh.budget_item_id
      ),
      latest AS (
        SELECT
          budget_item_id,
          unit_cost AS last_purchase_unit_cost,
          created_at AS last_purchase_at
        FROM ordered_history
        WHERE latest_row_number = 1
      ),
      mapped_codes AS (
        SELECT
          am.budget_item_id,
          STUFF((
            SELECT DISTINCT ', ' + am2.po_item_code
            FROM active_mappings am2
            WHERE am2.budget_item_id = am.budget_item_id
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS mapped_item_codes
        FROM active_mappings am
        GROUP BY am.budget_item_id
      )
      SELECT
        bi.budget_item_id,
        med.median_unit_cost AS historical_benchmark,
        agg.average_unit_cost,
        agg.min_unit_cost,
        agg.max_unit_cost,
        latest.last_purchase_unit_cost,
        latest.last_purchase_at,
        ISNULL(agg.purchase_count, 0) AS purchase_count,
        ISNULL(agg.supplier_count, 0) AS supplier_count,
        mapped.mapped_item_codes,
        agg.evidence_window_used
      FROM budget_items bi
      LEFT JOIN aggregates agg
        ON agg.budget_item_id = bi.budget_item_id
      LEFT JOIN medians med
        ON med.budget_item_id = bi.budget_item_id
      LEFT JOIN latest
        ON latest.budget_item_id = bi.budget_item_id
      LEFT JOIN mapped_codes mapped
        ON mapped.budget_item_id = bi.budget_item_id
    `);

  return result.recordset;
}

export async function getBudgetItemPriceIntelligenceDetailsRepo({
  budgetId,
  budgetItemId,
}) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.BigInt, budgetId)
    .input("budgetItemId", sql.BigInt, budgetItemId).query(`
      DECLARE @evidenceWindowStart DATETIME2 = DATEADD(MONTH, -24, SYSUTCDATETIME());

      SELECT
        bi.id AS budget_item_id,
        bi.budget_id,
        b.department_id,
        d.name AS department_name,
        b.financial_year_id,
        fy.year AS financial_year,
        t.category_id,
        c.name AS category_name,
        bi.type_id,
        t.name AS type_name,
        t.expense_type,
        bi.quantity,
        bi.unit_price,
        bi.total_amount,
        bi.distribution_method,
        bi.distribution_level
      INTO #budget_item
      FROM BS_budget_items bi
      INNER JOIN BS_budgets b
        ON b.id = bi.budget_id
       AND b.is_active = 1
      INNER JOIN BS_departments d
        ON d.id = b.department_id
      INNER JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      INNER JOIN BS_budget_types t
        ON t.id = bi.type_id
      INNER JOIN BS_budget_categories c
        ON c.id = t.category_id
      WHERE bi.id = @budgetItemId
        AND bi.budget_id = @budgetId
        AND bi.is_active = 1;

      SELECT DISTINCT
        bi.budget_item_id,
        LTRIM(RTRIM(m.po_item_code)) AS po_item_code
      INTO #active_mappings
      FROM #budget_item bi
      INNER JOIN BS_PO_ITEM_MAPPINGS m
        ON m.budget_type_id = bi.type_id
      WHERE m.is_active = 1
        AND m.po_item_code IS NOT NULL
        AND LTRIM(RTRIM(m.po_item_code)) <> '';

      SELECT
        am.budget_item_id,
        po.ID AS purchase_invoice_line_id,
        LTRIM(RTRIM(po.ITEM_CODE)) AS item_code,
        po.ITEM_DESC AS item_description,
        po.PARENT_ITEM_NAME AS parent_item_name,
        po.SUPPLIER_NAME_EN AS supplier_name,
        po.QTY AS quantity,
        CAST(po.UNIT_COST AS DECIMAL(18, 6)) AS unit_cost,
        po.NET_AMOUNT AS net_amount,
        po.CREATED_AT AS created_at
      INTO #all_history
      FROM #active_mappings am
      INNER JOIN BS_Purchase_Invoices_For_Budget po
        ON LTRIM(RTRIM(po.ITEM_CODE)) = am.po_item_code
      WHERE po.UNIT_COST IS NOT NULL
        AND po.UNIT_COST > 0;

      SELECT
        h.*,
        CASE
          WHEN ISNULL(rc.recent_purchase_count, 0) > 0
            THEN 'RECENT_24_MONTHS'
          ELSE 'ALL_HISTORY'
        END AS evidence_window_used
      INTO #scoped_history
      FROM #all_history h
      LEFT JOIN (
        SELECT
          budget_item_id,
          COUNT(*) AS recent_purchase_count
        FROM #all_history
        WHERE created_at >= @evidenceWindowStart
        GROUP BY budget_item_id
      ) rc
        ON rc.budget_item_id = h.budget_item_id
      WHERE
        (
          ISNULL(rc.recent_purchase_count, 0) > 0
          AND h.created_at >= @evidenceWindowStart
        )
        OR ISNULL(rc.recent_purchase_count, 0) = 0;

      SELECT *
      FROM #budget_item;

      WITH ordered_history AS (
        SELECT
          sh.*,
          ROW_NUMBER() OVER (
            PARTITION BY sh.budget_item_id
            ORDER BY sh.unit_cost ASC, sh.purchase_invoice_line_id ASC
          ) AS median_row_number,
          COUNT(*) OVER (
            PARTITION BY sh.budget_item_id
          ) AS median_row_count,
          ROW_NUMBER() OVER (
            PARTITION BY sh.budget_item_id
            ORDER BY sh.created_at DESC, sh.purchase_invoice_line_id DESC
          ) AS latest_row_number
        FROM #scoped_history sh
      ),
      medians AS (
        SELECT
          budget_item_id,
          AVG(unit_cost) AS median_unit_cost
        FROM ordered_history
        WHERE median_row_number IN (
          (median_row_count + 1) / 2,
          (median_row_count + 2) / 2
        )
        GROUP BY budget_item_id
      ),
      aggregates AS (
        SELECT
          sh.budget_item_id,
          COUNT(*) AS purchase_count,
          COUNT(DISTINCT NULLIF(LTRIM(RTRIM(sh.supplier_name)), '')) AS supplier_count,
          AVG(sh.unit_cost) AS average_unit_cost,
          MIN(sh.unit_cost) AS min_unit_cost,
          MAX(sh.unit_cost) AS max_unit_cost,
          MAX(sh.evidence_window_used) AS evidence_window_used
        FROM #scoped_history sh
        GROUP BY sh.budget_item_id
      ),
      latest AS (
        SELECT
          budget_item_id,
          unit_cost AS last_purchase_unit_cost,
          created_at AS last_purchase_at
        FROM ordered_history
        WHERE latest_row_number = 1
      ),
      mapped_codes AS (
        SELECT
          am.budget_item_id,
          STUFF((
            SELECT DISTINCT ', ' + am2.po_item_code
            FROM #active_mappings am2
            WHERE am2.budget_item_id = am.budget_item_id
            FOR XML PATH(''), TYPE
          ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS mapped_item_codes
        FROM #active_mappings am
        GROUP BY am.budget_item_id
      )
      SELECT
        bi.budget_item_id,
        med.median_unit_cost AS historical_benchmark,
        agg.average_unit_cost,
        agg.min_unit_cost,
        agg.max_unit_cost,
        latest.last_purchase_unit_cost,
        latest.last_purchase_at,
        ISNULL(agg.purchase_count, 0) AS purchase_count,
        ISNULL(agg.supplier_count, 0) AS supplier_count,
        mapped.mapped_item_codes,
        agg.evidence_window_used
      FROM #budget_item bi
      LEFT JOIN aggregates agg
        ON agg.budget_item_id = bi.budget_item_id
      LEFT JOIN medians med
        ON med.budget_item_id = bi.budget_item_id
      LEFT JOIN latest
        ON latest.budget_item_id = bi.budget_item_id
      LEFT JOIN mapped_codes mapped
        ON mapped.budget_item_id = bi.budget_item_id;

      SELECT TOP 50
        purchase_invoice_line_id,
        item_code,
        item_description,
        parent_item_name,
        supplier_name,
        quantity,
        unit_cost,
        net_amount,
        created_at
      FROM #scoped_history
      ORDER BY created_at DESC, purchase_invoice_line_id DESC;
    `);

  return {
    budgetItem: result.recordsets?.[0]?.[0] || null,
    benchmark: result.recordsets?.[1]?.[0] || null,
    recentPurchases: result.recordsets?.[2] || [],
  };
}

export async function approveBudgetRepo({ budgetId, approvedBy }) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("budgetId", sql.BigInt, budgetId)
    .input("approvedBy", sql.Int, approvedBy).query(`
      UPDATE BS_budgets
      SET
        status = 'APPROVED',
        approved_by = @approvedBy,
        approved_at = GETUTCDATE(),
        returned_by = NULL,
        returned_at = NULL,
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @budgetId
        AND status = 'PENDING_APPROVAL'
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function returnBudgetRepo(
  { budgetId, returnedBy },
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("budgetId", sql.BigInt, budgetId)
    .input("returnedBy", sql.Int, returnedBy).query(`
      UPDATE BS_budgets
      SET
        status = 'RETURNED',
        returned_by = @returnedBy,
        returned_at = GETUTCDATE(),
        updated_at = GETUTCDATE()
      OUTPUT INSERTED.*
      WHERE id = @budgetId
        AND status = 'PENDING_APPROVAL'
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getBudgetComparisonRepo() {
  const pool = await poolPromise;

  const result = await pool.request().query(`
    SELECT
      b.id AS budget_id,
      b.department_id,
      d.name AS department_name,
      b.financial_year_id,
      fy.year AS financial_year,
      b.status,

      t.category_id,
      c.name AS category_name,
      bi.type_id,
      t.name AS type_name,
      t.expense_type,

      bi.quantity,
      bi.unit_price,

      bi.total_amount AS original_amount,

      ISNULL(ti.transfer_in, 0) AS transfer_in,

      ISNULL(tox.transfer_out, 0) AS transfer_out,

      (
        bi.total_amount
        + ISNULL(ti.transfer_in, 0)
        - ISNULL(tox.transfer_out, 0)
      ) AS current_amount,

    bi.distribution_method,
bi.distribution_level,

bi.created_from_transfer,
bi.source_transfer_id

    FROM BS_budgets b

    INNER JOIN BS_departments d
      ON d.id = b.department_id

    INNER JOIN BS_financial_years fy
      ON fy.id = b.financial_year_id

    INNER JOIN BS_budget_items bi
      ON bi.budget_id = b.id
     AND bi.is_active = 1

    INNER JOIN BS_budget_types t
      ON t.id = bi.type_id

    INNER JOIN BS_budget_categories c
      ON c.id = t.category_id

    LEFT JOIN (
      SELECT
        to_budget_item_id,
        SUM(amount) AS transfer_in
      FROM BS_budget_transfers
      WHERE status = 'APPROVED'
      GROUP BY to_budget_item_id
    ) ti
      ON ti.to_budget_item_id = bi.id

    LEFT JOIN (
      SELECT
        from_budget_item_id,
        SUM(amount) AS transfer_out
      FROM BS_budget_transfers
      WHERE status = 'APPROVED'
      GROUP BY from_budget_item_id
    ) tox
      ON tox.from_budget_item_id = bi.id

    WHERE b.is_active = 1

    ORDER BY
      fy.year DESC,
      d.name,
      c.name,
      t.name
  `);

  return result.recordset;
}
export async function getApprovedBudgetsRepo(financialYearId) {
  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("financialYearId", sql.Int, financialYearId).query(`
      SELECT
        b.id,
        b.department_id,
        d.name AS department_name,
        b.financial_year_id,
        fy.year AS financial_year,
        b.status,
        b.approved_by,
        u.USER_NAME AS approved_by_name,
        b.approved_at,
        COUNT(bi.id) AS items_count,
        ISNULL(SUM(bi.total_amount), 0) AS total_amount
      FROM BS_budgets b
      INNER JOIN BS_departments d
        ON d.id = b.department_id
      INNER JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      LEFT JOIN users u
        ON u.USER_ID = b.approved_by
      LEFT JOIN BS_budget_items bi
        ON bi.budget_id = b.id
       AND bi.is_active = 1
      WHERE b.status = 'APPROVED'
        AND b.is_active = 1
        AND b.financial_year_id = @financialYearId
      GROUP BY
        b.id,
        b.department_id,
        d.name,
        b.financial_year_id,
        fy.year,
        b.status,
        b.approved_by,
        u.USER_NAME,
        b.approved_at
      ORDER BY b.approved_at DESC
    `);

  return result.recordset;
}
