SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.BS_category_budget_packages', 'submitted_to_purchasing_by') IS NULL
    ALTER TABLE dbo.BS_category_budget_packages ADD submitted_to_purchasing_by INT NULL;

  IF COL_LENGTH('dbo.BS_category_budget_packages', 'submitted_to_purchasing_user_role_id') IS NULL
    ALTER TABLE dbo.BS_category_budget_packages ADD submitted_to_purchasing_user_role_id INT NULL;

  IF COL_LENGTH('dbo.BS_category_budget_packages', 'submitted_to_purchasing_at') IS NULL
    ALTER TABLE dbo.BS_category_budget_packages ADD submitted_to_purchasing_at DATETIME2(3) NULL;

  IF COL_LENGTH('dbo.BS_category_budget_packages', 'purchasing_review_round') IS NULL
    ALTER TABLE dbo.BS_category_budget_packages
      ADD purchasing_review_round INT NOT NULL
        CONSTRAINT DF_BS_category_budget_packages_purchasing_review_round DEFAULT (0);

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_BS_category_budget_packages_submitted_to_purchasing_by')
    ALTER TABLE dbo.BS_category_budget_packages
      ADD CONSTRAINT FK_BS_category_budget_packages_submitted_to_purchasing_by
      FOREIGN KEY (submitted_to_purchasing_by) REFERENCES dbo.users(USER_ID);

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_BS_category_budget_packages_submitted_to_purchasing_user_role')
    ALTER TABLE dbo.BS_category_budget_packages
      ADD CONSTRAINT FK_BS_category_budget_packages_submitted_to_purchasing_user_role
      FOREIGN KEY (submitted_to_purchasing_user_role_id) REFERENCES dbo.BS_budget_user_roles(id);

  IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_BS_category_budget_packages_status')
    ALTER TABLE dbo.BS_category_budget_packages DROP CONSTRAINT CK_BS_category_budget_packages_status;

  ALTER TABLE dbo.BS_category_budget_packages WITH CHECK ADD CONSTRAINT CK_BS_category_budget_packages_status
    CHECK (status IN ('DRAFT', 'IN_PURCHASING_REVIEW', 'IN_CFO_REVIEW', 'RETURNED_BY_CFO', 'CFO_REVIEW_COMPLETED'));

  IF COL_LENGTH('dbo.BS_category_budget_package_sub_items', 'category_manager_unit_price') IS NULL
    ALTER TABLE dbo.BS_category_budget_package_sub_items
      ADD category_manager_unit_price DECIMAL(18,6) NULL;

  UPDATE dbo.BS_category_budget_package_sub_items
  SET category_manager_unit_price = unit_price
  WHERE category_manager_unit_price IS NULL
    AND unit_price IS NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_BS_category_budget_package_sub_items_category_manager_unit_price')
    ALTER TABLE dbo.BS_category_budget_package_sub_items WITH CHECK
      ADD CONSTRAINT CK_BS_category_budget_package_sub_items_category_manager_unit_price
      CHECK (category_manager_unit_price IS NULL OR category_manager_unit_price >= 0);

  IF COL_LENGTH('dbo.BS_category_budget_package_sub_item_attachments', 'attachment_source') IS NULL
    ALTER TABLE dbo.BS_category_budget_package_sub_item_attachments
      ADD attachment_source VARCHAR(30) NOT NULL
        CONSTRAINT DF_BS_package_sub_item_attachments_source DEFAULT ('CATEGORY_MANAGER');

  IF COL_LENGTH('dbo.BS_category_budget_package_sub_item_attachments', 'uploaded_user_role_id') IS NULL
    ALTER TABLE dbo.BS_category_budget_package_sub_item_attachments ADD uploaded_user_role_id INT NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_BS_package_sub_item_attachments_source')
    ALTER TABLE dbo.BS_category_budget_package_sub_item_attachments WITH CHECK
      ADD CONSTRAINT CK_BS_package_sub_item_attachments_source
      CHECK (attachment_source IN ('CATEGORY_MANAGER', 'PURCHASING'));

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_BS_package_sub_item_attachments_uploaded_user_role')
    ALTER TABLE dbo.BS_category_budget_package_sub_item_attachments
      ADD CONSTRAINT FK_BS_package_sub_item_attachments_uploaded_user_role
      FOREIGN KEY (uploaded_user_role_id) REFERENCES dbo.BS_budget_user_roles(id);

  IF OBJECT_ID('dbo.BS_category_budget_package_sub_item_price_reviews', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.BS_category_budget_package_sub_item_price_reviews
    (
      id BIGINT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_BS_category_budget_package_sub_item_price_reviews PRIMARY KEY,
      category_budget_package_id BIGINT NOT NULL,
      category_budget_package_sub_item_id BIGINT NOT NULL,
      review_round INT NOT NULL,
      catalog_sub_item_id_snapshot INT NOT NULL,
      quantity_snapshot DECIMAL(18,4) NOT NULL,
      specification_snapshot NVARCHAR(2000) NULL,
      unit_of_measure_id_snapshot INT NOT NULL,
      category_manager_unit_price_snapshot DECIMAL(18,6) NOT NULL,
      previous_purchasing_unit_price DECIMAL(18,6) NULL,
      purchasing_unit_price DECIMAL(18,6) NOT NULL,
      status VARCHAR(20) NOT NULL,
      decision_source VARCHAR(30) NOT NULL,
      reviewed_by INT NULL,
      reviewed_user_role_id INT NULL,
      reviewed_at DATETIME2(3) NULL,
      created_at DATETIME2(3) NOT NULL
        CONSTRAINT DF_BS_package_sub_item_price_reviews_created_at DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2(3) NULL,
      row_version ROWVERSION NOT NULL,
      CONSTRAINT UQ_BS_package_sub_item_price_reviews_sub_item_round
        UNIQUE (category_budget_package_sub_item_id, review_round),
      CONSTRAINT CK_BS_package_sub_item_price_reviews_round CHECK (review_round > 0),
      CONSTRAINT CK_BS_package_sub_item_price_reviews_quantity CHECK (quantity_snapshot >= 0),
      CONSTRAINT CK_BS_package_sub_item_price_reviews_cm_price CHECK (category_manager_unit_price_snapshot >= 1),
      CONSTRAINT CK_BS_package_sub_item_price_reviews_price CHECK (purchasing_unit_price >= 1),
      CONSTRAINT CK_BS_package_sub_item_price_reviews_previous_price
        CHECK (previous_purchasing_unit_price IS NULL OR previous_purchasing_unit_price >= 1),
      CONSTRAINT CK_BS_package_sub_item_price_reviews_status CHECK (status IN ('PENDING', 'ACCEPTED')),
      CONSTRAINT CK_BS_package_sub_item_price_reviews_source CHECK (decision_source IN ('MANUAL', 'CARRIED_FORWARD')),
      CONSTRAINT CK_BS_package_sub_item_price_reviews_decision
        CHECK ((status = 'PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL)
          OR (status = 'ACCEPTED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
      CONSTRAINT FK_BS_package_sub_item_price_reviews_package
        FOREIGN KEY (category_budget_package_id) REFERENCES dbo.BS_category_budget_packages(id),
      CONSTRAINT FK_BS_package_sub_item_price_reviews_sub_item
        FOREIGN KEY (category_budget_package_sub_item_id) REFERENCES dbo.BS_category_budget_package_sub_items(id),
      CONSTRAINT FK_BS_package_sub_item_price_reviews_catalog_sub_item
        FOREIGN KEY (catalog_sub_item_id_snapshot) REFERENCES dbo.BS_budget_catalog_sub_items(id),
      CONSTRAINT FK_BS_package_sub_item_price_reviews_uom
        FOREIGN KEY (unit_of_measure_id_snapshot) REFERENCES dbo.BS_units_of_measure(id),
      CONSTRAINT FK_BS_package_sub_item_price_reviews_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES dbo.users(USER_ID),
      CONSTRAINT FK_BS_package_sub_item_price_reviews_reviewed_user_role
        FOREIGN KEY (reviewed_user_role_id) REFERENCES dbo.BS_budget_user_roles(id)
    );

    CREATE INDEX IX_BS_package_sub_item_price_reviews_package_round_status
      ON dbo.BS_category_budget_package_sub_item_price_reviews
      (category_budget_package_id, review_round, status)
      INCLUDE (category_budget_package_sub_item_id, purchasing_unit_price, row_version);

    CREATE INDEX IX_BS_package_sub_item_price_reviews_sub_item_history
      ON dbo.BS_category_budget_package_sub_item_price_reviews
      (category_budget_package_sub_item_id, review_round DESC);
  END;

  IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_BS_budget_permissions_group')
    ALTER TABLE dbo.BS_budget_permissions DROP CONSTRAINT CK_BS_budget_permissions_group;

  ALTER TABLE dbo.BS_budget_permissions WITH CHECK ADD CONSTRAINT CK_BS_budget_permissions_group
    CHECK (permission_group IN ('DEPARTMENT', 'CATEGORY_MANAGER', 'PURCHASING', 'CFO', 'TRANSFER', 'PO_LINK', 'ADMIN_REPORTING'));

  IF NOT EXISTS (SELECT 1 FROM dbo.BS_budget_roles WHERE role_code = 'PURCHASING_PRICE_REVIEWER')
    INSERT INTO dbo.BS_budget_roles (name, description, role_code, is_active)
    VALUES ('Purchasing Price Reviewer', 'Reviews category package model prices before CFO review.', 'PURCHASING_PRICE_REVIEWER', 1);
  ELSE
    UPDATE dbo.BS_budget_roles
    SET name = 'Purchasing Price Reviewer',
        description = 'Reviews category package model prices before CFO review.',
        is_active = 1
    WHERE role_code = 'PURCHASING_PRICE_REVIEWER';

  DECLARE @NextSortOrder INT = ISNULL((SELECT MAX(sort_order) FROM dbo.BS_budget_permissions), 0);

  IF NOT EXISTS
  (
    SELECT 1
    FROM dbo.BS_budget_permissions
    WHERE permission_code = 'can_submit_category_budget_packages_to_purchasing'
  )
    INSERT INTO dbo.BS_budget_permissions
      (permission_code, name, description, permission_group, sort_order, is_active)
    VALUES
      ('can_submit_category_budget_packages_to_purchasing',
       'Submit Category Packages to Purchasing',
       'Submit a completed category package to Purchasing price review.',
       'CATEGORY_MANAGER',
       @NextSortOrder + 1,
       1);
  ELSE
    UPDATE dbo.BS_budget_permissions
    SET name = 'Submit Category Packages to Purchasing',
        description = 'Submit a completed category package to Purchasing price review.',
        permission_group = 'CATEGORY_MANAGER',
        is_active = 1
    WHERE permission_code = 'can_submit_category_budget_packages_to_purchasing';

  DELETE permissionOverride
  FROM dbo.BS_budget_user_permission_overrides AS permissionOverride
  INNER JOIN dbo.BS_budget_permissions AS permission
    ON permission.id = permissionOverride.permission_id
  WHERE permission.permission_code = 'can_submit_category_budget_packages_to_cfo';

  DELETE rolePermission
  FROM dbo.BS_budget_role_permissions AS rolePermission
  INNER JOIN dbo.BS_budget_permissions AS permission
    ON permission.id = rolePermission.permission_id
  WHERE permission.permission_code = 'can_submit_category_budget_packages_to_cfo';

  DELETE FROM dbo.BS_budget_permissions
  WHERE permission_code = 'can_submit_category_budget_packages_to_cfo';

  DECLARE @Permissions TABLE
  (
    permission_code VARCHAR(150) NOT NULL,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000) NOT NULL,
    sort_offset INT NOT NULL
  );

  INSERT INTO @Permissions VALUES
    ('can_view_purchasing_price_reviews', 'View Purchasing Price Reviews', 'View category packages waiting for Purchasing price review.', 2),
    ('can_review_category_package_prices', 'Review Category Package Prices', 'Save and accept Purchasing prices for category package sub-items.', 3),
    ('can_submit_priced_category_packages_to_cfo', 'Submit Priced Packages to CFO', 'Submit fully priced category packages from Purchasing to CFO.', 4),
    ('can_manage_purchasing_supporting_documents', 'Manage Purchasing Supporting Documents', 'Manage Purchasing-owned supporting documents for package sub-items.', 5);

  INSERT INTO dbo.BS_budget_permissions
    (permission_code, name, description, permission_group, sort_order, is_active)
  SELECT p.permission_code, p.name, p.description, 'PURCHASING', @NextSortOrder + p.sort_offset, 1
  FROM @Permissions AS p
  WHERE NOT EXISTS
    (SELECT 1 FROM dbo.BS_budget_permissions AS existing WHERE existing.permission_code = p.permission_code);

  UPDATE permission
  SET name = requested.name,
      description = requested.description,
      permission_group = 'PURCHASING',
      is_active = 1
  FROM dbo.BS_budget_permissions AS permission
  INNER JOIN @Permissions AS requested
    ON requested.permission_code = permission.permission_code;

  DECLARE @PurchasingRoleId INT =
    (SELECT id FROM dbo.BS_budget_roles WHERE role_code = 'PURCHASING_PRICE_REVIEWER');
  DECLARE @CategoryManagerRoleId INT =
    (SELECT id FROM dbo.BS_budget_roles WHERE role_code = 'CATEGORY_BUDGET_MANAGER');

  INSERT INTO dbo.BS_budget_role_permissions (role_id, permission_id)
  SELECT @CategoryManagerRoleId, permission.id
  FROM dbo.BS_budget_permissions AS permission
  WHERE permission.permission_code = 'can_submit_category_budget_packages_to_purchasing'
    AND @CategoryManagerRoleId IS NOT NULL
    AND NOT EXISTS
    (
      SELECT 1
      FROM dbo.BS_budget_role_permissions AS existing
      WHERE existing.role_id = @CategoryManagerRoleId
        AND existing.permission_id = permission.id
    );

  INSERT INTO dbo.BS_budget_role_permissions (role_id, permission_id)
  SELECT @PurchasingRoleId, permission.id
  FROM dbo.BS_budget_permissions AS permission
  INNER JOIN @Permissions AS requested ON requested.permission_code = permission.permission_code
  WHERE NOT EXISTS
  (
    SELECT 1
    FROM dbo.BS_budget_role_permissions AS existing
    WHERE existing.role_id = @PurchasingRoleId
      AND existing.permission_id = permission.id
  );

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
