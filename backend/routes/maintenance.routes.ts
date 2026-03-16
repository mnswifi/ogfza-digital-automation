import { Router } from "express";
import { createRequest, hasRole } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { pool, poolConnect, sql } from "@/db";
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
    if (!hasRole(req.user?.role, ["Admin", "Operations"])) {
        return res.sendStatus(403);
    }

    try {
        const result = await (await createRequest()).query(`
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
            JOIN dbo.assets a ON m.asset_id = a.id
            LEFT JOIN dbo.companies c ON c.id = a.company_id
            ORDER BY m.maintenance_date DESC, m.id DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch maintenance records" });
    }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Operations"])) {
        return res.sendStatus(403);
    }

    const assetId = toRequiredInt(req.body?.assetId);
    const maintenanceType = toNullableString(req.body?.maintenanceType);
    const description = toNullableString(req.body?.description);
    const technician = toNullableString(req.body?.technician);
    const cost = Number(req.body?.cost ?? 0);
    const maintenanceDate = toNullableString(req.body?.maintenanceDate);
    const nextDueDate = toNullableString(req.body?.nextDueDate);
    const status = toNullableString(req.body?.status) || "Scheduled";

    if (!assetId || !maintenanceType || !description || !technician || !maintenanceDate || Number.isNaN(cost)) {
        return res.status(400).json({
            error: "Asset, maintenance type, description, technician, cost, and maintenance date are required.",
        });
    }

    try {
        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const insertRequest = new sql.Request(transaction);
            insertRequest
                .input("asset_id", sql.Int, assetId)
                .input("maintenance_type", sql.NVarChar, maintenanceType)
                .input("description", sql.NVarChar(sql.MAX), description)
                .input("technician", sql.NVarChar, technician)
                .input("cost", sql.Decimal(18, 2), cost)
                .input("maintenance_date", sql.Date, maintenanceDate)
                .input("next_due_date", sql.Date, nextDueDate)
                .input("status", sql.NVarChar, status);

            const result = await insertRequest.query(`
                INSERT INTO dbo.equipment_maintenance (
                    asset_id,
                    maintenance_type,
                    description,
                    technician,
                    cost,
                    maintenance_date,
                    next_due_date,
                    status
                )
                VALUES (
                    @asset_id,
                    @maintenance_type,
                    @description,
                    @technician,
                    @cost,
                    @maintenance_date,
                    @next_due_date,
                    @status
                );

                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
            `);

            const assetStatus =
                status === "Completed"
                    ? "Operational"
                    : status === "In Progress"
                        ? "Under Maintenance"
                        : null;

            const assetRequest = new sql.Request(transaction);
            assetRequest
                .input("asset_id", sql.Int, assetId)
                .input("asset_status", sql.NVarChar, assetStatus)
                .input("maintenance_date", sql.Date, nextDueDate);

            await assetRequest.query(`
                UPDATE dbo.assets
                SET
                    status = COALESCE(@asset_status, status),
                    maintenance_date = COALESCE(@maintenance_date, maintenance_date)
                WHERE id = @asset_id
            `);

            await transaction.commit();

            res.status(201).json({
                id: result.recordset[0]?.id,
                message: "Maintenance work order created successfully.",
            });
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to create maintenance work order." });
    }
});

router.patch("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Operations"])) {
        return res.sendStatus(403);
    }

    const maintenanceId = Number(req.params.id);
    const status = toNullableString(req.body?.status);
    const nextDueDate = toNullableString(req.body?.nextDueDate);

    if (!Number.isInteger(maintenanceId) || maintenanceId <= 0) {
        return res.status(400).json({ error: "Invalid maintenance record id." });
    }

    if (!status) {
        return res.status(400).json({ error: "A maintenance status is required." });
    }

    try {
        const maintenanceLookup = await createRequest();
        maintenanceLookup.input("id", sql.Int, maintenanceId);

        const recordResult = await maintenanceLookup.query(`
            SELECT TOP 1
                id,
                asset_id,
                next_due_date
            FROM dbo.equipment_maintenance
            WHERE id = @id
        `);

        const record = recordResult.recordset[0] as {
            id: number;
            asset_id: number;
            next_due_date?: string | null;
        } | undefined;

        if (!record) {
            return res.status(404).json({ error: "Maintenance record not found." });
        }

        await poolConnect;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const updateRequest = new sql.Request(transaction);
            updateRequest
                .input("id", sql.Int, maintenanceId)
                .input("status", sql.NVarChar, status)
                .input("next_due_date", sql.Date, nextDueDate);

            await updateRequest.query(`
                UPDATE dbo.equipment_maintenance
                SET
                    status = @status,
                    next_due_date = COALESCE(@next_due_date, next_due_date)
                WHERE id = @id
            `);

            const assetStatus =
                status === "Completed"
                    ? "Operational"
                    : status === "In Progress"
                        ? "Under Maintenance"
                        : null;

            const assetRequest = new sql.Request(transaction);
            assetRequest
                .input("asset_id", sql.Int, record.asset_id)
                .input("asset_status", sql.NVarChar, assetStatus)
                .input("maintenance_date", sql.Date, nextDueDate || record.next_due_date || null);

            await assetRequest.query(`
                UPDATE dbo.assets
                SET
                    status = COALESCE(@asset_status, status),
                    maintenance_date = COALESCE(@maintenance_date, maintenance_date)
                WHERE id = @asset_id
            `);

            await transaction.commit();

            res.json({ message: "Maintenance status updated successfully." });
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to update maintenance status." });
    }
});

export default router;
