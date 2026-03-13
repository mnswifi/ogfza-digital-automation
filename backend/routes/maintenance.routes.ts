import { Router } from "express";
import { createRequest } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

// GET /api/maintenance
router.get("/", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`
      SELECT m.*, a.asset_name
      FROM equipment_maintenance m
      JOIN assets a ON m.asset_id = a.id
      ORDER BY m.maintenance_date DESC
    `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch maintenance records" });
    }
});

export default router;