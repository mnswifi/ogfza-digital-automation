import { Router } from "express";
import { createRequest, today } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { sql } from "@/db";

const router = Router();

router.get("/", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`
            SELECT *
            FROM operations
            ORDER BY report_date DESC
          `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch operations" });
    }
});

router.post("/", authenticateToken, async (req, res) => {
    const { field_name, production_volume, downtime_hours, report_date } = req.body;

    try {
        const result = await (await createRequest())
            .input("field_name", sql.NVarChar, field_name)
            .input("production_volume", sql.Decimal(18, 2), Number(production_volume || 0))
            .input("downtime_hours", sql.Decimal(18, 2), Number(downtime_hours || 0))
            .input("report_date", sql.NVarChar, report_date || today())
            .query(`
          INSERT INTO operations (field_name, production_volume, downtime_hours, report_date)
          OUTPUT INSERTED.id
          VALUES (@field_name, @production_volume, @downtime_hours, @report_date)
        `);

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to log production data" });
    }
});

export default router;