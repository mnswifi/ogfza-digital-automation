SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.company_applications', N'payment_submitted_at') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD payment_submitted_at DATETIME2 NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'payment_submitted_by_user_id') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD payment_submitted_by_user_id INT NULL;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = N'FK_company_applications_payment_submitted_by_user'
    )
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD CONSTRAINT FK_company_applications_payment_submitted_by_user
                FOREIGN KEY (payment_submitted_by_user_id)
                REFERENCES dbo.users(id);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_company_applications_payment_submitted_by_user_id'
          AND object_id = OBJECT_ID(N'dbo.company_applications')
    )
    BEGIN
        CREATE INDEX IX_company_applications_payment_submitted_by_user_id
            ON dbo.company_applications(payment_submitted_by_user_id);
    END;

    EXEC(N'
        IF EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE parent_object_id = OBJECT_ID(N''dbo.company_applications'')
              AND name = N''CK_company_applications_status''
        )
        BEGIN
            ALTER TABLE dbo.company_applications
                DROP CONSTRAINT CK_company_applications_status;
        END;

        ALTER TABLE dbo.company_applications WITH CHECK
            ADD CONSTRAINT CK_company_applications_status CHECK (
                status IN (
                    N''Draft'',
                    N''Submitted'',
                    N''Under Review'',
                    N''Awaiting Admin Approval'',
                    N''Returned'',
                    N''Approved Pending Payment'',
                    N''Payment Submitted'',
                    N''Licence Issued'',
                    N''Approved'',
                    N''Rejected''
                )
            );

        IF EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE parent_object_id = OBJECT_ID(N''dbo.company_applications'')
              AND name = N''CK_company_applications_payment_status''
        )
        BEGIN
            ALTER TABLE dbo.company_applications
                DROP CONSTRAINT CK_company_applications_payment_status;
        END;

        ALTER TABLE dbo.company_applications WITH CHECK
            ADD CONSTRAINT CK_company_applications_payment_status CHECK (
                payment_status IS NULL
                OR payment_status IN (
                    N''Awaiting Contractor Payment'',
                    N''Payment Submitted'',
                    N''Paid''
                )
            );

        IF EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE parent_object_id = OBJECT_ID(N''dbo.company_application_events'')
              AND name = N''CK_company_application_events_type''
        )
        BEGIN
            ALTER TABLE dbo.company_application_events
                DROP CONSTRAINT CK_company_application_events_type;
        END;

        ALTER TABLE dbo.company_application_events WITH CHECK
            ADD CONSTRAINT CK_company_application_events_type CHECK (
                event_type IN (
                    N''Submitted'',
                    N''Resubmitted'',
                    N''ForwardedToAdmin'',
                    N''PaymentSubmitted'',
                    N''ReturnedForRevision'',
                    N''RejectedByCompliance'',
                    N''RejectedByAdmin'',
                    N''ApprovedByAdmin'',
                    N''LicenseIssued''
                )
            );
    ');

    UPDATE dbo.company_applications
    SET payment_status = N'Awaiting Contractor Payment'
    WHERE status = N'Approved Pending Payment'
      AND (payment_status IS NULL OR payment_status = N'Awaiting Payment Confirmation');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
