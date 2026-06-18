/* =========================================================
   PO Item Mapping Knowledge Base + Permission

   Purpose:
   - Adds can_manage_po_item_mappings permission.
   - Creates BS_PO_ITEM_MAPPINGS as the source of truth for
     Budget Item Type <-> PO ITEM_CODE mappings.
   - Backfills initial mappings from approved BS_PO_LINKS.

   Notes:
   - Suggestions must query BS_PO_ITEM_MAPPINGS, not BS_PO_LINKS.
   - BS_PO_LINKS remains audit/history/learning source only.
   - This script is defensive for columns/table creation.
   ========================================================= */

BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('BS_budget_role_permissions', 'can_manage_po_item_mappings') IS NULL
  BEGIN
    ALTER TABLE BS_budget_role_permissions
      ADD can_manage_po_item_mappings BIT NOT NULL
        CONSTRAINT DF_BS_budget_role_permissions_can_manage_po_item_mappings
        DEFAULT 0;
  END;

  IF COL_LENGTH('BS_budget_user_roles', 'can_manage_po_item_mappings') IS NULL
  BEGIN
    ALTER TABLE BS_budget_user_roles
      ADD can_manage_po_item_mappings BIT NULL;
  END;

  UPDATE brp
  SET can_manage_po_item_mappings =
    CASE
      WHEN UPPER(br.name) = 'ADMIN' THEN 1
      ELSE 0
    END
  FROM BS_budget_role_permissions brp
  INNER JOIN BS_budget_roles br
    ON br.id = brp.role_id
  WHERE UPPER(br.name) IN ('ADMIN', 'HOD', 'BUDGET_APPROVER', 'PURCHASING');

  IF OBJECT_ID('BS_PO_ITEM_MAPPINGS', 'U') IS NULL
  BEGIN
    CREATE TABLE BS_PO_ITEM_MAPPINGS (
      id BIGINT IDENTITY(1,1) NOT NULL,

      budget_type_id INT NOT NULL,
      po_item_code NVARCHAR(100) NOT NULL,
      po_item_description NVARCHAR(500) NULL,

      mapping_source VARCHAR(30) NOT NULL,
      source_po_link_id BIGINT NULL,

      learned_count INT NOT NULL
        CONSTRAINT DF_BS_PO_ITEM_MAPPINGS_learned_count DEFAULT 0,
      last_learned_at DATETIME2 NULL,

      is_active BIT NOT NULL
        CONSTRAINT DF_BS_PO_ITEM_MAPPINGS_is_active DEFAULT 1,

      created_by INT NULL,
      created_at DATETIME2 NOT NULL
        CONSTRAINT DF_BS_PO_ITEM_MAPPINGS_created_at DEFAULT SYSUTCDATETIME(),

      updated_by INT NULL,
      updated_at DATETIME2 NULL,

      disabled_by INT NULL,
      disabled_at DATETIME2 NULL,
      disabled_reason NVARCHAR(500) NULL,

      CONSTRAINT PK_BS_PO_ITEM_MAPPINGS
        PRIMARY KEY (id),

      CONSTRAINT FK_BS_PO_ITEM_MAPPINGS_budget_type
        FOREIGN KEY (budget_type_id)
        REFERENCES BS_budget_types(id),

      CONSTRAINT FK_BS_PO_ITEM_MAPPINGS_source_po_link
        FOREIGN KEY (source_po_link_id)
        REFERENCES BS_PO_LINKS(ID),

      CONSTRAINT FK_BS_PO_ITEM_MAPPINGS_created_by
        FOREIGN KEY (created_by)
        REFERENCES USERS(USER_ID),

      CONSTRAINT FK_BS_PO_ITEM_MAPPINGS_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES USERS(USER_ID),

      CONSTRAINT FK_BS_PO_ITEM_MAPPINGS_disabled_by
        FOREIGN KEY (disabled_by)
        REFERENCES USERS(USER_ID),

      CONSTRAINT CK_BS_PO_ITEM_MAPPINGS_source
        CHECK (mapping_source IN ('MANUAL', 'APPROVED_LINK')),

      CONSTRAINT CK_BS_PO_ITEM_MAPPINGS_item_code_not_blank
        CHECK (LEN(LTRIM(RTRIM(po_item_code))) > 0),

      CONSTRAINT CK_BS_PO_ITEM_MAPPINGS_learned_count
        CHECK (learned_count >= 0),

      CONSTRAINT CK_BS_PO_ITEM_MAPPINGS_source_link
        CHECK (
          (mapping_source = 'MANUAL' AND source_po_link_id IS NULL)
          OR
          (mapping_source = 'APPROVED_LINK' AND source_po_link_id IS NOT NULL)
        ),

      CONSTRAINT UQ_BS_PO_ITEM_MAPPINGS_type_code
        UNIQUE (budget_type_id, po_item_code)
    );

    CREATE INDEX IX_BS_PO_ITEM_MAPPINGS_type_active
      ON BS_PO_ITEM_MAPPINGS (budget_type_id, is_active)
      INCLUDE (
        po_item_code,
        po_item_description,
        mapping_source,
        learned_count,
        last_learned_at,
        created_at
      );

    CREATE INDEX IX_BS_PO_ITEM_MAPPINGS_item_code
      ON BS_PO_ITEM_MAPPINGS (po_item_code)
      INCLUDE (budget_type_id, is_active);

    CREATE INDEX IX_BS_PO_ITEM_MAPPINGS_source_active
      ON BS_PO_ITEM_MAPPINGS (mapping_source, is_active, created_at);
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BS_Purchase_Invoices_For_Budget_ITEM_CODE'
      AND object_id = OBJECT_ID('BS_Purchase_Invoices_For_Budget')
  )
  BEGIN
    CREATE INDEX IX_BS_Purchase_Invoices_For_Budget_ITEM_CODE
      ON BS_Purchase_Invoices_For_Budget (ITEM_CODE)
      INCLUDE (
        ID,
        ITEM_DESC,
        PARENT_ITEM_NAME,
        SUPPLIER_NAME_EN,
        QTY,
        UNIT_COST,
        NET_AMOUNT,
        CREATED_AT
      );
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BS_PO_LINKS_status_budget_item_po'
      AND object_id = OBJECT_ID('BS_PO_LINKS')
  )
  BEGIN
    CREATE INDEX IX_BS_PO_LINKS_status_budget_item_po
      ON BS_PO_LINKS (STATUS, BUDGET_ITEM_ID, PURCHASE_INVOICE_LINE_ID)
      INCLUDE (APPROVED_AT, APPROVED_BY);
  END;

  ;WITH approved_mappings AS (
    SELECT
      bi.type_id AS budget_type_id,
      LTRIM(RTRIM(po.ITEM_CODE)) AS po_item_code,
      MAX(po.ITEM_DESC) AS po_item_description,
      COUNT(*) AS learned_count,
      MAX(pl.APPROVED_AT) AS last_learned_at,
      MIN(pl.ID) AS source_po_link_id
    FROM BS_PO_LINKS pl
    INNER JOIN BS_budget_items bi
      ON bi.id = pl.BUDGET_ITEM_ID
    INNER JOIN BS_Purchase_Invoices_For_Budget po
      ON po.ID = pl.PURCHASE_INVOICE_LINE_ID
    WHERE pl.STATUS = 'APPROVED'
      AND po.ITEM_CODE IS NOT NULL
      AND LTRIM(RTRIM(po.ITEM_CODE)) <> ''
    GROUP BY
      bi.type_id,
      LTRIM(RTRIM(po.ITEM_CODE))
  ),
  first_mapping AS (
    SELECT
      am.*,
      pl.APPROVED_BY AS created_by,
      pl.APPROVED_AT AS created_at
    FROM approved_mappings am
    INNER JOIN BS_PO_LINKS pl
      ON pl.ID = am.source_po_link_id
  )
  INSERT INTO BS_PO_ITEM_MAPPINGS (
    budget_type_id,
    po_item_code,
    po_item_description,
    mapping_source,
    source_po_link_id,
    learned_count,
    last_learned_at,
    created_by,
    created_at
  )
  SELECT
    fm.budget_type_id,
    fm.po_item_code,
    fm.po_item_description,
    'APPROVED_LINK',
    fm.source_po_link_id,
    fm.learned_count,
    fm.last_learned_at,
    fm.created_by,
    ISNULL(fm.created_at, SYSUTCDATETIME())
  FROM first_mapping fm
  WHERE NOT EXISTS (
    SELECT 1
    FROM BS_PO_ITEM_MAPPINGS existing
    WHERE existing.budget_type_id = fm.budget_type_id
      AND existing.po_item_code = fm.po_item_code
  );

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
  BEGIN
    ROLLBACK TRANSACTION;
  END;

  THROW;
END CATCH;
