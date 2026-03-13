import { Router } from "express";

import { createRequest } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.get("/stats", authenticateToken, async (_req, res) => {
    try {
        const [
            totalCompanies,
            pendingPermits,
            totalProduction,
            totalRevenue,
            totalIncidents,
        ] = await Promise.all([
            (await createRequest()).query(`SELECT COUNT(*) AS count FROM companies`),
            (await createRequest()).query(
                `SELECT COUNT(*) AS count FROM permits WHERE status = 'Pending'`,
            ),
            (await createRequest()).query(
                `SELECT ISNULL(SUM(production_volume), 0) AS total FROM operations`,
            ),
            (await createRequest()).query(
                `SELECT ISNULL(SUM(amount), 0) AS total FROM revenue`,
            ),
            (await createRequest()).query(
                `SELECT COUNT(*) AS count FROM incidents WHERE status = 'Open'`,
            ),
        ]);

        res.json({
            totalCompanies: totalCompanies.recordset[0],
            pendingPermits: pendingPermits.recordset[0],
            totalProduction: totalProduction.recordset[0],
            totalRevenue: totalRevenue.recordset[0],
            totalIncidents: totalIncidents.recordset[0],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load dashboard stats" });
    }
});

export default router;