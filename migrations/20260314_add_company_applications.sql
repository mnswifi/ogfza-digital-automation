SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.company_applications', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.company_applications (
            id INT IDENTITY(1,1) PRIMARY KEY,
            application_reference NVARCHAR(100) NOT NULL,
            company_name NVARCHAR(255) NULL,
            incorporation_type NVARCHAR(100) NULL,
            free_zone_location NVARCHAR(255) NULL,
            requested_license_type NVARCHAR(100) NULL,
            estimated_fee_usd DECIMAL(18,2) NULL,

            global_head_office_address NVARCHAR(MAX) NULL,
            global_phone_1 NVARCHAR(50) NULL,
            global_email NVARCHAR(255) NULL,
            global_phone_2 NVARCHAR(50) NULL,
            global_website NVARCHAR(255) NULL,

            nigeria_office_address NVARCHAR(MAX) NULL,
            nigeria_phone_1 NVARCHAR(50) NULL,
            nigeria_email NVARCHAR(255) NULL,
            nigeria_phone_2 NVARCHAR(50) NULL,
            nigeria_website NVARCHAR(255) NULL,

            primary_contact_name NVARCHAR(255) NULL,
            primary_contact_designation NVARCHAR(255) NULL,
            primary_contact_phone NVARCHAR(50) NULL,
            primary_contact_email NVARCHAR(255) NULL,
            secondary_contact_name NVARCHAR(255) NULL,
            secondary_contact_designation NVARCHAR(255) NULL,
            secondary_contact_phone NVARCHAR(50) NULL,
            secondary_contact_email NVARCHAR(255) NULL,

            present_business_operations NVARCHAR(MAX) NULL,
            dpr_registration_number NVARCHAR(255) NULL,
            activity_description NVARCHAR(MAX) NULL,
            countries_of_operation_west_africa NVARCHAR(MAX) NULL,
            proposed_business_activity NVARCHAR(MAX) NULL,
            project_summary_attachment_url NVARCHAR(MAX) NULL,

            undeveloped_land_sqm DECIMAL(18,2) NULL,
            developed_land_sqm DECIMAL(18,2) NULL,
            concrete_stacking_area_sqm DECIMAL(18,2) NULL,
            warehouse_space_sqm DECIMAL(18,2) NULL,
            factory_premises_sqm DECIMAL(18,2) NULL,
            office_accommodation_sqm DECIMAL(18,2) NULL,
            equipment_requirement NVARCHAR(MAX) NULL,
            residential_accommodation_personnel_count INT NULL,

            imports_summary NVARCHAR(MAX) NULL,
            exports_summary NVARCHAR(MAX) NULL,
            proposed_commencement_date DATE NULL,

            declaration_name NVARCHAR(255) NULL,
            declaration_designation NVARCHAR(255) NULL,
            declaration_signature_date DATE NULL,
            company_seal_file_url NVARCHAR(MAX) NULL,

            status NVARCHAR(100) NOT NULL
                CONSTRAINT DF_company_applications_status DEFAULT 'Draft',
            submitted_by_user_id INT NULL,
            reviewed_by_user_id INT NULL,
            approved_by_user_id INT NULL,
            payment_submitted_by_user_id INT NULL,
            payment_confirmed_by_user_id INT NULL,
            submitted_at DATETIME2 NULL,
            reviewed_at DATETIME2 NULL,
            approved_at DATETIME2 NULL,
            payment_status NVARCHAR(100) NULL,
            payment_reference NVARCHAR(255) NULL,
            payment_submitted_at DATETIME2 NULL,
            payment_confirmed_at DATETIME2 NULL,
            returned_at DATETIME2 NULL,
            returned_by_user_id INT NULL,
            resubmitted_at DATETIME2 NULL,
            query_note NVARCHAR(MAX) NULL,
            rejected_at DATETIME2 NULL,
            rejection_reason NVARCHAR(MAX) NULL,
            approved_license_type NVARCHAR(100) NULL,
            approved_fee_usd DECIMAL(18,2) NULL,

            internal_company_profile NVARCHAR(MAX) NULL,
            internal_activity_1 NVARCHAR(255) NULL,
            internal_activity_2 NVARCHAR(255) NULL,
            internal_activity_3 NVARCHAR(255) NULL,
            internal_activity_4 NVARCHAR(255) NULL,
            internal_activity_5 NVARCHAR(255) NULL,
            internal_license_category NVARCHAR(255) NULL,
            internal_free_zone_management_comment NVARCHAR(MAX) NULL,
            internal_facility_leased NVARCHAR(MAX) NULL,
            internal_project_recommendation BIT NULL,
            internal_project_endorsement_comment NVARCHAR(MAX) NULL,

            created_at DATETIME2 NOT NULL
                CONSTRAINT DF_company_applications_created_at DEFAULT SYSDATETIME(),
            updated_at DATETIME2 NOT NULL
                CONSTRAINT DF_company_applications_updated_at DEFAULT SYSDATETIME(),

            CONSTRAINT UQ_company_applications_reference UNIQUE (application_reference),
            CONSTRAINT CK_company_applications_status CHECK (
                status IN (
                    'Draft',
                    'Submitted',
                    'Under Review',
                    'Awaiting Admin Approval',
                    'Returned',
                    'Approved Pending Payment',
                    'Payment Submitted',
                    'Licence Issued',
                    'Approved',
                    'Rejected'
                )
            ),
            CONSTRAINT CK_company_applications_requested_license_type CHECK (
                requested_license_type IS NULL
                OR requested_license_type IN (
                    'Free Zone Service Licence',
                    'Free Zone Enterprise Licence',
                    'Free Zone Enterprise - Special Activity Licence',
                    'Free Zone Developer Licence'
                )
            ),
            CONSTRAINT CK_company_applications_approved_license_type CHECK (
                approved_license_type IS NULL
                OR approved_license_type IN (
                    'Free Zone Service Licence',
                    'Free Zone Enterprise Licence',
                    'Free Zone Enterprise - Special Activity Licence',
                    'Free Zone Developer Licence'
                )
            ),
            CONSTRAINT CK_company_applications_payment_status CHECK (
                payment_status IS NULL
                OR payment_status IN (
                    'Awaiting Contractor Payment',
                    'Payment Submitted',
                    'Paid'
                )
            ),
            CONSTRAINT CK_company_applications_incorporation_type CHECK (
                incorporation_type IS NULL
                OR incorporation_type IN (
                    'Offshore/overseas incorporation',
                    'Free Zone incorporation',
                    'Nigerian registered company'
                )
            ),
            CONSTRAINT CK_company_applications_free_zone_location CHECK (
                free_zone_location IS NULL
                OR free_zone_location IN (
                    'Brass Oil & Gas Free Zone Area, Bayelsa State',
                    'Eko Support Free Zone Area, Lagos State',
                    'Liberty Oil & Gas Free Zone Area, Akwa Ibom State',
                    'Onne Oil & Gas Free Zone Area, Rivers State',
                    'Warri Oil & Gas Free Zone Area, Delta State',
                    'Bestaf Maritime Industrial Free Zone, Lagos State'
                )
            ),
            CONSTRAINT FK_company_applications_submitted_by_user FOREIGN KEY (submitted_by_user_id)
                REFERENCES dbo.users(id),
            CONSTRAINT FK_company_applications_reviewed_by_user FOREIGN KEY (reviewed_by_user_id)
                REFERENCES dbo.users(id),
            CONSTRAINT FK_company_applications_returned_by_user FOREIGN KEY (returned_by_user_id)
                REFERENCES dbo.users(id),
            CONSTRAINT FK_company_applications_approved_by_user FOREIGN KEY (approved_by_user_id)
                REFERENCES dbo.users(id),
            CONSTRAINT FK_company_applications_payment_submitted_by_user FOREIGN KEY (payment_submitted_by_user_id)
                REFERENCES dbo.users(id),
            CONSTRAINT FK_company_applications_payment_confirmed_by_user FOREIGN KEY (payment_confirmed_by_user_id)
                REFERENCES dbo.users(id)
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_company_applications_status'
          AND object_id = OBJECT_ID(N'dbo.company_applications')
    )
    BEGIN
        CREATE INDEX IX_company_applications_status
            ON dbo.company_applications(status);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_company_applications_submitted_by_user_id'
          AND object_id = OBJECT_ID(N'dbo.company_applications')
    )
    BEGIN
        CREATE INDEX IX_company_applications_submitted_by_user_id
            ON dbo.company_applications(submitted_by_user_id);
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

    IF OBJECT_ID(N'dbo.company_application_documents', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.company_application_documents (
            id INT IDENTITY(1,1) PRIMARY KEY,
            application_id INT NOT NULL,
            document_type NVARCHAR(100) NOT NULL,
            file_name NVARCHAR(255) NOT NULL,
            created_at DATETIME2 NOT NULL
                CONSTRAINT DF_company_application_documents_created_at DEFAULT SYSDATETIME(),
            updated_at DATETIME2 NOT NULL
                CONSTRAINT DF_company_application_documents_updated_at DEFAULT SYSDATETIME(),
            CONSTRAINT FK_company_application_documents_application FOREIGN KEY (application_id)
                REFERENCES dbo.company_applications(id),
            CONSTRAINT UQ_company_application_documents_type UNIQUE (application_id, document_type),
            CONSTRAINT CK_company_application_documents_type CHECK (
                document_type IN (
                    'dpr_certificate',
                    'certificate_of_incorporation',
                    'certificate_or_notarized_overseas_incorporation',
                    'memorandum_and_articles_of_association',
                    'company_brochure_or_profile',
                    'environmental_impact_assessment_report',
                    'company_contact_details',
                    'feasibility_study_business_plan',
                    'financial_and_personnel_profile',
                    'sources_of_funding',
                    'audited_accounts_last_three_years',
                    'facility_lease_confirmation',
                    'oil_and_gas_affidavit',
                    'pre_incorporation_meeting_with_promoters',
                    'share_capital_and_stamp_duty_evidence',
                    'financial_profile_fdi_and_personnel_profile',
                    'project_summary',
                    'company_stamp_or_seal',
                    'notarized_overseas_incorporation'
                )
            )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_company_application_documents_application_id'
          AND object_id = OBJECT_ID(N'dbo.company_application_documents')
    )
    BEGIN
        CREATE INDEX IX_company_application_documents_application_id
            ON dbo.company_application_documents(application_id, document_type);
    END;

    IF OBJECT_ID(N'dbo.company_application_events', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.company_application_events (
            id INT IDENTITY(1,1) PRIMARY KEY,
            application_id INT NOT NULL,
            event_type NVARCHAR(100) NOT NULL,
            actor_user_id INT NULL,
            actor_name NVARCHAR(255) NULL,
            actor_role NVARCHAR(255) NULL,
            from_status NVARCHAR(100) NULL,
            to_status NVARCHAR(100) NULL,
            note NVARCHAR(MAX) NULL,
            metadata_json NVARCHAR(MAX) NULL,
            created_at DATETIME2 NOT NULL
                CONSTRAINT DF_company_application_events_created_at DEFAULT SYSDATETIME(),
            CONSTRAINT FK_company_application_events_application FOREIGN KEY (application_id)
                REFERENCES dbo.company_applications(id),
            CONSTRAINT FK_company_application_events_actor FOREIGN KEY (actor_user_id)
                REFERENCES dbo.users(id),
            CONSTRAINT CK_company_application_events_type CHECK (
                event_type IN (
                    'Submitted',
                    'Resubmitted',
                    'ForwardedToAdmin',
                    'PaymentSubmitted',
                    'ReturnedForRevision',
                    'RejectedByCompliance',
                    'RejectedByAdmin',
                    'ApprovedByAdmin',
                    'LicenseIssued'
                )
            )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_company_application_events_application_created'
          AND object_id = OBJECT_ID(N'dbo.company_application_events')
    )
    BEGIN
        CREATE INDEX IX_company_application_events_application_created
            ON dbo.company_application_events(application_id, created_at, id);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_company_application_events_actor_user_id'
          AND object_id = OBJECT_ID(N'dbo.company_application_events')
    )
    BEGIN
        CREATE INDEX IX_company_application_events_actor_user_id
            ON dbo.company_application_events(actor_user_id);
    END;

    -- Keep representative_email on companies.
    -- Retain legacy columns like tin, sector, and lease_info for now so we can
    -- backfill and cut the application workflow over safely in later steps.

    IF COL_LENGTH(N'dbo.companies', N'type') IS NOT NULL
       AND COL_LENGTH(N'dbo.companies', N'incorporation_type') IS NULL
    BEGIN
        EXEC sp_rename N'dbo.companies.[type]', N'incorporation_type', N'COLUMN';
    END;

    IF COL_LENGTH(N'dbo.companies', N'incorporation_type') IS NULL
    BEGIN
        ALTER TABLE dbo.companies
            ADD incorporation_type NVARCHAR(255) NULL;
    END;

    IF COL_LENGTH(N'dbo.companies', N'joined_date') IS NOT NULL
       AND COL_LENGTH(N'dbo.companies', N'approved_date') IS NULL
    BEGIN
        EXEC sp_rename N'dbo.companies.[joined_date]', N'approved_date', N'COLUMN';
    END;

    IF COL_LENGTH(N'dbo.companies', N'approved_date') IS NULL
    BEGIN
        ALTER TABLE dbo.companies
            ADD approved_date DATE NULL;
    END;

    IF COL_LENGTH(N'dbo.companies', N'free_zone_location') IS NULL
    BEGIN
        ALTER TABLE dbo.companies
            ADD free_zone_location NVARCHAR(255) NULL;
    END;

    IF COL_LENGTH(N'dbo.companies', N'license_type') IS NULL
    BEGIN
        ALTER TABLE dbo.companies
            ADD license_type NVARCHAR(100) NULL;
    END;

    IF COL_LENGTH(N'dbo.companies', N'approved_application_id') IS NULL
    BEGIN
        ALTER TABLE dbo.companies
            ADD approved_application_id INT NULL;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'UQ_companies_approved_application_id'
          AND object_id = OBJECT_ID(N'dbo.companies')
    )
    BEGIN
        EXEC(N'
            CREATE UNIQUE INDEX UQ_companies_approved_application_id
                ON dbo.companies(approved_application_id)
                WHERE approved_application_id IS NOT NULL;
        ');
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = N'FK_companies_approved_application'
    )
    BEGIN
        EXEC(N'
            ALTER TABLE dbo.companies
                ADD CONSTRAINT FK_companies_approved_application
                    FOREIGN KEY (approved_application_id)
                    REFERENCES dbo.company_applications(id);
        ');
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
