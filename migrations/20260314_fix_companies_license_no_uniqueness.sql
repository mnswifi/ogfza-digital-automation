SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @legacyLicenseNoIndex SYSNAME;
    DECLARE @legacyLicenseNoIsConstraint BIT = 0;
    DECLARE @sql NVARCHAR(MAX);

    SELECT TOP 1
        @legacyLicenseNoIndex = i.name,
        @legacyLicenseNoIsConstraint = i.is_unique_constraint
    FROM sys.indexes i
    JOIN sys.index_columns ic
        ON ic.object_id = i.object_id
       AND ic.index_id = i.index_id
    JOIN sys.columns c
        ON c.object_id = ic.object_id
       AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'dbo.companies')
      AND i.is_unique = 1
      AND c.name = N'license_no';

    IF @legacyLicenseNoIndex IS NOT NULL
       AND @legacyLicenseNoIndex <> N'UX_companies_license_no_non_null'
    BEGIN
        IF @legacyLicenseNoIsConstraint = 1
        BEGIN
            SET @sql = N'ALTER TABLE dbo.companies DROP CONSTRAINT ['
                + REPLACE(@legacyLicenseNoIndex, N']', N']]')
                + N']';
        END;
        ELSE
        BEGIN
            SET @sql = N'DROP INDEX ['
                + REPLACE(@legacyLicenseNoIndex, N']', N']]')
                + N'] ON dbo.companies';
        END;

        EXEC(@sql);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.companies')
          AND name = N'UX_companies_license_no_non_null'
    )
    BEGIN
        CREATE UNIQUE INDEX UX_companies_license_no_non_null
            ON dbo.companies(license_no)
            WHERE license_no IS NOT NULL;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
