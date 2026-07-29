# CFO Meeting Brief - New Budget Workflow

This document is a short speaking aid for the meeting. It is not a technical spec.

## 1. Purpose

The new workflow moves budget review from the old department-by-department style to a clearer hospital workflow:

```text
HOD submits a department budget
-> Category Manager reviews and prepares the category package
-> CFO reviews the package
-> Execution starts after final approval
```

Why this matters:
- HODs request what they need.
- Category Managers turn those requests into real purchase models and package values.
- CFO reviews the final hospital package, not raw department drafts.

Simple example:
- A department asks for laptops.
- The Category Manager turns that into actual laptop models and prices.
- The CFO sees the laptop package total and the model breakdown behind it.

---

## 2. End-to-End Flow

### Step 1 - HOD submits a department budget

The HOD enters the generic need, quantity, and distribution.

Example:
- Laptop
- Quantity: 20
- Distribution: Monthly

The HOD does not enter:
- model
- unit price
- attachments
- vendor details

### Step 2 - Category Manager reviews the request

The Category Manager reviews the submitted items for one category, such as IT, Biomedical, or General.

Example:
- 20 requested laptops
- Category Manager approves 15
- 5 remain unapproved or need revision in the package process

### Step 3 - Category Manager prepares the package

The Category Manager chooses the actual sub-items or models.

Example:
- 5 General laptops
- 5 HP laptops
- 5 Dell laptops

### Step 4 - Category Manager closes the submission window

This stops new department submissions for that category so the package becomes stable.

Example:
- IT submission is closed
- No more IT requests can be added
- Biomedical and General may still be open if needed

### Step 5 - CFO reviews the final package

The CFO sees the final package, the totals, and the breakdown.

Example:
- IT laptop package total
- model list
- values
- notes
- status

### Step 6 - CFO approves or returns the package

The CFO can approve the package or return it for changes.

Example:
- Approve: package is ready to move forward
- Return: the Category Manager must fix specific package items

---

## 3. Why We Use Sub-Items

This is the most important concept to explain clearly.

The HOD requests the generic item.
The Category Manager chooses the exact sub-item model.
The CFO sees both the total and the model details.

Why this is needed:
- Different laptop models have different prices.
- Different departments may request the same generic item.
- The system still needs one total hospital view.

Simple example:
- HOD asks for "Laptop"
- Category Manager selects:
  - HP EliteBook 840
  - Dell Latitude 5450
  - General Laptop
- CFO sees one laptop package total, plus the model split

Short explanation you can say in the meeting:
> The generic item is the request. The sub-item is the exact model we buy.

---

## 4. What a Sub-Item Means

A sub-item is the real purchasable model inside the package.

Example:
- Generic item: Laptop
- Sub-items:
  - HP EliteBook 840
  - Dell Latitude 5450
  - General Laptop

Why it matters:
- A laptop is not always the same price.
- One department may need a more expensive model.
- Another department may need a simpler model.

So the Category Manager enters:
- unit price
- attachments
- specification
- note

These belong to the sub-item, not the generic item.

---

## 5. Sub-Item Pricing and Attachments

Prices and documents are stored per sub-item because each model is independent.

Example:
- HP EliteBook 840
  - unit price: SAR 4,000
  - attachment: supplier quotation
- Dell Latitude 5450
  - unit price: SAR 3,500
  - attachment: technical sheet

Simple point:
- one generic item can have many sub-items
- each sub-item can have its own price and documents

---

## 6. Package Item Concept

The CFO does not approve each department line separately.

The CFO approves the hospital package item level.

Example:
- 3 departments requested laptops
- the Category Manager grouped them under one Laptop package item
- the CFO approves or returns that Laptop package item

Why this is useful:
- one decision covers all related laptop demand
- the CFO sees the full total in one place
- the package is easier to review than many separate department lines

---

## 7. Accepted vs Needs Modification

When the CFO returns the package, there are two important states:

- `CFO_ACCEPTED`
- `NEEDS_MODIFICATION`

What they mean:
- `CFO_ACCEPTED` means the item is locked
- `NEEDS_MODIFICATION` means the Category Manager must fix that item

Simple example:
- Laptop package item is accepted
- Printer package item needs modification
- The Category Manager can only change the printer item, not the accepted laptop item

Important rule:
- accepted items stay locked
- only need-modification items can be changed after return

---

## 8. Return to Category Manager

When the CFO returns a package, the Category Manager fixes only the items marked for modification.

Example:
- CFO says the laptop price is too high
- The Category Manager lowers the model price or adjusts the split
- The accepted items stay unchanged

What the Category Manager can do on returned items:
- change quantity
- choose a different model
- adjust the split
- update notes

What the Category Manager cannot do:
- edit accepted items
- reopen the whole package freely

Short phrase:
> The return is item-specific, not a free edit of the whole package.

---

## 9. View Changes

When the CFO opens `View Changes`, he sees what changed after the return.

Example:
- before: Laptop package item had one model split
- after: the Category Manager reduced quantity and changed the model
- reason: CFO asked for a lower cost

This helps the CFO understand:
- what the item looked like before
- what changed
- how the Category Manager fixed it

---

## 10. Submission Window

The submission window is a cutoff point for department submissions.

Why it exists:
- the Category Manager needs a final stable package
- the CFO should not review a moving target

Example:
- IT and Biomedical have already submitted
- General is still open
- the Category Manager closes IT submission before CFO review

After closure:
- no new IT department submission can be added
- the package becomes stable for CFO review

---

## 11. What the CFO Sees

The CFO needs a clear summary first, then details.

Suggested view:
- overall package status
- total amount
- package items
- item totals
- model breakdown
- notes
- return reason if the package came back

Short example:
- Total laptop package value
- approved quantity
- models used
- status: waiting for CFO or returned for changes

---

## 12. A Short Example Walk-Through

### Example

1. HOD requests 20 laptops.
2. Category Manager reviews the request.
3. Category Manager approves 15.
4. Category Manager splits the 15 across models:
   - 5 General
   - 5 HP
   - 5 Dell
5. The submission window closes.
6. The CFO reviews the laptop package item.
7. The CFO returns it because the total is too high.
8. The Category Manager changes the returned item.
9. The CFO opens `View Changes` and sees before vs after.

One-line summary:
> The HOD requests the need, the Category Manager builds the package, and the CFO approves the final hospital version.

---

## 13. Suggested Meeting Talking Order

Use this order if you want to explain it quickly:

1. Purpose of the workflow
2. HOD submission
3. Submission window
4. Category Manager review
5. Sub-item concept
6. Why sub-items exist
7. Sub-item pricing and attachments
8. Package item concept
9. CFO review
10. Accepted vs needs modification
11. Return to Category Manager
12. View Changes
13. Short example walk-through

---

## 14. Short Recap

If you want one short recap sentence:

> HODs request generic items, Category Managers choose the exact sub-items and package values, and the CFO reviews the final hospital package item by item.

