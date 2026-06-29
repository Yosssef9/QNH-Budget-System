SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID('dbo.BS_PO_SUB_ITEM_MAPPINGS', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_PO_SUB_ITEM_MAPPINGS (
      id BIGINT IDENTITY(1,1) NOT NULL,
      budget_sub_item_id BIGINT NOT NULL,
      po_item_code NVARCHAR(100) NOT NULL,
      po_item_description NVARCHAR(500) NULL,
      mapping_source VARCHAR(30) NOT NULL,
      source_category_po_link_id BIGINT NULL,
      learned_count INT NOT NULL
        CONSTRAINT DF_BS_PO_SUB_ITEM_MAPPINGS_learned_count DEFAULT 0,
      last_learned_at DATETIME2 NULL,
      is_active BIT NOT NULL
        CONSTRAINT DF_BS_PO_SUB_ITEM_MAPPINGS_is_active DEFAULT 1,
      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_PO_SUB_ITEM_MAPPINGS_created_at DEFAULT SYSUTCDATETIME(),
      updated_by INT NULL,
      updated_at DATETIME2 NULL,
      disabled_by INT NULL,
      disabled_at DATETIME2 NULL,
      disabled_reason NVARCHAR(500) NULL,

      CONSTRAINT PK_BS_PO_SUB_ITEM_MAPPINGS
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_PO_SUB_ITEM_MAPPINGS_sub_item
        FOREIGN KEY (budget_sub_item_id)
        REFERENCES dbo.BS_budget_sub_items(id),

      CONSTRAINT FK_BS_PO_SUB_ITEM_MAPPINGS_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_PO_SUB_ITEM_MAPPINGS_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_PO_SUB_ITEM_MAPPINGS_disabled_by
        FOREIGN KEY (disabled_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_PO_SUB_ITEM_MAPPINGS_source
        CHECK (mapping_source IN ('MANUAL', 'APPROVED_LINK'))
    );

    CREATE UNIQUE INDEX UQ_BS_PO_SUB_ITEM_MAPPINGS_sub_item_code
      ON dbo.BS_PO_SUB_ITEM_MAPPINGS (budget_sub_item_id, po_item_code);

    CREATE INDEX IX_BS_PO_SUB_ITEM_MAPPINGS_active
      ON dbo.BS_PO_SUB_ITEM_MAPPINGS (is_active, budget_sub_item_id)
      INCLUDE (po_item_code, mapping_source, learned_count, last_learned_at);
  END;

  IF OBJECT_ID('dbo.BS_category_po_links', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_category_po_links (
      id BIGINT IDENTITY(1,1) NOT NULL,
      purchase_invoice_line_id BIGINT NOT NULL,
      category_type_review_sub_item_id BIGINT NOT NULL,
      requested_qty DECIMAL(18, 4) NOT NULL,
      unit_cost DECIMAL(18, 6) NOT NULL,
      linked_amount DECIMAL(18, 6) NOT NULL,
      status VARCHAR(30) NOT NULL
        CONSTRAINT DF_BS_category_po_links_status DEFAULT 'PENDING',
      requested_by INT NOT NULL,
      requested_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_category_po_links_requested_at DEFAULT SYSUTCDATETIME(),
      approved_by INT NULL,
      approved_at DATETIME2 NULL,
      rejected_by INT NULL,
      rejected_at DATETIME2 NULL,
      rejection_reason NVARCHAR(1000) NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_category_po_links_created_at DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NULL,

      CONSTRAINT PK_BS_category_po_links
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_category_po_links_purchase_invoice_line
        FOREIGN KEY (purchase_invoice_line_id)
        REFERENCES dbo.BS_Purchase_Invoices_For_Budget(ID),

      CONSTRAINT FK_BS_category_po_links_review_sub_item
        FOREIGN KEY (category_type_review_sub_item_id)
        REFERENCES dbo.BS_category_type_review_sub_items(id),

      CONSTRAINT FK_BS_category_po_links_requested_by
        FOREIGN KEY (requested_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_po_links_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT FK_BS_category_po_links_rejected_by
        FOREIGN KEY (rejected_by)
        REFERENCES dbo.USERS(USER_ID),

      CONSTRAINT CK_BS_category_po_links_requested_qty
        CHECK (requested_qty > 0),

      CONSTRAINT CK_BS_category_po_links_unit_cost
        CHECK (unit_cost >= 0),

      CONSTRAINT CK_BS_category_po_links_linked_amount
        CHECK (linked_amount >= 0),

      CONSTRAINT CK_BS_category_po_links_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
    );

    CREATE INDEX IX_BS_category_po_links_status
      ON dbo.BS_category_po_links (status, requested_at);

    CREATE INDEX IX_BS_category_po_links_sub_item_status
      ON dbo.BS_category_po_links (
        category_type_review_sub_item_id,
        status
      )
      INCLUDE (requested_qty, linked_amount);

    CREATE INDEX IX_BS_category_po_links_invoice_status
      ON dbo.BS_category_po_links (
        purchase_invoice_line_id,
        status
      )
      INCLUDE (requested_qty);
  END;

  IF OBJECT_ID('dbo.BS_category_po_links', 'U') IS NOT NULL
     AND OBJECT_ID('dbo.BS_PO_SUB_ITEM_MAPPINGS', 'U') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM sys.foreign_keys
       WHERE name = 'FK_BS_PO_SUB_ITEM_MAPPINGS_source_category_po_link'
     )
  BEGIN
    ALTER TABLE dbo.BS_PO_SUB_ITEM_MAPPINGS
      ADD CONSTRAINT FK_BS_PO_SUB_ITEM_MAPPINGS_source_category_po_link
      FOREIGN KEY (source_category_po_link_id)
      REFERENCES dbo.BS_category_po_links(id);
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
  BEGIN
    ROLLBACK TRANSACTION;
  END;

  THROW;
END CATCH;
