SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

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
                    'ReturnedForRevision',
                    'RejectedByCompliance',
                    'RejectedByAdmin',
                    'ApprovedByAdmin'
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

    INSERT INTO dbo.company_application_events (
        application_id,
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
        a.id,
        N'Submitted',
        a.submitted_by_user_id,
        submitter.full_name,
        submitter.role,
        NULL,
        N'Submitted',
        N'Company application submitted by contractor.',
        a.submitted_at
    FROM dbo.company_applications a
    LEFT JOIN dbo.users submitter ON submitter.id = a.submitted_by_user_id
    WHERE a.submitted_at IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_events e
          WHERE e.application_id = a.id
            AND e.event_type = N'Submitted'
      );

    INSERT INTO dbo.company_application_events (
        application_id,
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
        a.id,
        N'ReturnedForRevision',
        a.returned_by_user_id,
        returned_by.full_name,
        returned_by.role,
        N'Submitted',
        N'Returned',
        a.query_note,
        a.returned_at
    FROM dbo.company_applications a
    LEFT JOIN dbo.users returned_by ON returned_by.id = a.returned_by_user_id
    WHERE a.returned_at IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_events e
          WHERE e.application_id = a.id
            AND e.event_type = N'ReturnedForRevision'
      );

    INSERT INTO dbo.company_application_events (
        application_id,
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
        a.id,
        N'Resubmitted',
        a.submitted_by_user_id,
        submitter.full_name,
        submitter.role,
        N'Returned',
        N'Submitted',
        CASE
            WHEN a.query_note IS NOT NULL AND LTRIM(RTRIM(a.query_note)) <> N''
                THEN N'Contractor resubmitted the application after addressing the compliance query.'
            ELSE N'Contractor resubmitted the application after review feedback.'
        END,
        a.resubmitted_at
    FROM dbo.company_applications a
    LEFT JOIN dbo.users submitter ON submitter.id = a.submitted_by_user_id
    WHERE a.resubmitted_at IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_events e
          WHERE e.application_id = a.id
            AND e.event_type = N'Resubmitted'
      );

    INSERT INTO dbo.company_application_events (
        application_id,
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
        a.id,
        N'ForwardedToAdmin',
        a.reviewed_by_user_id,
        reviewer.full_name,
        reviewer.role,
        N'Submitted',
        N'Awaiting Admin Approval',
        N'Compliance review completed and the application was forwarded for final admin approval.',
        a.reviewed_at
    FROM dbo.company_applications a
    LEFT JOIN dbo.users reviewer ON reviewer.id = a.reviewed_by_user_id
    WHERE a.reviewed_at IS NOT NULL
      AND (
          a.status = N'Awaiting Admin Approval'
          OR a.status = N'Approved'
          OR (
              a.status = N'Rejected'
              AND a.rejected_at IS NOT NULL
              AND a.rejected_at > a.reviewed_at
          )
      )
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_events e
          WHERE e.application_id = a.id
            AND e.event_type = N'ForwardedToAdmin'
      );

    INSERT INTO dbo.company_application_events (
        application_id,
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
        a.id,
        N'ApprovedByAdmin',
        a.approved_by_user_id,
        approver.full_name,
        approver.role,
        N'Awaiting Admin Approval',
        N'Approved',
        N'Managing Director granted final approval and the company was added to the registry.',
        a.approved_at
    FROM dbo.company_applications a
    LEFT JOIN dbo.users approver ON approver.id = a.approved_by_user_id
    WHERE a.approved_at IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_events e
          WHERE e.application_id = a.id
            AND e.event_type = N'ApprovedByAdmin'
      );

    INSERT INTO dbo.company_application_events (
        application_id,
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
        a.id,
        N'RejectedByCompliance',
        a.reviewed_by_user_id,
        reviewer.full_name,
        reviewer.role,
        N'Submitted',
        N'Rejected',
        a.rejection_reason,
        a.rejected_at
    FROM dbo.company_applications a
    LEFT JOIN dbo.users reviewer ON reviewer.id = a.reviewed_by_user_id
    WHERE a.rejected_at IS NOT NULL
      AND a.reviewed_at IS NOT NULL
      AND DATEDIFF(SECOND, a.reviewed_at, a.rejected_at) = 0
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_events e
          WHERE e.application_id = a.id
            AND e.event_type = N'RejectedByCompliance'
      );

    INSERT INTO dbo.company_application_events (
        application_id,
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
        a.id,
        N'RejectedByAdmin',
        NULL,
        NULL,
        NULL,
        N'Awaiting Admin Approval',
        N'Rejected',
        a.rejection_reason,
        a.rejected_at
    FROM dbo.company_applications a
    WHERE a.rejected_at IS NOT NULL
      AND (
          a.reviewed_at IS NULL
          OR a.rejected_at > a.reviewed_at
      )
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.company_application_events e
          WHERE e.application_id = a.id
            AND e.event_type = N'RejectedByAdmin'
      );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
