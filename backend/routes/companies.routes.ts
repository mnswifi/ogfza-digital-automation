import { Router } from "express";
import { createRequest, hasRole, sendPushNotification, today } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { sql } from "@/db";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import { transporter } from "../email";

const router = Router();

router.get("/", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`SELECT * FROM companies`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch companies" });
    }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin"])) return res.sendStatus(403);

    const { name, licenseNo, tin, sector, type, leaseInfo, representativeEmail } = req.body;

    try {
        const result = await (await createRequest())
            .input("name", sql.NVarChar, name)
            .input("license_no", sql.NVarChar, licenseNo ?? null)
            .input("tin", sql.NVarChar, tin ?? null)
            .input("sector", sql.NVarChar, sector ?? null)
            .input("type", sql.NVarChar, type ?? null)
            .input("joined_date", sql.NVarChar, today())
            .input("lease_info", sql.NVarChar(sql.MAX), leaseInfo ?? null)
            .input("representative_email", sql.NVarChar, representativeEmail ?? null)
            .query(`
        INSERT INTO companies (name, license_no, tin, sector, type, joined_date, lease_info, representative_email)
        OUTPUT INSERTED.id
        VALUES (@name, @license_no, @tin, @sector, @type, @joined_date, @lease_info, @representative_email)
      `);

        await transporter.sendMail({
            from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
            to: "admin@petroflow.com",
            subject: `Workflow: New Entity Onboarded - ${name}`,
            html: `
        <h4>A new OGFZA entity has been registered.</h4>
        <p>Company: ${name}</p>
        <p>Sector: ${sector}</p>
        <p>Registration Date: ${new Date().toISOString()}</p>
      `,
        });

        sendPushNotification(
            "SUCCESS",
            "New Company Registered",
            `Entity "${name}" successfully listed.`,
        );

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to register company" });
    }
});

export default router;