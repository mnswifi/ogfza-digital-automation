import { Router } from "express";
import { createRequest, sendPushNotification } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { sql } from "@/db";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import { transporter } from "../email";

const router = Router();

router.get("/", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`
            SELECT *
            FROM incidents
            ORDER BY reported_date DESC
          `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch incidents" });
    }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { company_name, incident_type, severity, description } = req.body;

    try {
        const result = await (await createRequest())
            .input("company_name", sql.NVarChar, company_name ?? null)
            .input("incident_type", sql.NVarChar, incident_type ?? null)
            .input("severity", sql.NVarChar, severity ?? null)
            .input("description", sql.NVarChar(sql.MAX), description ?? null)
            .input("reported_by", sql.NVarChar, req.user?.fullName || "Unknown")
            .query(`
        INSERT INTO incidents (company_name, incident_type, severity, description, reported_by)
        OUTPUT INSERTED.id
        VALUES (@company_name, @incident_type, @severity, @description, @reported_by)
      `);

        await transporter.sendMail({
            from: `"OGFZA Emergency" <${process.env.SMTP_USER}>`,
            to: "safety@petroflow.com",
            subject: `URGENT: ${severity} Incident Reported - ${incident_type}`,
            html: `
        <h4>New incident report received.</h4>
        <p>Type: ${incident_type}</p>
        <p>Severity: ${severity}</p>
        <p>Company: ${company_name}</p>
        <p>Description: ${description}</p>
      `,
        });

        sendPushNotification(
            "WARNING",
            "New Incident Reported",
            `${incident_type} (${severity}) - Reported by ${req.user?.fullName}`,
        );

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to report incident" });
    }
});

export default router;