IF COL_LENGTH('dbo.BS_budget_items', 'is_project') IS NULL
BEGIN
  ALTER TABLE dbo.BS_budget_items
  ADD is_project BIT NOT NULL
    CONSTRAINT DF_BS_budget_items_is_project DEFAULT (0);
END;
