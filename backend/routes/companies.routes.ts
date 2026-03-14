import { Router } from "express";
import { sql } from "@/db";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import { createRequest, hasRole } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const request = await createRequest();
        const canSeeAllCompanies = hasRole(req.user?.role, [
            "Admin",
            "Compliance",
            "Finance",
            "Operations",
            "HR Manager",
        ]);
        const restrictToOwnCompanies =
            hasRole(req.user?.role, ["Contractor"]) && !canSeeAllCompanies;

        let query = `
            SELECT
                c.id,
                c.name,
                c.license_no,
                c.incorporation_type,
                c.free_zone_location,
                c.representative_email,
                c.status,
                c.approved_date,
                c.approved_application_id
            FROM dbo.companies c
        `;

        if (restrictToOwnCompanies) {
            request.input("submitted_by_user_id", sql.Int, req.user?.id ?? 0);
            query += `
                INNER JOIN dbo.company_applications a
                    ON a.id = c.approved_application_id
                WHERE a.submitted_by_user_id = @submitted_by_user_id
            `;
        }

        query += ` ORDER BY c.approved_date DESC, c.name ASC`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch companies" });
    }
});

export default router;
