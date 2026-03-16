import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import sql from "mssql";
import { hasRole, createRequest, isUniqueConstraintError, sendPushNotification } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { AuthenticatedRequest } from "../../middleware/types.middleware";
import { transporter } from "../email";

const router = Router();

const generateTemporaryPassword = () =>
    `OGFZA${randomBytes(3).toString("hex").toUpperCase()}`;

// GET /api/users
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin"])) {
        return res.sendStatus(403);
    }

    try {
        const result = await (await createRequest()).query(`
      SELECT
        id,
        email,
        full_name AS fullName,
        role,
        operational_unit AS unit,
        operational_unit AS operationalUnit,
        must_change_password AS mustChangePassword
      FROM users
    `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// POST /api/users/invite
router.post("/invite", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin"])) {
        return res.sendStatus(403);
    }

    const { email, fullName, role, operationalUnit } = req.body ?? {};

    if (!email || !fullName || !role || !operationalUnit) {
        return res.status(400).json({ error: "Full name, email, role, and operational unit are required." });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = bcrypt.hashSync(temporaryPassword, 10);

    try {
        const result = await (await createRequest())
            .input("email", sql.NVarChar, email)
            .input("password", sql.NVarChar, hashedPassword)
            .input("full_name", sql.NVarChar, fullName)
            .input("role", sql.NVarChar, role)
            .input("operational_unit", sql.NVarChar, operationalUnit)
            .query(`
                INSERT INTO users (email, password, full_name, role, operational_unit, must_change_password)
                OUTPUT INSERTED.id
                VALUES (@email, @password, @full_name, @role, @operational_unit, 1)
            `);

        let emailDelivered = true;

        try {
            await transporter.sendMail({
                from: `"OGFZA Support" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Your OGFZA Platform Access",
                html: `
                    <h3>Hello ${fullName},</h3>
                    <p>You have been invited to the OGFZA Digital Automation platform.</p>
                    <p><b>Your access details</b></p>
                    <ul>
                        <li>Email: ${email}</li>
                        <li>Temporary Password: ${temporaryPassword}</li>
                        <li>Role: ${role}</li>
                        <li>Operational Unit: ${operationalUnit}</li>
                    </ul>
                    <p>You will be asked to change your password on first login.</p>
                    <br/>
                    <p>Best Regards,<br/>OGFZA IT Team</p>
                `,
            });
        } catch (mailError) {
            emailDelivered = false;
            console.error("Failed to send invite email:", mailError);
        }

        sendPushNotification(
            "SUCCESS",
            "User Invited",
            `${fullName} was added to the platform as ${role}.`,
        );

        return res.status(201).json({
            id: result.recordset[0].id,
            emailDelivered,
            temporaryPassword: emailDelivered ? undefined : temporaryPassword,
            message: emailDelivered
                ? "User invited successfully. Login details have been emailed."
                : "User created, but the invite email could not be delivered. Share the temporary password manually.",
        });
    } catch (err: any) {
        if (isUniqueConstraintError(err)) {
            return res.status(400).json({ error: "Email already exists" });
        }

        console.error(err);
        return res.status(500).json({ error: "Failed to invite user" });
    }
});

// PUT /api/users/:id/role
router.put("/:id/role", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin"])) {
        return res.sendStatus(403);
    }

    const { role } = req.body;

    try {
        await (await createRequest())
            .input("role", sql.NVarChar, role)
            .input("id", sql.Int, Number(req.params.id))
            .query(`
        UPDATE users
        SET role = @role
        WHERE id = @id
      `);

        res.json({ success: true, role });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to update role" });
    }
});

export default router;
