IF COL_LENGTH('dbo.BS_budget_item_requests', 'unit_of_measure_id') IS NULL
BEGIN
  ALTER TABLE dbo.BS_budget_item_requests
    ADD unit_of_measure_id INT NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_BS_budget_item_requests_unit_of_measure'
    AND parent_object_id = OBJECT_ID('dbo.BS_budget_item_requests')
)
BEGIN
  ALTER TABLE dbo.BS_budget_item_requests
    ADD CONSTRAINT FK_BS_budget_item_requests_unit_of_measure
    FOREIGN KEY (unit_of_measure_id)
    REFERENCES dbo.BS_units_of_measure(id);
END;
