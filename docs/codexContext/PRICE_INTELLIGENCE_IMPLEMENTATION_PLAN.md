# Price Intelligence / Historical Procurement Benchmarking Implementation Plan

## 1. Business Context

### Current Budget Approval Workflow

The QNH Budget System currently supports a controlled hospital budget workflow:

1. Departments prepare budgets for an open financial year.
2. Budget items are entered with:
   - item/type
   - quantity
   - unit price
   - total amount
   - distribution method
3. Departments submit budgets for approval.
4. CFOs and Budget Approvers review submitted budgets in the Budget Approval page.
5. Approvers can approve the budget or return it with general and item-level notes.

The approval review screen currently gives approvers the requested budget item values, such as:

```text
Item: Office Chair
Quantity: 50
Unit Price: 420 SAR
Total Amount: 21,000 SAR
```

This is operationally correct, but it does not provide procurement context.

### Current Problems Faced by CFOs and Approvers

Approvers currently need to rely on experience, memory, or manual investigation to answer critical questions:

- Is the requested unit price reasonable?
- Has QNH purchased the same or similar item before?
- What was the historical purchase price?
- Is this item significantly above historical procurement prices?
- How much financial impact does the variance create?
- Is the variance material enough to justify returning the budget?
- Is there enough evidence to trust the benchmark?
- Is this a true risk, or is the historical evidence weak?

Without historical context, approvers may:

- approve overpriced items because the variance is not visible
- return reasonable items because they lack evidence
- spend time manually searching PO history
- make inconsistent approval decisions between departments
- miss high-impact budget risks hidden among many normal line items

### Why Procurement Intelligence Is Needed

QNH already has historical procurement data in the system. The feature should use that existing data to help approvers make better decisions during budget approval.

This is not an AI feature. It uses deterministic business rules, approved mappings, and historical procurement records already stored in the database.

The goal is to make the approval screen an evidence-backed decision tool, not merely a list of requested budget items.

### Why Historical Benchmark Visibility Improves Approval Quality

Historical procurement benchmarks give approvers immediate context:

```text
Budget Unit Price: 420 SAR
Historical Benchmark: 390 SAR
Variance: +7.7%
Potential Impact: +1,500 SAR
Evidence: 37 purchases, 4 suppliers, last 24 months
```

This allows the approver to:

- identify items that need review
- focus attention on high-impact variances
- understand whether the benchmark is based on strong evidence
- write more precise return notes
- justify approvals with auditable procurement evidence

### Expected Business Value

The feature is expected to deliver:

- better approval decisions
- faster review of large budgets
- improved financial control
- reduced manual procurement investigation
- clearer CFO visibility into potential overspend
- stronger auditability of approval decisions
- consistent review criteria across departments

The most important CFO value is not the benchmark itself. It is the combination of:

- variance visibility
- potential overspend calculation
- evidence strength
- transparent historical source data

## 2. Existing System Context

This feature builds on existing Budget, PO, and PO Mapping data. No AI, machine learning, vector database, or external benchmark service is involved in Phase 1.

### BS_budgets

Purpose in the system:

- Stores department budgets by financial year.
- Tracks budget status such as `DRAFT`, `RETURNED`, `PENDING_APPROVAL`, and `APPROVED`.
- Drives the Budget Approval workflow.

Role in this feature:

- The Budget Approval page loads one submitted budget.
- Price intelligence is calculated for the active items in that budget.
- The budget ID scopes the benchmark query to the current approval review.

Important fields:

- `id`
- `department_id`
- `financial_year_id`
- `status`
- `is_active`
- `submitted_at`
- `approved_at`

### BS_budget_items

Purpose in the system:

- Stores individual budget line items.
- Each row represents a requested item/type, quantity, unit price, and total amount.

Role in this feature:

- Each budget item is benchmarked against historical procurement data.
- The budget item's `type_id` is used to find mapped PO item codes in `BS_PO_ITEM_MAPPINGS`.
- The budget item's `unit_price` is compared to the historical benchmark.
- The budget item's `quantity` is used to calculate potential overspend.

Important fields:

- `id`
- `budget_id`
- `type_id`
- `quantity`
- `unit_price`
- `total_amount`
- `is_active`

### BS_budget_types

Purpose in the system:

- Defines standard budget item types such as Office Chair, Laptop, Network Switch, Patient Monitor, etc.
- Links budget items to category and expense type.

Role in this feature:

- `BS_budget_items.type_id` references `BS_budget_types.id`.
- `BS_PO_ITEM_MAPPINGS.budget_type_id` maps a budget type to one or more PO item codes.
- This makes budget type the bridge between budget planning and historical procurement.

Important fields:

- `id`
- `name`
- `category_id`
- `expense_type`
- `is_active`

### BS_PO_LINKS

Purpose in the system:

- Stores PO link requests and approval history.
- Records approved relationships between budget items and PO source records.
- Used for PO allocation, audit history, and learning mappings.

Role in this feature:

- `BS_PO_LINKS` is not the direct benchmark source for Phase 1 benchmark generation.
- It remains the historical learning source that feeds `BS_PO_ITEM_MAPPINGS`.
- Approved PO links create or update mappings automatically.
- It may be used indirectly for mapping learning and audit, not for benchmark selection.

Reason not to query directly for benchmark generation:

- The approved architecture defines `BS_PO_ITEM_MAPPINGS` as the source of truth for Budget Type to PO Item Code relationships.
- `BS_PO_LINKS` contains event history, not the curated knowledge base.
- Directly using `BS_PO_LINKS` for benchmarks would duplicate mapping logic and violate the single-source-of-truth direction already approved for PO intelligence.

Important fields:

- `ID`
- `PURCHASE_INVOICE_LINE_ID`
- `BUDGET_ID`
- `BUDGET_ITEM_ID`
- `REQUESTED_QTY`
- `UNIT_COST`
- `LINKED_AMOUNT`
- `STATUS`
- `APPROVED_AT`
- `APPROVED_BY`

### BS_PO_ITEM_MAPPINGS

Purpose in the system:

- Source-of-truth knowledge base mapping Budget Item Types to PO item codes.
- Supports PO suggestions and mapping management.
- Contains both manually curated and automatically learned mappings.

Role in this feature:

- Primary lookup table for benchmark generation.
- Given a budget item type, the engine finds active mapped PO item codes.
- Those item codes are used to select historical PO records from `BS_Purchase_Invoices_For_Budget`.

Important fields:

- `id`
- `budget_type_id`
- `po_item_code`
- `po_item_description`
- `mapping_source`
- `learned_count`
- `last_learned_at`
- `is_active`

Only active mappings should be used for benchmark generation:

```sql
WHERE m.is_active = 1
```

### BS_Purchase_Invoices_For_Budget

Purpose in the system:

- Source table containing historical procurement / PO records from CareWare.
- Includes item code, item description, supplier, unit cost, quantity, and created date.

Role in this feature:

- Primary historical data source for benchmark calculations.
- The benchmark engine uses mapped `ITEM_CODE` values to find comparable historical purchases.
- Unit cost data from this table is used to calculate median, average, minimum, maximum, and last purchase price.

Important fields:

- `ID`
- `ITEM_CODE`
- `ITEM_DESC`
- `PARENT_ITEM_NAME`
- `SUPPLIER_NAME_EN`
- `QTY`
- `UNIT_COST`
- `NET_AMOUNT`
- `CREATED_AT`

## 3. Architecture

Final approved architecture:

```text
Budget Approval
  ↓
Price Intelligence Engine
  ↓
BS_PO_ITEM_MAPPINGS
  ↓
BS_Purchase_Invoices_For_Budget
  ↓
Benchmark Results
  ↓
Budget Approval UI
```

### Step 1: Budget Approval

The user enters the Budget Approval page and selects a pending budget for review.

Existing frontend flow:

```text
BudgetApprovalPage
  -> useBudgetReview(budgetId)
  -> GET /api/budget-approval/:budgetId
```

Existing backend flow:

```text
budgetApproval.routes.js
  -> budgetApproval.controller.js
  -> budgetApproval.service.js
  -> budgetApproval.repository.js
```

### Step 2: Price Intelligence Engine

The backend extends the existing budget review process by calculating procurement intelligence for every active budget item.

The service should:

1. Load budget header.
2. Load active budget items.
3. Load historical procurement benchmark aggregates for all budget items in one set-based query.
4. Classify each item using deterministic threshold logic.
5. Attach `price_intelligence` to each budget item.
6. Build a `priceIntelligenceSummary` for CFO-level overview.

### Step 3: BS_PO_ITEM_MAPPINGS

The benchmark engine uses the budget item's `type_id` to find active mappings:

```text
BS_budget_items.type_id
  -> BS_PO_ITEM_MAPPINGS.budget_type_id
```

Only active mappings are used:

```text
BS_PO_ITEM_MAPPINGS.is_active = 1
```

This produces one or more PO item codes for the budget item type.

### Step 4: BS_Purchase_Invoices_For_Budget

The mapped item codes are used to find historical procurement records:

```text
BS_PO_ITEM_MAPPINGS.po_item_code
  -> BS_Purchase_Invoices_For_Budget.ITEM_CODE
```

The system then calculates historical procurement statistics based on `UNIT_COST`.

### Step 5: Benchmark Results

The benchmark result includes:

- historical benchmark unit price
- variance SAR
- variance %
- potential overspend
- evidence strength
- purchase count
- supplier count
- mapped item codes
- price statistics

The benchmark unit price is the median historical unit cost.

### Step 6: Budget Approval UI

The frontend displays:

- a Price Intelligence Summary section above the item table
- new benchmark columns in the main item review table
- a Details action for each item
- a drawer with full explainability and recent historical purchases

## 4. Benchmark Methodology

### Benchmark Name

Approved terminology:

- Historical Benchmark
- Historical Procurement Benchmark

Do not use:

- Market Benchmark

Reason:

Phase 1 uses internal QNH historical procurement data only. It does not use external market prices.

### Primary Benchmark

The primary benchmark is:

```text
Median Historical Unit Cost
```

The system should label it as:

```text
Historical Benchmark
```

### Why Median Was Selected

Median was selected because it is more resistant to outliers.

Example historical unit costs:

```text
350, 370, 390, 395, 410, 1200
```

The average is distorted by the 1200 outlier.

The median better represents the typical purchase price.

### Why Average Alone Is Not Enough

Average is useful as a supporting metric, but it should not be the benchmark because:

- one unusual urgent purchase can inflate it
- one unusually discounted purchase can reduce it
- supplier or delivery conditions can create abnormal prices
- small datasets can be skewed

Average should still be shown in the drawer for transparency.

### Historical Purchase Window

Primary evidence window:

```text
24 months
```

Reason:

- Recent enough to reflect current procurement reality.
- Long enough to usually include enough purchase records.

Fallback:

- If no records exist in the 24-month window, the system may use older records but must reduce evidence strength and show that the benchmark is based on older data.

Approved Phase 1 behavior:

- Aggregate review should use the approved window logic.
- Drawer should display the evidence window clearly.

### Variance Calculations

Formula:

```text
variance_amount = budget_unit_price - historical_benchmark
```

```text
variance_percent = (variance_amount / historical_benchmark) * 100
```

Example:

```text
Budget Unit Price = 420
Historical Benchmark = 390

variance_amount = 420 - 390 = 30
variance_percent = (30 / 390) * 100 = 7.69%
```

### Potential Overspend Calculation

Formula:

```text
potential_overspend = (budget_unit_price - historical_benchmark) * quantity
```

Example:

```text
Budget Unit Price = 420
Historical Benchmark = 390
Quantity = 50

potential_overspend = (420 - 390) * 50
potential_overspend = 1,500 SAR
```

Only positive values should contribute to the summary total potential overspend.

If the budget price is below benchmark:

- show the negative variance as informational
- do not subtract it from total potential overspend

### Evidence Strength Logic

Evidence strength communicates how much trust should be placed in the benchmark.

Recommended levels:

```text
HIGH
MEDIUM
LOW
NONE
```

Logic:

```text
HIGH:
  purchase_count >= 10
  AND supplier_count >= 2
  AND latest_purchase_at within 24 months

MEDIUM:
  purchase_count >= 3
  AND latest_purchase_at within 36 months

LOW:
  purchase_count >= 1

NONE:
  purchase_count = 0
```

Evidence strength is not AI scoring. It is a deterministic classification based on purchase count, supplier count, and recency.

## 5. UI / UX Design

### Approved UX Direction

The Budget Approval page keeps the existing item review table but adds procurement benchmark columns.

The goal is to allow approvers to scan the entire budget without opening drawers.

### Main Budget Approval Table Columns

Approved columns:

| Item | Qty | Unit Price | Total | Historical Benchmark | Variance | Potential Impact | Status | Details |
| ---- | --- | ---------- | ----- | -------------------- | -------- | ---------------- | ------ | ------- |

The existing table also includes category, expense, method, and approver note columns. Those should remain unless the final UI layout requires small adjustments.

### Historical Benchmark Column

Displays the median historical unit cost.

Example:

```text
390 SAR
```

If no benchmark exists:

```text
No benchmark
```

Supporting display may include evidence strength:

```text
390 SAR
High evidence
```

### Variance Column

Displays both percentage and SAR difference.

Example:

```text
+7.7%
+30 SAR
```

If below benchmark:

```text
-5.2%
-20 SAR
```

If no benchmark exists:

```text
-
```

### Potential Impact Column

Displays the financial impact of the unit price variance multiplied by quantity.

Example:

```text
+1,500 SAR
```

If below benchmark:

```text
Possible savings: 1,000 SAR
```

For summary calculations, only positive overspend values count toward total potential overspend.

### Status Column

Displays one of:

- Within Benchmark
- Review Price
- Significant Variance
- High Overspend Risk
- No Benchmark Available

Example:

```text
Review Price
```

The status should use a clear badge:

- green for within benchmark
- yellow for review price
- orange for significant variance
- red for high overspend risk
- gray for no benchmark

### Details Column

Displays a `View` button for every item.

Even when no benchmark exists, the `View` action should still be available so users can understand why no benchmark is available.

Example:

```text
View
```

Clicking opens the Price Intelligence drawer.

### Example Table Row

```text
Item: Office Chair
Qty: 50
Unit Price: 420 SAR
Total: 21,000 SAR
Historical Benchmark: 390 SAR
Variance: +7.7% / +30 SAR
Potential Impact: +1,500 SAR
Status: Review Price
Details: View
```

## 6. Drawer Design

### Existing Drawer Architecture

The drawer must reuse the existing drawer architecture already used by:

- Budget View Page
- PO Used Drawer
- `BudgetItemPOLinksDrawer`
- `AnimatedDrawer`

Do not introduce a different drawer system.

Relevant existing files:

```text
client/src/components/budgets/shared/drawers/AnimatedDrawer.jsx
client/src/components/budgets/shared/drawers/BudgetItemPOLinksDrawer.jsx
```

### Drawer Purpose

The drawer provides full explainability for the benchmark.

It should answer:

- How was the benchmark calculated?
- Which historical records were used?
- How many purchases support the benchmark?
- How many suppliers support the benchmark?
- What is the price range?
- What was the last purchase price?
- Which item codes were mapped?

### Drawer Layout

Use full-screen drawer behavior consistent with `BudgetItemPOLinksDrawer`.

Header:

```text
Historical Procurement Benchmark
Office Chair
[Close]
```

### Section 1: Budget Information

Displays:

```text
Budget Unit Price: 420 SAR
Budget Quantity: 50
Budget Total: 21,000 SAR
```

Example layout:

```text
Budget Information
------------------------------------------------
Budget Unit Price        420 SAR
Budget Quantity          50
Budget Total             21,000 SAR
```

### Section 2: Benchmark Summary

Displays:

```text
Historical Benchmark: 390 SAR
Variance: +30 SAR
Variance %: +7.7%
Potential Overspend: 1,500 SAR
Evidence Strength: HIGH
```

Example layout:

```text
Benchmark Summary
------------------------------------------------
Historical Benchmark     390 SAR
Variance                 +30 SAR
Variance %               +7.7%
Potential Overspend      1,500 SAR
Evidence Strength        HIGH
```

### Section 3: Historical Procurement Data

Displays:

```text
Historical Purchases: 37
Suppliers: 4
Mapped Item Codes: 2102030060, 2102030061
Evidence Window: 24 Months
```

Example layout:

```text
Historical Procurement Data
------------------------------------------------
Historical Purchases     37
Suppliers                4
Mapped Item Codes        2102030060, 2102030061
Evidence Window          24 Months
```

### Section 4: Price Statistics

Displays:

```text
Median: 390 SAR
Average: 392 SAR
Minimum: 350 SAR
Maximum: 430 SAR
Last Purchase: 405 SAR
Last Purchase Date: 14-Jun-2026
```

Example layout:

```text
Price Statistics
------------------------------------------------
Median                   390 SAR
Average                  392 SAR
Minimum                  350 SAR
Maximum                  430 SAR
Last Purchase            405 SAR
Last Purchase Date       14-Jun-2026
```

### Section 5: Recent Historical Purchases

Displays a table of recent PO records used in the benchmark calculation.

Columns:

| Date | Supplier | Item Code | Quantity | Unit Cost |
| ---- | -------- | --------- | -------- | --------- |

Example:

| Date | Supplier | Item Code | Quantity | Unit Cost |
| ---- | -------- | --------- | -------- | --------- |
| 14-Jun-2026 | Supplier A | 2102030060 | 20 | 405 SAR |
| 21-Mar-2026 | Supplier B | 2102030060 | 15 | 390 SAR |
| 10-Jan-2026 | Supplier C | 2102030061 | 10 | 385 SAR |

The table should use existing table patterns:

- `SortableHeader`
- `useTableSort`
- `usePagination`
- `TablePagination`

Limit recent historical purchase records to a reasonable default, such as 25 rows.

## 7. Threshold Logic

### Statuses

Approved statuses:

- Within Benchmark
- Review Price
- Significant Variance
- High Overspend Risk
- No Benchmark Available

### No Benchmark Available

Condition:

```text
historical_benchmark IS NULL
OR purchase_count = 0
OR no active mapping exists
```

Meaning:

The system does not have enough mapped historical procurement data to produce a benchmark.

Badge:

```text
gray
```

### Within Benchmark

Condition:

```text
variance_percent <= 5
```

This includes:

- prices equal to benchmark
- prices moderately below benchmark
- prices up to 5% above benchmark

Rationale:

Small price movements are normal in procurement. A 5% tolerance avoids creating noise for approvers.

Badge:

```text
green
```

### Review Price

Condition:

```text
variance_percent > 5
AND variance_percent <= 15
```

Rationale:

This range is not necessarily problematic, but it deserves attention and context.

Badge:

```text
yellow
```

### Significant Variance

Condition:

```text
variance_percent > 15
AND variance_percent <= 30
```

Rationale:

This level of difference is large enough to require a clear explanation or return note.

Badge:

```text
orange
```

### High Overspend Risk

Condition:

```text
variance_percent > 30
```

Rationale:

This level of variance is materially above the historical benchmark and should be highly visible to CFOs.

Badge:

```text
red
```

### Below Benchmark

If the budget unit price is below the historical benchmark:

- show the negative variance
- do not mark as overspend
- do not subtract from total potential overspend

Potential future status:

```text
Possible Savings
```

For Phase 1, below-benchmark values can remain `Within Benchmark` unless a separate informational badge is later approved.

## 8. Data Sources

### BS_PO_ITEM_MAPPINGS

Used because it is the approved source of truth for:

```text
Budget Item Type ↔ PO Item Code
```

Benefits:

- curated by administrators
- learned automatically from approved PO links
- supports multiple PO item codes per budget type
- provides traceability through mapping source and learned count
- avoids direct dependency on historical event records for semantic mapping

Only active mappings should be used:

```sql
WHERE is_active = 1
```

### BS_Purchase_Invoices_For_Budget

Used because it contains the historical procurement data:

- item code
- item description
- supplier
- unit cost
- quantity
- purchase date

This table is the historical price source for Phase 1.

### Why BS_PO_LINKS Is Not Used Directly

`BS_PO_LINKS` is important, but it should not be queried directly to generate benchmarks.

Approved role of `BS_PO_LINKS`:

- audit history
- approval history
- learning source

Approved role of `BS_PO_ITEM_MAPPINGS`:

- source of truth for mapping
- suggestion generation
- benchmark generation
- future reporting

Using `BS_PO_LINKS` directly for benchmark generation would create two competing mapping sources:

```text
BS_PO_LINKS-derived logic
BS_PO_ITEM_MAPPINGS logic
```

That would violate the single-source-of-truth rule.

## 9. Backend Design

### Modified Route

File:

```text
server/routes/budgetApproval.routes.js
```

Purpose:

- Existing Budget Approval routes.

Exact changes:

- Keep existing route:

```text
GET /api/budget-approval/:budgetId
```

- Add detail route:

```text
GET /api/budget-approval/:budgetId/items/:budgetItemId/price-intelligence
```

Responsibility:

- Route the drawer detail request to the controller.
- Keep existing permission behavior under `can_approve_budget`.

### Modified Controller

File:

```text
server/controllers/budgetApproval.controller.js
```

Purpose:

- Thin HTTP controller for Budget Approval.

Exact changes:

- Import new service:

```text
getBudgetItemPriceIntelligenceDetailService
```

- Add controller:

```text
getBudgetItemPriceIntelligenceDetail
```

Responsibility:

- Read `budgetId` and `budgetItemId` from params.
- Call service.
- Return `ApiResponse`.

No benchmark business logic should be placed in the controller.

### Modified Service

File:

```text
server/services/budgetApproval.service.js
```

Purpose:

- Business workflow and approval rules.

Exact changes:

- Modify `getBudgetReviewService(budgetId)`:
  - fetch existing budget header
  - fetch existing budget items
  - fetch benchmark aggregates for all items
  - classify each item using helper logic
  - attach `price_intelligence` to each item
  - create `priceIntelligenceSummary`

- Add:

```text
getBudgetItemPriceIntelligenceDetailService({ budgetId, budgetItemId })
```

Responsibility:

- validate budget exists
- validate item belongs to budget
- fetch detailed benchmark and recent purchases
- apply same classification logic
- return drawer-ready object

### Modified Repository

File:

```text
server/repositories/budgetApproval.repository.js
```

Purpose:

- SQL data access for Budget Approval.

Exact changes:

- Add:

```text
getBudgetItemPriceIntelligenceRepo(budgetId)
```

Responsibility:

- return aggregate benchmark data for all active budget items in a budget
- calculate purchase count, supplier count, mapped item codes, median, average, min, max, last purchase price/date

- Add:

```text
getBudgetItemPriceIntelligenceDetailRepo({ budgetId, budgetItemId, limit })
```

Responsibility:

- return drawer detail data for one item
- include recent historical PO records

### New Helper

File:

```text
server/helpers/priceIntelligence.helper.js
```

Purpose:

- Deterministic benchmark classification and calculation helper.

Responsibility:

- calculate variance amount
- calculate variance percent
- calculate potential overspend
- determine evidence strength
- determine status
- produce labels and severity values

This keeps threshold logic centralized and avoids duplicating calculations in frontend code.

## 10. Frontend Design

### Modified API File

File:

```text
client/src/api/budget.api.js
```

Purpose:

- Existing frontend budget API module.

Exact changes:

- Add:

```text
getBudgetItemPriceIntelligence(budgetId, budgetItemId)
```

Responsibility:

- Call:

```text
GET /budget-approval/:budgetId/items/:budgetItemId/price-intelligence
```

### Modified Hook File

File:

```text
client/src/hooks/budgets/useBudgetApproval.js
```

Purpose:

- Existing React Query hooks for budget approval.

Exact changes:

- Add:

```text
useBudgetItemPriceIntelligence(budgetId, budgetItemId)
```

Responsibility:

- Fetch drawer detail lazily only when an item is selected.
- Use existing React Query patterns.

### Modified Page Component

File:

```text
client/src/pages/budget-approval/ReadonlyBudgetGrid.jsx
```

Purpose:

- Read-only budget review layout used in Budget Approval.

Exact changes:

- Render `PriceIntelligenceSummary` above the item table.
- Pass `showPriceIntelligence` to `BudgetItemsTable`.
- Track selected budget item for drawer state.
- Render `BudgetPriceIntelligenceDrawer`.

Responsibility:

- Coordinate summary display, table columns, and drawer state.

### Modified Shared Table Component

File:

```text
client/src/components/budgets/shared/BudgetItemsTable.jsx
```

Purpose:

- Shared budget item table used by approval and budget view screens.

Exact changes:

- Add optional prop:

```text
showPriceIntelligence
```

- Add optional prop:

```text
onViewPriceIntelligence
```

- When `showPriceIntelligence` is true, add columns:
  - Historical Benchmark
  - Variance
  - Potential Impact
  - Status
  - Details

Responsibility:

- Preserve existing behavior when `showPriceIntelligence` is false.
- Render intelligence columns only for Budget Approval.

### New Summary Component

File:

```text
client/src/components/budgets/price-intelligence/PriceIntelligenceSummary.jsx
```

Purpose:

- CFO-level summary above the item table.

Responsibility:

- Display:
  - Items Analyzed
  - High Risk Items
  - Potential Overspend
  - Missing Benchmarks

### New Status Badge Component

File:

```text
client/src/components/budgets/price-intelligence/PriceIntelligenceStatusBadge.jsx
```

Purpose:

- Consistent rendering of price intelligence statuses.

Responsibility:

- Render the correct label, color, and accessible text for:
  - Within Benchmark
  - Review Price
  - Significant Variance
  - High Overspend Risk
  - No Benchmark Available

### New Drawer Component

File:

```text
client/src/components/budgets/price-intelligence/BudgetPriceIntelligenceDrawer.jsx
```

Purpose:

- Full explainability drawer.

Responsibility:

- Reuse `AnimatedDrawer`.
- Fetch detail through `useBudgetItemPriceIntelligence`.
- Display:
  - Budget Information
  - Benchmark Summary
  - Historical Procurement Data
  - Price Statistics
  - Recent Historical Purchases

## 11. SQL Design

### Aggregate Query Strategy

The aggregate query should:

1. Select active budget items for the budget.
2. Join active mappings by budget item type.
3. Join historical PO rows by item code.
4. Filter historical records to the evidence window when possible.
5. Calculate aggregate statistics per budget item.

Conceptual SQL shape:

```sql
WITH budget_items AS (
  SELECT
    bi.id AS budget_item_id,
    bi.type_id,
    bi.quantity,
    bi.unit_price,
    bi.total_amount
  FROM BS_budget_items bi
  WHERE bi.budget_id = @budgetId
    AND bi.is_active = 1
),
active_mappings AS (
  SELECT
    m.budget_type_id,
    LTRIM(RTRIM(m.po_item_code)) AS po_item_code
  FROM BS_PO_ITEM_MAPPINGS m
  WHERE m.is_active = 1
),
historical_po AS (
  SELECT
    bi.budget_item_id,
    po.ID,
    po.ITEM_CODE,
    po.ITEM_DESC,
    po.SUPPLIER_NAME_EN,
    po.QTY,
    po.UNIT_COST,
    po.CREATED_AT
  FROM budget_items bi
  INNER JOIN active_mappings m
    ON m.budget_type_id = bi.type_id
  INNER JOIN BS_Purchase_Invoices_For_Budget po
    ON LTRIM(RTRIM(po.ITEM_CODE)) = m.po_item_code
  WHERE po.UNIT_COST IS NOT NULL
    AND po.UNIT_COST > 0
)
SELECT ...
```

### Median Calculation Strategy

Preferred:

```sql
PERCENTILE_CONT(0.5)
WITHIN GROUP (ORDER BY UNIT_COST)
OVER (PARTITION BY budget_item_id)
```

If the database compatibility level does not support `PERCENTILE_CONT`, use a row-number median fallback.

Fallback concept:

```sql
ROW_NUMBER() OVER (
  PARTITION BY budget_item_id
  ORDER BY UNIT_COST
) AS rn,
COUNT(*) OVER (
  PARTITION BY budget_item_id
) AS cnt
```

Median rows:

```text
rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
```

Then:

```text
median = AVG(unit_cost of median rows)
```

### Aggregations

Required aggregate metrics:

```text
purchase_count = COUNT(*)
supplier_count = COUNT(DISTINCT supplier)
average_unit_cost = AVG(UNIT_COST)
min_unit_cost = MIN(UNIT_COST)
max_unit_cost = MAX(UNIT_COST)
median_unit_cost = median calculation
last_purchase_unit_cost = unit cost of latest CREATED_AT row
last_purchase_at = MAX(CREATED_AT)
mapped_item_codes = distinct mapped item codes
```

### Detail Query Strategy

The detail endpoint should return recent historical purchase records:

```sql
SELECT TOP (@limit)
  po.ID AS purchase_invoice_line_id,
  po.CREATED_AT AS created_at,
  po.SUPPLIER_NAME_EN AS supplier_name,
  po.ITEM_CODE AS item_code,
  po.ITEM_DESC AS item_description,
  po.QTY AS quantity,
  po.UNIT_COST AS unit_cost
FROM ...
ORDER BY po.CREATED_AT DESC, po.ID DESC
```

### Proposed Indexes

Do not execute until approved.

```sql
CREATE INDEX IX_BS_PO_ITEM_MAPPINGS_type_active
ON BS_PO_ITEM_MAPPINGS (budget_type_id, is_active)
INCLUDE (
  po_item_code,
  mapping_source,
  learned_count,
  last_learned_at
);
```

```sql
CREATE INDEX IX_BS_Purchase_Invoices_For_Budget_ITEM_CODE_CREATED_AT
ON BS_Purchase_Invoices_For_Budget (ITEM_CODE, CREATED_AT)
INCLUDE (
  ID,
  ITEM_DESC,
  SUPPLIER_NAME_EN,
  QTY,
  UNIT_COST,
  NET_AMOUNT
);
```

## 12. Performance Design

### Why Aggregate Data Loads With Budget Review

Approvers need to scan all budget items at once.

Loading the aggregate benchmark data with the budget review response enables:

- immediate table visibility
- one backend call per selected budget
- no per-row loading spinners
- consistent sorting and display

### Why Drawer Details Load Lazily

Detailed historical purchase records can be larger.

Loading them only when the user clicks `View` avoids:

- large initial payloads
- slow budget review load
- unnecessary transfer of detail rows for items the approver never opens

This mirrors the existing PO Used drawer pattern.

### Expected Performance Behavior

Budget review endpoint:

- one query for budget header
- one query for budget items
- one set-based query for benchmark aggregates

Drawer endpoint:

- one query for selected item benchmark detail
- one query for recent purchase rows or a combined multi-result query

### Potential Bottlenecks

Potential bottlenecks:

- large `BS_Purchase_Invoices_For_Budget` table
- no useful index on `ITEM_CODE`
- median calculation over too many historical rows
- many mappings per budget type
- loading all-time history when no recent records exist

Mitigations:

- index by `ITEM_CODE, CREATED_AT`
- use a 24-month evidence window
- lazy-load recent purchase records
- limit drawer records
- avoid per-item queries

## 13. Risks and Edge Cases

### No Mappings

Condition:

```text
Budget item type has no active BS_PO_ITEM_MAPPINGS rows
```

Behavior:

- show `No Benchmark Available`
- drawer explains no active mapping exists
- do not calculate variance or overspend

### No Purchases

Condition:

```text
Active mappings exist, but no historical PO rows match mapped item codes
```

Behavior:

- show `No Benchmark Available`
- drawer explains mappings exist but no purchase history was found

### Stale Purchases

Condition:

```text
Purchases exist but latest purchase is older than the evidence window
```

Behavior:

- benchmark may still be shown
- evidence strength should be reduced
- drawer must show last purchase date and evidence window

### One Supplier Only

Condition:

```text
supplier_count = 1
```

Behavior:

- benchmark can be shown
- evidence strength should not be HIGH
- drawer should show supplier count clearly

### Price Decreases

Condition:

```text
budget_unit_price < historical_benchmark
```

Behavior:

- show negative variance
- do not add to potential overspend summary
- treat as within benchmark unless separate future status is approved

### Unit Mismatches

Condition:

```text
Historical records use different unit basis than the budget item expectation
```

Risk:

- benchmark can mislead users

Mitigation:

- show unit/quantity context in drawer
- future phase may include unit normalization

### Description Drift

Condition:

```text
Same ITEM_CODE has changed item description over time
```

Risk:

- historical records may not represent the exact same specification

Mitigation:

- show recent item descriptions in drawer
- rely on stable ITEM_CODE as current business fact

### Outliers

Condition:

```text
One historical purchase has unusually high or low UNIT_COST
```

Mitigation:

- use median as primary benchmark
- show min/max and average for transparency

### Low Purchase Count

Condition:

```text
purchase_count < 3
```

Behavior:

- benchmark may show, but evidence strength is LOW
- approver should treat result cautiously

### Multiple Mapped Item Codes

Condition:

```text
Budget type maps to several PO item codes
```

Behavior:

- aggregate across all active mapped codes
- drawer must list mapped item codes

### Inactive Mappings

Condition:

```text
Mapping exists but is_active = 0
```

Behavior:

- inactive mappings must not influence benchmarks
- admin screens can still show them separately

### Live Benchmark Changes

Condition:

```text
Historical PO data or mappings change after budget approval
```

Risk:

- benchmark shown later may differ from benchmark seen during approval

Mitigation:

- Phase 1 accepts live calculation
- future phase should add benchmark snapshots for audit preservation

## 14. Future Roadmap

These items are future phases and are not part of Phase 1 implementation.

### External Market Benchmarks

Use external procurement or market pricing sources.

Not Phase 1 because:

- requires source governance
- requires validation of market comparability
- may introduce licensing or data quality concerns

### Manual Market Benchmark Tables

Allow Finance or Procurement to maintain manual benchmark prices.

Potential table:

```text
BS_ITEM_MARKET_BENCHMARKS
```

Could include:

- budget type
- benchmark price
- source
- effective date
- entered by
- approved by

### Supplier Benchmarking

Analyze supplier-specific price patterns:

- supplier average
- supplier last price
- supplier variance
- supplier ranking

Useful for Procurement, not required for initial approval support.

### Trend Charts

Show historical unit cost trend over time.

Potential drawer enhancement:

- sparkline
- quarterly median price
- last 12/24/36 month comparison

### Procurement Intelligence Scoring

Add a deterministic composite score.

Important:

- This must remain explainable.
- Avoid AI/ML scoring unless explicitly approved in a future phase.

### Price Snapshots for Audit History

Create approval-time snapshots:

```text
BS_BUDGET_ITEM_PRICE_INTELLIGENCE_SNAPSHOTS
```

Purpose:

- preserve benchmark values shown at approval time
- support audit review later
- prevent live benchmark changes from altering historical approval context

Recommended if auditors require exact historical evidence preservation.

### Configurable Thresholds

Move thresholds into an admin-managed configuration table.

Potential fields:

- within benchmark threshold
- review price threshold
- significant variance threshold
- high risk threshold
- evidence window months

## Phase 1 Implementation Status

This section records the controlled implementation batches completed for Phase 1.

### Batch 1: Foundation + Backend Price Intelligence Engine

Status: Implemented.

Implemented:

- `server/helpers/priceIntelligence.helper.js`
- aggregate benchmark calculation support in `server/repositories/budgetApproval.repository.js`
- price intelligence enrichment in `server/services/budgetApproval.service.js`
- `price_intelligence` attached to each budget item in the budget review response
- `priceIntelligenceSummary` attached to the budget review response

Validation:

- Backend syntax checks passed for modified backend files.
- Calculations remain centralized in the helper/service layer.
- Repository remains the only layer with database access.

### Batch 2: Approval Page Table Integration

Status: Implemented.

Implemented:

- `PriceIntelligenceStatusBadge`
- Historical Benchmark column
- Variance column
- Potential Impact column
- Status column
- Details column placeholder

Validation:

- Existing `BudgetItemsTable` sorting pattern was reused.
- Price intelligence columns are enabled only for pending approval review mode.
- Existing budget view and read-only approved budget views remain unchanged.

### Batch 3: Price Intelligence Drawer

Status: Implemented.

Implemented:

- detail endpoint:

```text
GET /api/budget-approval/:budgetId/items/:budgetItemId/price-intelligence
```

- lazy frontend API/hook
- `BudgetPriceIntelligenceDrawer`
- full-screen drawer using existing `AnimatedDrawer`
- recent purchases table using `SortableHeader`, `useTableSort`, `usePagination`, and `TablePagination`

Validation:

- Detail route is registered before `GET /api/budget-approval/:budgetId`.
- Drawer calculations reuse backend price intelligence helper output.
- Recent purchases are limited to 50 records and loaded only when the drawer opens.

### Batch 4: Price Intelligence Summary Dashboard

Status: Implemented.

Implemented:

- `PriceIntelligenceSummary`
- pending review summary cards:
  - Items Analyzed
  - High Risk Items
  - Potential Overspend
  - Missing Benchmarks

Validation:

- Summary uses the backend `priceIntelligenceSummary` response.
- No frontend aggregation duplicates backend summary logic.

### Batch 5: Hardening + Performance + Validation

Status: Implemented.

Hardening completed:

- No-mapping drawer empty state now explicitly tells the user that no active PO item mappings exist.
- Mapped-but-no-purchases drawer empty state remains separate and explains that mappings exist but no purchase records were found.

Validation completed:

- Aggregate and drawer query paths both use:
  - active `BS_PO_ITEM_MAPPINGS`
  - historical `BS_Purchase_Invoices_For_Budget`
  - 24-month evidence window
  - all-history fallback when no recent records exist
  - median unit cost as the benchmark
- `BS_PO_LINKS` is not used directly for benchmark generation.
- Drawer details are lazy-loaded and item-scoped.
- Recent historical purchases are capped at 50.

Operational notes:

- Recommended indexes remain the same as documented in the SQL Design section.
- No schema changes were made during Batch 5.
- No new permissions were introduced for this feature; it remains under existing Budget Approval authorization.

## 15. Final Recommendation

This design was selected because it gives CFOs and Budget Approvers an evidence-backed view of price reasonableness directly inside the approval workflow.

It is preferable to simpler approaches because:

- A single benchmark number without evidence is not trustworthy.
- A drawer without table columns forces too much clicking.
- A summary without row-level detail is not actionable.
- Average-only benchmarking is vulnerable to outliers.
- Directly querying `BS_PO_LINKS` would violate the approved source-of-truth architecture.

The approved design balances:

- scanability through table columns
- executive visibility through the summary section
- explainability through the drawer
- performance through aggregate loading and lazy detail loading
- auditability through deterministic formulas and source data

The feature should make the Budget Approval page materially more valuable by answering:

```text
Is this price reasonable?
How much money is at risk?
How strong is the evidence?
What historical purchases support the benchmark?
```

This is the information CFOs need to make faster, better, and more defensible budget approval decisions.
