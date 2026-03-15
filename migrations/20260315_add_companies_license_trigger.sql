SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    EXEC(N'
        CREATE OR ALTER TRIGGER dbo.TR_companies_assign_license_no
        ON dbo.companies
        AFTER INSERT
        AS
        BEGIN
            SET NOCOUNT ON;

            DECLARE @companyId INT;
            DECLARE @candidate NVARCHAR(20);
            DECLARE @attempts INT;

            DECLARE pending CURSOR LOCAL FAST_FORWARD FOR
                SELECT id
                FROM inserted
                WHERE license_no IS NULL;

            OPEN pending;
            FETCH NEXT FROM pending INTO @companyId;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                SET @attempts = 0;

                WHILE 1 = 1
                BEGIN
                    SET @candidate = CONCAT(
                        N''RO-'',
                        RIGHT(N''00000'' + CAST(ABS(CHECKSUM(NEWID())) % 100000 AS NVARCHAR(5)), 5)
                    );

                    IF NOT EXISTS (
                        SELECT 1
                        FROM dbo.companies
                        WHERE license_no = @candidate
                          AND id <> @companyId
                    )
                    BEGIN
                        UPDATE dbo.companies
                        SET license_no = @candidate
                        WHERE id = @companyId
                          AND license_no IS NULL;

                        BREAK;
                    END;

                    SET @attempts = @attempts + 1;

                    IF @attempts >= 50
                    BEGIN
                        CLOSE pending;
                        DEALLOCATE pending;
                        THROW 50002, ''Failed to generate a unique license number for a new company.'', 1;
                    END;
                END;

                FETCH NEXT FROM pending INTO @companyId;
            END;

            CLOSE pending;
            DEALLOCATE pending;
        END;
    ');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
