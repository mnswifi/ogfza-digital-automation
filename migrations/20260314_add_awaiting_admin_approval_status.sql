SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.company_applications')
          AND name = N'CK_company_applications_status'
    )
    BEGIN
        ALTER TABLE dbo.company_applications
            DROP CONSTRAINT CK_company_applications_status;
    END;

    ALTER TABLE dbo.company_applications WITH CHECK
        ADD CONSTRAINT CK_company_applications_status CHECK (
            status IN (
                'Draft',
                'Submitted',
                'Under Review',
                'Awaiting Admin Approval',
                'Returned',
                'Approved',
                'Rejected'
            )
        );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
