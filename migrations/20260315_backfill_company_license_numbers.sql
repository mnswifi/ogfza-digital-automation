SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @companyId INT;
    DECLARE @candidate NVARCHAR(20);
    DECLARE @attempts INT;

    WHILE EXISTS (
        SELECT 1
        FROM dbo.companies
        WHERE license_no IS NULL
    )
    BEGIN
        SELECT TOP 1
            @companyId = id
        FROM dbo.companies
        WHERE license_no IS NULL
        ORDER BY id;

        SET @attempts = 0;

        WHILE 1 = 1
        BEGIN
            SET @candidate = CONCAT(
                N'RO-',
                RIGHT(N'00000' + CAST(ABS(CHECKSUM(NEWID())) % 100000 AS NVARCHAR(5)), 5)
            );

            IF NOT EXISTS (
                SELECT 1
                FROM dbo.companies
                WHERE license_no = @candidate
            )
            BEGIN
                UPDATE dbo.companies
                SET license_no = @candidate
                WHERE id = @companyId;

                BREAK;
            END;

            SET @attempts = @attempts + 1;

            IF @attempts >= 50
            BEGIN
                THROW 50001, 'Failed to generate a unique license number during backfill.', 1;
            END;
        END;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
