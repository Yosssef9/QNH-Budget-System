# Business Rules

This document records business rules verified from the source code only.

Primary source files:

- `server/services/financialYears.service.js`
- `server/services/budgets.service.js`
- `server/services/budgetApproval.service.js`
- `server/services/budgetItems.service.js`
- `server/services/budgetBalance.service.js`
- `server/services/transfer.service.js`
- `server/services/po.service.js`
- `server/services/itemRequest.service.js`
- `server/services/category.service.js`
- `server/helpers/distribution.helper.js`
- `server/helpers/validateBudgetModifyPermission.js`
- `server/validators/*.validator.js`
- Related repositories under `server/repositories/`

## Financial Year Rules

### Create Financial Year

Source: `server/services/financialYears.service.js`

A financial year can be created only when:

- The requested year does not already exist.
- The requested year is the next sequential year after the latest existing year.
- There is no active financial year.

An active financial year is defined by repository logic as a financial year with status:

- `OPEN`
- `PRE_CLOSING`

When a financial year is created:

- It is created with status `OPEN`.
- Draft budgets are created for all active departments.
- A `FINANCIAL_YEAR_OPENED` notification is queued.

### Pre-Close Financial Year

Source: `server/services/financialYears.service.js`

A financial year can be moved to `PRE_CLOSING` only when:

- The financial year exists.
- The financial year status is `OPEN`.
- The financial year has at least one active budget.
- All active budgets for the financial year are approved.

The repository counts active budgets whose status is not `APPROVED`.

When pre-closing succeeds:

- The financial year status is updated to `PRE_CLOSING`.
- A `FINANCIAL_YEAR_PRE_CLOSING` notification is queued.

### Close Financial Year

Source: `server/services/financialYears.service.js`

A financial year can be closed only when:

- The financial year exists.
- The financial year status is `PRE_CLOSING`.
- The financial year has at least one active budget.
- All active budgets for the financial year are approved.
- There are no pending transfer requests for the financial year.
- There are no unfinished PO links for the financial year.

Pending transfer statuses checked by repository logic:

- `PENDING`
- `PENDING_APPROVAL`

Unfinished PO links are checked in `BS_PO_LINKS` with status:

- `PENDING`

When closing succeeds:

- The financial year status is updated to `CLOSED`.
- A `FINANCIAL_YEAR_CLOSED` notification is queued.

## Budget Rules

### Current Budget

Source: `server/services/budgets.service.js`

The current budget lookup uses the latest financial year from repository logic.

For global users:

- A department must be provided.
- If no department is provided, the service throws `DEPARTMENT_REQUIRED`.

A global user is treated as one of:

- `isGlobalAdmin`
- user with `can_approve_budget`

For non-global users:

- The user must have a department.
- The budget is loaded for the user's department.

If no matching budget exists, the service throws `CURRENT_BUDGET_NOT_FOUND`.

### Create Budget

Source: `server/services/budgets.service.js`

A budget can be created only when:

- There is an open financial year.
- A department is available from request body or user context.
- The department exists and is active.
- A non-global user is creating a budget only for their own department.

If a budget already exists for the same department and financial year:

- Existing `DRAFT` or `RETURNED` budgets are returned with `alreadyExists: true`.
- Other existing statuses cause `BUDGET_ALREADY_EXISTS`.

New budgets are created with status:

- `DRAFT`

### Submit Budget

Source: `server/services/budgets.service.js`

A budget can be submitted only when:

- The budget exists.
- The financial year status is `OPEN`.
- The budget status is `DRAFT` or `RETURNED`.
- A non-global user belongs to the budget department.
- The budget has at least one active item.

When submission succeeds:

- The budget status is updated to `PENDING_APPROVAL`.
- A `BUDGET_SUBMITTED` notification is queued.

## Budget Approval Rules

### Pending Budgets

Source: `server/services/budgetApproval.service.js`

Pending budget lookup uses the latest financial year.

If no financial year exists:

- The service returns an empty array.

### Approve Budget

Source: `server/services/budgetApproval.service.js`

A budget can be approved only when:

- The budget exists.
- The related financial year status is `OPEN`.
- The budget status is `PENDING_APPROVAL`.

When approval succeeds:

- The budget is approved.
- Optional general approval notes are stored as `GENERAL_APPROVAL`.
- Optional item approval notes are stored as `ITEM_APPROVAL`.
- A `BUDGET_APPROVED` notification is queued.

### Return Budget

Source: `server/services/budgetApproval.service.js`

A budget can be returned only when:

- A general return note is provided.
- The budget exists.
- The related financial year status is `OPEN`.
- The budget status is `PENDING_APPROVAL`.

When return succeeds:

- The budget is returned.
- The general note is stored as `GENERAL_RETURN`.
- Optional item notes are stored as `ITEM_RETURN`.
- A `BUDGET_RETURNED` notification is queued.

## Budget Item Rules

### Create Budget Item

Source:

- `server/services/budgetItems.service.js`
- `server/validators/budgetItems.validator.js`
- `server/helpers/distribution.helper.js`

A budget item can be created only when:

- The budget exists.
- The financial year status is `OPEN`.
- The budget status is `DRAFT` or `RETURNED`.
- The user has permission to modify the budget.
- The item type exists.
- The same item type does not already exist in the budget.

A non-global user can modify only their own department budget.

A global user is treated as one of:

- `isGlobalAdmin`
- user with `can_approve_budget`

The item total amount is calculated as:

```text
quantity * unit_price
```

### Budget Item Validation

Source: `server/validators/budgetItems.validator.js`

Budget item validation requires:

- `type_id` must be a positive integer.
- `quantity` must be a positive number.
- `unit_price` must be a positive number.
- Distribution method must be one of:
  - `MONTHLY`
  - `QUARTERLY`
  - `ANNUAL`
  - `CUSTOM`
- Distribution level must be one of:
  - `MONTH`
  - `QUARTER`
  - `YEAR`

### Distribution Rules

Source: `server/helpers/distribution.helper.js`

Annual distribution:

- Requires level `YEAR`.
- Does not create distribution rows.

Monthly distribution:

- Requires level `MONTH`.
- Automatically distributes quantity across 12 periods.

Quarterly distribution:

- Requires level `QUARTER`.
- Automatically distributes quantity across 4 periods.

Custom distribution:

- Requires level `MONTH` or `QUARTER`.
- Monthly period numbers must be between 1 and 12.
- Quarterly period numbers must be between 1 and 4.
- Custom distribution quantities cannot be negative.
- The total custom distribution quantity must equal the item quantity.

### Modify Budget Item

Source:

- `server/services/budgetItems.service.js`
- `server/helpers/validateBudgetModifyPermission.js`

Budget items can be deleted or replaced only when:

- The budget exists.
- The financial year status is `OPEN`.
- The budget status is `DRAFT` or `RETURNED`.
- The user has permission to modify the budget.

## Budget Balance Rules

Source:

- `server/services/budgetBalance.service.js`
- `server/repositories/budgetBalance.repository.js`

Budget item balance is calculated from:

- Approved budget item amount.
- Approved budget item quantity.
- Approved transfer-in amount.
- Approved transfer-out amount.
- Approved transfer-in quantity.
- Approved transfer-out quantity.
- PO-used amount.

The calculated fields are:

```text
remainingAmount = approvedAmount + transferIn - transferOut - poUsed
netTransfer = transferIn - transferOut
remainingQuantity = approvedQuantity + transferInQuantity - transferOutQuantity
availableForTransfer = max(0, remainingAmount)
availableForTransferQuantity = max(0, remainingQuantity)
isExceeded = remainingAmount < 0
```

If the item does not exist, balance calculation fails.

## Transfer Rules

Source: `server/services/transfer.service.js`

### Create Transfer

A transfer can be created only when:

- The source budget item exists.
- The source item unit price is greater than zero.
- The source budget status is `APPROVED`.
- The source financial year status is `PRE_CLOSING`.

For an existing-item transfer:

- The source and target item must be different.
- The target item must exist.
- The target budget status must be `APPROVED`.
- The source and target items must belong to the same financial year.

For a new-item transfer:

- The new item type is required.
- The new item quantity must be greater than zero.
- The new item unit price must be greater than zero.
- The item type must not already exist in the source budget.
- There must be no pending new-item transfer for the same budget and item type.

For quantity-mode transfers:

- `transfer_quantity` must be greater than zero.
- Transfer amount is calculated as:

```text
transfer_quantity * source_unit_price
```

For amount-mode transfers:

- Amount must be greater than zero.
- Transfer quantity is calculated as:

```text
amount / source_unit_price
```

The source item must have enough:

- Available transfer amount.
- Remaining quantity.

Existing-item transfers also check for pending transfer locks involving the source or target item.

When a transfer is created:

- The transfer status is `PENDING_APPROVAL`.
- A `TRANSFER_CREATED` notification is queued.

### Approve Transfer

A transfer can be approved only when:

- The transfer exists.
- The transfer status is `PENDING_APPROVAL`.
- The source item still has enough available amount.
- The source item still has enough remaining quantity.

When approving a new-item transfer:

- The service checks again that the item type does not already exist in the budget.
- A new budget item is created.
- The new item uses:
  - distribution method `MONTHLY`
  - distribution level `MONTH`

When approval succeeds:

- The transfer status is updated to `APPROVED`.
- A `TRANSFER_APPROVED` notification is queued.

### Reject Transfer

A transfer can be rejected only when:

- The transfer exists.
- The transfer status is `PENDING_APPROVAL`.
- A rejection note is provided.

When rejection succeeds:

- The transfer status is updated to `REJECTED`.
- A `TRANSFER_REJECTED` notification is queued.

### Transfer Dashboard

Source: `server/services/transfer.service.js`

Dashboard mode is selected from user context:

- Approvers use `APPROVER_PENDING`.
- Non-approvers use `REQUESTER_HISTORY`.

## Purchase Order Rules

Source:

- `server/services/po.service.js`
- `server/validators/po.validator.js`
- `server/repositories/po.repository.js`

### PO Link Validation

Creating a PO link requires:

- `PURCHASE_INVOICE_LINE_ID` as a positive integer.
- `budget_item_id` as a positive integer.
- `requested_qty` as a positive number.

Rejecting a PO link requires:

- `reason`
- Maximum reason length: 1000 characters.

PO status filters allow:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `ALL`

### Create PO Link

A PO link can be created only when:

- The PO record exists.
- The budget item exists.
- There is no pending PO link for the same PO record and budget item.
- Requested quantity is greater than zero.
- The budget item status is `APPROVED`.
- The related financial year exists.
- The related financial year status is `PRE_CLOSING`.

The requested quantity must not exceed available PO quantity.

Available PO quantity is calculated from repository data as:

```text
PO quantity - approved linked quantity - pending linked quantity
```

The requested quantity must not exceed remaining budget item quantity.

Remaining budget item quantity is calculated as:

```text
budget item quantity - approved linked quantity - pending linked quantity
```

The linked amount is calculated as:

```text
requested quantity * PO unit cost
```

When a PO link is created:

- The PO link status is `PENDING`.
- A `PO_LINK_SUBMITTED` notification is queued.

### Approve PO Link

A PO link can be approved only when:

- The PO link exists.
- The PO link status is `PENDING`.
- The PO record exists.
- The budget item exists.
- The related financial year exists.
- The related financial year status is `PRE_CLOSING`.

Before approval, the service recalculates:

- Available PO quantity.
- Remaining budget item quantity.

The current link quantity is added back during recalculation.

When approval succeeds:

- The PO link status is updated to `APPROVED`.
- A `PO_LINK_APPROVED` notification is queued.

### Reject PO Link

A PO link can be rejected only when:

- A reason is provided.
- The PO link exists.
- The PO link status is `PENDING`.

When rejection succeeds:

- The PO link status is updated to `REJECTED`.
- A `PO_LINK_REJECTED` notification is queued.

## Item Request Rules

Source:

- `server/services/itemRequest.service.js`
- `server/validators/itemRequest.validator.js`

### Create Item Request

An item request requires:

- Requested type name.
- Either an existing category ID or a new category name.
- Expense type.

Expense type must be one of:

- `OPEX`
- `CAPEX`

When an item request is created:

- A `ITEM_REQUEST_CREATED` notification is queued.

### Approve Item Request

An item request can be approved only when:

- The request exists.
- The request status is `PENDING`.

When approval succeeds:

- If no existing category ID is present, a new category is created.
- A new type is created.
- The request is approved.
- A `ITEM_REQUEST_APPROVED` notification is queued.

### Reject Item Request

An item request can be rejected only when:

- The request exists.
- The request status is `PENDING`.

When rejection succeeds:

- The request is rejected.
- A `ITEM_REQUEST_REJECTED` notification is queued.

## Category and Type Rules

Source:

- `server/services/category.service.js`
- `server/validators/category.validator.js`

### Category Rules

Category names are:

- Required for create and update operations.
- Trimmed.
- Whitespace-normalized.
- Required to be between 2 and 200 characters.

Creating a category:

- Rejects duplicate active category names.
- Reactivates an inactive category with the same name.
- Otherwise creates a new category.

Updating a category:

- Requires the category to exist.
- Rejects names already used by another category.

Deleting a category:

- Requires the category to exist.

### Type Rules

Type names are:

- Required for create and update operations.
- Trimmed.
- Whitespace-normalized.
- Required to be between 2 and 200 characters.

Type expense type must be one of:

- `OPEX`
- `CAPEX`

Creating a type:

- Requires the category to exist.
- Rejects duplicate active type names in the same category.
- Reactivates an inactive type with the same name in the category.
- Otherwise creates a new type.

Updating a type:

- Requires the category to exist.
- Requires the type to exist.
- Rejects duplicate names in the same category.
- Rejects expense type changes when the type is already used.

Deleting a type:

- Requires the type to exist.

## Budget Review Feedback Rules

Source: `server/services/budgetReviewFeedback.service.js`

Budget review feedback can be read only when:

- The budget owner exists.
- The user is global, or the user belongs to the budget department.

A global user is treated as one of:

- `isGlobalAdmin`
- user with `can_approve_budget`

Feedback is grouped from notes into:

- General return notes: `GENERAL_RETURN`
- Item return notes: `ITEM_RETURN`

## Notification Rules Referenced by Business Flows

Business services queue notifications for these events:

- `FINANCIAL_YEAR_OPENED`
- `FINANCIAL_YEAR_PRE_CLOSING`
- `FINANCIAL_YEAR_CLOSED`
- `BUDGET_SUBMITTED`
- `BUDGET_APPROVED`
- `BUDGET_RETURNED`
- `TRANSFER_CREATED`
- `TRANSFER_APPROVED`
- `TRANSFER_REJECTED`
- `PO_LINK_SUBMITTED`
- `PO_LINK_APPROVED`
- `PO_LINK_REJECTED`
- `ITEM_REQUEST_CREATED`
- `ITEM_REQUEST_APPROVED`
- `ITEM_REQUEST_REJECTED`

Notification delivery behavior is documented separately in `docs/notifications.md`.

## Source-Code Observations

The following observations are based on verified source code:

- `getCurrentBudgetService` loads the latest financial year, not specifically an open financial year.
- Budget approval stores approval notes outside the approval repository transaction flow.
- Budget return stores return status and return notes inside a transaction.
- `budgetBalance.repository.js` calculates PO-used amount from `BS_budget_po_links`, while the PO module uses `BS_PO_LINKS`.
- `getMyTransfersService` does not use the user and financial year arguments passed by the controller.
- PO link approval recalculates availability before approval and adds back the current pending link quantity during that recalculation.
