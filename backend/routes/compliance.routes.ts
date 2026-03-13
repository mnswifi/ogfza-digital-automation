import { Router } from "express";
import { createRequest } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`
            SELECT comp.*, c.name AS company_name
            FROM compliance comp
            JOIN companies c ON comp.company_id = c.id
            ORDER BY audit_date DESC
          `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch compliance records" });
    }
});

export default router;