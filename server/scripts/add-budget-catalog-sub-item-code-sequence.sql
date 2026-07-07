IF OBJECT_ID(N'dbo.BS_budget_catalog_sub_item_code_seq', N'SO') IS NULL
BEGIN
  CREATE SEQUENCE dbo.BS_budget_catalog_sub_item_code_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 50;
END;
