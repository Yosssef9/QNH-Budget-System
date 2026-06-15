import { poolPromise, sql } from "../config/db.js";

export async function getBudgetItemBalanceRepo(itemId) {
  const pool = await poolPromise;

  const result = await pool.request().input("itemId", sql.Int, itemId).query(`
      SELECT
        bi.id,

     bi.total_amount AS approved_amount,
bi.quantity AS approved_quantity,

        ISNULL((
            SELECT SUM(t.amount)
            FROM BS_budget_transfers t
            WHERE t.to_budget_item_id = bi.id
            AND t.status = 'APPROVED'
        ),0) AS transfer_in,
ISNULL(
(
    SELECT
        SUM(t.amount) / NULLIF(bi.unit_price,0)
    FROM BS_budget_transfers t
    WHERE t.to_budget_item_id = bi.id
      AND t.status = 'APPROVED'
),
0) AS transfer_in_quantity,
        ISNULL((
            SELECT SUM(t.amount)
            FROM BS_budget_transfers t
            WHERE t.from_budget_item_id = bi.id
            AND t.status = 'APPROVED'
        ),0) AS transfer_out,
ISNULL(
(
    SELECT SUM(t.transfer_quantity)
    FROM BS_budget_transfers t
    WHERE t.from_budget_item_id = bi.id
    AND t.status = 'APPROVED'
),
0) AS transfer_out_quantity,
        ISNULL((
            SELECT SUM(p.LINKED_AMOUNT)
            FROM BS_PO_LINKS p
            WHERE p.BUDGET_ITEM_ID = bi.id
            AND p.STATUS = 'APPROVED'
        ),0) AS po_used

      FROM BS_budget_items bi
      WHERE bi.id = @itemId
    `);

  return result.recordset[0] || null;
}
export async function getBudgetBalanceSummaryRepo(budgetId) {
  const pool = await poolPromise;

  const result = await pool.request().input("budgetId", sql.BigInt, budgetId)
    .query(`
      SELECT
        bi.id,

        bt.name AS type_name,

    bi.total_amount AS approved_amount,
bi.quantity AS approved_quantity,

        bi.created_from_transfer,
        bi.source_transfer_id

      FROM BS_budget_items bi

      INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id

      WHERE bi.budget_id = @budgetId
        AND bi.is_active = 1
    `);

  return result.recordset;
}

export async function getBudgetItemPOLinksRepo(budgetItemId) {
  const pool = await poolPromise;

  const itemResult = await pool
    .request()
    .input("budgetItemId", sql.Int, budgetItemId).query(`
      SELECT TOP 1
        bi.id AS budget_item_id,
        bi.budget_id AS budget_id,
        bi.quantity AS budget_quantity,
        bi.unit_price AS budget_unit_price,
        bi.total_amount AS budget_total_amount,
        bt.name AS budget_type_name,
        bt.expense_type AS expense_type,
        b.department_id AS department_id,
        d.name AS department_name,
        b.financial_year_id AS financial_year_id,
        fy.year AS financial_year,
        b.status AS budget_status,
       ISNULL((
  SELECT SUM(pl.LINKED_AMOUNT)
  FROM BS_PO_LINKS pl
  WHERE pl.BUDGET_ITEM_ID = bi.id
    AND pl.STATUS = 'APPROVED'
), 0) AS total_po_used,

ISNULL((
  SELECT SUM(pl.REQUESTED_QTY)
  FROM BS_PO_LINKS pl
  WHERE pl.BUDGET_ITEM_ID = bi.id
    AND pl.STATUS = 'APPROVED'
), 0) AS total_linked_quantity
      FROM BS_budget_items bi
      INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id
      INNER JOIN BS_budgets b
        ON b.id = bi.budget_id
      LEFT JOIN BS_departments d
        ON d.id = b.department_id
      LEFT JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      WHERE bi.id = @budgetItemId
        AND bi.is_active = 1
    `);

  const budgetItem = itemResult.recordset[0] || null;

  if (!budgetItem) {
    return null;
  }

  const linksResult = await pool
    .request()
    .input("budgetItemId", sql.Int, budgetItemId).query(`
      SELECT
        pl.ID AS id,
        pl.PURCHASE_INVOICE_LINE_ID AS purchase_invoice_line_id,
        pl.BUDGET_ID AS budget_id,
        pl.BUDGET_ITEM_ID AS budget_item_id,
        pl.REQUESTED_QTY AS requested_qty,
        pl.UNIT_COST AS unit_cost,
        pl.LINKED_AMOUNT AS linked_amount,
        pl.STATUS AS status,
        pl.REQUESTED_BY AS requested_by,
        pl.REQUESTED_AT AS requested_at,
        pl.APPROVED_BY AS approved_by,
        pl.APPROVED_AT AS approved_at,
        pl.REJECTED_BY AS rejected_by,
        pl.REJECTED_AT AS rejected_at,
        pl.REJECTION_REASON AS rejection_reason,
        bt.name AS budget_type_name,
        d.name AS department_name,
        fy.year AS financial_year,
        requestedUser.USER_NAME AS requested_by_name,
        approvedUser.USER_NAME AS approved_by_name,
        rejectedUser.USER_NAME AS rejected_by_name,
        po.INVOICE_NO AS invoice_no,
        po.INVOICE_DUE_DATE AS invoice_due_date,
        po.ORDER_ID AS order_id,
        po.ITEM_CODE AS item_code,
        po.ITEM_DESC AS item_description,
        po.SUPPLIER_NAME_EN AS supplier_name,
        po.QTY AS po_qty,
        po.UNIT_COST AS po_unit_cost,
        po.NET_AMOUNT AS po_net_amount
      FROM BS_PO_LINKS pl
      INNER JOIN BS_budget_items bi
        ON bi.id = pl.BUDGET_ITEM_ID
      INNER JOIN BS_budget_types bt
        ON bt.id = bi.type_id
      INNER JOIN BS_budgets b
        ON b.id = pl.BUDGET_ID
      LEFT JOIN BS_departments d
        ON d.id = b.department_id
      LEFT JOIN BS_financial_years fy
        ON fy.id = b.financial_year_id
      LEFT JOIN USERS requestedUser
        ON requestedUser.USER_ID = pl.REQUESTED_BY
      LEFT JOIN USERS approvedUser
        ON approvedUser.USER_ID = pl.APPROVED_BY
      LEFT JOIN USERS rejectedUser
        ON rejectedUser.USER_ID = pl.REJECTED_BY
      INNER JOIN BS_Purchase_Invoices_For_Budget po
        ON po.ID = pl.PURCHASE_INVOICE_LINE_ID
      WHERE pl.BUDGET_ITEM_ID = @budgetItemId
        AND pl.STATUS = 'APPROVED'
      ORDER BY pl.APPROVED_AT DESC, pl.ID DESC
    `);

  return {
    budgetItem,
    links: linksResult.recordset,
  };
}
