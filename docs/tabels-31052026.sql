
/* QNH Budget System Rebuild Script
   Generated from current backend repositories
*/

CREATE TABLE BS_departments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE BS_budget_roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500) NULL
);

CREATE TABLE BS_budget_role_permissions (
    role_id INT PRIMARY KEY,
    can_view_budget BIT NOT NULL DEFAULT 0,
    can_edit_budget BIT NOT NULL DEFAULT 0,
    can_link_po BIT NOT NULL DEFAULT 0,
    can_request_transfer BIT NOT NULL DEFAULT 0,
    can_approve_budget BIT NOT NULL DEFAULT 0,
    can_approve_transfer BIT NOT NULL DEFAULT 0,
    can_manage_users BIT NOT NULL DEFAULT 0,
    can_manage_categories BIT NOT NULL DEFAULT 0,
    can_view_reports BIT NOT NULL DEFAULT 0,
    can_manage_financial_years BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_BSRP_Role FOREIGN KEY(role_id)
        REFERENCES BS_budget_roles(id)
);

CREATE TABLE BS_financial_years (
    id INT IDENTITY(1,1) PRIMARY KEY,
    [year] INT NOT NULL UNIQUE,
    [status] VARCHAR(30) NOT NULL,
    started_by INT NULL,
    started_at DATETIME NULL,
    pre_closed_by INT NULL,
    pre_closed_at DATETIME NULL,
    closed_by INT NULL,
    closed_at DATETIME NULL,
    CONSTRAINT CK_BS_financial_years_status
    CHECK ([status] IN ('OPEN','PRE_CLOSING','CLOSED'))
);

CREATE TABLE BS_budget_user_roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
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
    can_manage_financial_years BIT NULL,

    is_active BIT NOT NULL DEFAULT 1,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME NULL,

    CONSTRAINT FK_BSUR_Department FOREIGN KEY(department_id)
        REFERENCES BS_departments(id),
    CONSTRAINT FK_BSUR_Role FOREIGN KEY(role_id)
        REFERENCES BS_budget_roles(id)
);

CREATE TABLE BS_budget_categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL UNIQUE,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE BS_budget_types (
    id INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT NOT NULL,
    name NVARCHAR(200) NOT NULL,
    expense_type VARCHAR(20) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_BST_Category FOREIGN KEY(category_id)
        REFERENCES BS_budget_categories(id),

    CONSTRAINT CK_BST_ExpenseType
    CHECK (expense_type IN ('CAPEX','OPEX'))
);

CREATE TABLE BS_budgets (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    department_id INT NOT NULL,
    financial_year_id INT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

    submitted_by INT NULL,
    submitted_at DATETIME NULL,

    approved_by INT NULL,
    approved_at DATETIME NULL,

    returned_by INT NULL,
    returned_at DATETIME NULL,

    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME NULL,

    is_active BIT NOT NULL DEFAULT 1,

    CONSTRAINT FK_Budget_FY FOREIGN KEY(financial_year_id)
        REFERENCES BS_financial_years(id),

    CONSTRAINT FK_Budget_Department FOREIGN KEY(department_id)
        REFERENCES BS_departments(id),

    CONSTRAINT UQ_Budget_Department_Year
        UNIQUE(department_id, financial_year_id),

    CONSTRAINT CK_Budget_Status
    CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','RETURNED'))
);

CREATE TABLE BS_budget_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    budget_id BIGINT NOT NULL,
    type_id INT NOT NULL,

    quantity DECIMAL(18,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,

    distribution_method VARCHAR(50) NOT NULL,
    distribution_level VARCHAR(20) NULL,

    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME NULL,

    is_active BIT NOT NULL DEFAULT 1,

    CONSTRAINT FK_BI_Budget FOREIGN KEY(budget_id)
        REFERENCES BS_budgets(id),

    CONSTRAINT FK_BI_Type FOREIGN KEY(type_id)
        REFERENCES BS_budget_types(id)
);

CREATE TABLE BS_budget_item_distribution (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    budget_item_id BIGINT NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    period_no INT NOT NULL,
    quantity DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT FK_BID_Item FOREIGN KEY(budget_item_id)
        REFERENCES BS_budget_items(id)
);

CREATE TABLE BS_budget_notes (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    budget_id BIGINT NOT NULL,
    budget_item_id BIGINT NULL,

    note_type VARCHAR(50) NOT NULL,
    note NVARCHAR(MAX) NOT NULL,

    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_BN_Budget FOREIGN KEY(budget_id)
        REFERENCES BS_budgets(id),

    CONSTRAINT FK_BN_Item FOREIGN KEY(budget_item_id)
        REFERENCES BS_budget_items(id)
);

CREATE TABLE BS_budget_item_requests (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    existing_category_id INT NULL,

    requested_category_name NVARCHAR(200) NULL,
    requested_type_name NVARCHAR(200) NOT NULL,

    requested_by INT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    admin_note NVARCHAR(MAX) NULL,

    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_BIR_Category FOREIGN KEY(existing_category_id)
        REFERENCES BS_budget_categories(id),

    CONSTRAINT CK_BIR_Status
    CHECK (status IN ('PENDING','APPROVED','REJECTED'))
);

CREATE TABLE BS_audit_logs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    action NVARCHAR(100) NOT NULL,

    entity_type NVARCHAR(100) NOT NULL,
    entity_id NVARCHAR(100) NULL,
    entity_name NVARCHAR(300) NULL,

    description NVARCHAR(500) NULL,

    old_values NVARCHAR(MAX) NULL,
    new_values NVARCHAR(MAX) NULL,

    user_id INT NULL,
    user_code NVARCHAR(100) NULL,
    user_name NVARCHAR(200) NULL,

    department_id INT NULL,
    role_name NVARCHAR(100) NULL,

    ip_address NVARCHAR(100) NULL,
    user_agent NVARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Budgets_Status ON BS_budgets(status);
CREATE INDEX IX_Budgets_FY ON BS_budgets(financial_year_id);
CREATE INDEX IX_BudgetItems_BudgetId ON BS_budget_items(budget_id);
CREATE INDEX IX_BudgetNotes_BudgetId ON BS_budget_notes(budget_id);
CREATE INDEX IX_AuditLogs_Entity ON BS_audit_logs(entity_type, entity_id);
CREATE INDEX IX_AuditLogs_CreatedAt ON BS_audit_logs(created_at);

INSERT INTO BS_budget_roles(name,description)
VALUES
('ADMIN','System Administrator'),
('HOD','Head Of Department'),
('APPROVER','Budget Approver');
