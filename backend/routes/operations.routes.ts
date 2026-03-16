import { Router } from "express";
import { createRequest, hasRole, today } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { sql } from "@/db";
import type { AuthenticatedRequest } from "@/middleware/types.middleware";

const router = Router();

const toRequiredInt = (value: unknown) => {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toNullableString = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin", "Operations"])) {
        return res.sendStatus(403);
    }

    try {
        const result = await (await createRequest()).query(`
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
            ORDER BY o.report_date DESC, o.id DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch operations" });
    }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Operations"])) {
        return res.sendStatus(403);
    }

    const assetId = toRequiredInt(req.body?.assetId);
    const productionVolume = Number(req.body?.production_volume ?? 0);
    const downtimeHours = Number(req.body?.downtime_hours ?? 0);
    const reportDate = toNullableString(req.body?.report_date) || today();
    const notes = toNullableString(req.body?.notes);

    if (!assetId || Number.isNaN(productionVolume) || Number.isNaN(downtimeHours)) {
        return res.status(400).json({
            error: "A valid asset, production volume, and downtime value are required.",
        });
    }

    try {
        const assetRequest = await createRequest();
        assetRequest.input("asset_id", sql.Int, assetId);

        const assetResult = await assetRequest.query(`
            SELECT TOP 1
                id,
                asset_name
            FROM dbo.assets
            WHERE id = @asset_id
        `);

        const asset = assetResult.recordset[0] as { id: number; asset_name: string } | undefined;

        if (!asset) {
            return res.status(404).json({ error: "Selected asset was not found." });
        }

        const result = await (await createRequest())
            .input("asset_id", sql.Int, asset.id)
            .input("field_name", sql.NVarChar, asset.asset_name)
            .input("production_volume", sql.Decimal(18, 2), productionVolume)
            .input("downtime_hours", sql.Decimal(18, 2), downtimeHours)
            .input("report_date", sql.Date, reportDate)
            .input("notes", sql.NVarChar(sql.MAX), notes)
            .query(`
                INSERT INTO dbo.operations (
                    asset_id,
                    field_name,
                    production_volume,
                    downtime_hours,
                    report_date,
                    notes
                )
                VALUES (
                    @asset_id,
                    @field_name,
                    @production_volume,
                    @downtime_hours,
                    @report_date,
                    @notes
                );

                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
            `);

        res.status(201).json({ id: result.recordset[0]?.id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to log production data" });
    }
});

export default router;
