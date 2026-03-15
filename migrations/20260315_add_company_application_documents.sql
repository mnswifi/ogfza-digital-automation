SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

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

    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.company_application_documents')
          AND name = N'CK_company_application_documents_type'
    )
    BEGIN
        ALTER TABLE dbo.company_application_documents
            DROP CONSTRAINT CK_company_application_documents_type;
    END;

    ALTER TABLE dbo.company_application_documents WITH CHECK
        ADD CONSTRAINT CK_company_application_documents_type CHECK (
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
        );

    INSERT INTO dbo.company_application_documents (
        application_id,
        document_type,
        file_name,
        created_at,
        updated_at
    )
    SELECT
        id,
        N'project_summary',
        project_summary_attachment_url,
        COALESCE(updated_at, created_at),
        COALESCE(updated_at, created_at)
    FROM dbo.company_applications
    WHERE project_summary_attachment_url IS NOT NULL
      AND LTRIM(RTRIM(project_summary_attachment_url)) <> N''
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_documents d
          WHERE d.application_id = company_applications.id
            AND d.document_type = N'project_summary'
      );

    INSERT INTO dbo.company_application_documents (
        application_id,
        document_type,
        file_name,
        created_at,
        updated_at
    )
    SELECT
        id,
        N'company_stamp_or_seal',
        company_seal_file_url,
        COALESCE(updated_at, created_at),
        COALESCE(updated_at, created_at)
    FROM dbo.company_applications
    WHERE company_seal_file_url IS NOT NULL
      AND LTRIM(RTRIM(company_seal_file_url)) <> N''
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_documents d
          WHERE d.application_id = company_applications.id
            AND d.document_type = N'company_stamp_or_seal'
      );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
