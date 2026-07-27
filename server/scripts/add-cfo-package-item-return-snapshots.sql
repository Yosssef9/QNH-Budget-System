IF OBJECT_ID('dbo.BS_cfo_package_item_return_snapshots', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BS_cfo_package_item_return_snapshots
    (
        id BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_BS_cfo_package_item_return_snapshots PRIMARY KEY,
        category_budget_package_id BIGINT NOT NULL,
        category_budget_package_item_id BIGINT NOT NULL,
        financial_year_id INT NOT NULL,
        budget_category_id INT NOT NULL,
        snapshot_reason NVARCHAR(1000) NULL,
        cfo_review_note NVARCHAR(1000) NULL,
        package_return_reason NVARCHAR(1000) NULL,
        approved_quantity DECIMAL(18,4) NOT NULL
            CONSTRAINT DF_BS_cfo_package_item_return_snapshots_approved_quantity DEFAULT (0),
        item_total_amount DECIMAL(19,4) NOT NULL
            CONSTRAINT DF_BS_cfo_package_item_return_snapshots_item_total_amount DEFAULT (0),
        snapshot_json NVARCHAR(MAX) NOT NULL,
        created_by INT NULL,
        created_at DATETIME2(3) NOT NULL
            CONSTRAINT DF_BS_cfo_package_item_return_snapshots_created_at DEFAULT SYSUTCDATETIME(),
        row_version ROWVERSION NOT NULL,
        CONSTRAINT FK_BS_cfo_item_return_snapshots_package
            FOREIGN KEY (category_budget_package_id)
            REFERENCES dbo.BS_category_budget_packages(id),
        CONSTRAINT FK_BS_cfo_item_return_snapshots_package_item
            FOREIGN KEY (category_budget_package_item_id)
            REFERENCES dbo.BS_category_budget_package_items(id),
        CONSTRAINT FK_BS_cfo_item_return_snapshots_financial_year
            FOREIGN KEY (financial_year_id)
            REFERENCES dbo.BS_financial_years(id),
        CONSTRAINT FK_BS_cfo_item_return_snapshots_category
            FOREIGN KEY (budget_category_id)
            REFERENCES dbo.BS_budget_categories(id),
        CONSTRAINT CK_BS_cfo_item_return_snapshots_snapshot_json
            CHECK (ISJSON(snapshot_json) = 1)
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BS_cfo_item_return_snapshots_package_item_created'
      AND object_id = OBJECT_ID('dbo.BS_cfo_package_item_return_snapshots')
)
BEGIN
    CREATE INDEX IX_BS_cfo_item_return_snapshots_package_item_created
    ON dbo.BS_cfo_package_item_return_snapshots
    (
        category_budget_package_item_id,
        created_at DESC,
        id DESC
    )
    INCLUDE
    (
        category_budget_package_id,
        financial_year_id,
        budget_category_id
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BS_cfo_item_return_snapshots_package'
      AND object_id = OBJECT_ID('dbo.BS_cfo_package_item_return_snapshots')
)
BEGIN
    CREATE INDEX IX_BS_cfo_item_return_snapshots_package
    ON dbo.BS_cfo_package_item_return_snapshots
    (
        category_budget_package_id,
        created_at DESC,
        id DESC
    );
END;
