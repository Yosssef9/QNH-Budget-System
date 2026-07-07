/*
  Phase 5C - Category package sub-item attachment concurrency

  Adds a ROWVERSION token to existing package sub-item attachments so attachment
  removal can use the same optimistic concurrency rule as other mutable package
  records.
*/

IF COL_LENGTH(
  'dbo.BS_category_budget_package_sub_item_attachments',
  'row_version'
) IS NULL
BEGIN
  ALTER TABLE dbo.BS_category_budget_package_sub_item_attachments
    ADD row_version ROWVERSION NOT NULL;
END;
