import { Router } from "express";
import { createRequest } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`
            SELECT r.*, c.name AS company_name
            FROM revenue r
            JOIN companies c ON r.company_id = c.id
            ORDER BY payment_date DESC
          `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch revenue" });
    }
});

export default router;