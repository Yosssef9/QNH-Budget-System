# Price Intelligence User Guide

## 1. Executive Summary

Price Intelligence is a historical procurement benchmarking feature for Budget Approval.

It helps approvers compare a proposed budget item price against QNH's own historical purchase behavior. Instead of reviewing only quantity, unit price, and total amount, approvers can now see whether the requested unit price is consistent with similar historical procurement records.

The feature was added because budget approval decisions often require context that was previously available only through manual investigation.

Example:

| Budget Item | Quantity | Requested Unit Price |
|---|---:|---:|
| Office Chair | 50 | SAR 420 |

Without Price Intelligence, the approver must ask:

- Is SAR 420 reasonable?
- Has QNH purchased this item before?
- What did it usually cost?
- How much money is at risk if this price is high?

Price Intelligence answers these questions with historical procurement evidence.

The goal is procurement benchmarking and approval decision support. Procurement benchmarking is commonly used to compare proposed prices against historical purchasing behavior and market-aligned reference values. In Phase 1, this feature uses only QNH internal historical procurement data, not external market data.

How it helps key users:

| User | How Price Intelligence Helps |
|---|---|
| CFO | Quickly identifies budget items with possible overspend risk and sees the financial impact. |
| Budget Approver | Reviews item-level price reasonableness without leaving the approval screen. |
| Procurement Team | Sees which historical item codes support the benchmark and can maintain mappings. |
| Auditor | Can trace benchmark results back to deterministic formulas and historical procurement records. |
| Developer | Can understand the business calculation model without reading source code. |

Important principle:

Price Intelligence is not AI. It does not use language models, machine learning, embeddings, predictions, or external recommendation services. It uses deterministic calculations over approved source-of-truth mappings and historical PO records.

## 2. High-Level Data Flow

The high-level flow is:

```text
Budget Item
  |
  v
Budget Type
  |
  v
PO Item Mappings
  |
  v
Mapped ITEM_CODE values
  |
  v
Historical PO Records
  |
  v
Price Intelligence Engine
  |
  v
Approval Indicators
```

Expanded flow:

```text
HOD submits budget
  |
  v
Budget Approval page opens
  |
  v
System reads each budget item
  |
  v
System reads the item's Budget Type
  |
  v
System finds all active PO Item Mappings for that Budget Type
  |
  v
System collects all mapped ITEM_CODE values
  |
  v
System retrieves historical PO rows for those ITEM_CODE values
  |
  v
System calculates benchmark, statistics, variance, impact, and risk
  |
  v
CFO / Budget Approver sees table indicators and drawer details
```

Each step has a specific purpose:

| Step | Meaning |
|---|---|
| Budget Item | The line item submitted for approval, such as Laptop or Office Chair. |
| Budget Type | The master item type behind the budget item. |
| PO Item Mappings | Maintained relationships between Budget Types and procurement ITEM_CODE values. |
| Mapped ITEM_CODEs | Stable item codes from Carware historical procurement data. |
| Historical PO Records | Actual QNH purchase invoice line records for mapped ITEM_CODEs. |
| Price Intelligence Engine | Deterministic calculation layer. |
| Approval Indicators | Benchmark, variance, potential overspend, status, and drawer details. |

## 3. Understanding PO Item Mappings

A PO Item Mapping connects a budget type to a procurement item code.

Example:

```text
Budget Type: Laptop

Laptop <-> ITEM_CODE 17819
Laptop <-> ITEM_CODE 17820
Laptop <-> ITEM_CODE 17821
```

Mappings exist because a single business item may appear under one or more procurement ITEM_CODE values in historical purchase data.

For example, Laptop may have multiple ITEM_CODE values because different laptop models, suppliers, or procurement classifications were used historically.

### Mapping Source

Each mapping has a source:

| Mapping Source | Meaning |
|---|---|
| MANUAL | Created manually by an administrator. |
| APPROVED_LINK | Learned automatically after an approved PO link confirmed a relationship. |

### MANUAL Mappings

Manual mappings are created by administrators when QNH already knows that a Budget Type corresponds to a PO ITEM_CODE.

Example:

```text
Laptop <-> 17819
Source: MANUAL
```

Business meaning:

An administrator intentionally decided that historical PO records with ITEM_CODE 17819 should be considered relevant when benchmarking Laptop budget items.

### APPROVED_LINK Mappings

Approved-link mappings are learned when a PO link is approved.

Example:

```text
Approved PO Link:
Budget Item Type = Laptop
PO ITEM_CODE = 17820

System learns:
Laptop <-> 17820
Source: APPROVED_LINK
```

Business meaning:

An approver already confirmed a real-world relationship between that budget item type and the PO record. The system stores that relationship for future benchmarking and suggestions.

### How Mappings Participate in Analysis

For benchmark calculations, MANUAL and APPROVED_LINK mappings are treated equally.

If Laptop has these mappings:

| Budget Type | ITEM_CODE | Source |
|---|---|---|
| Laptop | 17819 | MANUAL |
| Laptop | 17820 | APPROVED_LINK |
| Laptop | 17821 | APPROVED_LINK |

The engine uses all three active ITEM_CODE values:

```text
17819
17820
17821
```

It does not use only manual mappings.

It does not use only learned mappings.

It does not use only the most recent mapping.

It does not use only one ITEM_CODE.

## 4. Historical Dataset Construction

Historical dataset construction is the most important part of the feature.

The engine must decide which historical PO records are relevant to the budget item being reviewed.

### Step 1: Start With the Budget Item

Example budget item:

| Field | Value |
|---|---|
| Budget Item | Office Chair |
| Budget Type ID | 301 |
| Quantity | 50 |
| Unit Price | SAR 420 |

The engine reads the Budget Type ID.

```text
Office Chair budget item
  |
  v
Budget Type ID = 301
```

### Step 2: Find Active Mappings

Mappings:

| Budget Type | ITEM_CODE | Source | Active? |
|---|---|---|---|
| Office Chair | 2102030060 | MANUAL | Yes |
| Office Chair | 2102030061 | APPROVED_LINK | Yes |
| Office Chair | 2102039999 | MANUAL | No |

The engine includes only active mappings.

Included:

```text
2102030060
2102030061
```

Excluded:

```text
2102039999
```

Reason:

Inactive mappings are disabled by administrators and should not influence benchmarks.

### Step 3: Remove Duplicate ITEM_CODE Values

If duplicates exist:

| Budget Type | ITEM_CODE | Source | Active? |
|---|---|---|---|
| Office Chair | 2102030060 | MANUAL | Yes |
| Office Chair | 2102030060 | APPROVED_LINK | Yes |

The engine treats `2102030060` as one mapped code for benchmark construction.

This prevents the same historical PO rows from being counted twice.

### Step 4: Retrieve Historical PO Records

The engine queries historical procurement records where:

```text
BS_Purchase_Invoices_For_Budget.ITEM_CODE
matches one of the active mapped ITEM_CODE values
```

Example mappings:

```text
2102030060
2102030061
```

Historical PO records:

| PO Record | ITEM_CODE | Unit Cost | Included? |
|---|---|---:|---|
| PO #1 | 2102030060 | SAR 380 | Yes |
| PO #2 | 2102030060 | SAR 390 | Yes |
| PO #3 | 2102030061 | SAR 410 | Yes |
| PO #4 | 2102039999 | SAR 500 | No |

PO #4 is excluded because its ITEM_CODE is not active for Office Chair.

### Step 5: Exclude Invalid Unit Costs

The engine includes only historical rows with:

```text
UNIT_COST is not null
UNIT_COST > 0
```

Example:

| PO Record | ITEM_CODE | Unit Cost | Included? |
|---|---|---:|---|
| PO #1 | 2102030060 | SAR 380 | Yes |
| PO #2 | 2102030060 | SAR 0 | No |
| PO #3 | 2102030061 | null | No |

Zero or missing unit costs cannot support a price benchmark.

### Step 6: Apply Evidence Window

The primary evidence window is the last 24 months.

Rule:

```text
If at least one matching historical PO record exists in the last 24 months,
use only matching records from the last 24 months.

If no matching historical PO record exists in the last 24 months,
fall back to all available matching history.
```

Example A: Recent history exists

| PO Record | Date | Unit Cost | Used? |
|---|---|---:|---|
| PO #1 | 2026 | SAR 390 | Yes |
| PO #2 | 2025 | SAR 395 | Yes |
| PO #3 | 2020 | SAR 310 | No |

The old 2020 record is excluded because recent evidence exists.

Example B: No recent history exists

| PO Record | Date | Unit Cost | Used? |
|---|---|---:|---|
| PO #1 | 2020 | SAR 310 | Yes |
| PO #2 | 2019 | SAR 320 | Yes |

All available history is used because no recent evidence exists.

### Summary of Dataset Rules

| Condition | Behavior |
|---|---|
| Active mapping | Included. |
| Inactive mapping | Excluded. |
| Duplicate ITEM_CODE mapping | Counted once. |
| No mapping | No benchmark available. |
| Mapping exists but no PO history | No benchmark available, mapped codes still visible. |
| UNIT_COST is null or zero | Excluded. |
| Recent records exist | Use last 24 months only. |
| No recent records exist | Use all available matching history. |

## 5. Every Metric Explained

### Benchmark Price

#### Business Meaning

Benchmark Price is the main historical reference price used to judge whether the proposed budget unit price is reasonable.

It represents the typical historical unit cost for the mapped item codes.

#### Formula

```text
Benchmark Price = Median Historical Unit Cost
```

The median is calculated from the scoped historical dataset.

#### Example

Historical unit costs:

```text
350, 380, 390, 410, 900
```

Sorted:

```text
350, 380, 390, 410, 900
```

Median:

```text
390
```

Benchmark Price:

```text
SAR 390
```

#### Interpretation

If the budget unit price is close to the Benchmark Price, the item is likely aligned with historical purchasing behavior.

If the budget unit price is much higher, the item may require review.

### Average Price

#### Business Meaning

Average Price shows the arithmetic average of historical unit costs.

It is useful as a supporting statistic but is not the primary benchmark.

#### Formula

```text
Average Price = Sum of historical unit costs / Number of historical purchases
```

#### Example

Historical unit costs:

```text
350, 380, 390, 410, 900
```

Calculation:

```text
(350 + 380 + 390 + 410 + 900) / 5
= 2,430 / 5
= 486
```

Average Price:

```text
SAR 486
```

#### Interpretation

The average can be pulled upward by outliers. In this example, SAR 900 makes the average much higher than the typical price.

### Median Price

#### Business Meaning

Median Price is the middle value after historical unit costs are sorted.

It is more resistant to extreme prices than average.

#### Formula

Odd number of records:

```text
Median = middle value
```

Even number of records:

```text
Median = average of the two middle values
```

#### Example

Odd count:

```text
350, 380, 390, 410, 900
Median = 390
```

Even count:

```text
350, 380, 390, 410
Median = (380 + 390) / 2 = 385
```

#### Interpretation

Median is the current Benchmark Price.

### Minimum Price

#### Business Meaning

Minimum Price is the lowest historical unit cost in the scoped dataset.

#### Formula

```text
Minimum Price = Lowest historical UNIT_COST
```

#### Example

Historical unit costs:

```text
350, 380, 390, 410
```

Minimum:

```text
SAR 350
```

#### Interpretation

Minimum Price shows the lowest observed historical cost. It should not automatically be treated as the expected price because it may reflect an old deal, discount, promotion, or different item specification.

### Maximum Price

#### Business Meaning

Maximum Price is the highest historical unit cost in the scoped dataset.

#### Formula

```text
Maximum Price = Highest historical UNIT_COST
```

#### Example

Historical unit costs:

```text
350, 380, 390, 410
```

Maximum:

```text
SAR 410
```

#### Interpretation

Maximum Price shows the highest observed cost. If the requested budget price is above the maximum, that may require stronger justification.

### Last Purchase Price

#### Business Meaning

Last Purchase Price is the unit cost from the most recent historical PO record in the scoped dataset.

#### Formula

```text
Last Purchase Price = UNIT_COST from the most recent historical PO record
```

#### Example

| Date | Unit Cost |
|---|---:|
| 01-Jan-2025 | SAR 390 |
| 14-Jun-2026 | SAR 405 |

Last Purchase Price:

```text
SAR 405
```

#### Interpretation

Last Purchase Price shows the latest known procurement cost. It may reflect recent price movement, supplier change, or inflation.

### Purchase Count

#### Business Meaning

Purchase Count is the number of historical PO records used in the benchmark calculation.

#### Formula

```text
Purchase Count = Count of included historical PO records
```

#### Example

If 37 historical PO rows match active mapped ITEM_CODE values and pass the evidence window and unit cost rules:

```text
Purchase Count = 37
```

#### Interpretation

Higher purchase count usually means stronger evidence. One record is useful, but less reliable than many records.

### Supplier Count

#### Business Meaning

Supplier Count is the number of distinct suppliers represented in the historical dataset.

#### Formula

```text
Supplier Count = Count of distinct non-empty supplier names
```

#### Example

Historical purchases:

| PO | Supplier |
|---|---|
| PO #1 | Supplier A |
| PO #2 | Supplier A |
| PO #3 | Supplier B |
| PO #4 | Supplier C |

Supplier Count:

```text
3
```

#### Interpretation

More suppliers generally means the benchmark is less dependent on one vendor's pricing.

### Benchmark Coverage

#### Business Meaning

Benchmark Coverage means whether a budget item has enough mapped historical procurement data to produce a benchmark.

This is shown indirectly through:

- Items Analyzed
- Missing Benchmarks
- No Benchmark Available status

#### Formula

For one item:

```text
Covered = historical benchmark exists
Missing = no historical benchmark exists
```

For a budget:

```text
Items Analyzed = count of items with benchmark
Missing Benchmarks = count of items without benchmark
```

#### Example

Budget has 10 items:

```text
7 items have benchmarks
3 items do not
```

Coverage:

```text
Items Analyzed = 7
Missing Benchmarks = 3
```

#### Interpretation

Missing benchmarks show where mapping or historical data is incomplete.

### Evidence Strength

#### Business Meaning

Evidence Strength explains how reliable the benchmark evidence is.

It is currently shown in the drawer and table as evidence information.

#### Formula

```text
HIGH:
  purchase_count >= 10
  supplier_count >= 2
  latest purchase age <= 24 months

MEDIUM:
  purchase_count >= 3
  latest purchase age <= 36 months

LOW:
  purchase_count >= 1

NONE:
  purchase_count = 0
```

#### Example

```text
Purchase Count = 12
Supplier Count = 4
Last Purchase = 6 months ago
Evidence Strength = HIGH
```

#### Interpretation

HIGH evidence is more trustworthy than LOW evidence. LOW evidence should still be reviewed carefully.

### Confidence Score

Confidence Score is not currently implemented as a numeric score.

The implemented substitute is Evidence Strength:

```text
HIGH
MEDIUM
LOW
NONE
```

This is intentionally simpler and easier to audit.

### Historical Spend

Historical Spend is not currently shown as a main implemented metric.

The drawer shows recent historical purchase records with unit cost, quantity, and net amount data where available, but the feature does not currently display a formal Historical Spend KPI.

### Variance Amount

#### Business Meaning

Variance Amount is the unit price difference between the budget request and the benchmark.

#### Formula

```text
Variance Amount = Budget Unit Price - Benchmark Price
```

#### Example

```text
Budget Unit Price = 420
Benchmark Price = 390
Variance Amount = 420 - 390 = 30
```

#### Interpretation

Positive variance means the budget price is above the benchmark.

Negative variance means the budget price is below the benchmark.

### Variance Percent

#### Business Meaning

Variance Percent shows how far above or below benchmark the requested price is.

#### Formula

```text
Variance % = ((Budget Unit Price - Benchmark Price) / Benchmark Price) * 100
```

#### Example

```text
((420 - 390) / 390) * 100
= (30 / 390) * 100
= 7.69%
```

Displayed:

```text
+7.7%
```

### Potential Impact

#### Business Meaning

Potential Impact is the total financial difference between the budget request and the benchmark for the requested quantity.

#### Formula

```text
Potential Impact = (Budget Unit Price - Benchmark Price) * Quantity
```

#### Example

```text
(420 - 390) * 50
= 30 * 50
= 1,500
```

Potential Impact:

```text
SAR 1,500
```

### Potential Overspend

#### Business Meaning

Potential Overspend is the positive financial risk amount. It ignores savings.

#### Formula

```text
Potential Overspend = max(0, Potential Impact)
```

#### Example

```text
Potential Impact = SAR 1,500
Potential Overspend = SAR 1,500
```

If budget price is below benchmark:

```text
Potential Impact = -SAR 1,000
Potential Overspend = SAR 0
```

## 6. Benchmark Price Deep Dive

Benchmark Price is the most important price reference in the feature.

It is defined as:

```text
Benchmark Price = Median Historical Unit Cost
```

The benchmark is not average price.

### Why Median Was Chosen

Median is more resistant to outliers.

Example:

```text
Historical prices:
350, 380, 390, 410, 900
```

Average:

```text
(350 + 380 + 390 + 410 + 900) / 5 = 486
```

Median:

```text
390
```

In this example, SAR 900 may be an unusual purchase, different specification, emergency purchase, or data outlier. Average is pulled upward. Median better reflects the normal historical price.

### Example: Odd Number of Purchases

Historical prices:

```text
380, 390, 410
```

Sorted:

```text
380, 390, 410
```

Middle value:

```text
390
```

Benchmark Price:

```text
SAR 390
```

### Example: Even Number of Purchases

Historical prices:

```text
380, 390, 410, 420
```

Middle two values:

```text
390 and 410
```

Median:

```text
(390 + 410) / 2 = 400
```

Benchmark Price:

```text
SAR 400
```

### Example: Multiple ITEM_CODEs

Budget Type:

```text
Laptop
```

Mapped ITEM_CODEs:

```text
17819
17820
17821
```

Historical unit costs:

| ITEM_CODE | Unit Cost |
|---|---:|
| 17819 | 3,900 |
| 17819 | 4,000 |
| 17820 | 4,100 |
| 17821 | 4,200 |
| 17821 | 4,500 |

Sorted:

```text
3,900, 4,000, 4,100, 4,200, 4,500
```

Benchmark Price:

```text
SAR 4,100
```

The benchmark uses all included records across all active mapped ITEM_CODEs.

## 7. Variance Calculation

Variance shows how different the proposed budget unit price is from the Benchmark Price.

Formula:

```text
Variance % = ((Budget Price - Benchmark Price) / Benchmark Price) * 100
```

### Example A: Budget Price Above Benchmark

Budget Price:

```text
SAR 420
```

Benchmark:

```text
SAR 390
```

Step 1:

```text
Budget Price - Benchmark Price
= 420 - 390
= 30
```

Step 2:

```text
30 / 390
= 0.0769
```

Step 3:

```text
0.0769 * 100
= 7.69%
```

Displayed:

```text
+7.7%
```

Interpretation:

The requested price is 7.7% above historical benchmark.

### Example B: Budget Price Below Benchmark

Budget Price:

```text
SAR 360
```

Benchmark:

```text
SAR 390
```

Calculation:

```text
((360 - 390) / 390) * 100
= (-30 / 390) * 100
= -7.69%
```

Displayed:

```text
-7.7%
```

Interpretation:

The requested price is below historical benchmark. This may represent savings or a lower-specification item.

### Example C: Budget Price Equals Benchmark

Budget Price:

```text
SAR 390
```

Benchmark:

```text
SAR 390
```

Calculation:

```text
((390 - 390) / 390) * 100
= 0%
```

Displayed:

```text
0.0%
```

Interpretation:

The requested price exactly matches historical benchmark.

## 8. Potential Overspend

Potential Overspend is one of the most important CFO-facing values.

It translates a unit price difference into total budget risk.

Formula:

```text
Potential Impact = (Budget Unit Price - Benchmark Price) * Quantity
Potential Overspend = max(0, Potential Impact)
```

### Why CFOs Care

A small unit price difference can become significant when multiplied by quantity.

Example:

```text
Unit difference = SAR 30
Quantity = 50
Potential Overspend = SAR 1,500
```

This helps finance leadership focus on material risk, not just percentage variance.

### Example A: Positive Overspend

Budget Unit Price:

```text
SAR 420
```

Benchmark:

```text
SAR 390
```

Quantity:

```text
50
```

Step 1:

```text
420 - 390 = 30
```

Step 2:

```text
30 * 50 = 1,500
```

Potential Overspend:

```text
SAR 1,500
```

Interpretation:

If historical benchmark is a reasonable reference, approving this item at SAR 420 may create SAR 1,500 of avoidable budget exposure.

### Example B: Price Below Benchmark

Budget Unit Price:

```text
SAR 360
```

Benchmark:

```text
SAR 390
```

Quantity:

```text
50
```

Potential Impact:

```text
(360 - 390) * 50 = -1,500
```

Potential Overspend:

```text
SAR 0
```

Interpretation:

There is no overspend risk. The item is below historical benchmark. The approver may still verify that specifications are comparable.

### Example C: Large Quantity Amplifies Risk

Budget Unit Price:

```text
SAR 15 above benchmark
```

Quantity:

```text
1,000
```

Potential Overspend:

```text
15 * 1,000 = SAR 15,000
```

Interpretation:

Even moderate unit variance can matter when volume is high.

## 9. Risk Classification

Risk status is based on Variance Percent.

If no benchmark exists, status is No Benchmark Available.

| Status | Color Meaning | Threshold | Business Meaning |
|---|---|---:|---|
| Within Benchmark | Green | Variance <= 5% | Price is aligned with history. |
| Review Price | Yellow | > 5% and <= 15% | Price is moderately above benchmark. |
| Significant Variance | Orange | > 15% and <= 30% | Price is materially above benchmark. |
| High Overspend Risk | Red | > 30% | Price is far above benchmark. |
| No Benchmark Available | Gray | No benchmark | Not enough mapped history. |

### Within Benchmark

Threshold:

```text
Variance <= 5%
```

Meaning:

The price is close to historical benchmark.

Recommended action:

Proceed with normal review. Check quantity and business justification.

### Review Price

Threshold:

```text
Variance > 5% and <= 15%
```

Meaning:

The price is above benchmark but not extreme.

Recommended action:

Ask whether inflation, specification changes, supplier change, or delivery requirements explain the variance.

### Significant Variance

Threshold:

```text
Variance > 15% and <= 30%
```

Meaning:

The requested price is materially above historical benchmark.

Recommended action:

Require explanation, compare recent purchases, and consider Procurement review.

### High Overspend Risk

Threshold:

```text
Variance > 30%
```

Meaning:

The requested price is significantly above historical benchmark and may represent a high financial risk.

Recommended action:

Escalate review. Confirm specifications, supplier conditions, and whether the budget should be revised.

### No Benchmark Available

Threshold:

```text
No historical benchmark exists
```

Meaning:

The system cannot determine price reasonableness from current mapping and historical data.

Recommended action:

Use manual review and consider creating or correcting PO item mappings.

## 10. Approval Guidance

Price Intelligence supports decision-making. It does not automatically approve or reject items.

### If Item Is Green: Within Benchmark

Approver should think:

```text
The requested price is consistent with historical purchases.
```

Recommended checks:

- Is the requested quantity justified?
- Is the department need valid?
- Is the budget total acceptable?

Example:

```text
Benchmark = SAR 390
Budget Price = SAR 400
Variance = +2.6%
Status = Within Benchmark
```

Likely action:

Approve if business need and quantity are reasonable.

### If Item Is Yellow: Review Price

Approver should think:

```text
The price is somewhat above history. It may be reasonable, but should be checked.
```

Recommended checks:

- Has supplier pricing changed?
- Is the specification upgraded?
- Is this a different quality level?
- Is there inflation or urgent delivery?

Example:

```text
Benchmark = SAR 390
Budget Price = SAR 420
Variance = +7.7%
Status = Review Price
```

Likely action:

Approve with justification, request clarification, or ask Procurement to confirm.

### If Item Is Orange: Significant Variance

Approver should think:

```text
The price is materially above historical benchmark.
```

Recommended checks:

- Require written justification.
- Review recent historical purchases.
- Check supplier count and evidence strength.
- Consider reducing budget price.

Example:

```text
Benchmark = SAR 390
Budget Price = SAR 480
Variance = +23.1%
Status = Significant Variance
```

Likely action:

Return for revision unless a strong justification exists.

### If Item Is Red: High Overspend Risk

Approver should think:

```text
This item may create substantial avoidable overspend.
```

Recommended checks:

- Escalate to CFO or Procurement Manager.
- Verify item specification.
- Compare recent PO records.
- Require department explanation.
- Consider rejecting or returning the budget item.

Example:

```text
Benchmark = SAR 390
Budget Price = SAR 550
Variance = +41.0%
Status = High Overspend Risk
```

Likely action:

Return for revision unless there is strong evidence supporting the higher price.

### If No Benchmark Is Available

Approver should think:

```text
The system cannot provide historical price evidence for this item.
```

Recommended checks:

- Review manually.
- Ask Procurement whether historical ITEM_CODE mappings exist.
- Consider creating mappings for future approvals.

## 11. Drawer Explanation

The Details drawer explains how the benchmark was calculated.

### Budget Information

#### Budget Type

Meaning:

The budget item type being reviewed, such as Laptop or Office Chair.

Source:

`BS_budget_items.type_id` joined to `BS_budget_types`.

Why it matters:

The Budget Type determines which PO item mappings are used.

#### Category

Meaning:

The budget category for the item.

Source:

`BS_budget_categories`.

Why it matters:

It provides business grouping and context.

#### Department

Meaning:

The department that submitted the budget.

Source:

`BS_budgets.department_id` joined to `BS_departments`.

Why it matters:

It identifies ownership of the request.

#### Financial Year

Meaning:

The financial year for the submitted budget.

Source:

`BS_budgets.financial_year_id` joined to `BS_financial_years`.

Why it matters:

Approval decisions are tied to a budget year.

#### Budget Quantity

Meaning:

The quantity requested by the department.

Source:

`BS_budget_items.quantity`.

Why it matters:

Quantity multiplies price variance into financial impact.

#### Budget Unit Price

Meaning:

The requested price per unit.

Source:

`BS_budget_items.unit_price`.

Why it matters:

It is compared against the Benchmark Price.

#### Budget Total

Meaning:

The total requested amount for the item.

Formula:

```text
Budget Total = Quantity * Budget Unit Price
```

Source:

`BS_budget_items.total_amount`.

Why it matters:

It shows total budget exposure.

### Benchmark Summary

#### Status

Meaning:

Risk classification based on variance from benchmark.

Source:

Calculated by Price Intelligence.

Why it matters:

It tells the approver how much review attention the item needs.

#### Benchmark Method

Meaning:

The method used to calculate benchmark.

Current value:

```text
Median historical unit cost
```

Why it matters:

It explains why the benchmark may differ from average.

#### Historical Benchmark

Meaning:

The median historical unit cost.

Source:

Historical PO records for active mapped ITEM_CODE values.

Why it matters:

It is the main price reference.

#### Variance Amount

Formula:

```text
Budget Unit Price - Historical Benchmark
```

Why it matters:

It shows unit-level difference.

#### Variance %

Formula:

```text
((Budget Unit Price - Historical Benchmark) / Historical Benchmark) * 100
```

Why it matters:

It normalizes difference into percentage.

#### Potential Overspend

Formula:

```text
max(0, (Budget Unit Price - Historical Benchmark) * Quantity)
```

Why it matters:

It shows the CFO-facing financial risk.

### Historical Procurement Data

#### Historical Purchases

Meaning:

Number of historical PO records used.

Why it matters:

More records usually mean stronger evidence.

#### Suppliers

Meaning:

Number of distinct suppliers in the historical dataset.

Why it matters:

Multiple suppliers reduce dependency on one vendor's pricing.

#### Evidence Window

Meaning:

Which time range was used.

Possible values:

| Value | Meaning |
|---|---|
| Last 24 months | Recent historical data exists and was used. |
| All available history | No recent records existed, so older history was used. |

#### Mapped Item Codes

Meaning:

Active ITEM_CODE values used to gather historical records.

Why it matters:

It lets users verify whether the benchmark is based on the right procurement item codes.

### Price Statistics

#### Median

Same as Historical Benchmark.

#### Average

Arithmetic mean of historical unit costs.

#### Minimum

Lowest historical unit cost.

#### Maximum

Highest historical unit cost.

#### Last Purchase

Most recent historical unit cost.

#### Last Purchase Date

Date of the most recent historical purchase in the scoped dataset.

### Recent Historical Purchases

Meaning:

A limited table of recent PO records used as evidence.

Fields:

| Field | Meaning |
|---|---|
| Date | PO record creation date. |
| Supplier | Supplier name from historical PO data. |
| Item Code | Procurement ITEM_CODE. |
| Description | Historical item description. |
| Quantity | Historical PO quantity. |
| Unit Cost | Historical unit cost. |

Why it matters:

Approvers can inspect the actual records behind the benchmark.

## 12. Complete End-to-End Examples

### Example 1: Office Chair

Budget item:

| Field | Value |
|---|---:|
| Budget Type | Office Chair |
| Quantity | 50 |
| Budget Unit Price | SAR 420 |

Mappings:

| ITEM_CODE | Source | Active? |
|---|---|---|
| 2102030060 | MANUAL | Yes |
| 2102030061 | APPROVED_LINK | Yes |

Historical PO records:

| PO | ITEM_CODE | Date | Supplier | Unit Cost |
|---|---|---|---|---:|
| PO #1 | 2102030060 | 2025 | Supplier A | 350 |
| PO #2 | 2102030060 | 2025 | Supplier A | 380 |
| PO #3 | 2102030061 | 2026 | Supplier B | 390 |
| PO #4 | 2102030061 | 2026 | Supplier C | 410 |
| PO #5 | 2102030060 | 2026 | Supplier C | 430 |

Sorted unit costs:

```text
350, 380, 390, 410, 430
```

Benchmark:

```text
Median = 390
```

Average:

```text
(350 + 380 + 390 + 410 + 430) / 5
= 1,960 / 5
= 392
```

Minimum:

```text
350
```

Maximum:

```text
430
```

Variance:

```text
((420 - 390) / 390) * 100
= 7.69%
```

Potential Overspend:

```text
(420 - 390) * 50
= 30 * 50
= SAR 1,500
```

Risk:

```text
Review Price
```

Reason:

Variance is greater than 5% and less than or equal to 15%.

### Example 2: Laptop

Budget item:

| Field | Value |
|---|---:|
| Budget Type | Laptop |
| Quantity | 20 |
| Budget Unit Price | SAR 4,200 |

Mappings:

| ITEM_CODE | Source | Active? |
|---|---|---|
| 17819 | MANUAL | Yes |
| 17820 | APPROVED_LINK | Yes |
| 17821 | APPROVED_LINK | Yes |

Historical PO records:

| PO | ITEM_CODE | Supplier | Unit Cost |
|---|---|---|---:|
| PO #1 | 17819 | Supplier A | 3,800 |
| PO #2 | 17819 | Supplier A | 3,900 |
| PO #3 | 17820 | Supplier B | 4,000 |
| PO #4 | 17821 | Supplier C | 4,100 |
| PO #5 | 17821 | Supplier C | 4,500 |

Sorted unit costs:

```text
3,800, 3,900, 4,000, 4,100, 4,500
```

Benchmark:

```text
SAR 4,000
```

Average:

```text
(3,800 + 3,900 + 4,000 + 4,100 + 4,500) / 5
= 20,300 / 5
= 4,060
```

Variance:

```text
((4,200 - 4,000) / 4,000) * 100
= 5%
```

Potential Overspend:

```text
(4,200 - 4,000) * 20
= 200 * 20
= SAR 4,000
```

Risk:

```text
Within Benchmark
```

Reason:

Variance is equal to 5%, which remains within benchmark.

### Example 3: Medical Equipment

Budget item:

| Field | Value |
|---|---:|
| Budget Type | Patient Monitor |
| Quantity | 10 |
| Budget Unit Price | SAR 18,000 |

Mappings:

| ITEM_CODE | Source | Active? |
|---|---|---|
| PM-8840 | MANUAL | Yes |
| PM-8841 | APPROVED_LINK | Yes |

Historical PO records:

| PO | ITEM_CODE | Supplier | Unit Cost |
|---|---|---|---:|
| PO #1 | PM-8840 | Supplier A | 12,000 |
| PO #2 | PM-8840 | Supplier B | 12,500 |
| PO #3 | PM-8841 | Supplier B | 13,000 |
| PO #4 | PM-8841 | Supplier C | 13,500 |

Sorted unit costs:

```text
12,000, 12,500, 13,000, 13,500
```

Benchmark:

```text
(12,500 + 13,000) / 2
= 12,750
```

Variance:

```text
((18,000 - 12,750) / 12,750) * 100
= 41.18%
```

Potential Overspend:

```text
(18,000 - 12,750) * 10
= 5,250 * 10
= SAR 52,500
```

Risk:

```text
High Overspend Risk
```

Recommended action:

Escalate for review. Confirm whether the requested equipment has a different specification, warranty, supplier package, or clinical requirement.

## 13. Edge Cases

### No Mappings

Condition:

No active `BS_PO_ITEM_MAPPINGS` rows exist for the Budget Type.

System displays:

```text
No Benchmark Available
```

Benchmark:

```text
null
```

Variance:

```text
null
```

Potential Overspend:

```text
SAR 0
```

Drawer message:

The drawer explains that no active PO item mappings exist.

### No PO History

Condition:

Active mappings exist, but no matching historical PO records exist.

System displays:

```text
No Benchmark Available
```

Drawer message:

Active mappings exist, but no purchase records were found for the mapped item codes.

### One PO Only

Condition:

Only one historical PO record is available.

Behavior:

```text
Median = that one unit cost
Average = that one unit cost
Minimum = that one unit cost
Maximum = that one unit cost
Purchase Count = 1
```

Evidence Strength:

```text
LOW
```

Interpretation:

The benchmark exists but should be interpreted carefully.

### One Supplier Only

Condition:

Historical records exist but all are from one supplier.

Behavior:

Supplier Count:

```text
1
```

Evidence Strength cannot be HIGH because HIGH requires at least two suppliers.

Interpretation:

The benchmark may reflect one supplier's pricing rather than broader procurement behavior.

### Extreme Outlier Prices

Condition:

Historical records include unusually high or low prices.

Example:

```text
350, 380, 390, 410, 900
```

Behavior:

Median:

```text
390
```

Average:

```text
486
```

Interpretation:

Median protects the benchmark from being overly distorted by the outlier.

### Disabled Mappings

Condition:

A mapping exists but `is_active = 0`.

Behavior:

The mapping is excluded from benchmark calculations.

Interpretation:

Administrators can disable mappings that are incorrect or no longer relevant.

### Missing Benchmark

Condition:

No usable historical benchmark can be calculated.

Common causes:

- no active mappings
- active mappings but no PO history
- historical PO rows have zero or null unit cost

Behavior:

Status:

```text
No Benchmark Available
```

Variance:

```text
not calculated
```

Overspend:

```text
SAR 0
```

## 14. Frequently Asked Questions

### Why is benchmark different from average?

Benchmark uses median, not average.

Median is less affected by outliers.

Example:

```text
350, 380, 390, 410, 900
Average = 486
Median = 390
```

The system uses SAR 390 as benchmark because it better represents the typical historical price.

### Why is an item marked red?

An item is marked High Overspend Risk when:

```text
Variance % > 30%
```

This means the requested unit price is more than 30% above historical benchmark.

### Why is my budget price higher than historical price?

Possible reasons:

- inflation
- upgraded specification
- different supplier
- warranty or service package
- urgent delivery
- low historical price was unusual
- incorrect mapping

The approver should review the drawer details and request justification if needed.

### Why is there no benchmark?

Common reasons:

- no active mapping exists for the Budget Type
- mappings exist but no historical PO records match
- historical records have missing or zero unit cost

### How are mappings maintained?

Mappings are maintained through the PO Item Mapping Management page.

Administrators can:

- create mappings manually
- disable mappings
- review manual and learned mappings together

### How does auto-learning work?

When a PO link is approved, the system learns the relationship between:

```text
Budget Type
and
PO ITEM_CODE
```

If the mapping does not exist, it is created as:

```text
APPROVED_LINK
```

If it already exists, the learning count and last learned date are updated.

### Does Price Intelligence use only approved PO links?

No.

Approved PO links help create or update mappings, but benchmark calculations use:

```text
BS_PO_ITEM_MAPPINGS
BS_Purchase_Invoices_For_Budget
```

The benchmark is not calculated directly from `BS_PO_LINKS`.

### Are manual and learned mappings weighted differently?

No.

For benchmark calculation, both are treated equally if active.

### Does the system use external market data?

No.

Phase 1 uses QNH historical procurement data only.

## 15. Data Sources Reference

### BS_budget_items

Role:

Stores submitted budget line items.

Used fields:

| Field | Purpose |
|---|---|
| id | Identifies the budget item. |
| type_id | Links the budget item to its Budget Type. |
| quantity | Used in potential impact and overspend. |
| unit_price | Compared against benchmark. |
| total_amount | Displayed as budget total. |
| is_active | Ensures inactive items are excluded. |

### BS_budget_types

Role:

Defines master budget item types such as Laptop, Office Chair, Patient Monitor.

Used fields:

| Field | Purpose |
|---|---|
| id | Used to match mappings. |
| name | Displayed as Budget Type. |
| category_id | Used for category display. |
| expense_type | Displayed for context. |

### BS_PO_ITEM_MAPPINGS

Role:

Source of truth for connecting Budget Types to procurement ITEM_CODE values.

Used fields:

| Field | Purpose |
|---|---|
| budget_type_id | Connects mapping to Budget Type. |
| po_item_code | Historical procurement ITEM_CODE. |
| po_item_description | Description for administration and audit. |
| mapping_source | MANUAL or APPROVED_LINK. |
| is_active | Determines whether mapping participates in analysis. |
| learned_count | Supports mapping history, not benchmark weighting. |
| last_learned_at | Supports mapping history, not benchmark weighting. |

### BS_Purchase_Invoices_For_Budget

Role:

Historical procurement source table.

Used fields:

| Field | Purpose |
|---|---|
| ID | Identifies historical PO line. |
| ITEM_CODE | Matched against mapped PO item codes. |
| ITEM_DESC | Displayed in drawer. |
| PARENT_ITEM_NAME | Displayed in drawer where available. |
| SUPPLIER_NAME_EN | Used for supplier count and drawer display. |
| QTY | Displayed in recent purchases. |
| UNIT_COST | Main input to all price calculations. |
| NET_AMOUNT | Displayed where available. |
| CREATED_AT | Used for evidence window and last purchase. |

### BS_PO_LINKS

Role:

Audit history and learning source.

Price Intelligence does not calculate benchmarks directly from this table.

It contributes indirectly because approved PO links can create or update mappings in `BS_PO_ITEM_MAPPINGS`.

## 16. Formula Reference Sheet

### Benchmark Price

```text
Benchmark Price = Median Historical Unit Cost
```

### Median: Odd Number of Records

```text
Median = Middle value after sorting unit costs ascending
```

### Median: Even Number of Records

```text
Median = Average of the two middle values
```

### Average Price

```text
Average Price = Sum(Historical Unit Costs) / Purchase Count
```

### Minimum Price

```text
Minimum Price = MIN(Historical Unit Cost)
```

### Maximum Price

```text
Maximum Price = MAX(Historical Unit Cost)
```

### Last Purchase Price

```text
Last Purchase Price = Unit Cost of most recent included PO record
```

### Purchase Count

```text
Purchase Count = Number of included historical PO records
```

### Supplier Count

```text
Supplier Count = Number of distinct non-empty supplier names
```

### Variance Amount

```text
Variance Amount = Budget Unit Price - Benchmark Price
```

### Variance Percent

```text
Variance % = ((Budget Unit Price - Benchmark Price) / Benchmark Price) * 100
```

### Potential Impact

```text
Potential Impact = (Budget Unit Price - Benchmark Price) * Quantity
```

### Potential Overspend

```text
Potential Overspend = max(0, Potential Impact)
```

### Items Analyzed

```text
Items Analyzed = Count of budget items with an available benchmark
```

### Missing Benchmarks

```text
Missing Benchmarks = Count of budget items with no available benchmark
```

### High Risk Items

```text
High Risk Items = Count of items where Status = High Overspend Risk
```

### Evidence Strength

```text
HIGH =
  Purchase Count >= 10
  and Supplier Count >= 2
  and Last Purchase Age <= 24 months

MEDIUM =
  Purchase Count >= 3
  and Last Purchase Age <= 36 months

LOW =
  Purchase Count >= 1

NONE =
  Purchase Count = 0
```

### Risk Status

```text
No Benchmark Available:
  no benchmark exists

Within Benchmark:
  Variance <= 5%

Review Price:
  Variance > 5% and <= 15%

Significant Variance:
  Variance > 15% and <= 30%

High Overspend Risk:
  Variance > 30%
```

### Historical Dataset Rule

```text
Dataset =
  Historical PO records where:
    ITEM_CODE is in active mappings for the Budget Type
    and UNIT_COST is not null
    and UNIT_COST > 0

If recent records exist in the last 24 months:
  use only last 24 months

Otherwise:
  use all available matching history
```
