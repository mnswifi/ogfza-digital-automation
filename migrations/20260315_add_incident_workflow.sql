SET XACT_ABORT ON;
GO

IF COL_LENGTH('dbo.incidents', 'company_id') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD company_id INT NULL;
END;

IF COL_LENGTH('dbo.incidents', 'reported_by_user_id') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD reported_by_user_id INT NULL;
END;

IF COL_LENGTH('dbo.incidents', 'follow_up_note') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD follow_up_note NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.incidents', 'follow_up_submitted_at') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD follow_up_submitted_at DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.incidents', 'follow_up_submitted_by_user_id') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD follow_up_submitted_by_user_id INT NULL;
END;

IF COL_LENGTH('dbo.incidents', 'resolved_at') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD resolved_at DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.incidents', 'resolved_by_user_id') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD resolved_by_user_id INT NULL;
END;

IF COL_LENGTH('dbo.incidents', 'closed_at') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD closed_at DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.incidents', 'closed_by_user_id') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD closed_by_user_id INT NULL;
END;

IF COL_LENGTH('dbo.incidents', 'updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD updated_at DATETIME2 NULL;
END;
GO

UPDATE dbo.incidents
SET updated_at = COALESCE(updated_at, reported_date, SYSDATETIME())
WHERE updated_at IS NULL;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.incidents')
      AND name = 'updated_at'
      AND is_nullable = 1
)
BEGIN
    ALTER TABLE dbo.incidents ALTER COLUMN updated_at DATETIME2 NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.incidents')
      AND name = 'DF_incidents_updated_at'
)
BEGIN
    ALTER TABLE dbo.incidents
    ADD CONSTRAINT DF_incidents_updated_at DEFAULT SYSDATETIME() FOR updated_at;
END;
GO

UPDATE i
SET company_id = c.id
FROM dbo.incidents i
INNER JOIN dbo.companies c
    ON c.name = i.company_name
WHERE i.company_id IS NULL;
GO

UPDATE dbo.incidents
SET status = 'Open'
WHERE status IS NULL
   OR status NOT IN ('Open', 'Resolved', 'Closed');
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_incidents_company_id'
)
BEGIN
    ALTER TABLE dbo.incidents
    ADD CONSTRAINT FK_incidents_company_id
        FOREIGN KEY (company_id) REFERENCES dbo.companies(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_incidents_reported_by_user'
)
BEGIN
    ALTER TABLE dbo.incidents
    ADD CONSTRAINT FK_incidents_reported_by_user
        FOREIGN KEY (reported_by_user_id) REFERENCES dbo.users(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_incidents_follow_up_user'
)
BEGIN
    ALTER TABLE dbo.incidents
    ADD CONSTRAINT FK_incidents_follow_up_user
        FOREIGN KEY (follow_up_submitted_by_user_id) REFERENCES dbo.users(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_incidents_resolved_by_user'
)
BEGIN
    ALTER TABLE dbo.incidents
    ADD CONSTRAINT FK_incidents_resolved_by_user
        FOREIGN KEY (resolved_by_user_id) REFERENCES dbo.users(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_incidents_closed_by_user'
)
BEGIN
    ALTER TABLE dbo.incidents
    ADD CONSTRAINT FK_incidents_closed_by_user
        FOREIGN KEY (closed_by_user_id) REFERENCES dbo.users(id);
END;
GO

IF OBJECT_ID('dbo.incident_events', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.incident_events (
        id INT IDENTITY(1,1) PRIMARY KEY,
        incident_id INT NOT NULL,
        event_type NVARCHAR(100) NOT NULL,
        actor_user_id INT NULL,
        actor_name NVARCHAR(255) NULL,
        actor_role NVARCHAR(100) NULL,
        from_status NVARCHAR(100) NULL,
        to_status NVARCHAR(100) NULL,
        note NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_incident_events_incident
            FOREIGN KEY (incident_id) REFERENCES dbo.incidents(id),
        CONSTRAINT FK_incident_events_actor
            FOREIGN KEY (actor_user_id) REFERENCES dbo.users(id)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM dbo.incident_events
)
BEGIN
    INSERT INTO dbo.incident_events (
        incident_id,
        event_type,
        actor_user_id,
        actor_name,
        actor_role,
        from_status,
        to_status,
        note,
        created_at
    )
    SELECT
        i.id,
        'IncidentLogged',
        i.reported_by_user_id,
        i.reported_by,
        'Compliance',
        NULL,
        i.status,
        i.description,
        COALESCE(i.reported_date, SYSDATETIME())
    FROM dbo.incidents i;
END;
GO
