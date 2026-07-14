IF COL_LENGTH('dbo.BS_department_category_budget_items', 'catalog_item_name_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_department_category_budget_items
    ADD catalog_item_name_snapshot NVARCHAR(200) NULL;
END;

IF COL_LENGTH('dbo.BS_department_category_budget_items', 'catalog_item_code_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_department_category_budget_items
    ADD catalog_item_code_snapshot VARCHAR(80) NULL;
END;

IF COL_LENGTH('dbo.BS_department_category_budget_items', 'expense_type_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_department_category_budget_items
    ADD expense_type_snapshot VARCHAR(10) NULL;
END;

IF COL_LENGTH('dbo.BS_department_category_budget_items', 'unit_of_measure_id_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_department_category_budget_items
    ADD unit_of_measure_id_snapshot INT NULL;
END;

IF COL_LENGTH('dbo.BS_department_category_budget_items', 'unit_name_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_department_category_budget_items
    ADD unit_name_snapshot NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.BS_department_category_budget_items', 'unit_code_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_department_category_budget_items
    ADD unit_code_snapshot VARCHAR(30) NULL;
END;

UPDATE item
SET
  catalog_item_name_snapshot = COALESCE(item.catalog_item_name_snapshot, catalog.name),
  catalog_item_code_snapshot = COALESCE(item.catalog_item_code_snapshot, catalog.item_code),
  expense_type_snapshot = COALESCE(item.expense_type_snapshot, catalog.expense_type),
  unit_of_measure_id_snapshot = COALESCE(item.unit_of_measure_id_snapshot, catalog.unit_of_measure_id),
  unit_name_snapshot = COALESCE(item.unit_name_snapshot, unit.name),
  unit_code_snapshot = COALESCE(item.unit_code_snapshot, unit.unit_code)
FROM dbo.BS_department_category_budget_items AS item
INNER JOIN dbo.BS_budget_catalog_items AS catalog
  ON catalog.id = item.catalog_item_id
INNER JOIN dbo.BS_units_of_measure AS unit
  ON unit.id = catalog.unit_of_measure_id
WHERE item.catalog_item_name_snapshot IS NULL
   OR item.catalog_item_code_snapshot IS NULL
   OR item.expense_type_snapshot IS NULL
   OR item.unit_of_measure_id_snapshot IS NULL
   OR item.unit_name_snapshot IS NULL
   OR item.unit_code_snapshot IS NULL;

IF COL_LENGTH('dbo.BS_category_budget_package_items', 'catalog_item_name_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_category_budget_package_items
    ADD catalog_item_name_snapshot NVARCHAR(200) NULL;
END;

IF COL_LENGTH('dbo.BS_category_budget_package_items', 'catalog_item_code_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_category_budget_package_items
    ADD catalog_item_code_snapshot VARCHAR(80) NULL;
END;

IF COL_LENGTH('dbo.BS_category_budget_package_items', 'expense_type_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_category_budget_package_items
    ADD expense_type_snapshot VARCHAR(10) NULL;
END;

IF COL_LENGTH('dbo.BS_category_budget_package_items', 'unit_of_measure_id_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_category_budget_package_items
    ADD unit_of_measure_id_snapshot INT NULL;
END;

IF COL_LENGTH('dbo.BS_category_budget_package_items', 'unit_name_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_category_budget_package_items
    ADD unit_name_snapshot NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.BS_category_budget_package_items', 'unit_code_snapshot') IS NULL
BEGIN
  ALTER TABLE dbo.BS_category_budget_package_items
    ADD unit_code_snapshot VARCHAR(30) NULL;
END;

UPDATE packageItem
SET
  catalog_item_name_snapshot = COALESCE(packageItem.catalog_item_name_snapshot, catalog.name),
  catalog_item_code_snapshot = COALESCE(packageItem.catalog_item_code_snapshot, catalog.item_code),
  expense_type_snapshot = COALESCE(packageItem.expense_type_snapshot, catalog.expense_type),
  unit_of_measure_id_snapshot = COALESCE(packageItem.unit_of_measure_id_snapshot, catalog.unit_of_measure_id),
  unit_name_snapshot = COALESCE(packageItem.unit_name_snapshot, unit.name),
  unit_code_snapshot = COALESCE(packageItem.unit_code_snapshot, unit.unit_code)
FROM dbo.BS_category_budget_package_items AS packageItem
INNER JOIN dbo.BS_budget_catalog_items AS catalog
  ON catalog.id = packageItem.catalog_item_id
INNER JOIN dbo.BS_units_of_measure AS unit
  ON unit.id = catalog.unit_of_measure_id
WHERE packageItem.catalog_item_name_snapshot IS NULL
   OR packageItem.catalog_item_code_snapshot IS NULL
   OR packageItem.expense_type_snapshot IS NULL
   OR packageItem.unit_of_measure_id_snapshot IS NULL
   OR packageItem.unit_name_snapshot IS NULL
   OR packageItem.unit_code_snapshot IS NULL;
