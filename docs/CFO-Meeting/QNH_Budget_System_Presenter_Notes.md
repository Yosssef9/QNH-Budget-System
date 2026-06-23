# QNH Budget Management System Presenter Notes

Personal demo companion for presenting the system to Department Heads, Finance, Approvers, Administrators, and the CFO.

Use this document while demonstrating the live system. It is intentionally short, practical, and organized by workflow.

## Demo Principle

- Start with access and financial year context.
- Show how a department creates a budget.
- Show how approval, return, transfers, and PO linking control execution.
- Show how dashboards, analytics, audit logs, notifications, and permissions support governance.
- Mention roadmap features only at the end.

---

# 1. Authentication & Access

## Purpose

Control who can enter the Budget System and what each user can see or do.

## Main Features

- Login through authenticated portal access.
- Budget access is loaded after authentication.
- Sidebar menu changes based on permissions.
- User profile area shows current user and role label.
- Unauthorized users are redirected to the login-required page.
- Page routes are protected by permission checks.

## Demo Flow

1. Login as a user with budget access.
2. Point out the user name and role in the header.
3. Show that the sidebar contains only permitted modules.
4. Explain that a Department Head sees a different menu than an Approver or Admin.
5. If possible, switch roles or mention role-based visibility.

## Easy To Forget

- Sidebar has MAIN and ADMINISTRATION groups.
- Some actions are hidden entirely if the user lacks permission.
- Budget access is separate from general login access.
- Menu visibility is part of governance, not only UI convenience.

## Questions Users May Ask

- Why can I not see a menu item?
  - Your assigned budget permissions do not allow that action.
- Can one user have multiple permissions?
  - Yes. Permissions can combine role defaults and user-specific overrides.
- Can an approver also view budgets?
  - Yes, depending on assigned permissions.

## Business Value

- Prevents unauthorized budget actions.
- Separates preparation, approval, finance, and administration responsibilities.
- Reduces accidental or inappropriate changes.

---

# 2. Financial Years

## Purpose

Control the annual budget cycle from opening through pre-closing and final closure.

## Main Features

- View financial years and statuses.
- Create the next sequential financial year.
- New financial year creation creates department budget shells.
- Move an OPEN year to PRE-CLOSING.
- Close a PRE-CLOSING year.
- Current financial year is shown across dashboards and pages.

## Demo Flow

1. Open Financial Years.
2. Explain the statuses:
   - OPEN
   - PRE-CLOSING
   - CLOSED
3. Show the current active year.
4. Explain that only one active year can exist.
5. Explain pre-closing requirements:
   - all active budgets approved
6. Explain closing requirements:
   - all budgets approved
   - no pending transfers
   - no pending PO links

## Easy To Forget

- Financial year must be sequential.
- Financial year cannot be pre-closed until budgets are approved.
- Financial year cannot be closed while pending transfers or PO links exist.
- PO linking and transfers are tied to PRE-CLOSING behavior.
- Financial year lifecycle emails are sent.

## Questions Users May Ask

- Can we create any year manually?
  - No. The year must follow the sequence and no other active year can exist.
- Why can we not close the year?
  - There may be unapproved budgets, pending transfers, or pending PO links.
- What happens when a year is closed?
  - It becomes historical and active changes are restricted.

## Business Value

- Creates a controlled annual budget period.
- Prevents ungoverned activity after closure.
- Supports audit and year-end discipline.

---

# 3. Budget Configuration

## Purpose

Maintain the master budget categories, item types, and item request workflow used by departments.

## Main Features

- Create budget categories.
- Create budget item types under categories.
- Set expense type such as OPEX or CAPEX.
- Edit existing categories and item types.
- Deactivate categories and item types.
- Usage check before editing or deactivating configured data.
- Search categories and item types.
- View and filter item/category requests.
- Approve item requests.
- Approve and automatically create the requested item/type.
- Approve only, then create manually later.
- Reject requests with admin notes.
- Collapsible setup and request sections.

## Demo Flow

1. Open Budget Configuration.
2. Show category list and item/type list.
3. Create or explain a new category.
4. Create or explain a new item/type.
5. Show expense type selection.
6. Show search for categories and item types.
7. Open Item / Category Requests.
8. Filter requests by status.
9. Explain approve, approve and auto-create, and reject.

## Easy To Forget

- HODs can request missing budget items from Budget Entry.
- Requests can be for an existing category or a new category.
- Admin notes can be added during request review.
- Deactivation is preferred over uncontrolled deletion for master data.
- Usage checks warn when a category or item is already used.

## Questions Users May Ask

- What if a department cannot find an item?
  - They submit an item request; Admin reviews it.
- Can Admin create the item automatically from the request?
  - Yes, through approve and auto-create.
- Why not let everyone create item types?
  - Master data must stay controlled to protect reporting quality.

## Business Value

- Keeps budget item naming consistent.
- Reduces duplicate or unclear item types.
- Gives departments a controlled path to request missing setup.

---

# 4. Budget Entry

## Purpose

Allow Department Heads to prepare, save, import, copy, and submit their department budget.

## Main Features

- Open current department budget.
- Create a budget when allowed.
- Add budget items.
- Select category and item/type.
- Enter quantity and unit price.
- Total amount is calculated.
- Choose distribution method:
  - Annual
  - Monthly
  - Quarterly
  - Custom
- Custom distribution validation.
- Mark an item as Project.
- Save draft.
- Submit budget.
- Delete or replace budget items while editable.
- Copy Budget From History drawer.
- Preview historical budget items before copying.
- Excel import flow and template-driven entry.
- Request missing budget item/type.
- Unsaved changes protection.
- Returned budget notes are visible when correcting.

## Demo Flow

1. Open Budgets or Enter / Edit Budget.
2. Show current budget status.
3. Add one item.
4. Select category and item/type.
5. Enter quantity and unit price.
6. Show total amount.
7. Show distribution method.
8. Mark item as Project if relevant.
9. Save as draft.
10. Open Copy Budget From History.
11. Show historical approved budgets and preview.
12. Mention Excel import and item request.
13. Submit the budget.

## Easy To Forget

- Budget must have at least one active item before submission.
- Budget is editable only when DRAFT or RETURNED.
- Submitted budgets are locked.
- Custom distribution total must equal the item quantity.
- Copy from history uses approved historical budgets.
- Item request can include new category request.
- Project flag is a budget item visibility flag, not full project management.
- Financial year status can lock entry.

## Questions Users May Ask

- Can I edit after submission?
  - No, unless the budget is returned.
- Can I reuse last year's items?
  - Yes, use Copy Budget From History.
- Can I upload many items?
  - Yes, use Excel import where available.
- What if the item does not exist?
  - Use Request New Budget Item.
- What is Project?
  - A budget item marked for elevated visibility and reporting.

## Business Value

- Standardizes department budget preparation.
- Reduces repeated manual entry.
- Keeps budget requests structured and ready for approval.

---

# 5. Budget Approval

## Purpose

Allow Approvers and the CFO to review submitted budgets and approve or return them with evidence.

## Main Features

- Pending approval list.
- Search and filter pending budgets.
- Collapsible budget selection sidebar.
- Budget review header and summary.
- Read-only budget item table.
- Sortable item table columns.
- Price Intelligence columns:
  - Historical Unit Price Benchmark
  - Unit Price Variance
  - Total Estimated Impact
  - Status
  - Details
- Price Intelligence summary cards.
- Project badge on project items.
- General approval note.
- Item-level approval notes.
- Approve decision.
- Return decision.
- Budget timeline and review context.

## Demo Flow

1. Open Budget Approvals.
2. Select a pending budget.
3. Show the review table.
4. Explain quantity, unit price, total amount, distribution, and project badge.
5. Show Price Intelligence summary.
6. Point to benchmark, variance, impact, and status columns.
7. Open Details for one item.
8. Add optional notes.
9. Approve or demonstrate return flow.

## Easy To Forget

- Price Intelligence supports the decision; it does not auto-approve or auto-reject.
- General notes and item-level notes can be stored.
- The item table can be sorted.
- The create/selection sidebar collapses so the review table can expand.
- Approval is allowed only while the financial year is OPEN.
- Only PENDING_APPROVAL budgets can be approved or returned.

## Questions Users May Ask

- Does the system decide for the CFO?
  - No. It gives evidence; the approver decides.
- Why is an item marked High Overspend Risk?
  - Its unit price is materially above historical benchmark and creates financial exposure.
- Can I return only one item?
  - The budget is returned as a whole, but feedback can be attached to specific items.

## Business Value

- Improves approval quality.
- Makes review faster and more evidence-based.
- Creates clear approval or return evidence.

---

# 6. Return & Feedback

## Purpose

Allow approvers to return a budget with structured correction guidance.

## Main Features

- General return note.
- Item-level return notes.
- Returned budget becomes editable again.
- HOD sees return feedback in Budget Entry.
- Item notes can guide the user to the affected row.
- Resubmission after correction.
- Return action is audited.
- Return notification is sent.

## Demo Flow

1. In Budget Approval, choose Return instead of Approve.
2. Enter a general note.
3. Add item-level notes for specific lines.
4. Return the budget.
5. Open Budget Entry as HOD.
6. Show returned notes.
7. Correct an item.
8. Resubmit.

## Easy To Forget

- A general return note is required.
- Item notes are optional but valuable.
- RETURNED status unlocks editing.
- Notes remain part of review evidence.

## Questions Users May Ask

- Can the HOD see exactly what to fix?
  - Yes, through general and item-level notes.
- Can the budget be resubmitted?
  - Yes, after correction.
- Are return notes visible later?
  - Yes, as part of review feedback and audit context.

## Business Value

- Reduces unclear email-based correction loops.
- Improves accountability for returned budgets.
- Speeds up resubmission.

---

# 7. Budget Transfers

## Purpose

Move approved budget value between items in a controlled approval workflow.

## Main Features

- Transfer request page.
- Source item selection.
- Searchable source and target items.
- Transfer to an existing item.
- Transfer to a new budget item where permitted.
- Quantity and amount validation.
- Transfer reason / notes.
- Confirmation modal before submission.
- My Transfer Requests table.
- Status filters:
  - All
  - Pending Approval
  - Approved
  - Rejected
- Search transfer requests.
- Transfer approval page.
- Transfer details drawer.
- Approve or reject with reason.

## Demo Flow

1. Open Transfer Requests.
2. Select a source approved budget item.
3. Show available balance or transferable amount.
4. Choose existing item or new item target.
5. Enter transfer quantity or amount.
6. Submit request.
7. Open Transfer Approvals.
8. Review details.
9. Approve or reject.
10. Explain balance impact.

## Easy To Forget

- Transfers are allowed during PRE-CLOSING.
- Source budget item must be approved.
- Target item must be valid.
- Transfer cannot exceed available balance.
- Rejected transfers keep rejection notes.
- Dashboard shows pending transfer requests.
- Transfer approval can create a new target item if using new-item transfer.

## Questions Users May Ask

- Can we move budget after approval?
  - Yes, through controlled transfer approval.
- Can transfer create a new item?
  - The workflow supports transfer to a new item when permitted.
- Does a pending transfer affect closure?
  - Yes, pending transfers block financial year closure.

## Business Value

- Provides flexibility without losing control.
- Keeps balance movement traceable.
- Prevents informal budget reallocations.

---

# 8. PO Linking

## Purpose

Connect purchase order records to approved budget items so spending is visible against the budget.

## Main Features

- PO Link Requests page.
- Available PO records list.
- Search available POs.
- Budget and budget item selection.
- Suggested PO Records based on PO Item Mappings.
- All PO Records list remains available.
- Fully consumed PO records remain visible but disabled.
- Requested quantity entry.
- Linked amount preview.
- Quantity validation against PO availability.
- Quantity validation against budget item remaining quantity.
- Submit PO link request.
- Confirmation modal.
- My PO Link Requests.
- Status tabs:
  - All
  - Pending
  - Approved
  - Rejected
- Create again from rejected request.
- PO link details drawer.
- PO transparency / allocation history where available.

## Demo Flow

1. Open PO Link Requests.
2. Select budget and budget item.
3. Show Suggested PO Records.
4. Explain why suggestions appear.
5. Show All PO Records remains available.
6. Select a PO record.
7. Enter requested quantity.
8. Show linked amount preview.
9. Submit request.
10. Show My PO Link Requests and details drawer.

## Easy To Forget

- PO linking is only allowed during PRE-CLOSING.
- Suggested records come from PO Item Mappings, not AI.
- Fully consumed records stay visible for transparency but cannot be selected.
- Pending quantities are considered in availability.
- Rejected PO links can be used to create a new request.
- PO link submission notifies PO approvers.

## Questions Users May Ask

- Why do I see suggested POs?
  - The selected budget item type has mapped PO item codes.
- Can I still manually search?
  - Yes, all PO records remain available.
- Why is a PO disabled?
  - It may have no available quantity remaining.
- Does rejected PO consume budget?
  - No, only approved PO links count.

## Business Value

- Links procurement to budget control.
- Helps Finance see consumed and remaining budget.
- Reduces manual PO matching effort.

---

# 9. PO Approval

## Purpose

Allow Finance or PO Approvers to approve or reject PO link requests.

## Main Features

- Pending PO link approval list.
- Summary cards.
- Status filter.
- Department filter.
- Financial year filter.
- Search input.
- PO approval table.
- PO link details drawer.
- Approve action.
- Reject action with reason.
- Notifications to requester.
- Audit logs for approval or rejection.

## Demo Flow

1. Open PO Link Approvals.
2. Show pending requests.
3. Filter by department or financial year.
4. Open details drawer.
5. Explain budget item, PO record, requested quantity, and linked amount.
6. Approve one request or explain approval.
7. Reject one request or explain rejection reason.
8. Show how approved links affect consumption.

## Easy To Forget

- Approval revalidates PO quantity and budget item quantity.
- Approval is allowed only during PRE-CLOSING.
- Rejection reason is required.
- Pending PO links block financial year closure.
- Approved PO links feed auto-learning for PO Item Mappings.

## Questions Users May Ask

- Why validate again during approval?
  - Availability may have changed after submission.
- Who receives rejection feedback?
  - The requester receives notification and can review status.
- Does approval update the budget directly?
  - It updates PO consumption visibility for the linked budget item.

## Business Value

- Gives Finance a formal control point before PO activity consumes budget.
- Prevents duplicate or excessive PO allocation.
- Preserves approval evidence.

---

# 10. PO Item Mapping

## Purpose

Maintain the source-of-truth relationship between budget item types and Careware PO item codes.

## Main Features

- Dedicated PO Item Mappings administration page.
- View manual and learned mappings together.
- Search mappings.
- Filter by source and status.
- Create manual mapping.
- Search budget item types.
- Search PO records / item codes.
- Disable or enable mappings through soft delete behavior.
- View mapping source:
  - MANUAL
  - APPROVED_LINK
- View learned count and last learned date.
- Mapping statistics cards.
- Collapsible Create Mapping and Filters panels.
- Sortable and paginated mappings table.

## Demo Flow

1. Open PO Item Mappings.
2. Show total, active, manual, and learned mapping cards.
3. Expand Create Mapping.
4. Search for a budget item type.
5. Search for a PO item code.
6. Create a manual mapping.
7. Show Existing Mappings table.
8. Filter by source or status.
9. Disable and re-enable a mapping.
10. Explain automatic learning from approved PO links.

## Easy To Forget

- `BS_PO_ITEM_MAPPINGS` is the source of truth for suggestions and benchmarks.
- `BS_PO_LINKS` is audit history and learning source, not the direct suggestion source.
- Manual and approved-link mappings are treated equally for Price Intelligence.
- Inactive mappings remain visible in admin screens but do not influence suggestions or benchmarks.
- Duplicate budget type plus PO item code mappings are prevented.

## Questions Users May Ask

- Why maintain mappings?
  - They connect budget item types to stable PO item codes.
- Is this AI?
  - No. It is deterministic mapping from approved knowledge.
- What is learned count?
  - How often approved PO links reinforced that mapping.

## Business Value

- Improves PO suggestions.
- Improves historical benchmark quality.
- Builds a controlled procurement knowledge base.

---

# 11. Budget Consumption

## Purpose

Show approved budget, PO consumption, transfers, and remaining balance.

## Main Features

- Budget balance summary.
- Approved amount and quantity.
- Transfer in.
- Transfer out.
- Net transfer.
- PO used amount.
- Remaining amount.
- Remaining quantity.
- Available for transfer.
- Exceeded flag if remaining is negative.
- PO Used drawer from budget item rows.
- Approved PO link table with sorting and pagination.

## Demo Flow

1. Open an approved budget or Budget View.
2. Show budget balance summary.
3. Pick a budget item.
4. Open PO Used drawer if available.
5. Show linked PO history.
6. Explain remaining budget formula.

## Easy To Forget

- Remaining includes approved PO usage and transfers.
- Pending PO links do not count as approved consumption, but can affect availability validation.
- PO Used drawer gives traceability from budget item to PO links.
- Available for transfer is not always the same as original budget.

## Questions Users May Ask

- What is remaining budget?
  - Approved amount plus transfers in, minus transfers out, minus approved PO usage.
- Why is an item exceeded?
  - Its calculated remaining amount is below zero.
- Can I see which POs consumed the item?
  - Yes, open the PO Used drawer.

## Business Value

- Shows the financial position after execution activity.
- Helps Finance control remaining budget.
- Links approvals, transfers, and procurement into one view.

---

# 12. Price Intelligence

## Purpose

Give approvers historical procurement evidence when reviewing budget item prices.

## Main Features

- Price Intelligence summary above approval table.
- Table columns for:
  - Historical Unit Price Benchmark
  - Unit Price Variance
  - Total Estimated Impact
  - Status
  - Details
- Status badge:
  - Within Benchmark
  - Review Price
  - Significant Variance
  - High Overspend Risk
  - No Benchmark Available
- Details drawer.
- Budget Information section.
- Benchmark Summary section.
- Historical Procurement Data section.
- Price Statistics section.
- Recent Historical Purchases table.
- Evidence strength:
  - HIGH
  - MEDIUM
  - LOW
  - NONE
- Median historical unit cost as benchmark.

## Demo Flow

1. Open a pending budget in Budget Approval.
2. Show Price Intelligence Summary.
3. Explain Items Analyzed, High Risk Items, Potential Overspend, Missing Benchmarks.
4. In the table, point to one item with benchmark data.
5. Explain:
   - Budget Unit Price
   - Historical Unit Price Benchmark
   - Unit Price Variance
   - Total Estimated Impact
6. Open Details.
7. Show mapped item codes, supplier count, purchase count, median, average, min, max, last purchase.
8. Show recent historical purchases.

## Easy To Forget

- Benchmark is a unit price benchmark, not total amount.
- Benchmark uses median, not average.
- Potential overspend is quantity multiplied by positive unit variance.
- Missing benchmark usually means no active mapping or no matching PO history.
- Drawer loads detail lazily.
- `BS_PO_LINKS` is not used directly for benchmark generation.
- This is not AI.

## Questions Users May Ask

- Why median?
  - It is less distorted by outlier purchases.
- What does No Benchmark Available mean?
  - No usable mapped historical PO data exists.
- Does high risk mean reject?
  - No. It means the approver should challenge or justify the price.
- Can Procurement improve benchmark quality?
  - Yes, by maintaining PO Item Mappings.

## Business Value

- Helps CFOs ask better questions.
- Highlights possible overspend.
- Makes approval decisions more defensible.
- Reduces manual price investigation.

---

# 13. Budget Analytics

## Purpose

Help Finance and Approvers filter, compare, and investigate budgets.

## Main Features

- Budget Analytics page.
- Budget comparison view.
- Budget analytics filters.
- Search and filter behavior.
- Smart Filter Bar components.
- Applied filter chips.
- Smart filter explanation.
- Smart filter autocomplete components.
- Smart filter history components.
- Price Intelligence filter examples:
  - variance greater than a threshold
  - overspend greater than a threshold
  - missing benchmark
- Comparison insights.
- Sortable tables where used.

## Demo Flow

1. Open Budget Analytics.
2. Show available filters.
3. Search or filter by department, status, year, or amount where available.
4. Use a smart filter example if visible.
5. Show applied filter chips.
6. Explain that analytics is for investigation, not approval workflow.
7. Show comparison insights or tables.

## Easy To Forget

- Smart filters are intended to populate structured analytics filters.
- They are not text-to-SQL.
- Applied chips help users understand what the system interpreted.
- Analytics differs from dashboards:
  - Dashboard = current status and action cues.
  - Analytics = exploration and comparison.

## Questions Users May Ask

- Can I type business language?
  - Smart filter components support this direction where enabled.
- Is it AI?
  - Current direction is deterministic filter parsing, not AI-generated SQL.
- Can I find high-risk budgets?
  - Price Intelligence fields support risk and variance investigation where integrated.

## Business Value

- Speeds up financial investigation.
- Helps leadership focus on exceptions.
- Reduces manual filter combination effort.

---

# 14. Dashboards

## Purpose

Give each role an immediate view of status, workload, and actions.

## Main Features

- Active Financial Year card.
- HOD cards:
  - My Department
  - Current Budget Status
  - Current Budget Total
  - PO Link Requests when permitted
- Admin / Approver cards:
  - Pending Budget Approvals
  - Approved Budget Value
  - Departments Covered
  - Pending Item Requests
  - Pending Transfer Requests
  - Pending PO Link Requests
  - System Users
- Quick action cards.
- Work panels:
  - My PO Link Requests
  - Pending PO Link Requests
  - Approval Queue
  - Admin Overview
  - Item / Category Requests
  - Transfer Requests
  - Reports Overview
- Role-aware dashboard content.

## Demo Flow

1. Open Dashboard.
2. Show active financial year.
3. Show role-specific cards.
4. Click a quick action.
5. Show work panels.
6. Explain that dashboard changes depending on permissions.

## Easy To Forget

- Dashboard cards link directly to action pages.
- Pending counters are a live work queue concept.
- HOD dashboard is different from Admin / Approver dashboard.
- PO and transfer panels appear only if relevant permission exists.

## Questions Users May Ask

- Why does my dashboard look different?
  - It is tailored to your role and permissions.
- Can I navigate directly from cards?
  - Yes, cards and quick actions open relevant pages.
- Are these executive KPIs?
  - They are operational and governance indicators for the active budget cycle.

## Business Value

- Reduces searching for work.
- Shows what needs attention.
- Gives leadership immediate status visibility.

---

# 15. Reports

## Purpose

Provide a formal entry point for budget, transfer, variance, and usage reporting.

## Main Features

- Reports page.
- Current visible description:
  - budget reports
  - transfer reports
  - variance reports
  - usage summaries
- Permission protected by `can_view_reports`.
- Dashboard Reports Overview work panel.
- Advanced reporting is roadmap / partial foundation.

## Demo Flow

1. Open Reports.
2. Explain this is the reporting entry point.
3. Mention current foundation and planned advanced report packs.
4. Connect reports to audit, governance, and leadership reviews.

## Easy To Forget

- Reports are separate from Analytics.
- Analytics is exploration; reports are formal outputs.
- Advanced reporting is not the same as fully implemented dashboard cards.

## Questions Users May Ask

- Are all reports complete today?
  - The reports entry point exists; advanced reporting is planned.
- Who should use reports?
  - CFO, Finance, Approvers, Auditors, Department Directors.

## Business Value

- Provides the future formal management reporting layer.
- Separates operational dashboard visibility from report outputs.

---

# 16. Email Notifications

## Purpose

Notify users when workflow action or status awareness is required.

## Main Features

- Notification queue and email worker.
- Budget notifications:
  - Budget Submitted
  - Budget Approved
  - Budget Returned
- Transfer notifications:
  - Transfer Submitted
  - Transfer Approved
  - Transfer Rejected
- Item request notifications:
  - Item Request Created
  - Item Request Approved
  - Item Request Rejected
- Financial year notifications:
  - Financial Year Opened
  - Financial Year Pre-Closing
  - Financial Year Closed
- PO notifications:
  - PO Link Submitted
  - PO Link Approved
  - PO Link Rejected
- Recipient strategies:
  - permission-based recipients
  - owner/requester recipients
  - broadcast-style lifecycle recipients

## Demo Flow

1. Do not open a technical email screen unless available.
2. Explain notifications during each workflow:
   - submit budget -> approver notified
   - return budget -> HOD notified
   - transfer submitted -> transfer approver notified
   - PO link submitted -> PO approver notified
3. Mention emails reduce manual follow-up.

## Easy To Forget

- Notifications are queued from domain workflows.
- Approval/rejection results notify the requester or owner.
- Financial year changes notify relevant users.
- Notifications support workflow awareness but do not replace permissions.

## Questions Users May Ask

- Will I get an email when action is needed?
  - Yes, for key workflow events tied to your role.
- Who receives approval requests?
  - Users with the relevant approval permission.
- Are notifications audited?
  - Workflow actions themselves are audited; notifications support communication.

## Business Value

- Reduces manual chasing.
- Speeds up approvals and corrections.
- Improves accountability.

---

# 17. Audit Logs

## Purpose

Track important system actions for governance, accountability, and review.

## Main Features

- Audit Logs page.
- Total log count.
- Search by action, user, entity, description, or IP.
- Filter by user.
- Filter by rows per page.
- Advanced filters:
  - date from
  - date to
  - action
  - entity type
- Pagination.
- Table columns:
  - Date
  - User
  - Action
  - Entity
  - Description
  - IP
- Audit events for:
  - financial year creation, pre-close, close
  - budget creation, submission, approval, return
  - budget item save activity
  - transfer create, approve, reject
  - PO link create, approve, reject
  - category/type activity
  - item request activity
  - user access actions

## Demo Flow

1. Open Audit Logs.
2. Search for a budget or action.
3. Filter by user.
4. Filter by date range.
5. Filter by action or entity type.
6. Explain how audit evidence answers who, what, when, and why.

## Easy To Forget

- IP address is shown.
- Page size can be changed.
- Reset clears filters.
- Audit Logs require user management permission.
- Some read-only activity is not audited; state-changing activity is the focus.

## Questions Users May Ask

- Can audit logs show who approved a budget?
  - Yes, approval actions are tracked.
- Can audit logs show why a budget was returned?
  - Return notes and return actions provide context.
- Can users edit audit logs?
  - No normal user workflow should edit audit history.

## Business Value

- Supports internal control.
- Helps explain decisions during review.
- Reduces reliance on scattered email evidence.

---

# 18. User Access & Permissions

## Purpose

Manage who can view, edit, approve, and administer budget system functions.

## Main Features

- User Access page.
- Search users.
- Create user access assignment.
- Edit assignment.
- Delete assignment.
- Activate or deactivate assignment.
- Department assignment.
- Role assignment.
- Permission overrides.
- Role defaults with optional per-user overrides.
- Permission chips in user table.
- Hard delete confirmation for user access assignment.
- Role and department management routes exist.

## Core Permissions To Mention

- `can_view_budget`
- `can_edit_budget`
- `can_approve_budget`
- `can_request_transfer`
- `can_approve_transfer`
- `can_view_po_links`
- `can_request_po_links`
- `can_view_all_po_link_requests`
- `can_approve_po_links`
- `can_manage_users`
- `can_manage_categories`
- `can_manage_po_item_mappings`
- `can_manage_financial_years`
- `can_view_reports`

## Demo Flow

1. Open User Access.
2. Search for a user.
3. Show role and department.
4. Show permission chips.
5. Edit an assignment.
6. Explain role defaults versus overrides.
7. Show activation/deactivation.

## Easy To Forget

- Menu visibility follows permission state.
- Admin permissions are separated:
  - user access
  - budget configuration
  - PO item mappings
  - financial years
- HOD, Approver, PO Approver, and Admin can have different combinations.
- User access changes are audit-relevant.

## Questions Users May Ask

- Can a user be restricted to one department?
  - Yes, access includes department context.
- Can Admin give only one extra permission?
  - Yes, through overrides where configured.
- Why do I see "Role defaults"?
  - The user is using inherited permissions without explicit overrides.

## Business Value

- Supports segregation of duties.
- Controls sensitive financial actions.
- Keeps the system aligned with hospital responsibility boundaries.

---

# 19. Projects Feature

## Purpose

Show budget items marked as projects with elevated visibility.

## Main Features

- Project Item flag in Budget Entry.
- Project badge in budget item tables.
- Projects page.
- Project filters:
  - financial year
  - status
  - department
  - budget
  - project name
- Projects list shows project budget items.
- Project row opens Project Details page.
- Project Details page exists as a placeholder / foundation.
- Projects remain budget items, not a separate project management system.

## Demo Flow

1. In Budget Entry, mark an item as Project.
2. Show the Project badge in the budget item table.
3. Open Projects page.
4. Filter by year, department, status, or project name.
5. Open a project detail row.
6. Explain current foundation and future direction.

## Easy To Forget

- Project display name is the budget item type name.
- There is no separate project name field.
- If a specific project name is required, the approved approach is to create/request that item type.
- Project = budget item with elevated visibility.
- Not full project management software.

## Questions Users May Ask

- Can one project contain multiple item types today?
  - Current model treats project as a budget item with project visibility.
- Is this a project management module?
  - No, it is a budget-driven project visibility foundation.
- Will there be milestones later?
  - Future roadmap may add tracking, reporting, and oversight features.

## Business Value

- Highlights important budget initiatives.
- Helps executives identify project-related budget lines.
- Creates a foundation for project reporting.

---

# 20. Future Roadmap

## Purpose

Clarify planned direction without presenting roadmap items as fully operational.

## Roadmap Items To Mention

- Projects expansion:
  - project dashboards
  - project reporting
  - executive oversight
  - possible milestones, risks, documents, and procurement tracking
- Companies / Vendors:
  - supplier spending visibility
  - vendor concentration analysis
  - procurement transparency
  - supplier-based reporting
- Advanced Reporting:
  - budget status reports
  - department reports
  - approval reports
  - transfer reports
  - PO linking reports
  - consumption reports
  - Price Intelligence reports
  - audit reports
- Smart Analytics Filters:
  - natural language filter bar
  - deterministic parser
  - applied filter chips
  - autocomplete and suggestions
  - no text-to-SQL
- Future AI-Assisted Analysis:
  - future enhancement only
  - should remain explainable and governed
  - should not replace accountable human approval

## Demo Flow

1. End the demo by separating current system from future roadmap.
2. Show Reports and Projects as foundation where useful.
3. Explain future capabilities in business terms only.
4. Avoid promising delivery dates unless already agreed separately.

## Easy To Forget

- Companies / Vendors is planned, not operational.
- Advanced Reporting is partial/planned.
- Smart Analytics Filters are a planned or staged analytics enhancement.
- AI-assisted analysis is future, not current workflow.

## Questions Users May Ask

- Are vendors fully implemented?
  - No, vendor management is a planned capability.
- Are smart filters live?
  - The direction exists; explain only what is visible in the current build.
- Will AI approve budgets?
  - No. Future AI should support analysis, not replace accountable approval.

## Business Value

- Shows that the platform can grow.
- Keeps expectations realistic.
- Connects current controls to future executive insight.

---

# Complete Demo Checklist

## Authentication & Access

- [ ] Login
- [ ] User name and role label
- [ ] Sidebar expands and collapses
- [ ] Role-based menu visibility
- [ ] Permission-protected pages
- [ ] Logout or session behavior if relevant

## Financial Years

- [ ] Financial year list
- [ ] OPEN status
- [ ] PRE-CLOSING status
- [ ] CLOSED status
- [ ] Create next financial year
- [ ] Department budget shells created with new year
- [ ] Pre-close rule: all budgets approved
- [ ] Close rule: no pending transfers
- [ ] Close rule: no pending PO links
- [ ] Financial year notifications

## Budget Configuration

- [ ] Categories list
- [ ] Item/type list
- [ ] OPEX / CAPEX selection
- [ ] Create category
- [ ] Create item/type
- [ ] Edit category
- [ ] Edit item/type
- [ ] Deactivate category
- [ ] Deactivate item/type
- [ ] Usage warning before edit/deactivate
- [ ] Category search
- [ ] Item/type search
- [ ] Item/category requests panel
- [ ] Request status filter
- [ ] Approve request
- [ ] Approve and auto-create
- [ ] Approve only
- [ ] Reject request
- [ ] Admin notes

## Budget Entry

- [ ] Current department budget
- [ ] Budget status
- [ ] Add budget item
- [ ] Category selection
- [ ] Item/type selection
- [ ] Quantity
- [ ] Unit price
- [ ] Total amount
- [ ] Annual distribution
- [ ] Monthly distribution
- [ ] Quarterly distribution
- [ ] Custom distribution
- [ ] Distribution validation
- [ ] Project Item flag
- [ ] Project badge
- [ ] Save draft
- [ ] Submit budget
- [ ] Submitted budget locks editing
- [ ] Copy Budget From History
- [ ] Historical budget search
- [ ] Copy preview
- [ ] Excel import
- [ ] Download import template if visible
- [ ] Import validation results
- [ ] Request missing item/type
- [ ] Request new category
- [ ] Returned feedback panel
- [ ] Unsaved changes protection

## Budget Approval

- [ ] Pending budget list
- [ ] Search pending budgets
- [ ] Collapsible sidebar
- [ ] Budget review summary
- [ ] Read-only item table
- [ ] Sortable item columns
- [ ] Project badge in approval table
- [ ] Price Intelligence summary
- [ ] Historical Unit Price Benchmark column
- [ ] Unit Price Variance column
- [ ] Total Estimated Impact column
- [ ] Price status badge
- [ ] Details button
- [ ] General approval note
- [ ] Item-level approval note
- [ ] Approve budget
- [ ] Return budget
- [ ] Budget timeline

## Return & Feedback

- [ ] Required general return note
- [ ] Optional item-level return notes
- [ ] RETURNED status
- [ ] HOD can edit returned budget
- [ ] HOD sees notes
- [ ] Item notes point to specific rows
- [ ] Resubmit after correction
- [ ] Return notification
- [ ] Return audit log

## Transfers

- [ ] Transfer Requests page
- [ ] Source item selection
- [ ] Available balance
- [ ] Existing target item
- [ ] New target item
- [ ] Transfer quantity / amount
- [ ] Transfer reason
- [ ] Submit confirmation
- [ ] My Transfer Requests table
- [ ] Transfer status filters
- [ ] Transfer search
- [ ] Transfer Approval page
- [ ] Transfer details drawer
- [ ] Approve transfer
- [ ] Reject transfer with reason
- [ ] Transfer notifications
- [ ] Transfer audit logs
- [ ] Pending transfers block closure

## PO Linking

- [ ] PO Link Requests page
- [ ] Budget selection
- [ ] Budget item selection
- [ ] Suggested PO Records
- [ ] All PO Records
- [ ] PO search
- [ ] Fully Consumed / No Available Quantity state
- [ ] Requested quantity
- [ ] Linked amount preview
- [ ] PO quantity validation
- [ ] Budget item remaining quantity validation
- [ ] Submit PO link request
- [ ] Confirmation modal
- [ ] My PO Link Requests
- [ ] PO request status tabs
- [ ] Rejected request create-again
- [ ] PO link details drawer
- [ ] PO transparency / allocation history if available

## PO Approval

- [ ] PO Link Approvals page
- [ ] Summary cards
- [ ] Status filter
- [ ] Department filter
- [ ] Financial year filter
- [ ] Search input
- [ ] Pending PO approval table
- [ ] Details drawer
- [ ] Approve PO link
- [ ] Reject PO link with reason
- [ ] Approval revalidation
- [ ] PO link notifications
- [ ] PO link audit logs
- [ ] Pending PO links block closure

## PO Item Mapping

- [ ] PO Item Mappings page
- [ ] Statistics cards
- [ ] Create Mapping panel
- [ ] Budget type search
- [ ] PO item search
- [ ] Manual mapping creation
- [ ] Existing mappings table
- [ ] Search mappings
- [ ] Source filter
- [ ] Status filter
- [ ] Sortable columns
- [ ] Pagination
- [ ] MANUAL source
- [ ] APPROVED_LINK source
- [ ] Learned count
- [ ] Last learned date
- [ ] Disable mapping
- [ ] Enable mapping
- [ ] Explain source of truth

## Budget Consumption

- [ ] Approved amount
- [ ] PO consumed amount
- [ ] Transfer in
- [ ] Transfer out
- [ ] Net transfer
- [ ] Remaining amount
- [ ] Remaining quantity
- [ ] Available for transfer
- [ ] Exceeded indicator
- [ ] PO Used drawer
- [ ] Approved PO link table
- [ ] PO link table sorting
- [ ] PO link table pagination

## Price Intelligence

- [ ] Explain not AI
- [ ] Explain PO Item Mapping data flow
- [ ] Price Intelligence Summary cards
- [ ] Items Analyzed
- [ ] High Risk Items
- [ ] Potential Overspend
- [ ] Missing Benchmarks
- [ ] Historical Unit Price Benchmark
- [ ] Median benchmark
- [ ] Average price
- [ ] Minimum price
- [ ] Maximum price
- [ ] Last purchase price
- [ ] Last purchase date
- [ ] Unit Price Variance
- [ ] Variance percent
- [ ] Total Estimated Impact
- [ ] Potential Overspend
- [ ] Evidence Strength
- [ ] Mapped item codes
- [ ] Purchase count
- [ ] Supplier count
- [ ] Recent historical purchases
- [ ] No Benchmark Available state

## Budget Analytics

- [ ] Budget Analytics page
- [ ] Filters
- [ ] Search
- [ ] Comparison view
- [ ] Comparison insights
- [ ] Smart Filter Bar if visible
- [ ] Applied filter chips
- [ ] Autocomplete suggestions if visible
- [ ] Smart filter history if visible
- [ ] Price Intelligence filter examples
- [ ] Explain not text-to-SQL

## Dashboards

- [ ] Active Financial Year card
- [ ] HOD dashboard cards
- [ ] Approver/Admin dashboard cards
- [ ] Pending Budget Approvals
- [ ] Approved Budget Value
- [ ] Departments Covered
- [ ] Pending Item Requests
- [ ] Pending Transfer Requests
- [ ] Pending PO Link Requests
- [ ] System Users
- [ ] Quick actions
- [ ] Work panels
- [ ] Role-aware dashboard behavior

## Reports

- [ ] Reports page
- [ ] Budget reports concept
- [ ] Transfer reports concept
- [ ] Variance reports concept
- [ ] Usage summaries concept
- [ ] Explain advanced reporting roadmap

## Email Notifications

- [ ] Budget Submitted
- [ ] Budget Approved
- [ ] Budget Returned
- [ ] Transfer Submitted
- [ ] Transfer Approved
- [ ] Transfer Rejected
- [ ] PO Link Submitted
- [ ] PO Link Approved
- [ ] PO Link Rejected
- [ ] Item Request Created
- [ ] Item Request Approved
- [ ] Item Request Rejected
- [ ] Financial Year Opened
- [ ] Financial Year Pre-Closing
- [ ] Financial Year Closed

## Audit Logs

- [ ] Audit Logs page
- [ ] Search logs
- [ ] Filter by user
- [ ] Filter by date from
- [ ] Filter by date to
- [ ] Filter by action
- [ ] Filter by entity type
- [ ] Page size
- [ ] Pagination
- [ ] IP address
- [ ] Reset filters

## User Access & Permissions

- [ ] User Access page
- [ ] Search users
- [ ] Create assignment
- [ ] Edit assignment
- [ ] Role assignment
- [ ] Department assignment
- [ ] Permission overrides
- [ ] Role defaults
- [ ] Activate / deactivate user access
- [ ] Delete assignment confirmation
- [ ] Permission chips
- [ ] Menu changes after permissions

## Projects Feature

- [ ] Project Item flag
- [ ] Project badge
- [ ] Projects page
- [ ] Financial year filter
- [ ] Status filter
- [ ] Department filter
- [ ] Budget filter
- [ ] Project name filter
- [ ] Project Details placeholder
- [ ] Explain project is still a budget item
- [ ] Explain future project roadmap

## Future Roadmap

- [ ] Projects expansion
- [ ] Companies / Vendors
- [ ] Advanced Reporting
- [ ] Smart Analytics Filters
- [ ] Future AI-Assisted Analysis
- [ ] Separate implemented from planned

