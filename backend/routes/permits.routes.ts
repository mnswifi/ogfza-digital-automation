import { Router } from "express";
import { createRequest, hasRole, sendPushNotification, today } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { sql } from "@/db";
import { AuthenticatedRequest } from "@/middleware/types.middleware";
import { transporter } from "../email";

const router = Router();

router.get("/", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`
            SELECT p.*, c.name AS company_name
            FROM permits p
            JOIN companies c ON p.company_id = c.id
          `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch permits" });
    }
});

router.post("/", authenticateToken, async (req, res) => {
    const { company_id, permit_type } = req.body;

    try {
        const result = await (await createRequest())
            .input("company_id", sql.Int, Number(company_id))
            .input("permit_type", sql.NVarChar, permit_type)
            .input("applied_date", sql.NVarChar, today())
            .query(`
        INSERT INTO permits (company_id, permit_type, applied_date)
        OUTPUT INSERTED.id
        VALUES (@company_id, @permit_type, @applied_date)
      `);

        await transporter.sendMail({
            from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
            to: "regulatory@petroflow.com",
            subject: `Action Required: New ${permit_type} Application`,
            html: `
        <h4>New permit application received.</h4>
        <p>Company ID: ${company_id}</p>
        <p>Permit Type: ${permit_type}</p>
        <p>Status: Pending Review</p>
      `,
        });

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to apply for permit" });
    }
});

router.patch("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin", "Compliance"])) return res.sendStatus(403);

    const { status, expiry_date } = req.body;

    try {
        await (await createRequest())
            .input("status", sql.NVarChar, status)
            .input("expiry_date", sql.NVarChar, expiry_date ?? null)
            .input("id", sql.Int, Number(req.params.id))
            .query(`
        UPDATE permits
        SET status = @status, expiry_date = @expiry_date
        WHERE id = @id
      `);

        const permitResult = await (await createRequest())
            .input("id", sql.Int, Number(req.params.id))
            .query(`
        SELECT TOP 1
          c.name AS company_name,
          c.representative_email,
          p.permit_type,
          p.applied_date
        FROM permits p
        JOIN companies c ON p.company_id = c.id
        WHERE p.id = @id
      `);

        const permit = permitResult.recordset[0] as any;

        let emailHtml = `
      <h4>Your permit application #${req.params.id} has been updated.</h4>
      <p>New Status: <b>${status}</b></p>
      <p>Expiry: ${expiry_date || "N/A"}</p>
    `;

        if (status === "Approved" && permit) {
            emailHtml = `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; border: 4px solid #0a192f; padding: 40px; text-align: center;">
          <h1 style="color: #0a192f; text-transform: uppercase;">Certificate of Approval</h1>
          <p style="font-size: 16px;">This certifies that</p>
          <h2 style="text-transform: uppercase; border-bottom: 2px solid #000; display: inline-block;">${permit.company_name}</h2>
          <p style="font-size: 16px;">has been officially granted the following permit:</p>
          <h3 style="text-transform: uppercase; border-bottom: 2px solid #000; display: inline-block;">${permit.permit_type}</h3>
          <p style="margin-top: 30px; font-size: 14px;">
            Effective Date: <b>${permit.applied_date}</b><br/>
            Expiry Date: <b>${expiry_date || "N/A"}</b>
          </p>
          <p style="margin-top: 40px; font-size: 12px; color: #666;">Issued by the Oil & Gas Free Zones Authority (OGFZA)</p>
        </div>
        <p style="text-align: center; margin-top: 20px;">Please download your official certificate copy attached below, or log in to the portal to view your digital copy.</p>
      `;
        }

        await transporter.sendMail({
            from: `"OGFZA Workflow" <${process.env.SMTP_USER}>`,
            to: permit?.representative_email || "representative@company.com",
            subject:
                status === "Approved"
                    ? `Official Approval Certificate: ${permit?.permit_type}`
                    : `Permit Update: ${status}`,
            html: emailHtml,
        });

        sendPushNotification(
            "INFO",
            "Permit Status Transition",
            `Permit #${req.params.id} updated to "${status}".`,
        );

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to update permit" });
    }
});

export default router;