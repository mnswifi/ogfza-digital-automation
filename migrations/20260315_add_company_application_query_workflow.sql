SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.company_applications', N'returned_by_user_id') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD returned_by_user_id INT NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'resubmitted_at') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD resubmitted_at DATETIME2 NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'query_note') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD query_note NVARCHAR(MAX) NULL;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = N'FK_company_applications_returned_by_user'
    )
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD CONSTRAINT FK_company_applications_returned_by_user
                FOREIGN KEY (returned_by_user_id)
                REFERENCES dbo.users(id);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_company_applications_returned_by_user_id'
          AND object_id = OBJECT_ID(N'dbo.company_applications')
    )
    BEGIN
        CREATE INDEX IX_company_applications_returned_by_user_id
            ON dbo.company_applications(returned_by_user_id);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
