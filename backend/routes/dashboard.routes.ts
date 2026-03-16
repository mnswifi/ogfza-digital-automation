import { Router } from "express";

import { createRequest } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.get("/stats", authenticateToken, async (_req, res) => {
    try {
        const [
            totalCompanies,
            totalProduction,
            totalRevenue,
            confirmedLicencePayments,
            pendingLicencePayments,
            totalIncidents,
        ] = await Promise.all([
            (await createRequest()).query(`SELECT COUNT(*) AS count FROM companies`),
            (await createRequest()).query(
                `SELECT ISNULL(SUM(production_volume), 0) AS total FROM operations`,
            ),
            (await createRequest()).query(
                `SELECT ISNULL(SUM(amount), 0) AS total FROM revenue`,
            ),
            (await createRequest()).query(
                `SELECT COUNT(*) AS count FROM revenue WHERE status = 'Paid'`,
            ),
            (await createRequest()).query(`
                SELECT COUNT(*) AS count
                FROM dbo.company_applications
                WHERE status IN ('Approved Pending Payment', 'Payment Submitted')
            `),
            (await createRequest()).query(
                `SELECT COUNT(*) AS count FROM incidents WHERE status = 'Open'`,
            ),
        ]);

        res.json({
            totalCompanies: totalCompanies.recordset[0],
            totalProduction: totalProduction.recordset[0],
            totalRevenue: totalRevenue.recordset[0],
            confirmedLicencePayments: confirmedLicencePayments.recordset[0],
            pendingLicencePayments: pendingLicencePayments.recordset[0],
            totalIncidents: totalIncidents.recordset[0],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load dashboard stats" });
    }
});

export default router;
