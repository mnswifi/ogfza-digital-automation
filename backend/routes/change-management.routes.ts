import { Router } from "express";
import { createRequest } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

// GET /api/change-management/team
router.get("/team", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`
      SELECT * FROM team_members
    `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch team members" });
    }
});

export default router;