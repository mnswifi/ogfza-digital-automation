import { Router } from "express";
import { createRequest, hasRole } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { sql } from "@/db";
import type { AuthenticatedRequest } from "@/middleware/types.middleware";

const router = Router();

const toNullableString = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const toRequiredInt = (value: unknown) => {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
    const normalized = toNullableString(value);
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin", "Operations", "Compliance"])) {
        return res.sendStatus(403);
    }

    try {
        const result = await (await createRequest()).query(`
            SELECT
                a.id,
                a.company_id,
                c.name AS company_name,
                a.asset_name,
                a.type,
                a.location_coordinates,
                a.status,
                a.maintenance_date,
                last_production.last_production_date,
                open_incidents.open_incident_count
            FROM dbo.assets a
            LEFT JOIN dbo.companies c
                ON c.id = a.company_id
            OUTER APPLY (
                SELECT TOP 1
                    o.report_date AS last_production_date
                FROM dbo.operations o
                WHERE o.asset_id = a.id
                ORDER BY o.report_date DESC, o.id DESC
            ) last_production
            OUTER APPLY (
                SELECT COUNT(*) AS open_incident_count
                FROM dbo.incidents i
                WHERE i.asset_id = a.id
                  AND i.status = 'Open'
            ) open_incidents
            ORDER BY a.asset_name ASC, a.id DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch assets" });
    }
});

router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin", "Operations", "Compliance"])) {
        return res.sendStatus(403);
    }

    const assetId = Number(req.params.id);

    if (!Number.isInteger(assetId) || assetId <= 0) {
        return res.status(400).json({ error: "Invalid asset id." });
    }

    try {
        const detailRequest = await createRequest();
        detailRequest.input("asset_id", sql.Int, assetId);

        const assetResult = await detailRequest.query(`
            SELECT TOP 1
                a.id,
                a.company_id,
                c.name AS company_name,
                a.asset_name,
                a.type,
                a.location_coordinates,
                a.status,
                a.maintenance_date,
                last_production.last_production_date,
                open_incidents.open_incident_count
            FROM dbo.assets a
            LEFT JOIN dbo.companies c
                ON c.id = a.company_id
            OUTER APPLY (
                SELECT TOP 1
                    o.report_date AS last_production_date
                FROM dbo.operations o
                WHERE o.asset_id = a.id
                ORDER BY o.report_date DESC, o.id DESC
            ) last_production
            OUTER APPLY (
                SELECT COUNT(*) AS open_incident_count
                FROM dbo.incidents i
                WHERE i.asset_id = a.id
                  AND i.status = 'Open'
            ) open_incidents
            WHERE a.id = @asset_id
        `);

        const asset = assetResult.recordset[0];

        if (!asset) {
            return res.status(404).json({ error: "Asset not found." });
        }

        const productionRequest = await createRequest();
        productionRequest.input("asset_id", sql.Int, assetId);
        const productionHistory = await productionRequest.query(`
            SELECT
                o.id,
                o.asset_id,
                COALESCE(a.asset_name, o.field_name) AS asset_name,
                a.company_id,
                c.name AS company_name,
                o.field_name,
                o.production_volume,
                o.downtime_hours,
                o.report_date,
                o.notes
            FROM dbo.operations o
            LEFT JOIN dbo.assets a
                ON a.id = o.asset_id
            LEFT JOIN dbo.companies c
                ON c.id = a.company_id
            WHERE o.asset_id = @asset_id
            ORDER BY o.report_date DESC, o.id DESC
        `);

        const maintenanceRequest = await createRequest();
        maintenanceRequest.input("asset_id", sql.Int, assetId);
        const maintenanceHistory = await maintenanceRequest.query(`
            SELECT
                m.id,
                m.asset_id,
                a.company_id,
                c.name AS company_name,
                a.asset_name,
                m.maintenance_type,
                m.description,
                m.technician,
                m.cost,
                m.maintenance_date,
                m.next_due_date,
                m.status
            FROM dbo.equipment_maintenance m
            INNER JOIN dbo.assets a
                ON a.id = m.asset_id
            LEFT JOIN dbo.companies c
                ON c.id = a.company_id
            WHERE m.asset_id = @asset_id
            ORDER BY m.maintenance_date DESC, m.id DESC
        `);

        const incidentsRequest = await createRequest();
        incidentsRequest.input("asset_id", sql.Int, assetId);
        const incidentHistory = await incidentsRequest.query(`
            SELECT
                i.id,
                i.company_id,
                i.asset_id,
                COALESCE(c.name, i.company_name) AS company_name,
                a.asset_name,
                i.incident_type,
                i.severity,
                i.description,
                COALESCE(reporter.full_name, i.reported_by) AS reported_by,
                i.reported_by_user_id,
                i.status,
                i.reported_date,
                i.follow_up_note,
                i.follow_up_submitted_at,
                follow_up_user.full_name AS follow_up_submitted_by_name,
                i.resolved_at,
                i.closed_at,
                i.updated_at
            FROM dbo.incidents i
            LEFT JOIN dbo.companies c
                ON c.id = i.company_id
            LEFT JOIN dbo.assets a
                ON a.id = i.asset_id
            LEFT JOIN dbo.users reporter
                ON reporter.id = i.reported_by_user_id
            LEFT JOIN dbo.users follow_up_user
                ON follow_up_user.id = i.follow_up_submitted_by_user_id
            WHERE i.asset_id = @asset_id
            ORDER BY COALESCE(i.updated_at, i.reported_date) DESC, i.id DESC
        `);

        res.json({
            ...asset,
            production_history: productionHistory.recordset,
            maintenance_history: maintenanceHistory.recordset,
            incident_history: incidentHistory.recordset,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch asset details." });
    }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin", "Operations"])) {
        return res.sendStatus(403);
    }

    const companyId = toRequiredInt(req.body?.companyId);
    const assetName = toNullableString(req.body?.assetName);
    const assetType = toNullableString(req.body?.assetType);
    const locationCoordinates = toNullableString(req.body?.locationCoordinates);
    const status = toNullableString(req.body?.status) || "Operational";
    const maintenanceDate = toNullableString(req.body?.maintenanceDate);

    if (!companyId || !assetName || !assetType || !locationCoordinates) {
        return res.status(400).json({
            error: "Company, asset name, asset type, and asset location are required.",
        });
    }

    try {
        const request = await createRequest();
        request
            .input("company_id", sql.Int, companyId)
            .input("asset_name", sql.NVarChar, assetName)
            .input("type", sql.NVarChar, assetType)
            .input("location_coordinates", sql.NVarChar, locationCoordinates)
            .input("status", sql.NVarChar, status)
            .input("maintenance_date", sql.Date, maintenanceDate);

        const result = await request.query(`
            INSERT INTO dbo.assets (
                company_id,
                asset_name,
                type,
                location_coordinates,
                status,
                maintenance_date
            )
            VALUES (
                @company_id,
                @asset_name,
                @type,
                @location_coordinates,
                @status,
                @maintenance_date
            );

            SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
        `);

        res.status(201).json({
            id: result.recordset[0]?.id,
            message: "Asset registered successfully.",
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to register asset." });
    }
});

router.patch("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin", "Operations"])) {
        return res.sendStatus(403);
    }

    const assetId = Number(req.params.id);
    const companyId = toRequiredInt(req.body?.companyId);
    const assetName = toNullableString(req.body?.assetName);
    const assetType = toNullableString(req.body?.assetType);
    const locationCoordinates = toNullableString(req.body?.locationCoordinates);
    const status = toNullableString(req.body?.status);
    const maintenanceDate = toNullableString(req.body?.maintenanceDate);

    if (!Number.isInteger(assetId) || assetId <= 0) {
        return res.status(400).json({ error: "Invalid asset id." });
    }

    if (!companyId || !assetName || !assetType || !locationCoordinates || !status) {
        return res.status(400).json({
            error: "Company, asset name, asset type, location, and status are required.",
        });
    }

    try {
        const request = await createRequest();
        request
            .input("id", sql.Int, assetId)
            .input("company_id", sql.Int, companyId)
            .input("asset_name", sql.NVarChar, assetName)
            .input("type", sql.NVarChar, assetType)
            .input("location_coordinates", sql.NVarChar, locationCoordinates)
            .input("status", sql.NVarChar, status)
            .input("maintenance_date", sql.Date, maintenanceDate);

        await request.query(`
            UPDATE dbo.assets
            SET
                company_id = @company_id,
                asset_name = @asset_name,
                type = @type,
                location_coordinates = @location_coordinates,
                status = @status,
                maintenance_date = @maintenance_date
            WHERE id = @id
        `);

        res.json({ message: "Asset updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to update asset." });
    }
});

export default router;
