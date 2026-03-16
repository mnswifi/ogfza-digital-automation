SET XACT_ABORT ON;
GO

IF COL_LENGTH('dbo.assets', 'company_id') IS NULL
BEGIN
    ALTER TABLE dbo.assets ADD company_id INT NULL;
END;

IF COL_LENGTH('dbo.operations', 'asset_id') IS NULL
BEGIN
    ALTER TABLE dbo.operations ADD asset_id INT NULL;
END;

IF COL_LENGTH('dbo.operations', 'notes') IS NULL
BEGIN
    ALTER TABLE dbo.operations ADD notes NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.incidents', 'asset_id') IS NULL
BEGIN
    ALTER TABLE dbo.incidents ADD asset_id INT NULL;
END;
GO

UPDATE o
SET asset_id = a.id
FROM dbo.operations o
INNER JOIN dbo.assets a
    ON a.asset_name = o.field_name
WHERE o.asset_id IS NULL;
GO

UPDATE a
SET maintenance_date = latest.next_due_date
FROM dbo.assets a
INNER JOIN (
    SELECT
        asset_id,
        MAX(next_due_date) AS next_due_date
    FROM dbo.equipment_maintenance
    WHERE next_due_date IS NOT NULL
    GROUP BY asset_id
) latest
    ON latest.asset_id = a.id
WHERE a.maintenance_date IS NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_assets_company_id'
)
BEGIN
    ALTER TABLE dbo.assets
    ADD CONSTRAINT FK_assets_company_id
        FOREIGN KEY (company_id) REFERENCES dbo.companies(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_operations_asset_id'
)
BEGIN
    ALTER TABLE dbo.operations
    ADD CONSTRAINT FK_operations_asset_id
        FOREIGN KEY (asset_id) REFERENCES dbo.assets(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_incidents_asset_id'
)
BEGIN
    ALTER TABLE dbo.incidents
    ADD CONSTRAINT FK_incidents_asset_id
        FOREIGN KEY (asset_id) REFERENCES dbo.assets(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.assets')
      AND name = 'IX_assets_company_id'
)
BEGIN
    CREATE INDEX IX_assets_company_id
        ON dbo.assets(company_id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.operations')
      AND name = 'IX_operations_asset_id'
)
BEGIN
    CREATE INDEX IX_operations_asset_id
        ON dbo.operations(asset_id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.incidents')
      AND name = 'IX_incidents_asset_id'
)
BEGIN
    CREATE INDEX IX_incidents_asset_id
        ON dbo.incidents(asset_id);
END;
GO
