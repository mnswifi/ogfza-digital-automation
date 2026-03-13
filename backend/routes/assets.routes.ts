import { Router } from "express";
import { createRequest } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`SELECT * FROM assets`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch assets" });
    }
});

export default router;