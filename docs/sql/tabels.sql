/* =========================================================
   QNH Budget System - SQL Server Tables
   Prefix: BS_
   ========================================================= */

------------------------------------------------------------
-- 1. Departments
------------------------------------------------------------
CREATE TABLE BS_departments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_BS_departments_name UNIQUE (name)
);

------------------------------------------------------------
-- 2. Budget Roles
------------------------------------------------------------
CREATE TABLE BS_budget_roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200) NULL,

    CONSTRAINT UQ_BS_budget_roles_name UNIQUE (name)
);

------------------------------------------------------------
-- 3. Budget Role Permissions
------------------------------------------------------------
CREATE TABLE BS_budget_role_permissions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_id INT NOT NULL,

    can_view_budget BIT NOT NULL DEFAULT 0,
    can_edit_budget BIT NOT NULL DEFAULT 0,
    can_link_po BIT NOT NULL DEFAULT 0,
    can_request_transfer BIT NOT NULL DEFAULT 0,
    can_approve_budget BIT NOT NULL DEFAULT 0,
    can_approve_transfer BIT NOT NULL DEFAULT 0,
    can_manage_users BIT NOT NULL DEFAULT 0,
    can_manage_categories BIT NOT NULL DEFAULT 0,
    can_view_reports BIT NOT NULL DEFAULT 0,

    CONSTRAINT FK_BS_budget_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES BS_budget_roles(id),

    CONSTRAINT UQ_BS_budget_role_permissions_role
        UNIQUE (role_id)
);

------------------------------------------------------------
-- 4. Budget User Roles
------------------------------------------------------------
CREATE TABLE BS_budget_user_roles (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NOT NULL,
    department_id INT NULL,
    role_id INT NOT NULL,

    can_view_budget BIT NULL,
    can_edit_budget BIT NULL,
    can_link_po BIT NULL,
    can_request_transfer BIT NULL,
    can_approve_budget BIT NULL,
    can_approve_transfer BIT NULL,
    can_manage_users BIT NULL,
    can_manage_categories BIT NULL,
    can_view_reports BIT NULL,

    is_active BIT NOT NULL DEFAULT 1,

    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NULL,

    CONSTRAINT FK_BS_budget_user_roles_department
        FOREIGN KEY (department_id) REFERENCES BS_departments(id),

    CONSTRAINT FK_BS_budget_user_roles_role
        FOREIGN KEY (role_id) REFERENCES BS_budget_roles(id),

    CONSTRAINT UQ_BS_budget_user_roles
        UNIQUE (user_id, department_id, role_id)
);

------------------------------------------------------------
-- 5. Budgets
------------------------------------------------------------
CREATE TABLE BS_budgets (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    department_id INT NOT NULL,
    year INT NOT NULL,
    status VARCHAR(50) NOT NULL,

    copied_from_budget_id BIGINT NULL,

    submitted_by INT NULL,
    submitted_at DATETIME NULL,

    approved_by INT NULL,
    approved_at DATETIME NULL,

    returned_by INT NULL,
    returned_at DATETIME NULL,

    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NULL,

    is_active BIT NOT NULL DEFAULT 1,

    CONSTRAINT FK_BS_budgets_department
        FOREIGN KEY (department_id) REFERENCES BS_departments(id),

    CONSTRAINT FK_BS_budgets_copied_from
        FOREIGN KEY (copied_from_budget_id) REFERENCES BS_budgets(id),

    CONSTRAINT UQ_BS_budgets_department_year
        UNIQUE (department_id, year),

    CONSTRAINT CK_BS_budgets_status
        CHECK (status IN (
            'DRAFT',
            'PENDING_APPROVAL',
            'APPROVED',
            'RETURNED',
            'CANCELLED'
        )),

    CONSTRAINT CK_BS_budgets_year
        CHECK (year BETWEEN 2000 AND 2100)
);

------------------------------------------------------------
-- 6. Budget Categories
------------------------------------------------------------
CREATE TABLE BS_budget_categories (
    id INT IDENTITY(1,1) PRIMARY KEY,

    name VARCHAR(200) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_BS_budget_categories_name
        UNIQUE (name)
);

------------------------------------------------------------
-- 7. Budget Types
------------------------------------------------------------
CREATE TABLE BS_budget_types (
    id INT IDENTITY(1,1) PRIMARY KEY,

    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_BS_budget_types_category
        FOREIGN KEY (category_id) REFERENCES BS_budget_categories(id),

    CONSTRAINT UQ_BS_budget_types_category_name
        UNIQUE (category_id, name)
);

------------------------------------------------------------
-- 8. Budget Items
------------------------------------------------------------
CREATE TABLE BS_budget_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    budget_id BIGINT NOT NULL,
    category_id INT NOT NULL,
    type_id INT NOT NULL,

    quantity DECIMAL(18,2) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    expense_type VARCHAR(10) NOT NULL,
    copied_from_item_id BIGINT NULL,

    distribution_method VARCHAR(50) NOT NULL,
    distribution_level VARCHAR(50) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NULL,
    is_active BIT NOT NULL DEFAULT 1,


    CONSTRAINT FK_BS_budget_items_budget
        FOREIGN KEY (budget_id) REFERENCES BS_budgets(id),

    CONSTRAINT FK_BS_budget_items_category
        FOREIGN KEY (category_id) REFERENCES BS_budget_categories(id),

    CONSTRAINT FK_BS_budget_items_type
        FOREIGN KEY (type_id) REFERENCES BS_budget_types(id),

    CONSTRAINT FK_BS_budget_items_copied_from
        FOREIGN KEY (copied_from_item_id) REFERENCES BS_budget_items(id),

    CONSTRAINT CK_BS_budget_items_quantity
        CHECK (quantity >= 0),

    CONSTRAINT CK_BS_budget_items_unit_price
        CHECK (unit_price >= 0),

    CONSTRAINT CK_BS_budget_items_total_amount
        CHECK (total_amount >= 0),

    CONSTRAINT CK_BS_budget_items_expense_type
        CHECK (expense_type IN ('OPEX','CAPEX')),

    CONSTRAINT CK_BS_budget_items_distribution
        CHECK (
            (distribution_method = 'MONTHLY' AND distribution_level = 'MONTH')
            OR
            (distribution_method = 'QUARTERLY' AND distribution_level = 'QUARTER')
            OR
            (distribution_method = 'ANNUAL' AND distribution_level = 'YEAR')
            OR
            (distribution_method = 'CUSTOM' AND distribution_level IN ('MONTH','QUARTER'))
        )
);

------------------------------------------------------------
-- 9. Budget Item Distribution
------------------------------------------------------------
CREATE TABLE BS_budget_item_distribution (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    budget_item_id BIGINT NOT NULL,

    period_type VARCHAR(50) NOT NULL,
    period_no INT NOT NULL,

    quantity DECIMAL(18,2) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_BS_budget_item_distribution_item
        FOREIGN KEY (budget_item_id) REFERENCES BS_budget_items(id),

    CONSTRAINT UQ_BS_budget_item_distribution_period
        UNIQUE (budget_item_id, period_type, period_no),

    CONSTRAINT CK_BS_budget_item_distribution_period
        CHECK (
            (period_type = 'MONTH' AND period_no BETWEEN 1 AND 12)
            OR
            (period_type = 'QUARTER' AND period_no BETWEEN 1 AND 4)
        ),

    CONSTRAINT CK_BS_budget_item_distribution_quantity
        CHECK (quantity >= 0)
);

------------------------------------------------------------
-- 10. Budget Notes
------------------------------------------------------------
CREATE TABLE BS_budget_notes (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    budget_id BIGINT NOT NULL,
    budget_item_id BIGINT NULL,

    note_type VARCHAR(50) NOT NULL,
    note NVARCHAR(MAX) NOT NULL,

    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_BS_budget_notes_budget
        FOREIGN KEY (budget_id) REFERENCES BS_budgets(id),

    CONSTRAINT FK_BS_budget_notes_item
        FOREIGN KEY (budget_item_id) REFERENCES BS_budget_items(id),

    CONSTRAINT CK_BS_budget_notes_type
        CHECK (note_type IN (
            'GENERAL_RETURN',
            'ITEM_RETURN',
            'GENERAL_APPROVAL',
            'ITEM_APPROVAL'
        ))
);

------------------------------------------------------------
-- 11. Budget Item Requests
------------------------------------------------------------
CREATE TABLE BS_budget_item_requests (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    requested_category_name VARCHAR(200) NULL,
    requested_type_name VARCHAR(200) NOT NULL,

    existing_category_id INT NULL,
    unit_of_measure_id INT NULL,

    requested_by INT NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',

    admin_note NVARCHAR(MAX) NULL,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_BS_budget_item_requests_existing_category
        FOREIGN KEY (existing_category_id) REFERENCES BS_budget_categories(id),

    CONSTRAINT FK_BS_budget_item_requests_unit_of_measure
        FOREIGN KEY (unit_of_measure_id) REFERENCES BS_units_of_measure(id),

    CONSTRAINT CK_BS_budget_item_requests_status
        CHECK (status IN ('PENDING','APPROVED','REJECTED')),

    CONSTRAINT CK_BS_budget_item_requests_category_logic
        CHECK (
            existing_category_id IS NOT NULL
            OR requested_category_name IS NOT NULL
        )
);

------------------------------------------------------------
-- 12. Budget PO Links
------------------------------------------------------------
CREATE TABLE BS_budget_po_links (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    budget_item_id BIGINT NOT NULL,

    po_number VARCHAR(100) NOT NULL,
    po_line_id VARCHAR(100) NOT NULL,
    po_line_description NVARCHAR(500) NULL,

    po_date DATE NULL,
    department_id INT NULL,
    careware_status VARCHAR(50) NULL,

    amount DECIMAL(18,2) NOT NULL,
    quantity DECIMAL(18,2) NULL,

    linked_by INT NOT NULL,
    linked_at DATETIME NOT NULL DEFAULT GETDATE(),

    is_active BIT NOT NULL DEFAULT 1,

    CONSTRAINT FK_BS_budget_po_links_item
        FOREIGN KEY (budget_item_id) REFERENCES BS_budget_items(id),

    CONSTRAINT FK_BS_budget_po_links_department
        FOREIGN KEY (department_id) REFERENCES BS_departments(id),

    CONSTRAINT UQ_BS_budget_po_links_po_line
        UNIQUE (po_line_id),

    CONSTRAINT CK_BS_budget_po_links_amount
        CHECK (amount >= 0),

    CONSTRAINT CK_BS_budget_po_links_quantity
        CHECK (quantity IS NULL OR quantity >= 0)
);

------------------------------------------------------------
-- 13. Budget Transfers
------------------------------------------------------------
CREATE TABLE BS_budget_transfers (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    from_item_id BIGINT NOT NULL,
    to_item_id BIGINT NULL,

    to_category_id INT NULL,
    to_type_id INT NULL,

    amount DECIMAL(18,2) NOT NULL,

    source_quantity DECIMAL(18,2) NULL,
    target_quantity DECIMAL(18,2) NULL,

    transfer_input_type VARCHAR(50) NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    reason NVARCHAR(MAX) NULL,

    requested_by INT NOT NULL,
    requested_at DATETIME NOT NULL DEFAULT GETDATE(),

    approved_by INT NULL,
    approved_at DATETIME NULL,

    rejected_by INT NULL,
    rejected_at DATETIME NULL,
    rejection_note NVARCHAR(MAX) NULL,

    CONSTRAINT FK_BS_budget_transfers_from_item
        FOREIGN KEY (from_item_id) REFERENCES BS_budget_items(id),

    CONSTRAINT FK_BS_budget_transfers_to_item
        FOREIGN KEY (to_item_id) REFERENCES BS_budget_items(id),

    CONSTRAINT FK_BS_budget_transfers_to_category
        FOREIGN KEY (to_category_id) REFERENCES BS_budget_categories(id),

    CONSTRAINT FK_BS_budget_transfers_to_type
        FOREIGN KEY (to_type_id) REFERENCES BS_budget_types(id),

    CONSTRAINT CK_BS_budget_transfers_target
        CHECK (
            (to_item_id IS NOT NULL AND to_category_id IS NULL AND to_type_id IS NULL)
            OR
            (to_item_id IS NULL AND to_category_id IS NOT NULL AND to_type_id IS NOT NULL)
        ),

    CONSTRAINT CK_BS_budget_transfers_status
        CHECK (status IN ('PENDING_APPROVAL','APPROVED','REJECTED')),

    CONSTRAINT CK_BS_budget_transfers_input_type
        CHECK (transfer_input_type IN ('AMOUNT','TARGET_QUANTITY')),

    CONSTRAINT CK_BS_budget_transfers_amount
        CHECK (amount > 0),

    CONSTRAINT CK_BS_budget_transfers_quantities
        CHECK (
            (source_quantity IS NULL OR source_quantity >= 0)
            AND
            (target_quantity IS NULL OR target_quantity >= 0)
        )
);

------------------------------------------------------------
-- 14. Budget Audit Logs
------------------------------------------------------------
CREATE TABLE BS_budget_audit_logs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NULL,

    budget_id BIGINT NULL,
    budget_item_id BIGINT NULL,

    action VARCHAR(200) NOT NULL,
    entity VARCHAR(200) NOT NULL,
    entity_id BIGINT NULL,

    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,

    request_id VARCHAR(100) NULL,
    user_agent NVARCHAR(500) NULL,
    ip_address VARCHAR(100) NULL,

    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_BS_budget_audit_logs_budget
        FOREIGN KEY (budget_id) REFERENCES BS_budgets(id),

    CONSTRAINT FK_BS_budget_audit_logs_item
        FOREIGN KEY (budget_item_id) REFERENCES BS_budget_items(id)
);
