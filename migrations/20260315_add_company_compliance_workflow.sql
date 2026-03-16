IF OBJECT_ID('dbo.company_compliance_cases', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.company_compliance_cases (
        id INT IDENTITY(1,1) PRIMARY KEY,
        company_id INT NOT NULL,
        case_type NVARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        document_type NVARCHAR(255) NULL,
        severity NVARCHAR(100) NULL,
        request_note NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(100) NOT NULL CONSTRAINT DF_company_compliance_cases_status DEFAULT 'Open',
        due_date DATE NULL,
        requested_by_user_id INT NULL,
        requested_at DATETIME2 NOT NULL CONSTRAINT DF_company_compliance_cases_requested_at DEFAULT SYSDATETIME(),
        contractor_response_note NVARCHAR(MAX) NULL,
        contractor_response_file_name NVARCHAR(255) NULL,
        contractor_response_submitted_at DATETIME2 NULL,
        contractor_response_submitted_by_user_id INT NULL,
        review_note NVARCHAR(MAX) NULL,
        returned_at DATETIME2 NULL,
        returned_by_user_id INT NULL,
        resolved_at DATETIME2 NULL,
        resolved_by_user_id INT NULL,
        closed_at DATETIME2 NULL,
        closed_by_user_id INT NULL,
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_company_compliance_cases_updated_at DEFAULT SYSDATETIME(),
        legacy_compliance_id INT NULL,
        CONSTRAINT FK_company_compliance_cases_company
            FOREIGN KEY (company_id) REFERENCES dbo.companies(id),
        CONSTRAINT FK_company_compliance_cases_requested_by
            FOREIGN KEY (requested_by_user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_company_compliance_cases_contractor_response_by
            FOREIGN KEY (contractor_response_submitted_by_user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_company_compliance_cases_returned_by
            FOREIGN KEY (returned_by_user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_company_compliance_cases_resolved_by
            FOREIGN KEY (resolved_by_user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_company_compliance_cases_closed_by
            FOREIGN KEY (closed_by_user_id) REFERENCES dbo.users(id),
        CONSTRAINT CK_company_compliance_cases_type
            CHECK (case_type IN ('DocumentUpdate', 'AuditFinding')),
        CONSTRAINT CK_company_compliance_cases_status
            CHECK (status IN ('Open', 'Response Submitted', 'Returned', 'Resolved', 'Closed'))
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_company_compliance_cases_company_status'
      AND object_id = OBJECT_ID('dbo.company_compliance_cases')
)
BEGIN
    CREATE INDEX IX_company_compliance_cases_company_status
        ON dbo.company_compliance_cases(company_id, status);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_company_compliance_cases_due_date'
      AND object_id = OBJECT_ID('dbo.company_compliance_cases')
)
BEGIN
    CREATE INDEX IX_company_compliance_cases_due_date
        ON dbo.company_compliance_cases(due_date);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_company_compliance_cases_legacy_compliance_id'
      AND object_id = OBJECT_ID('dbo.company_compliance_cases')
)
BEGIN
    CREATE UNIQUE INDEX UX_company_compliance_cases_legacy_compliance_id
        ON dbo.company_compliance_cases(legacy_compliance_id)
        WHERE legacy_compliance_id IS NOT NULL;
END;

IF OBJECT_ID('dbo.company_compliance_case_events', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.company_compliance_case_events (
        id INT IDENTITY(1,1) PRIMARY KEY,
        case_id INT NOT NULL,
        event_type NVARCHAR(100) NOT NULL,
        actor_user_id INT NULL,
        actor_name NVARCHAR(255) NULL,
        actor_role NVARCHAR(100) NULL,
        from_status NVARCHAR(100) NULL,
        to_status NVARCHAR(100) NULL,
        note NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_company_compliance_case_events_created_at DEFAULT SYSDATETIME(),
        CONSTRAINT FK_company_compliance_case_events_case
            FOREIGN KEY (case_id) REFERENCES dbo.company_compliance_cases(id),
        CONSTRAINT FK_company_compliance_case_events_actor
            FOREIGN KEY (actor_user_id) REFERENCES dbo.users(id)
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_company_compliance_case_events_case_id'
      AND object_id = OBJECT_ID('dbo.company_compliance_case_events')
)
BEGIN
    CREATE INDEX IX_company_compliance_case_events_case_id
        ON dbo.company_compliance_case_events(case_id, created_at);
END;

IF OBJECT_ID('dbo.compliance', 'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM dbo.company_compliance_cases
       WHERE legacy_compliance_id IS NOT NULL
   )
BEGIN
    INSERT INTO dbo.company_compliance_cases (
        company_id,
        case_type,
        title,
        document_type,
        severity,
        request_note,
        status,
        due_date,
        requested_by_user_id,
        requested_at,
        contractor_response_note,
        contractor_response_file_name,
        contractor_response_submitted_at,
        contractor_response_submitted_by_user_id,
        review_note,
        returned_at,
        returned_by_user_id,
        resolved_at,
        resolved_by_user_id,
        closed_at,
        closed_by_user_id,
        legacy_compliance_id
    )
    SELECT
        comp.company_id,
        'AuditFinding',
        CASE
            WHEN LEN(LTRIM(RTRIM(ISNULL(comp.findings, '')))) > 96
                THEN LEFT(LTRIM(RTRIM(comp.findings)), 96) + '...'
            ELSE COALESCE(NULLIF(LTRIM(RTRIM(comp.findings)), ''), 'Legacy Audit Finding')
        END,
        NULL,
        CASE
            WHEN comp.status = 'Violation' THEN 'High'
            ELSE NULL
        END,
        COALESCE(NULLIF(LTRIM(RTRIM(comp.findings)), ''), 'Legacy audit finding migrated from the previous compliance log.'),
        CASE
            WHEN comp.status = 'Completed' THEN 'Resolved'
            ELSE 'Open'
        END,
        NULL,
        NULL,
        COALESCE(CAST(comp.audit_date AS DATETIME2), SYSDATETIME()),
        NULL,
        NULL,
        NULL,
        NULL,
        CASE
            WHEN comp.status = 'Completed'
                THEN 'Migrated from legacy compliance log.'
            ELSE NULL
        END,
        NULL,
        NULL,
        CASE
            WHEN comp.status = 'Completed'
                THEN COALESCE(CAST(comp.audit_date AS DATETIME2), SYSDATETIME())
            ELSE NULL
        END,
        NULL,
        NULL,
        NULL,
        comp.id
    FROM dbo.compliance comp
    WHERE comp.company_id IS NOT NULL;

    INSERT INTO dbo.company_compliance_case_events (
        case_id,
        event_type,
        actor_user_id,
        actor_name,
        actor_role,
        from_status,
        to_status,
        note
    )
    SELECT
        cc.id,
        CASE
            WHEN cc.status = 'Resolved' THEN 'LegacyResolved'
            ELSE 'LegacyImported'
        END,
        NULL,
        'System Migration',
        'System',
        NULL,
        cc.status,
        'Imported from the previous compliance log.'
    FROM dbo.company_compliance_cases cc
    WHERE cc.legacy_compliance_id IS NOT NULL;
END;
