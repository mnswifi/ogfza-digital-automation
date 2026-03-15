SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.company_applications', N'requested_license_type') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD requested_license_type NVARCHAR(100) NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'estimated_fee_usd') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD estimated_fee_usd DECIMAL(18,2) NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'approved_license_type') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD approved_license_type NVARCHAR(100) NULL;
    END;

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

    IF COL_LENGTH(N'dbo.company_applications', N'approved_fee_usd') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD approved_fee_usd DECIMAL(18,2) NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'payment_status') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD payment_status NVARCHAR(100) NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'payment_reference') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD payment_reference NVARCHAR(255) NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'payment_confirmed_at') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD payment_confirmed_at DATETIME2 NULL;
    END;

    IF COL_LENGTH(N'dbo.company_applications', N'payment_confirmed_by_user_id') IS NULL
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD payment_confirmed_by_user_id INT NULL;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = N'FK_company_applications_payment_confirmed_by_user'
    )
    BEGIN
        ALTER TABLE dbo.company_applications
            ADD CONSTRAINT FK_company_applications_payment_confirmed_by_user
                FOREIGN KEY (payment_confirmed_by_user_id)
                REFERENCES dbo.users(id);
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
        WHERE name = N'IX_company_applications_payment_confirmed_by_user_id'
          AND object_id = OBJECT_ID(N'dbo.company_applications')
    )
    BEGIN
        CREATE INDEX IX_company_applications_payment_confirmed_by_user_id
            ON dbo.company_applications(payment_confirmed_by_user_id);
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

    IF COL_LENGTH(N'dbo.companies', N'license_type') IS NULL
    BEGIN
        ALTER TABLE dbo.companies
            ADD license_type NVARCHAR(100) NULL;
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
              AND name = N''CK_company_applications_requested_license_type''
        )
        BEGIN
            ALTER TABLE dbo.company_applications
                DROP CONSTRAINT CK_company_applications_requested_license_type;
        END;

        ALTER TABLE dbo.company_applications WITH CHECK
            ADD CONSTRAINT CK_company_applications_requested_license_type CHECK (
                requested_license_type IS NULL
                OR requested_license_type IN (
                    N''Free Zone Service Licence'',
                    N''Free Zone Enterprise Licence'',
                    N''Free Zone Enterprise - Special Activity Licence'',
                    N''Free Zone Developer Licence''
                )
            );

        IF EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE parent_object_id = OBJECT_ID(N''dbo.company_applications'')
              AND name = N''CK_company_applications_approved_license_type''
        )
        BEGIN
            ALTER TABLE dbo.company_applications
                DROP CONSTRAINT CK_company_applications_approved_license_type;
        END;

        ALTER TABLE dbo.company_applications WITH CHECK
            ADD CONSTRAINT CK_company_applications_approved_license_type CHECK (
                approved_license_type IS NULL
                OR approved_license_type IN (
                    N''Free Zone Service Licence'',
                    N''Free Zone Enterprise Licence'',
                    N''Free Zone Enterprise - Special Activity Licence'',
                    N''Free Zone Developer Licence''
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
            WHERE parent_object_id = OBJECT_ID(N''dbo.companies'')
              AND name = N''CK_companies_license_type''
        )
        BEGIN
            ALTER TABLE dbo.companies
                DROP CONSTRAINT CK_companies_license_type;
        END;

        ALTER TABLE dbo.companies WITH CHECK
            ADD CONSTRAINT CK_companies_license_type CHECK (
                license_type IS NULL
                OR license_type IN (
                    N''Free Zone Service Licence'',
                    N''Free Zone Enterprise Licence'',
                    N''Free Zone Enterprise - Special Activity Licence'',
                    N''Free Zone Developer Licence''
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

        ;WITH normalized_license_type AS (
            SELECT
                a.id,
                CASE
                    WHEN a.requested_license_type IN (
                        N''Free Zone Service Licence'',
                        N''Free Zone Enterprise Licence'',
                        N''Free Zone Enterprise - Special Activity Licence'',
                        N''Free Zone Developer Licence''
                    ) THEN a.requested_license_type
                    WHEN a.approved_license_type IN (
                        N''Free Zone Service Licence'',
                        N''Free Zone Enterprise Licence'',
                        N''Free Zone Enterprise - Special Activity Licence'',
                        N''Free Zone Developer Licence''
                    ) THEN a.approved_license_type
                    WHEN a.internal_license_category IN (
                        N''Free Zone Service Licence'',
                        N''Free Zone Enterprise Licence'',
                        N''Free Zone Enterprise - Special Activity Licence'',
                        N''Free Zone Developer Licence''
                    ) THEN a.internal_license_category
                    ELSE NULL
                END AS normalized_license_type
            FROM dbo.company_applications a
        )
        UPDATE a
        SET
            requested_license_type = COALESCE(a.requested_license_type, n.normalized_license_type),
            approved_license_type = COALESCE(a.approved_license_type, n.normalized_license_type)
        FROM dbo.company_applications a
        INNER JOIN normalized_license_type n
            ON n.id = a.id
        WHERE
            a.requested_license_type IS NULL
            OR a.approved_license_type IS NULL;

        UPDATE dbo.company_applications
        SET estimated_fee_usd = CASE requested_license_type
            WHEN N''Free Zone Service Licence'' THEN 4500
            WHEN N''Free Zone Enterprise Licence'' THEN 40500
            WHEN N''Free Zone Enterprise - Special Activity Licence'' THEN 115500
            WHEN N''Free Zone Developer Licence'' THEN 215500
            ELSE estimated_fee_usd
        END
        WHERE estimated_fee_usd IS NULL
          AND requested_license_type IS NOT NULL;

        UPDATE dbo.company_applications
        SET approved_fee_usd = CASE approved_license_type
            WHEN N''Free Zone Service Licence'' THEN 4500
            WHEN N''Free Zone Enterprise Licence'' THEN 40500
            WHEN N''Free Zone Enterprise - Special Activity Licence'' THEN 115500
            WHEN N''Free Zone Developer Licence'' THEN 215500
            ELSE approved_fee_usd
        END
        WHERE approved_fee_usd IS NULL
          AND approved_license_type IS NOT NULL;

        UPDATE a
        SET
            a.status = N''Licence Issued'',
            a.payment_status = COALESCE(a.payment_status, N''Paid''),
            a.payment_confirmed_at = COALESCE(
                a.payment_confirmed_at,
                a.approved_at,
                CAST(c.approved_date AS DATETIME2)
            ),
            a.approved_license_type = COALESCE(a.approved_license_type, a.requested_license_type),
            a.approved_fee_usd = COALESCE(
                a.approved_fee_usd,
                CASE COALESCE(a.approved_license_type, a.requested_license_type)
                    WHEN N''Free Zone Service Licence'' THEN 4500
                    WHEN N''Free Zone Enterprise Licence'' THEN 40500
                    WHEN N''Free Zone Enterprise - Special Activity Licence'' THEN 115500
                    WHEN N''Free Zone Developer Licence'' THEN 215500
                    ELSE NULL
                END
            )
        FROM dbo.company_applications a
        INNER JOIN dbo.companies c
            ON c.approved_application_id = a.id
        WHERE a.status IN (N''Approved'', N''Approved Pending Payment'', N''Licence Issued'');

        UPDATE dbo.company_applications
        SET
            status = N''Approved Pending Payment'',
            payment_status = COALESCE(payment_status, N''Awaiting Contractor Payment''),
            approved_license_type = COALESCE(approved_license_type, requested_license_type),
            approved_fee_usd = COALESCE(
                approved_fee_usd,
                CASE COALESCE(approved_license_type, requested_license_type)
                    WHEN N''Free Zone Service Licence'' THEN 4500
                    WHEN N''Free Zone Enterprise Licence'' THEN 40500
                    WHEN N''Free Zone Enterprise - Special Activity Licence'' THEN 115500
                    WHEN N''Free Zone Developer Licence'' THEN 215500
                    ELSE NULL
                END
            )
        WHERE status = N''Approved''
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.companies c
              WHERE c.approved_application_id = dbo.company_applications.id
          );

        UPDATE c
        SET c.license_type = COALESCE(
            c.license_type,
            a.approved_license_type,
            a.requested_license_type
        )
        FROM dbo.companies c
        INNER JOIN dbo.company_applications a
            ON a.id = c.approved_application_id
        WHERE c.license_type IS NULL;

        INSERT INTO dbo.company_application_events (
            application_id,
            event_type,
            actor_user_id,
            actor_name,
            actor_role,
            from_status,
            to_status,
            note,
            metadata_json,
            created_at
        )
        SELECT
            a.id,
            N''LicenseIssued'',
            a.payment_confirmed_by_user_id,
            confirmer.full_name,
            confirmer.role,
            N''Approved Pending Payment'',
            N''Licence Issued'',
            CONCAT(
                N''Legacy record synchronized into the licensing workflow. Licence '',
                COALESCE(c.license_no, N''--''),
                N'' was issued'',
                CASE
                    WHEN COALESCE(c.license_type, a.approved_license_type, a.requested_license_type) IS NOT NULL
                        THEN CONCAT(N'' for '', COALESCE(c.license_type, a.approved_license_type, a.requested_license_type))
                    ELSE N''''
                END,
                N''.''
            ),
            NULL,
            COALESCE(a.payment_confirmed_at, a.approved_at, CAST(c.approved_date AS DATETIME2), SYSDATETIME())
        FROM dbo.company_applications a
        INNER JOIN dbo.companies c
            ON c.approved_application_id = a.id
        LEFT JOIN dbo.users confirmer
            ON confirmer.id = a.payment_confirmed_by_user_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.company_application_events e
            WHERE e.application_id = a.id
              AND e.event_type = N''LicenseIssued''
        );
    ');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
