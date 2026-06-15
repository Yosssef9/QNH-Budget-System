# QNH Budget System Notifications

## Overview

QNH Budget System uses a database-backed notification queue and a background worker to send email notifications.

The notification flow is:

1. A domain service calls `queueNotification`.
2. Recipients are resolved from `notificationConfig.js` and `recipientResolver.js`.
3. Payload is enriched by `buildNotificationPayload`.
4. One row is inserted into `dbo.BS_Notifications` for each valid recipient.
5. `notification.worker.js` repeatedly processes pending queue rows.
6. The worker resolves an email template using `templateResolver.js`.
7. The worker renders the template through `defaultLayout`.
8. The worker sends email using `sendEmail`.
9. The queue row is marked `SENT`, retried as `PENDING`, or marked `FAILED`.

This document is based only on verified source code.

## Key Source Files

Core notification flow:

- `server/services/notification.service.js`
- `server/repositories/notification.repository.js`
- `server/jobs/notification.worker.js`

Notification configuration and resolution:

- `server/constants/notificationTypes.js`
- `server/notifications/notificationConfig.js`
- `server/notifications/recipientResolver.js`
- `server/notifications/templateResolver.js`
- `server/notifications/buildNotificationPayload.js`

Recipients:

- `server/repositories/notificationRecipients.repository.js`

Templates and layout:

- `server/notifications/templates/budgetApproved.template.js`
- `server/notifications/templates/budgetReturned.template.js`
- `server/notifications/templates/budgetSubmitted.template.js`
- `server/notifications/templates/financialYearClosed.template.js`
- `server/notifications/templates/financialYearOpened.template.js`
- `server/notifications/templates/financialYearPreClosing.template.js`
- `server/notifications/templates/itemRequestApproved.template.js`
- `server/notifications/templates/itemRequestCreated.template.js`
- `server/notifications/templates/itemRequestRejected.template.js`
- `server/notifications/templates/poLinkApproved.template.js`
- `server/notifications/templates/poLinkRejected.template.js`
- `server/notifications/templates/poLinkSubmitted.template.js`
- `server/notifications/templates/transferApproved.template.js`
- `server/notifications/templates/transferCreated.template.js`
- `server/notifications/templates/transferRejected.template.js`
- `server/notifications/layouts/default.layout.js`

Email sending:

- `server/utils/email.js`

## Notification Architecture

### Queue Producer

Function:

- `queueNotification(data)`

File:

- `server/services/notification.service.js`

Expected input shape used by callers:

- `notificationType`
- `entityType`
- `entityId`
- `payload`

Queue behavior:

- Resolves recipients for the notification type.
- Returns without inserting anything when no recipients are resolved.
- Filters recipients to those with a non-empty `email`.
- Logs skipped recipients without email using `console.warn`.
- Returns without inserting anything when all recipients are skipped.
- Builds an enriched payload per valid recipient.
- Inserts one queue row per valid recipient.

### Queue Storage

Repository:

- `server/repositories/notification.repository.js`

Table:

- `dbo.BS_Notifications`

Inserted fields:

- `notification_type`
- `entity_type`
- `entity_id`
- `recipient_email`
- `payload`

The payload is stored as JSON using `JSON.stringify(payload)`.

### Queue Consumer

Worker:

- `server/jobs/notification.worker.js`

The worker:

- Loads `.env` using `dotenv.config()`.
- Imports `processPendingNotifications`.
- Logs `Notification Worker Started`.
- Runs forever.
- Calls `processPendingNotifications()`.
- Catches and logs worker-level errors.
- Sleeps for `10000` milliseconds after each processing pass.

## Notification Types

File:

- `server/constants/notificationTypes.js`

Defined notification types:

| Type |
|---|
| `TRANSFER_CREATED` |
| `TRANSFER_APPROVED` |
| `TRANSFER_REJECTED` |
| `BUDGET_SUBMITTED` |
| `BUDGET_APPROVED` |
| `BUDGET_RETURNED` |
| `ITEM_REQUEST_CREATED` |
| `ITEM_REQUEST_APPROVED` |
| `ITEM_REQUEST_REJECTED` |
| `FINANCIAL_YEAR_OPENED` |
| `FINANCIAL_YEAR_PRE_CLOSING` |
| `FINANCIAL_YEAR_CLOSED` |
| `PO_LINK_SUBMITTED` |
| `PO_LINK_APPROVED` |
| `PO_LINK_REJECTED` |

## Queue Lifecycle

### Insert

Function:

- `createNotificationRepo`

Behavior:

- Inserts one row into `dbo.BS_Notifications`.
- Stores the notification payload as JSON text.
- Does not return the inserted row.

### Claim

Function:

- `claimNotificationRepo`

Behavior:

- Selects the oldest notification row where:
  - `status = 'PENDING'`
  - `next_retry_at <= GETDATE()`
- Uses a CTE with `SELECT TOP (1)`.
- Updates the selected row to:
  - `status = 'PROCESSING'`
  - `processing_started_at = GETDATE()`
- Returns the updated row using `OUTPUT inserted.*`.

### Sent

Function:

- `markNotificationSentRepo`

Behavior:

- Updates the row by ID.
- Sets:
  - `status = 'SENT'`
  - `processed_at = GETDATE()`

### Failed or Retried

Function:

- `markNotificationFailedRepo`

Inputs:

- `id`
- `attempts`
- `errorMessage`

Behavior:

- Updates attempts count.
- Stores the error message.
- Sets `next_retry_at` using retry delay.
- Sets status to:
  - `PENDING` when attempts are less than `5`
  - `FAILED` when attempts are `5` or more

Retry delay logic:

| Attempts value passed | Next retry delay |
|---:|---:|
| `1` | 5 minutes |
| `2` | 15 minutes |
| `3` | 30 minutes |
| `4` or more | 60 minutes |

## Worker Processing Flow

Function:

- `processPendingNotifications`

File:

- `server/services/notification.service.js`

Processing loop:

1. Calls `claimNotificationRepo()`.
2. Breaks when no notification is returned.
3. Checks `recipient_email`.
4. Marks the notification failed if recipient email is missing.
5. Parses `notification.payload` as JSON.
6. Calls `resolveTemplate(notification.notification_type, payload)`.
7. Builds HTML using `defaultLayout`.
8. Calls `sendEmail`.
9. Marks the notification as sent.
10. On error, marks the notification failed or retryable.

Missing recipient handling:

- If `recipient_email` is missing or blank, the service calls `markNotificationFailedRepo`.
- The error message used is `Recipient email is missing`.
- Processing continues to the next notification.

Error handling:

- Any error thrown while parsing payload, resolving template, rendering layout, sending email, or marking sent is caught.
- The catch block calls `markNotificationFailedRepo`.
- The stored error message is `error?.message || "Unknown error"`.

## Recipient Resolution Strategies

Files:

- `server/notifications/notificationConfig.js`
- `server/notifications/recipientResolver.js`
- `server/repositories/notificationRecipients.repository.js`

Supported strategies:

| Strategy | Resolver behavior |
|---|---|
| `PERMISSION` | Fetch users with a specific permission. |
| `BROADCAST` | Fetch all active users except `payload.actorUserId`. |
| `OWNER` | Fetch the owner/requester for a specific entity type. |

### Permission Strategy

Resolver function:

- `getUsersByPermissionRepo(permissionColumn)`

Allowed permission columns:

- `can_approve_transfer`
- `can_approve_budget`
- `can_manage_categories`
- `can_manage_financial_years`
- `can_approve_po_links`

Query behavior:

- Reads active budget user roles.
- Joins `USERS`.
- Requires `u.IS_ACTIVE = 1`.
- Requires `u.email IS NOT NULL`.
- Requires the selected permission column to equal `1`.
- Returns distinct users.

### Broadcast Strategy

Resolver function:

- `getAllActiveUsersExceptRepo(actorUserId)`

Query behavior:

- Reads from `USERS`.
- Requires `IS_ACTIVE = 1`.
- Requires `email IS NOT NULL`.
- Excludes `USER_ID = @actorUserId`.

### Owner Strategy

Owner resolver behavior:

| Owner type | Resolver function | Lookup |
|---|---|---|
| `TRANSFER` | `getTransferRequesterRepo` | Transfer requester from `BS_budget_transfers.requested_by`. |
| `BUDGET` | `getBudgetOwnerRepo` | Active HOD assigned to the budget department. |
| `ITEM_REQUEST` | `getItemRequestOwnerRepo` | Item request requester from `BS_budget_item_requests.requested_by`. |
| `PO_LINK` | `getPOLinkRequesterRepo` | PO link requester from `BS_PO_LINKS.REQUESTED_BY`. |

If an unknown owner type is used, the resolver returns an empty array.

If a notification type is not found in `NOTIFICATION_CONFIG`, the resolver returns an empty array.

## Notification Configuration

File:

- `server/notifications/notificationConfig.js`

| Notification type | Strategy | Permission / Owner type |
|---|---|---|
| `TRANSFER_CREATED` | `PERMISSION` | `can_approve_transfer` |
| `TRANSFER_APPROVED` | `OWNER` | `TRANSFER` |
| `TRANSFER_REJECTED` | `OWNER` | `TRANSFER` |
| `BUDGET_SUBMITTED` | `PERMISSION` | `can_approve_budget` |
| `BUDGET_APPROVED` | `OWNER` | `BUDGET` |
| `BUDGET_RETURNED` | `OWNER` | `BUDGET` |
| `ITEM_REQUEST_CREATED` | `PERMISSION` | `can_manage_categories` |
| `ITEM_REQUEST_APPROVED` | `OWNER` | `ITEM_REQUEST` |
| `ITEM_REQUEST_REJECTED` | `OWNER` | `ITEM_REQUEST` |
| `FINANCIAL_YEAR_OPENED` | `BROADCAST` | None |
| `FINANCIAL_YEAR_PRE_CLOSING` | `BROADCAST` | None |
| `FINANCIAL_YEAR_CLOSED` | `BROADCAST` | None |
| `PO_LINK_SUBMITTED` | `PERMISSION` | `can_approve_po_links` |
| `PO_LINK_APPROVED` | `OWNER` | `PO_LINK` |
| `PO_LINK_REJECTED` | `OWNER` | `PO_LINK` |

## Payload Enrichment Flow

File:

- `server/services/notification.service.js`

For each valid recipient, `queueNotification` adds:

- `recipientName`

The recipient name source is selected from:

1. `recipient.name`
2. `recipient.USER_NAME`
3. `recipient.user_name`

Then `queueNotification` calls:

- `buildNotificationPayload(notificationType, enrichedPayload)`

File:

- `server/notifications/buildNotificationPayload.js`

Verified behavior:

- For all explicitly handled budget, transfer, item request, and PO link notification types, it returns the payload unchanged.
- For default/unhandled notification types, it returns the payload unchanged.

## Template Resolution Flow

File:

- `server/notifications/templateResolver.js`

Function:

- `resolveTemplate(notificationType, payload)`

Behavior:

- Switches on `notificationType`.
- Calls the matching template function.
- Throws `Error("Unknown notification type: ${notificationType}")` for unknown notification types.

The worker passes the resolved template into `defaultLayout`.

The layout receives:

- `status`
- `title`
- `message`
- `recipientName`
- `details`
- `actionText`
- `actionUrl`

## Template Status Values

The templates use these status values:

| Status | Used by |
|---|---|
| `APPROVED` | Budget approved, item request approved, transfer approved, PO link approved |
| `REJECTED` | Budget returned, item request rejected, transfer rejected, PO link rejected |
| `ACTION_REQUIRED` | Budget submitted, item request created, financial year pre-closing, transfer created, PO link submitted |
| `INFO` | Financial year opened, financial year closed |

`defaultLayout` maps these statuses to visual labels and colors. If the status is unknown, it falls back to `INFO`.

## Template Map

| Notification type | Template function | Subject pattern |
|---|---|---|
| `TRANSFER_CREATED` | `transferCreatedTemplate` | `Transfer Request #${payload.transferId}` |
| `TRANSFER_APPROVED` | `transferApprovedTemplate` | `Transfer #${payload.transferId} Approved` |
| `TRANSFER_REJECTED` | `transferRejectedTemplate` | `Transfer #${payload.transferId} Rejected` |
| `BUDGET_SUBMITTED` | `budgetSubmittedTemplate` | `Budget Submitted - ${payload.budgetName}` |
| `BUDGET_APPROVED` | `budgetApprovedTemplate` | `Budget Approved - ${payload.budgetName}` |
| `BUDGET_RETURNED` | `budgetReturnedTemplate` | `Budget Returned - ${payload.budgetName}` |
| `ITEM_REQUEST_CREATED` | `itemRequestCreatedTemplate` | `Item Request #${payload.requestId}` |
| `ITEM_REQUEST_APPROVED` | `itemRequestApprovedTemplate` | `Item Request Approved` |
| `ITEM_REQUEST_REJECTED` | `itemRequestRejectedTemplate` | `Item Request Rejected` |
| `FINANCIAL_YEAR_OPENED` | `financialYearOpenedTemplate` | `Financial Year ${payload.year} Opened` |
| `FINANCIAL_YEAR_PRE_CLOSING` | `financialYearPreClosingTemplate` | `Financial Year ${payload.year} Pre-Closing` |
| `FINANCIAL_YEAR_CLOSED` | `financialYearClosedTemplate` | `Financial Year ${payload.year} Closed` |
| `PO_LINK_SUBMITTED` | `poLinkSubmittedTemplate` | `PO Link Request #${payload.poLinkId}` |
| `PO_LINK_APPROVED` | `poLinkApprovedTemplate` | `PO Link Approved #${payload.poLinkId}` |
| `PO_LINK_REJECTED` | `poLinkRejectedTemplate` | `PO Link Rejected #${payload.poLinkId}` |

## Email Sending

File:

- `server/utils/email.js`

Function:

- `sendEmail({ to, cc, subject, text, html })`

Behavior:

- Throws `ApiError(400, "Email recipient is required", "EMAIL_TO_REQUIRED")` if `to` is missing.
- Checks `EMAIL_ENABLED`.
- If `EMAIL_ENABLED` is not `true`, logs that email was skipped and returns:
  - `skipped: true`
  - `reason: "EMAIL_DISABLED"`
- If email is enabled, sends email using Nodemailer.
- Uses SMTP environment variables.
- Attaches `qnh-logo.png` with CID `qnh-logo`.
- Logs sent email metadata on success.
- On send failure, logs the error and throws `ApiError(500, "Failed to send email", "EMAIL_SEND_FAILED")`.

SMTP-related environment variables used:

- `EMAIL_ENABLED`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Module Event Map

### Financial Years

File:

- `server/services/financialYears.service.js`

| Service event | Notification type | Entity type | Entity ID | Payload fields verified in source |
|---|---|---|---|---|
| Financial year created | `FINANCIAL_YEAR_OPENED` | `FINANCIAL_YEAR` | `financialYear.id` | `financialYearId`, `year`, `openedBy` |
| Financial year pre-closed | `FINANCIAL_YEAR_PRE_CLOSING` | `FINANCIAL_YEAR` | `id` | `financialYearId`, `year`, `preClosedBy` |
| Financial year closed | `FINANCIAL_YEAR_CLOSED` | `FINANCIAL_YEAR` | `id` | `financialYearId`, `year`, `closedBy` |

### Budgets

File:

- `server/services/budgets.service.js`

| Service event | Notification type | Entity type | Entity ID | Payload fields verified in source |
|---|---|---|---|---|
| Budget submitted | `BUDGET_SUBMITTED` | `BUDGET` | `budgetId` | `budgetId`, `actorUserId`, `budgetName`, `departmentName`, `submittedBy` |

### Budget Approval

File:

- `server/services/budgetApproval.service.js`

| Service event | Notification type | Entity type | Entity ID | Payload fields verified in source |
|---|---|---|---|---|
| Budget approved | `BUDGET_APPROVED` | `BUDGET` | `budgetId` | `budgetId`, `budgetName`, `departmentName`, `approvedBy` |
| Budget returned | `BUDGET_RETURNED` | `BUDGET` | `budgetId` | `budgetId`, `budgetName`, `departmentName`, `returnedBy`, `reason` |

### Transfers

File:

- `server/services/transfer.service.js`

| Service event | Notification type | Entity type | Entity ID | Payload fields verified in source |
|---|---|---|---|---|
| Transfer created | `TRANSFER_CREATED` | `TRANSFER` | `transfer.id` | `transferId`, `budgetName`, `amount`, `requestedBy` |
| Transfer approved | `TRANSFER_APPROVED` | `TRANSFER` | `transferId` | `transferId`, `budgetName`, `amount`, `approvedBy` |
| Transfer rejected | `TRANSFER_REJECTED` | `TRANSFER` | `transferId` | `transferId`, `budgetName`, `amount`, `rejectedBy`, `reason` |

### Item Requests

File:

- `server/services/itemRequest.service.js`

| Service event | Notification type | Entity type | Entity ID | Payload fields verified in source |
|---|---|---|---|---|
| Item request created | `ITEM_REQUEST_CREATED` | `ITEM_REQUEST` | `request.id` | `requestId`, `actorUserId` |
| Item request approved | `ITEM_REQUEST_APPROVED` | `ITEM_REQUEST` | `requestId` | `requestId`, `itemName`, `approvedBy` |
| Item request rejected | `ITEM_REQUEST_REJECTED` | `ITEM_REQUEST` | `requestId`, `itemName`, `rejectedBy`, `reason` |

### PO Links

File:

- `server/services/po.service.js`

| Service event | Notification type | Entity type | Entity ID | Payload fields verified in source |
|---|---|---|---|---|
| PO link submitted | `PO_LINK_SUBMITTED` | `PO_LINK` | `poLink.id` | `poLinkId`, `itemDescription`, `requestedQuantity`, `requestedBy` |
| PO link approved | `PO_LINK_APPROVED` | `PO_LINK` | `poLinkId` | `poLinkId` |
| PO link rejected | `PO_LINK_REJECTED` | `PO_LINK` | `poLinkId` | `poLinkId`, `reason` |

## Retry and Failure Handling

Retry and failure are handled by:

- `processPendingNotifications`
- `markNotificationFailedRepo`

Failure paths verified in source:

- Missing recipient email.
- Invalid JSON payload.
- Unknown notification type.
- Template resolution failure.
- Layout rendering failure.
- Email send failure.
- Any other thrown error in the worker processing block.

Retry state behavior:

- The failed notification row is updated with a new `attempts` value.
- `error_message` stores the failure reason.
- `next_retry_at` is advanced by the retry delay.
- Status remains `PENDING` until attempts reach `5`.
- Status becomes `FAILED` when attempts are `5` or more.

The worker only claims rows where:

- `status = 'PENDING'`
- `next_retry_at <= GETDATE()`

## Known Observations

The following observations are based on inspected source code only:

- `queueNotification` silently returns when recipient resolution returns no recipients.
- `queueNotification` silently returns when all resolved recipients have missing or blank email addresses, after logging skipped recipients.
- `buildNotificationPayload` currently returns the payload unchanged for all notification types.
- `resolveTemplate` throws for unknown notification types; the worker catches that error and marks the notification failed or retryable.
- `claimNotificationRepo` claims one pending notification at a time.
- The worker processes pending notifications in a loop until `claimNotificationRepo` returns no row, then sleeps for 10 seconds.
- `sendEmail` treats disabled email as a successful skip; the worker then marks the notification as `SENT`.
- `defaultLayout` expects `details` to be an object and renders `Object.entries(details)`.
- Budget, transfer, item request, and financial year templates provide `details` as an object.
- PO link templates provide `details` as an array of `{ label, value }` objects.
- Some item request templates reference fields such as `itemName`, `requestedBy`, `approvedBy`, `rejectedBy`, and `reason`; the create item request notification payload in `itemRequest.service.js` only includes `requestId` and `actorUserId`.
- Financial year broadcast notifications use `BROADCAST`, which excludes `payload.actorUserId`; the verified financial year payloads use `openedBy`, `preClosedBy`, or `closedBy`, not `actorUserId`.
- Permission-based recipient resolution only allows these permission columns: `can_approve_transfer`, `can_approve_budget`, `can_manage_categories`, `can_manage_financial_years`, and `can_approve_po_links`.
- PO link owner resolution returns `email` and `name`; other owner/permission resolvers generally return `USER_ID`, `USER_NAME`, and `email`.
