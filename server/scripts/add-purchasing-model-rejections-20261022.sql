/*
    QNH Budget System
    Purchasing Model Rejections Migration
    Date: 2026-10-22

    Target Database: QNHDB

    Safe, transactional, repeatable migration.
    Back up QNHDB before execution.
*/

USE [QNHDB];
GO

SET XACT_ABORT ON;
SET NOCOUNT ON;

BEGIN TRY

    BEGIN TRANSACTION;

    --------------------------------------------------------
    -- 1. Verify target table exists
    --------------------------------------------------------

    IF OBJECT_ID(
        N'dbo.BS_category_budget_package_sub_item_price_reviews',
        N'U'
    ) IS NULL
    BEGIN
        THROW 50001,
            'Purchasing price reviews table was not found in QNHDB.',
            1;
    END;


    --------------------------------------------------------
    -- 2. Add rejection_reason if missing
    --------------------------------------------------------

    IF COL_LENGTH(
        N'dbo.BS_category_budget_package_sub_item_price_reviews',
        N'rejection_reason'
    ) IS NULL
    BEGIN

        EXEC sys.sp_executesql N'
            ALTER TABLE
                dbo.BS_category_budget_package_sub_item_price_reviews
            ADD
                rejection_reason NVARCHAR(1000) NULL;
        ';

    END;


    --------------------------------------------------------
    -- 3. Update status constraint
    --------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(
            N'dbo.BS_category_budget_package_sub_item_price_reviews'
        )
        AND name = N'CK_BS_package_sub_item_price_reviews_status'
    )
    BEGIN

        ALTER TABLE
            dbo.BS_category_budget_package_sub_item_price_reviews
        DROP CONSTRAINT
            CK_BS_package_sub_item_price_reviews_status;

    END;


    EXEC sys.sp_executesql N'
        ALTER TABLE
            dbo.BS_category_budget_package_sub_item_price_reviews
        WITH CHECK
        ADD CONSTRAINT
            CK_BS_package_sub_item_price_reviews_status
        CHECK (
            status IN (
                ''PENDING'',
                ''ACCEPTED'',
                ''REJECTED''
            )
        );
    ';


    --------------------------------------------------------
    -- 4. Drop previous decision constraint
    --------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(
            N'dbo.BS_category_budget_package_sub_item_price_reviews'
        )
        AND name = N'CK_BS_package_sub_item_price_reviews_decision'
    )
    BEGIN

        ALTER TABLE
            dbo.BS_category_budget_package_sub_item_price_reviews
        DROP CONSTRAINT
            CK_BS_package_sub_item_price_reviews_decision;

    END;


    --------------------------------------------------------
    -- 5. Create updated decision constraint
    --------------------------------------------------------

    EXEC sys.sp_executesql N'
        ALTER TABLE
            dbo.BS_category_budget_package_sub_item_price_reviews
        WITH CHECK
        ADD CONSTRAINT
            CK_BS_package_sub_item_price_reviews_decision
        CHECK (

            (
                status = ''PENDING''
                AND reviewed_by IS NULL
                AND reviewed_at IS NULL
                AND rejection_reason IS NULL
            )

            OR

            (
                status = ''ACCEPTED''
                AND reviewed_by IS NOT NULL
                AND reviewed_at IS NOT NULL
                AND rejection_reason IS NULL
            )

            OR

            (
                status = ''REJECTED''
                AND reviewed_by IS NOT NULL
                AND reviewed_at IS NOT NULL
                AND rejection_reason IS NOT NULL
                AND NULLIF(
                    LTRIM(RTRIM(rejection_reason)),
                    N''''
                ) IS NOT NULL
            )

        );
    ';


    --------------------------------------------------------
    -- 6. Commit migration
    --------------------------------------------------------

    COMMIT TRANSACTION;

    PRINT 'SUCCESS: Purchasing model rejection migration completed.';

END TRY

BEGIN CATCH

    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT 'ERROR: Purchasing model rejection migration failed.';

    THROW;

END CATCH;


--------------------------------------------------------
-- 7. Verify database changes
--------------------------------------------------------

SELECT
    DB_NAME() AS DatabaseName,
    COL_LENGTH(
        N'dbo.BS_category_budget_package_sub_item_price_reviews',
        N'rejection_reason'
    ) AS RejectionReasonColumnLength;


SELECT
    name AS ConstraintName,
    is_disabled,
    is_not_trusted
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID(
    N'dbo.BS_category_budget_package_sub_item_price_reviews'
)
AND name IN (
    N'CK_BS_package_sub_item_price_reviews_status',
    N'CK_BS_package_sub_item_price_reviews_decision'
);

GO