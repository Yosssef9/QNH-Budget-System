# PO Module

This document describes the Purchase Order linking module using verified source code only.

Primary source files:

- `server/routes/po.routes.js`
- `server/controllers/po.controller.js`
- `server/services/po.service.js`
- `server/repositories/po.repository.js`
- `server/validators/po.validator.js`
- `server/server.js`
- `server/middleware/permission.middleware.js`
- `server/middleware/verifyBudgetAccess.middleware.js`
- `server/repositories/userRole.repository.js`
- `server/repositories/notificationRecipients.repository.js`
- `server/notifications/notificationConfig.js`
- `server/notifications/templateResolver.js`
- `server/notifications/buildNotificationPayload.js`
- `server/notifications/templates/poLinkSubmitted.template.js`
- `server/notifications/templates/poLinkApproved.template.js`
- `server/notifications/templates/poLinkRejected.template.js`
- `client/src/api/po.api.js`
- `client/src/pages/POLinkingPage.jsx`
- `client/src/pages/POApprovalPage.jsx`
- `client/src/hooks/po/*.js`
- `client/src/components/po/*.jsx`

## Business Purpose

The PO module links Purchase Order quantities to approved budget items during the financial year pre-closing period.

Verified behavior:

- Users can view available PO records.
- Users can submit PO link requests.
- Users can view their own PO link requests.
- Approvers can view pending PO link requests.
- Approvers can approve PO link requests.
- Approvers can reject PO link requests.
- PO link activity contributes to financial year close restrictions.

The module stores PO link requests in `BS_PO_LINKS` and reads PO source data from `BS_Purchase_Invoices_For_Budget`.

## Backend Architecture

Source:

- `server/server.js`
- `server/routes/po.routes.js`
- `server/controllers/po.controller.js`
- `server/services/po.service.js`
- `server/repositories/po.repository.js`

Route registration:

```text
/api/po-links -> poRoutes
```

Request flow:

```text
Route
-> Controller
-> Service
-> Repository
-> MSSQL
```

The route module applies these middleware globally:

```text
verifyPortalJwt
verifyBudgetAccess
```

Each route then applies `requirePermission(...)`.

## Actors and Permissions

Source:

- `server/routes/po.routes.js`
- `server/middleware/permission.middleware.js`
- `server/middleware/verifyBudgetAccess.middleware.js`
- `server/repositories/userRole.repository.js`

Backend permission checks:

| Route                                   | Permission             |
| --------------------------------------- | ---------------------- |
| `GET /api/po-links/available-pos`       | `can_request_po_links` |
| `GET /api/po-links/my`                  | `can_request_po_links` |
| `GET /api/po-links/pending`             | `can_approve_po_links` |
| `POST /api/po-links`                    | `can_request_po_links` |
| `GET /api/po-links/po/:id/transparency` | `can_view_po_links`    |
| `GET /api/po-links/:id`                 | `can_view_po_links`    |
| `POST /api/po-links/:id/approve`        | `can_approve_po_links` |
| `POST /api/po-links/:id/reject`         | `can_approve_po_links` |

`requirePermission` checks:

```text
req.budgetAccess.permissions[permissionName]
```

If the permission is missing or false, the route returns HTTP 403.

`verifyBudgetAccess` loads budget access by user ID and attaches it to:

```text
req.budgetAccess
```

The active backend access resolver returns these PO permissions:

- `can_view_po_links`
- `can_request_po_links`
- `can_view_all_po_link_requests`
- `can_approve_po_links`

Global admin status is calculated in `userRole.repository.js` as:

```text
role_name === "ADMIN" && department_id === null
```

The PO route permission middleware does not separately check `isGlobalAdmin`; access depends on the resolved permission booleans.

## Complete PO Workflow

Source:

- `server/routes/po.routes.js`
- `server/controllers/po.controller.js`
- `server/services/po.service.js`
- `server/repositories/po.repository.js`
- `client/src/pages/POLinkingPage.jsx`
- `client/src/pages/POApprovalPage.jsx`

Main workflow:

1. A requester loads available PO records.
2. A requester selects a current budget item.
3. A requester selects an available PO record.
4. A requester enters requested quantity.
5. The frontend validates selected budget item, selected PO, positive quantity, available PO quantity, and remaining budget item quantity.
6. The requester submits the PO link request.
7. The backend validates PO record, budget item, pending duplicate link, requested quantity, budget item status, financial year status, PO quantity, and budget item quantity.
8. The backend creates a `PENDING` PO link in `BS_PO_LINKS`.
9. The backend queues `PO_LINK_SUBMITTED`.
10. An approver views pending PO links.
11. An approver approves or rejects the request.
12. Approval updates the link to `APPROVED` and queues `PO_LINK_APPROVED`.
13. Rejection updates the link to `REJECTED`, stores a rejection reason, and queues `PO_LINK_REJECTED`.

## Available PO Search Flow

Source:

- `client/src/api/po.api.js`
- `client/src/hooks/po/useAvailablePOs.js`
- `client/src/pages/POLinkingPage.jsx`
- `client/src/components/po/POLinkTable.jsx`
- `client/src/components/po/POLinkForm.jsx`
- `server/controllers/po.controller.js`
- `server/services/po.service.js`
- `server/repositories/po.repository.js`

Frontend API call:

```text
GET /api/po-links/available-pos
```

`useAvailablePOs(params)` calls `getAvailablePOs(params)` and uses React Query.

`POLinkingPage` calls `useAvailablePOs()` to show available PO records.

`POLinkForm` calls `useAvailablePOs({ search: poSearch || undefined })`.

Frontend search behavior:

- `POLinkTable` filters PO rows locally by:
  - order ID
  - item code
  - item description
  - supplier
- `POLinkForm` filters available PO rows locally by:
  - PO ID
  - item code
  - item description
  - supplier

Backend repository behavior:

- `getAvailablePurchaseInvoiceLinesRepo(filters = {})` accepts a filters parameter.
- The SQL query does not use the filters parameter.
- The query returns all rows from `BS_Purchase_Invoices_For_Budget`, ordered by `p.CREATED_AT DESC`.
- Approved, pending, and available quantities are calculated using `BS_PO_LINKS`.

Available quantity calculation:

```text
available_qty = QTY - approved_qty - pending_qty
```

Where:

- `approved_qty` is the sum of `BS_PO_LINKS.REQUESTED_QTY` for the PO record with status `APPROVED`.
- `pending_qty` is the sum of `BS_PO_LINKS.REQUESTED_QTY` for the PO record with status `PENDING`.

## PO Link Creation Flow

Source:

- `client/src/components/po/POLinkForm.jsx`
- `client/src/hooks/po/useCreatePOLink.js`
- `client/src/api/po.api.js`
- `server/controllers/po.controller.js`
- `server/services/po.service.js`
- `server/repositories/po.repository.js`

Frontend request payload:

```text
PURCHASE_INVOICE_LINE_ID
budget_item_id
requested_qty
```

Frontend create endpoint:

```text
POST /api/po-links
```

Backend service checks:

1. PO record exists.
2. Budget item exists.
3. No pending PO link already exists for the same PO record and budget item.
4. Requested quantity is greater than zero.
5. Budget item status is `APPROVED`.
6. Related financial year exists.
7. Related financial year status is `PRE_CLOSING`.
8. Requested quantity does not exceed available PO quantity.
9. Requested quantity does not exceed remaining budget item quantity.

Linked amount calculation:

```text
linked_amount = requested_qty * PO UNIT_COST
```

Repository insert:

```text
INSERT INTO BS_PO_LINKS
```

Inserted fields:

- `PURCHASE_INVOICE_LINE_ID`
- `BUDGET_ID`
- `BUDGET_ITEM_ID`
- `PARENT_ITEM_NAME`
- `REQUESTED_QTY`
- `UNIT_COST`
- `LINKED_AMOUNT`
- `STATUS`
- `REQUESTED_BY`
- `REQUESTED_AT`

Inserted status:

```text
PENDING
```

## Quantity Validation Rules

Source:

- `server/services/po.service.js`
- `server/repositories/po.repository.js`
- `server/validators/po.validator.js`
- `client/src/components/po/POLinkForm.jsx`

### Validator Rules

`validateCreatePOLink` validates:

- `PURCHASE_INVOICE_LINE_ID` must be a positive integer.
- `budget_item_id` must be a positive integer.
- `requested_qty` must be a positive number.

`validatePOLinkId` validates:

- PO link ID must be a positive integer.

`validateRejectPOLink` validates:

- rejection reason is required.
- rejection reason is trimmed and whitespace-normalized.
- rejection reason cannot exceed 1000 characters.

`validatePOFilters` normalizes:

- `invoiceNumber`
- `orderId`
- `itemCode`
- `itemDescription`
- `supplier`
- `year`
- `store`

`validatePOLinkStatus` allows:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `ALL`

### Backend Quantity Rules

Available PO quantity:

```text
availablePOQty = PO.QTY - approvedPOQty - pendingPOQty
```

The requested quantity must be less than or equal to `availablePOQty`.

Remaining budget item quantity:

```text
remainingBudgetQty = budgetItem.quantity - approvedBudgetQty - pendingBudgetQty
```

The requested quantity must be less than or equal to `remainingBudgetQty`.

Approved PO quantity source:

```text
BS_PO_LINKS
WHERE PURCHASE_INVOICE_LINE_ID = @poRecordId
AND STATUS = 'APPROVED'
```

Pending PO quantity source:

```text
BS_PO_LINKS
WHERE PURCHASE_INVOICE_LINE_ID = @poRecordId
AND STATUS = 'PENDING'
```

Approved budget linked quantity source:

```text
BS_PO_LINKS
WHERE BUDGET_ITEM_ID = @budgetItemId
AND STATUS = 'APPROVED'
```

Pending budget linked quantity source:

```text
BS_PO_LINKS
WHERE BUDGET_ITEM_ID = @budgetItemId
AND STATUS = 'PENDING'
```

### Frontend Quantity Rules

`POLinkForm` blocks submission when:

- no budget item is selected.
- no PO record is selected.
- requested quantity is empty, zero, or negative.
- requested quantity exceeds selected PO available quantity.
- requested quantity exceeds selected budget item remaining quantity.
- create mutation is pending.

The frontend linked amount preview is calculated as:

```text
requested quantity * selected PO unit cost
```

## Approval Workflow

Source:

- `server/controllers/po.controller.js`
- `server/services/po.service.js`
- `server/repositories/po.repository.js`
- `client/src/pages/POApprovalPage.jsx`
- `client/src/components/po/POApprovalTable.jsx`
- `client/src/hooks/po/useApprovePOLink.js`

Approval endpoint:

```text
POST /api/po-links/:id/approve
```

Backend approval checks:

1. PO link exists.
2. PO link status is `PENDING`.
3. PO record exists.
4. Budget item exists.
5. Related financial year exists.
6. Related financial year status is `PRE_CLOSING`.
7. PO quantity is still available.
8. Budget item quantity is still available.

During approval recalculation, the current pending request quantity is added back:

```text
availablePOQty = PO.QTY - approvedPOQty - pendingPOQty + requestedQty
remainingBudgetQty = budgetItem.quantity - approvedBudgetQty - pendingBudgetQty + requestedQty
```

Repository approval update:

```text
UPDATE BS_PO_LINKS
SET
  STATUS = 'APPROVED',
  APPROVED_BY = @userId,
  APPROVED_AT = GETDATE(),
  UPDATED_AT = GETDATE()
WHERE ID = @id
AND STATUS = 'PENDING'
```

When approval succeeds:

- `PO_LINK_APPROVED` notification is queued.
- `APPROVE_PO_LINK` audit event is written by the controller.

Frontend approval hook:

- `useApprovePOLink` calls `approvePOLink(id)`.
- On success, it invalidates:
  - `PENDING_PO_LINKS_QUERY_KEY`
  - `MY_PO_LINKS_QUERY_KEY`
  - `PO_QUERY_KEY`

## Rejection Workflow

Source:

- `server/controllers/po.controller.js`
- `server/services/po.service.js`
- `server/repositories/po.repository.js`
- `client/src/pages/POApprovalPage.jsx`
- `client/src/components/po/POApprovalTable.jsx`
- `client/src/hooks/po/useRejectPOLink.js`

Rejection endpoint:

```text
POST /api/po-links/:id/reject
```

Backend rejection checks:

1. Rejection reason is provided.
2. PO link exists.
3. PO link status is `PENDING`.

Repository rejection update:

```text
UPDATE BS_PO_LINKS
SET
  STATUS = 'REJECTED',
  REJECTED_BY = @userId,
  REJECTED_AT = GETDATE(),
  REJECTION_REASON = @reason,
  UPDATED_AT = GETDATE()
WHERE ID = @id
AND STATUS = 'PENDING'
```

When rejection succeeds:

- `PO_LINK_REJECTED` notification is queued.
- `REJECT_PO_LINK` audit event is written by the controller.

Frontend rejection hook:

- `useRejectPOLink` calls `rejectPOLink(id, reason)`.
- On success, it invalidates:
  - `PENDING_PO_LINKS_QUERY_KEY`
  - `MY_PO_LINKS_QUERY_KEY`
  - `PO_QUERY_KEY`

## Notification Events

Source:

- `server/services/po.service.js`
- `server/constants/notificationTypes.js`
- `server/notifications/notificationConfig.js`
- `server/notifications/recipientResolver.js`
- `server/notifications/templateResolver.js`
- `server/notifications/buildNotificationPayload.js`
- `server/notifications/templates/poLinkSubmitted.template.js`
- `server/notifications/templates/poLinkApproved.template.js`
- `server/notifications/templates/poLinkRejected.template.js`

PO notification types:

- `PO_LINK_SUBMITTED`
- `PO_LINK_APPROVED`
- `PO_LINK_REJECTED`

### PO Link Submitted

Queued by:

```text
createPOLinkService
```

Notification data:

- notification type: `PO_LINK_SUBMITTED`
- entity type: `PO_LINK`
- entity ID: PO link ID
- payload:
  - `poLinkId`
  - `itemDescription`
  - `requestedQuantity`
  - `requestedBy`

Recipient strategy:

```text
PERMISSION
```

Permission:

```text
can_approve_po_links
```

Template:

```text
poLinkSubmittedTemplate
```

Template status:

```text
ACTION_REQUIRED
```

### PO Link Approved

Queued by:

```text
approvePOLinkService
```

Notification data:

- notification type: `PO_LINK_APPROVED`
- entity type: `PO_LINK`
- entity ID: PO link ID
- payload:
  - `poLinkId`

Recipient strategy:

```text
OWNER
```

Owner type:

```text
PO_LINK
```

Recipient resolver:

```text
getPOLinkRequesterRepo(payload.poLinkId)
```

Template:

```text
poLinkApprovedTemplate
```

Template status:

```text
APPROVED
```

### PO Link Rejected

Queued by:

```text
rejectPOLinkService
```

Notification data:

- notification type: `PO_LINK_REJECTED`
- entity type: `PO_LINK`
- entity ID: PO link ID
- payload:
  - `poLinkId`
  - `reason`

Recipient strategy:

```text
OWNER
```

Owner type:

```text
PO_LINK
```

Recipient resolver:

```text
getPOLinkRequesterRepo(payload.poLinkId)
```

Template:

```text
poLinkRejectedTemplate
```

Template status:

```text
REJECTED
```

## Audit Events

Source:

- `server/controllers/po.controller.js`
- `server/utils/audit.js`

The PO controller writes audit logs for mutating actions.

| Action            | Entity Type | Description               |
| ----------------- | ----------- | ------------------------- |
| `CREATE_PO_LINK`  | `PO_LINK`   | `Created PO link request` |
| `APPROVE_PO_LINK` | `PO_LINK`   | `Approved PO Link #<id>`  |
| `REJECT_PO_LINK`  | `PO_LINK`   | `Rejected PO Link #<id>`  |

Audit data includes:

- `entityName`
- `entityType`
- `entityId`
- `description`
- `newValues`

No audit call was found in the PO controller for:

- available PO reads
- my PO link reads
- pending PO link reads
- PO link detail reads
- PO transparency reads

## Database Tables and Key Fields

Source:

- `server/repositories/po.repository.js`
- `server/repositories/budgetItem.repository.js`
- `server/repositories/financialYears.repository.js`
- `server/repositories/notificationRecipients.repository.js`

### `BS_Purchase_Invoices_For_Budget`

Used as the PO source table.

Fields referenced by source code:

- `ID`
- `ORDER_ID`
- `ITEM_CODE`
- `ITEM_DESC`
- `QTY`
- `UNIT_COST`
- `NET_AMOUNT`
- `SUPPLIER_NAME_EN`
- `PARENT_ITEM_NAME`
- `CREATED_AT`

Used by:

- available PO search
- PO record lookup
- PO link creation
- PO link detail query
- PO transparency history

### `BS_PO_LINKS`

Used as the PO link request and allocation table.

Fields referenced by source code:

- `ID`
- `PURCHASE_INVOICE_LINE_ID`
- `BUDGET_ID`
- `BUDGET_ITEM_ID`
- `PARENT_ITEM_NAME`
- `REQUESTED_QTY`
- `UNIT_COST`
- `LINKED_AMOUNT`
- `STATUS`
- `REQUESTED_BY`
- `REQUESTED_AT`
- `APPROVED_BY`
- `APPROVED_AT`
- `REJECTED_BY`
- `REJECTED_AT`
- `REJECTION_REASON`
- `CREATED_AT`
- `UPDATED_AT`

Statuses used by source code:

- `PENDING`
- `APPROVED`
- `REJECTED`

### `BS_budget_items`

Fields referenced in PO flows:

- `id`
- `budget_id`
- `type_id`
- `quantity`
- `unit_price`
- `total_amount`
- `distribution_method`
- `distribution_level`

### `BS_budgets`

Fields referenced in PO flows:

- `id`
- `department_id`
- `financial_year_id`
- `status`

### `BS_budget_types`

Fields referenced in PO detail/history flows:

- `id`
- `name`
- `expense_type`

### `BS_financial_years`

Fields referenced in PO flows:

- `id`
- `status`
- `year`

### `BS_departments`

Fields referenced in PO history/detail flows:

- `id`
- `department_name`
- `name`

### `USERS`

Fields referenced in PO history and notification recipient flows:

- `USER_ID`
- `USER_NAME`
- `email`
- `IS_ACTIVE`

## Financial Year Restrictions

Source:

- `server/services/po.service.js`
- `server/repositories/financialYears.repository.js`
- `client/src/pages/POLinkingPage.jsx`
- `client/src/pages/FinancialYearsPage.jsx`

PO linking is allowed only when the related financial year status is:

```text
PRE_CLOSING
```

This restriction is enforced in:

- `createPOLinkService`
- `approvePOLinkService`

Create flow rejects when financial year status is not `PRE_CLOSING`.

Approval flow also rejects when financial year status is not `PRE_CLOSING`.

Financial year closing checks unfinished PO links:

```text
BS_PO_LINKS.STATUS = 'PENDING'
```

A financial year cannot be closed while pending PO links exist for budgets in that financial year.

Frontend `POLinkingPage` uses `getTransferPageLock(budgets)` to decide whether the page is locked. Its page text says PO linking is performed during the pre-closing period.

## Frontend PO Module

Source:

- `client/src/api/po.api.js`
- `client/src/pages/POLinkingPage.jsx`
- `client/src/pages/POApprovalPage.jsx`
- `client/src/hooks/po/*.js`
- `client/src/components/po/*.jsx`

### API Client

`client/src/api/po.api.js` maps frontend calls to backend endpoints:

| Function            | Endpoint                                    |
| ------------------- | ------------------------------------------- |
| `getAvailablePOs`   | `GET /po-links/available-pos`               |
| `getMyPOLinks`      | `GET /po-links/my`                          |
| `getPendingPOLinks` | `GET /po-links/pending`                     |
| `getPOLinkById`     | `GET /po-links/:id`                         |
| `getPOTransparency` | `GET /po-links/po/:poRecordId/transparency` |
| `createPOLink`      | `POST /po-links`                            |
| `approvePOLink`     | `POST /po-links/:id/approve`                |
| `rejectPOLink`      | `POST /po-links/:id/reject`                 |

### Linking Page

`POLinkingPage` loads:

- current user budgets through `getMyBudgets`
- available PO records through `useAvailablePOs`
- current user's PO link requests through `useMyPOLinks`

It renders:

- `POSummaryCards`
- `POLinkForm`
- `MyPOLinkRequests`
- `POLinkTable`
- `POLinkDetailsDrawer`

The page supports creating a new request from a rejected request by using the rejected request as the form template.

### Link Form

`POLinkForm` loads:

- current budget through `getCurrentBudget`
- budget items through `getBudgetItems(currentBudget.id)`
- available PO records through `useAvailablePOs`

It submits:

```text
PURCHASE_INVOICE_LINE_ID
budget_item_id
requested_qty
```

It shows a confirmation modal before submission.

### My PO Link Requests

`MyPOLinkRequests` supports tabs:

- `ALL`
- `PENDING`
- `APPROVED`
- `REJECTED`

Rejected requests show a create-again action.

### Approval Page

`POApprovalPage` loads pending PO links through `usePendingPOLinks`.

It renders:

- summary cards
- status filter
- department filter
- financial year filter
- search input
- `POApprovalTable`
- `POLinkDetailsDrawer`

The table shows approve and reject buttons for pending requests.

### Details Drawer

`POLinkDetailsDrawer` loads PO link detail through `usePOLinkDetails`.

It displays:

- request details
- purchase order details
- budget details
- approval and rejection information

Rejected requests can trigger create-again behavior when the caller provides `onCreateFromRejected`.

## Known Observations and Implementation Inconsistencies

The following observations are based on verified source code.

### Controller to Service Create Call Mismatch

Source:

- `server/controllers/po.controller.js`
- `server/services/po.service.js`

`createPOLinkService` is defined as:

```text
createPOLinkService({ PURCHASE_INVOICE_LINE_ID, budget_item_id, requested_qty }, user)
```

The controller calls it as:

```text
createPOLinkService({
  ...req.body,
  user: req.user,
})
```

The service later reads:

```text
user.userId
user.userName
```

Because the controller does not pass `req.user` as the second argument, `user` is not supplied according to the service signature.

### Missing Repository Import Target

Source:

- `server/services/po.service.js`
- filesystem lookup

`po.service.js` imports:

```text
../repositories/financialYear.repository.js
```

The repository file found in the project is:

```text
server/repositories/financialYears.repository.js
```

No `server/repositories/financialYear.repository.js` file was found.

### PO Validators Are Not Wired Into Routes

Source:

- `server/validators/po.validator.js`
- `server/routes/po.routes.js`
- repository search for validator function names

PO validator functions exist, but no route usage was found for:

- `validateCreatePOLink`
- `validatePOLinkId`
- `validateRejectPOLink`
- `validatePOFilters`
- `validatePOLinkStatus`

The service still performs its own core validation for create, approve, and reject flows.

### Backend Available PO Filters Are Not Applied

Source:

- `server/services/po.service.js`
- `server/repositories/po.repository.js`
- `client/src/components/po/POLinkForm.jsx`

The frontend passes a `search` parameter to `useAvailablePOs`.

`getAvailablePOsService(filters)` passes filters into the repository.

`getAvailablePurchaseInvoiceLinesRepo(filters = {})` accepts filters, but the SQL query does not apply them.

Filtering currently occurs in frontend components.

### Frontend Query Key Module Is Empty

Source:

- `client/src/hooks/po/usePOQueryKeys.js`
- `client/src/hooks/po/useCreatePOLink.js`
- `client/src/hooks/po/useApprovePOLink.js`
- `client/src/hooks/po/useRejectPOLink.js`

`usePOQueryKeys.js` has zero bytes.

Several hooks import query key constants from this file:

- `AVAILABLE_POS_QUERY_KEY`
- `MY_PO_LINKS_QUERY_KEY`
- `PENDING_PO_LINKS_QUERY_KEY`
- `PO_QUERY_KEY`
- `PO_LINK_DETAILS_QUERY_KEY`
- `PO_TRANSPARENCY_QUERY_KEY`

### Frontend Approval and Rejection Confirmation UI Is Placeholder

Source:

- `client/src/pages/POApprovalPage.jsx`
- `client/src/components/po/POApprovalTable.jsx`

`POApprovalTable` calls `onApprove` and `onReject`.

`POApprovalPage` sets `approveItem` and `rejectItem`, and defines `confirmApprove` and `confirmReject`.

The rendered UI currently shows placeholder blocks:

- `Approval confirmation modal will be implemented in Phase 9...`
- `Rejection modal with required reason will be implemented in Phase 9...`

No rendered approve confirmation button was found that calls `confirmApprove`.

No rendered rejection submit control was found that calls `confirmReject`.

### Frontend Dashboard Permission Name Differs From Backend PO Permissions

Source:

- `client/src/config/dashboard/quickActions.js`
- `client/src/config/dashboard/workPanels.js`
- `client/src/pages/BudgetAccessManagementPage.jsx`
- `server/routes/po.routes.js`
- `server/repositories/userRole.repository.js`
- `server/repositories/budgetAccessAssignments.repository.js`

Some frontend access UI and dashboard code uses:

```text
can_link_po
```

Backend PO routes require:

- `can_view_po_links`
- `can_request_po_links`
- `can_approve_po_links`

The active backend access resolver returns PO link permissions with the `*_po_links` names.

The budget access assignment repository and validator still include `can_link_po`.

### PO Pages Were Not Found In Route Registration Search

Source:

- repository search under `client/src`

Search found the PO page components:

- `POLinkingPage.jsx`
- `POApprovalPage.jsx`

No import or route registration for these pages was found in the searched frontend source.

### Pending PO Links Query Returns All Pending Links

Source:

- `server/repositories/po.repository.js`
- `server/routes/po.routes.js`

`GET /api/po-links/pending` requires `can_approve_po_links`.

The repository query returns all rows from `BS_PO_LINKS` where:

```text
STATUS = 'PENDING'
```

No department or financial year filter is applied in that repository query.

### PO Link Detail Uses Raw Link Lookup

Source:

- `server/services/po.service.js`
- `server/repositories/po.repository.js`

`getPOLinkByIdService` calls `getPOLinkByIdRepo`.

`getPOLinkByIdRepo` returns:

```text
SELECT TOP 1 *
FROM BS_PO_LINKS
WHERE ID = @id
```

A richer `getPOLinkDetailsRepo` exists in the repository, but it is not used by the service.

### PO Transparency Uses Summary And Allocation History

Source:

- `server/services/po.service.js`
- `server/repositories/po.repository.js`

`getPOTransparencyService` returns:

- allocation summary from `getPOAllocationSummaryRepo`
- allocation history from `getPOAllocationHistoryRepo`

If no summary is found, the service throws `PO record not found`.

### Budget Balance Repository Uses Different PO Link Table Name

Source:

- `server/repositories/budgetBalance.repository.js`
- `server/repositories/po.repository.js`

The PO module uses:

```text
BS_PO_LINKS
```

The budget balance repository calculates PO-used amount from:

```text
BS_budget_po_links
```

### Rejection Service Fetches PO Record Without Using It

Source:

- `server/services/po.service.js`

`rejectPOLinkService` fetches the related PO record into `po`, but the fetched value is not used before rejection.

### Permission-Based Notification Recipient Lookup Uses Direct User Role Column

Source:

- `server/repositories/notificationRecipients.repository.js`
- `server/notifications/notificationConfig.js`

`PO_LINK_SUBMITTED` recipients are users with `BS_budget_user_roles.can_approve_po_links = 1`.

This notification recipient query does not join role permissions.
