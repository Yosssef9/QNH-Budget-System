/* ============================================================
   QNH Budget System
   Centralized Category Budget Workflow Schema

   Purpose:
   Defines the clean long-term database model for the new workflow:

   Department User
   -> Category Budget Manager
   -> CFO
   -> Execution

   Core design rules:
   - BS_budget_categories represents the three hospital responsibility
     categories: IT, Biomedical, General.
   - Every BS_budget_types row belongs to exactly one category.
   - Department requests store requested quantities only.
   - Consolidated category type reviews represent the CFO-facing
     record, for example FY 2026 + IT + Laptop.
   - Attachments belong to the consolidated type review, not to
     individual department request rows.
   - Pricing exists only on selected consolidated review sub-item lines.
   - Requested totals, selected sub-item totals, and price totals are
     calculated from source rows and are not stored as authoritative
     duplicate values.

   This script defines schema only. Do not execute in production without
   a reviewed deployment plan.
   ============================================================ */

BEGIN TRY
  BEGIN TRANSACTION;

  /* ============================================================
     1. Budget Category Master Contract
     ============================================================ */

  IF COL_LENGTH('dbo.BS_budget_categories', 'code') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_budget_categories
      ADD code VARCHAR(30) NULL;
  END;

  IF COL_LENGTH('dbo.BS_budget_categories', 'updated_at') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_budget_categories
      ADD updated_at DATETIME2 NULL;
  END;

  IF COL_LENGTH('dbo.BS_budget_categories', 'created_by') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_budget_categories
      ADD created_by INT NULL;
  END;

  IF COL_LENGTH('dbo.BS_budget_categories', 'updated_by') IS NULL
  BEGIN
    ALTER TABLE dbo.BS_budget_categories
      ADD updated_by INT NULL;
  END;

  UPDATE dbo.BS_budget_categories
  SET code =
    CASE
      WHEN UPPER(LTRIM(RTRIM(name))) = 'IT' THEN 'IT'
      WHEN UPPER(LTRIM(RTRIM(name))) = 'BIOMEDICAL' THEN 'BIOMEDICAL'
      WHEN UPPER(LTRIM(RTRIM(name))) = 'GENERAL' THEN 'GENERAL'
      ELSE code
    END
  WHERE code IS NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.BS_budget_categories
    WHERE code = 'IT'
  )
  BEGIN
    INSERT INTO dbo.BS_budget_categories (code, name, is_active, created_at)
    VALUES ('IT', 'IT', 1, SYSUTCDATETIME());
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.BS_budget_categories
    WHERE code = 'BIOMEDICAL'
  )
  BEGIN
    INSERT INTO dbo.BS_budget_categories (code, name, is_active, created_at)
    VALUES ('BIOMEDICAL', 'Biomedical', 1, SYSUTCDATETIME());
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.BS_budget_categories
    WHERE code = 'GENERAL'
  )
  BEGIN
    INSERT INTO dbo.BS_budget_categories (code, name, is_active, created_at)
    VALUES ('GENERAL', 'General', 1, SYSUTCDATETIME());
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_BS_budget_categories_code'
      AND object_id = OBJECT_ID('dbo.BS_budget_categories')
  )
  BEGIN
    CREATE UNIQUE INDEX UQ_BS_budget_categories_code
      ON dbo.BS_budget_categories (code)
      WHERE code IS NOT NULL;
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_BS_budget_categories_major_code'
  )
  BEGIN
    ALTER TABLE dbo.BS_budget_categories
      ADD CONSTRAINT CK_BS_budget_categories_major_code
      CHECK (code IN ('IT', 'BIOMEDICAL', 'GENERAL'));
  END;

  /* ============================================================
     2. Reusable Sub-Item Master
     ============================================================ */

  IF OBJECT_ID('dbo.BS_budget_sub_items', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_budget_sub_items (
      id BIGINT IDENTITY(1,1) NOT NULL,
      budget_type_id INT NOT NULL,

      name NVARCHAR(300) NOT NULL,
      description NVARCHAR(1000) NULL,
      specification_summary NVARCHAR(1000) NULL,

      is_active BIT NOT NULL
        CONSTRAINT DF_BS_budget_sub_items_is_active DEFAULT 1,

      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_budget_sub_items_created_at DEFAULT SYSUTCDATETIME(),

      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      disabled_by INT NULL,
      disabled_at DATETIME2 NULL,
      disabled_reason NVARCHAR(500) NULL,

      CONSTRAINT PK_BS_budget_sub_items
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_budget_sub_items_budget_type
        FOREIGN KEY (budget_type_id)
        REFERENCES dbo.BS_budget_types(id),

      CONSTRAINT FK_BS_budget_sub_items_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_budget_sub_items_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_budget_sub_items_disabled_by
        FOREIGN KEY (disabled_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_budget_sub_items_name_not_blank
        CHECK (LEN(LTRIM(RTRIM(name))) > 0)
    );

    CREATE UNIQUE INDEX UQ_BS_budget_sub_items_type_name
      ON dbo.BS_budget_sub_items (budget_type_id, name);

    CREATE INDEX IX_BS_budget_sub_items_type_active
      ON dbo.BS_budget_sub_items (budget_type_id, is_active)
      INCLUDE (name, specification_summary);
  END;

  /* ============================================================
     3. Department Request Layer
     ============================================================ */

  IF OBJECT_ID('dbo.BS_department_budgets', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_department_budgets (
      id BIGINT IDENTITY(1,1) NOT NULL,
      financial_year_id INT NOT NULL,
      department_id INT NOT NULL,

      status VARCHAR(40) NOT NULL
        CONSTRAINT DF_BS_department_budgets_status DEFAULT 'DRAFT',

      is_active BIT NOT NULL
        CONSTRAINT DF_BS_department_budgets_is_active DEFAULT 1,

      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_department_budgets_created_at DEFAULT SYSUTCDATETIME(),
      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      CONSTRAINT PK_BS_department_budgets
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_department_budgets_financial_year
        FOREIGN KEY (financial_year_id)
        REFERENCES dbo.BS_financial_years(id),

      CONSTRAINT FK_BS_department_budgets_department
        FOREIGN KEY (department_id)
        REFERENCES dbo.BS_departments(id),

      CONSTRAINT FK_BS_department_budgets_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_department_budgets_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_department_budgets_status
        CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
    );

    CREATE UNIQUE INDEX UQ_BS_department_budgets_year_department
      ON dbo.BS_department_budgets (financial_year_id, department_id)
      WHERE is_active = 1;
  END;

  IF OBJECT_ID('dbo.BS_department_category_budgets', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_department_category_budgets (
      id BIGINT IDENTITY(1,1) NOT NULL,
      department_budget_id BIGINT NOT NULL,
      category_id INT NOT NULL,

      status VARCHAR(40) NOT NULL
        CONSTRAINT DF_BS_department_category_budgets_status DEFAULT 'DRAFT',

      submitted_by INT NULL,
      submitted_at DATETIME2 NULL,

      returned_by INT NULL,
      returned_at DATETIME2 NULL,
      return_note NVARCHAR(1000) NULL,

      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_department_category_budgets_created_at
        DEFAULT SYSUTCDATETIME(),

      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      CONSTRAINT PK_BS_department_category_budgets
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_department_category_budgets_department_budget
        FOREIGN KEY (department_budget_id)
        REFERENCES dbo.BS_department_budgets(id),

      CONSTRAINT FK_BS_department_category_budgets_category
        FOREIGN KEY (category_id)
        REFERENCES dbo.BS_budget_categories(id),

      CONSTRAINT FK_BS_department_category_budgets_submitted_by
        FOREIGN KEY (submitted_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_department_category_budgets_returned_by
        FOREIGN KEY (returned_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_department_category_budgets_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_department_category_budgets_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_department_category_budgets_status
        CHECK (
          status IN (
            'DRAFT',
            'SUBMITTED',
            'IN_CATEGORY_REVIEW',
            'RETURNED',
            'ACCEPTED',
            'CANCELLED'
          )
        )
    );

    CREATE UNIQUE INDEX UQ_BS_department_category_budgets_budget_category
      ON dbo.BS_department_category_budgets (
        department_budget_id,
        category_id
      );

    CREATE INDEX IX_BS_department_category_budgets_category_status
      ON dbo.BS_department_category_budgets (category_id, status);
  END;

  IF OBJECT_ID('dbo.BS_department_budget_request_items', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_department_budget_request_items (
      id BIGINT IDENTITY(1,1) NOT NULL,
      department_category_budget_id BIGINT NOT NULL,
      budget_type_id INT NOT NULL,

      requested_quantity DECIMAL(18, 4) NOT NULL,
      distribution_method VARCHAR(50) NOT NULL,
      distribution_level VARCHAR(50) NULL,

      review_status VARCHAR(40) NOT NULL
        CONSTRAINT DF_BS_department_budget_request_items_review_status
        DEFAULT 'NOT_REVIEWED',

      is_reviewed BIT NOT NULL
        CONSTRAINT DF_BS_department_budget_request_items_is_reviewed DEFAULT 0,

      is_edit_locked BIT NOT NULL
        CONSTRAINT DF_BS_department_budget_request_items_is_edit_locked
        DEFAULT 0,

      review_note NVARCHAR(1000) NULL,

      is_active BIT NOT NULL
        CONSTRAINT DF_BS_department_budget_request_items_is_active DEFAULT 1,

      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_department_budget_request_items_created_at
        DEFAULT SYSUTCDATETIME(),

      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      CONSTRAINT PK_BS_department_budget_request_items
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_department_budget_request_items_category_budget
        FOREIGN KEY (department_category_budget_id)
        REFERENCES dbo.BS_department_category_budgets(id),

      CONSTRAINT FK_BS_department_budget_request_items_budget_type
        FOREIGN KEY (budget_type_id)
        REFERENCES dbo.BS_budget_types(id),

      CONSTRAINT FK_BS_department_budget_request_items_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_department_budget_request_items_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_department_budget_request_items_requested_quantity
        CHECK (requested_quantity > 0),

      CONSTRAINT CK_BS_department_budget_request_items_review_status
        CHECK (
          review_status IN (
            'NOT_REVIEWED',
            'REVIEWED_ACCEPTED',
            'NEEDS_MODIFICATION',
            'CANCELLED'
          )
        )
    );

    CREATE INDEX IX_BS_department_budget_request_items_category_budget
      ON dbo.BS_department_budget_request_items (
        department_category_budget_id,
        budget_type_id,
        is_active
      );

    CREATE INDEX IX_BS_department_budget_request_items_budget_type
      ON dbo.BS_department_budget_request_items (
        budget_type_id,
        is_active,
        review_status
      )
      INCLUDE (requested_quantity);
  END;

  IF OBJECT_ID('dbo.BS_department_budget_request_distribution', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_department_budget_request_distribution (
      id BIGINT IDENTITY(1,1) NOT NULL,
      request_item_id BIGINT NOT NULL,
      period_type VARCHAR(20) NOT NULL,
      period_no INT NOT NULL,
      quantity DECIMAL(18, 4) NOT NULL,

      CONSTRAINT PK_BS_department_budget_request_distribution
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_department_budget_request_distribution_request_item
        FOREIGN KEY (request_item_id)
        REFERENCES dbo.BS_department_budget_request_items(id)
        ON DELETE CASCADE,

      CONSTRAINT CK_BS_department_budget_request_distribution_period_type
        CHECK (period_type IN ('MONTH', 'QUARTER', 'YEAR')),

      CONSTRAINT CK_BS_department_budget_request_distribution_period_no
        CHECK (period_no > 0),

      CONSTRAINT CK_BS_department_budget_request_distribution_quantity
        CHECK (quantity >= 0)
    );

    CREATE UNIQUE INDEX UQ_BS_department_budget_request_distribution_period
      ON dbo.BS_department_budget_request_distribution (
        request_item_id,
        period_type,
        period_no
      );
  END;

  /* ============================================================
     4. Consolidated Category Review Layer
     ============================================================ */

  IF OBJECT_ID('dbo.BS_category_review_packages', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_category_review_packages (
      id BIGINT IDENTITY(1,1) NOT NULL,
      financial_year_id INT NOT NULL,
      category_id INT NOT NULL,

      status VARCHAR(50) NOT NULL
        CONSTRAINT DF_BS_category_review_packages_status
        DEFAULT 'IN_REVIEW',

      submitted_to_cfo_by INT NULL,
      submitted_to_cfo_at DATETIME2 NULL,

      approved_by INT NULL,
      approved_at DATETIME2 NULL,

      returned_by INT NULL,
      returned_at DATETIME2 NULL,
      return_note NVARCHAR(1000) NULL,

      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_category_review_packages_created_at
        DEFAULT SYSUTCDATETIME(),

      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      CONSTRAINT PK_BS_category_review_packages
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_category_review_packages_financial_year
        FOREIGN KEY (financial_year_id)
        REFERENCES dbo.BS_financial_years(id),

      CONSTRAINT FK_BS_category_review_packages_category
        FOREIGN KEY (category_id)
        REFERENCES dbo.BS_budget_categories(id),

      CONSTRAINT FK_BS_category_review_packages_submitted_to_cfo_by
        FOREIGN KEY (submitted_to_cfo_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_review_packages_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_review_packages_returned_by
        FOREIGN KEY (returned_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_review_packages_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_review_packages_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_category_review_packages_status
        CHECK (
          status IN (
            'IN_REVIEW',
            'SUBMITTED_TO_CFO',
            'RETURNED_BY_CFO',
            'APPROVED',
            'CANCELLED'
          )
        )
    );

    CREATE UNIQUE INDEX UQ_BS_category_review_packages_year_category
      ON dbo.BS_category_review_packages (financial_year_id, category_id);

    CREATE INDEX IX_BS_category_review_packages_status
      ON dbo.BS_category_review_packages (status, financial_year_id);
  END;

  IF OBJECT_ID('dbo.BS_category_type_reviews', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_category_type_reviews (
      id BIGINT IDENTITY(1,1) NOT NULL,
      category_review_package_id BIGINT NOT NULL,
      budget_type_id INT NOT NULL,

      approved_quantity DECIMAL(18, 4) NULL,

      category_review_status VARCHAR(50) NOT NULL
        CONSTRAINT DF_BS_category_type_reviews_category_review_status
        DEFAULT 'NOT_REVIEWED',

      cfo_review_status VARCHAR(50) NOT NULL
        CONSTRAINT DF_BS_category_type_reviews_cfo_review_status
        DEFAULT 'NOT_SUBMITTED',

      category_note NVARCHAR(1000) NULL,
      cfo_note NVARCHAR(1000) NULL,

      category_reviewed_by INT NULL,
      category_reviewed_at DATETIME2 NULL,

      cfo_reviewed_by INT NULL,
      cfo_reviewed_at DATETIME2 NULL,

      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_category_type_reviews_created_at
        DEFAULT SYSUTCDATETIME(),

      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      CONSTRAINT PK_BS_category_type_reviews
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_category_type_reviews_package
        FOREIGN KEY (category_review_package_id)
        REFERENCES dbo.BS_category_review_packages(id),

      CONSTRAINT FK_BS_category_type_reviews_budget_type
        FOREIGN KEY (budget_type_id)
        REFERENCES dbo.BS_budget_types(id),

      CONSTRAINT FK_BS_category_type_reviews_category_reviewed_by
        FOREIGN KEY (category_reviewed_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_type_reviews_cfo_reviewed_by
        FOREIGN KEY (cfo_reviewed_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_type_reviews_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_type_reviews_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_category_type_reviews_approved_quantity
        CHECK (approved_quantity IS NULL OR approved_quantity >= 0),

      CONSTRAINT CK_BS_category_type_reviews_category_status
        CHECK (
          category_review_status IN (
            'NOT_REVIEWED',
            'IN_REVIEW',
            'REVIEWED_ACCEPTED',
            'NEEDS_MODIFICATION',
            'SUBMITTED_TO_CFO',
            'RETURNED_BY_CFO',
            'APPROVED',
            'CANCELLED'
          )
        ),

      CONSTRAINT CK_BS_category_type_reviews_cfo_status
        CHECK (
          cfo_review_status IN (
            'NOT_SUBMITTED',
            'PENDING_REVIEW',
            'REVIEWED_ACCEPTED',
            'RETURNED',
            'APPROVED',
            'CANCELLED'
          )
        )
    );

    CREATE UNIQUE INDEX UQ_BS_category_type_reviews_package_type
      ON dbo.BS_category_type_reviews (
        category_review_package_id,
        budget_type_id
      );

    CREATE INDEX IX_BS_category_type_reviews_budget_type
      ON dbo.BS_category_type_reviews (budget_type_id);
  END;

  IF OBJECT_ID('dbo.BS_category_type_review_sub_items', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_category_type_review_sub_items (
      id BIGINT IDENTITY(1,1) NOT NULL,
      category_type_review_id BIGINT NOT NULL,
      budget_sub_item_id BIGINT NOT NULL,

      quantity DECIMAL(18, 4) NOT NULL,
      unit_cost DECIMAL(18, 6) NOT NULL,

      sub_item_name_snapshot NVARCHAR(300) NOT NULL,
      specification_snapshot NVARCHAR(1000) NULL,
      note NVARCHAR(1000) NULL,

      is_active BIT NOT NULL
        CONSTRAINT DF_BS_category_type_review_sub_items_is_active DEFAULT 1,

      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_category_type_review_sub_items_created_at
        DEFAULT SYSUTCDATETIME(),

      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      CONSTRAINT PK_BS_category_type_review_sub_items
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_category_type_review_sub_items_type_review
        FOREIGN KEY (category_type_review_id)
        REFERENCES dbo.BS_category_type_reviews(id),

      CONSTRAINT FK_BS_category_type_review_sub_items_sub_item
        FOREIGN KEY (budget_sub_item_id)
        REFERENCES dbo.BS_budget_sub_items(id),

      CONSTRAINT FK_BS_category_type_review_sub_items_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_type_review_sub_items_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_category_type_review_sub_items_quantity
        CHECK (quantity > 0),

      CONSTRAINT CK_BS_category_type_review_sub_items_unit_cost
        CHECK (unit_cost >= 0)
    );

    CREATE INDEX IX_BS_category_type_review_sub_items_type_review
      ON dbo.BS_category_type_review_sub_items (
        category_type_review_id,
        is_active
      )
      INCLUDE (quantity, unit_cost);
  END;

  /* ============================================================
     5. Consolidated Review Attachments
     ============================================================ */

  IF OBJECT_ID('dbo.BS_category_type_review_attachments', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_category_type_review_attachments (
      id BIGINT IDENTITY(1,1) NOT NULL,
      category_type_review_id BIGINT NOT NULL,

      original_file_name NVARCHAR(300) NOT NULL,
      storage_key NVARCHAR(500) NOT NULL,
      mime_type NVARCHAR(150) NULL,
      file_size_bytes BIGINT NOT NULL,
      description NVARCHAR(500) NULL,

      is_active BIT NOT NULL
        CONSTRAINT DF_BS_category_type_review_attachments_is_active DEFAULT 1,

      uploaded_by INT NOT NULL,
      uploaded_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_category_type_review_attachments_uploaded_at
        DEFAULT SYSUTCDATETIME(),

      CONSTRAINT PK_BS_category_type_review_attachments
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_category_type_review_attachments_type_review
        FOREIGN KEY (category_type_review_id)
        REFERENCES dbo.BS_category_type_reviews(id),

      CONSTRAINT FK_BS_category_type_review_attachments_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_category_type_review_attachments_file_size
        CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),

      CONSTRAINT CK_BS_category_type_review_attachments_file_name
        CHECK (LEN(LTRIM(RTRIM(original_file_name))) > 0),

      CONSTRAINT CK_BS_category_type_review_attachments_storage_key
        CHECK (LEN(LTRIM(RTRIM(storage_key))) > 0)
    );

    CREATE INDEX IX_BS_category_type_review_attachments_review
      ON dbo.BS_category_type_review_attachments (
        category_type_review_id,
        is_active
      )
      INCLUDE (
        original_file_name,
        file_size_bytes,
        uploaded_by,
        uploaded_at
      );
  END;

  IF OBJECT_ID('dbo.BS_category_type_review_sub_item_attachments', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_category_type_review_sub_item_attachments (
      id BIGINT IDENTITY(1,1) NOT NULL,
      category_type_review_sub_item_id BIGINT NOT NULL,

      original_file_name NVARCHAR(300) NOT NULL,
      storage_key NVARCHAR(500) NOT NULL,
      mime_type NVARCHAR(150) NULL,
      file_size_bytes BIGINT NOT NULL,
      description NVARCHAR(500) NULL,

      is_active BIT NOT NULL
        CONSTRAINT DF_BS_category_type_review_sub_item_attachments_is_active
        DEFAULT 1,

      uploaded_by INT NOT NULL,
      uploaded_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_category_type_review_sub_item_attachments_uploaded_at
        DEFAULT SYSUTCDATETIME(),

      CONSTRAINT PK_BS_category_type_review_sub_item_attachments
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_category_type_review_sub_item_attachments_sub_item
        FOREIGN KEY (category_type_review_sub_item_id)
        REFERENCES dbo.BS_category_type_review_sub_items(id),

      CONSTRAINT FK_BS_category_type_review_sub_item_attachments_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_category_type_review_sub_item_attachments_file_size
        CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),

      CONSTRAINT CK_BS_category_type_review_sub_item_attachments_file_name
        CHECK (LEN(LTRIM(RTRIM(original_file_name))) > 0),

      CONSTRAINT CK_BS_category_type_review_sub_item_attachments_storage_key
        CHECK (LEN(LTRIM(RTRIM(storage_key))) > 0)
    );

    CREATE INDEX IX_BS_category_type_review_sub_item_attachments_line
      ON dbo.BS_category_type_review_sub_item_attachments (
        category_type_review_sub_item_id,
        is_active
      )
      INCLUDE (
        original_file_name,
        file_size_bytes,
        uploaded_by,
        uploaded_at
      );
  END;

  /* ============================================================
     6. Review History
     ============================================================ */

  IF OBJECT_ID('dbo.BS_budget_review_history', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_budget_review_history (
      id BIGINT IDENTITY(1,1) NOT NULL,

      department_request_item_id BIGINT NULL,
      category_type_review_id BIGINT NULL,

      action VARCHAR(80) NOT NULL,
      note NVARCHAR(1000) NULL,

      old_values NVARCHAR(MAX) NULL,
      new_values NVARCHAR(MAX) NULL,

      acting_workspace_id NVARCHAR(100) NULL,
      acting_workspace_type VARCHAR(80) NULL,
      acting_as NVARCHAR(200) NULL,

      created_by INT NOT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_budget_review_history_created_at
        DEFAULT SYSUTCDATETIME(),

      CONSTRAINT PK_BS_budget_review_history
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_budget_review_history_request_item
        FOREIGN KEY (department_request_item_id)
        REFERENCES dbo.BS_department_budget_request_items(id),

      CONSTRAINT FK_BS_budget_review_history_type_review
        FOREIGN KEY (category_type_review_id)
        REFERENCES dbo.BS_category_type_reviews(id),

      CONSTRAINT FK_BS_budget_review_history_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_budget_review_history_target
        CHECK (
          department_request_item_id IS NOT NULL
          OR category_type_review_id IS NOT NULL
        )
    );

    CREATE INDEX IX_BS_budget_review_history_request_item
      ON dbo.BS_budget_review_history (
        department_request_item_id,
        created_at
      );

    CREATE INDEX IX_BS_budget_review_history_type_review
      ON dbo.BS_budget_review_history (
        category_type_review_id,
        created_at
      );
  END;

  /* ============================================================
     7. Calculated Read Views

     These views centralize non-authoritative calculated totals.
     The underlying source rows remain the source of truth.
     ============================================================ */

  EXEC('
    CREATE OR ALTER VIEW dbo.VW_category_type_review_summary AS
    SELECT
      ctr.id AS category_type_review_id,
      crp.financial_year_id,
      crp.category_id,
      ctr.budget_type_id,
      ctr.approved_quantity,
      ctr.category_review_status,
      ctr.cfo_review_status,

      ISNULL(request_totals.total_requested_quantity, 0)
        AS total_requested_quantity,

      ISNULL(request_totals.department_count, 0)
        AS department_count,

      ISNULL(sub_item_totals.total_selected_sub_item_quantity, 0)
        AS total_selected_sub_item_quantity,

      ISNULL(sub_item_totals.total_price, 0)
        AS total_price,

      ISNULL(attachment_totals.attachment_count, 0)
        AS attachment_count

    FROM dbo.BS_category_type_reviews ctr

    INNER JOIN dbo.BS_category_review_packages crp
      ON crp.id = ctr.category_review_package_id

    OUTER APPLY (
      SELECT
        SUM(dri.requested_quantity) AS total_requested_quantity,
        COUNT(DISTINCT db.department_id) AS department_count
      FROM dbo.BS_department_budget_request_items dri
      INNER JOIN dbo.BS_department_category_budgets dcb
        ON dcb.id = dri.department_category_budget_id
      INNER JOIN dbo.BS_department_budgets db
        ON db.id = dcb.department_budget_id
      WHERE db.financial_year_id = crp.financial_year_id
        AND dcb.category_id = crp.category_id
        AND dri.budget_type_id = ctr.budget_type_id
        AND dri.is_active = 1
    ) request_totals

    OUTER APPLY (
      SELECT
        SUM(si.quantity) AS total_selected_sub_item_quantity,
        SUM(si.quantity * si.unit_cost) AS total_price
      FROM dbo.BS_category_type_review_sub_items si
      WHERE si.category_type_review_id = ctr.id
        AND si.is_active = 1
    ) sub_item_totals

    OUTER APPLY (
      SELECT COUNT(*) AS attachment_count
      FROM dbo.BS_category_type_review_attachments a
      WHERE a.category_type_review_id = ctr.id
        AND a.is_active = 1
    ) attachment_totals;
  ');

  EXEC('
    CREATE OR ALTER VIEW dbo.VW_category_type_department_contributions AS
    SELECT
      ctr.id AS category_type_review_id,
      db.department_id,
      d.name AS department_name,
      SUM(dri.requested_quantity) AS requested_quantity
    FROM dbo.BS_category_type_reviews ctr
    INNER JOIN dbo.BS_category_review_packages crp
      ON crp.id = ctr.category_review_package_id
    INNER JOIN dbo.BS_department_budgets db
      ON db.financial_year_id = crp.financial_year_id
    INNER JOIN dbo.BS_departments d
      ON d.id = db.department_id
    INNER JOIN dbo.BS_department_category_budgets dcb
      ON dcb.department_budget_id = db.id
     AND dcb.category_id = crp.category_id
    INNER JOIN dbo.BS_department_budget_request_items dri
      ON dri.department_category_budget_id = dcb.id
     AND dri.budget_type_id = ctr.budget_type_id
     AND dri.is_active = 1
    GROUP BY
      ctr.id,
      db.department_id,
      d.name;
  ');

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
  BEGIN
    ROLLBACK TRANSACTION;
  END;

  THROW;
END CATCH;

