IF COL_LENGTH('dbo.BS_department_category_budget_items', 'hod_item_note') IS NULL
BEGIN
    ALTER TABLE dbo.BS_department_category_budget_items
        ADD hod_item_note NVARCHAR(3000) NULL;
END;
