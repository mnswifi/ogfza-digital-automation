import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sql from "mssql";

import type { AuthenticatedRequest, JwtUser } from "../../middleware/types.middleware";
import {
    createRequest,
    isUniqueConstraintError,
    sendPushNotification,
} from "../helpers";
import { transporter } from "../email";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "petroflow-secret-key-2024";

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
    const { email, password, fullName, role, operationalUnit } = req.body;

    try {
        const hashedPassword = bcrypt.hashSync(password, 10);

        const request = await createRequest();
        const result = await request
            .input("email", sql.NVarChar, email)
            .input("password", sql.NVarChar, hashedPassword)
            .input("full_name", sql.NVarChar, fullName)
            .input("role", sql.NVarChar, role)
            .input("operational_unit", sql.NVarChar, operationalUnit ?? null)
            .query(`
        INSERT INTO users (email, password, full_name, role, operational_unit, must_change_password)
        OUTPUT INSERTED.id
        VALUES (@email, @password, @full_name, @role, @operational_unit, 1)
      `);

        await transporter.sendMail({
            from: `"OGFZA Support" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Welcome to OGFZA Digital Automation",
            html: `
        <h3>Welcome ${fullName},</h3>
        <p>Your account has been created on the OGFZA Digital Automation platform.</p>
        <p><b>Your Credentials:</b></p>
        <ul>
          <li>Email: ${email}</li>
          <li>Initial Password: ${password}</li>
        </ul>
        <p>Please note: You will be required to change your password upon your first login.</p>
        <br/>
        <p>Best Regards,<br/>OGFZA IT Team</p>
      `,
        });

        sendPushNotification(
            "SUCCESS",
            "New Company Registered",
            `Entity "${fullName}" has been successfully added to the OGFZA directory.`,
        );

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err: any) {
        if (isUniqueConstraintError(err)) {
            return res.status(400).json({ error: "Email already exists" });
        }

        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log(`Login attempt for: ${email}`);

        const request = await createRequest();
        const result = await request
            .input("email", sql.NVarChar, email)
            .query(`
        SELECT TOP 1 *
        FROM users
        WHERE email = @email
      `);

        const user = result.recordset[0] as any;

        if (!user) {
            console.log(`User not found: ${email}`);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = bcrypt.compareSync(password, user.password);
        console.log(`Password match for ${email}: ${isMatch}`);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                operationalUnit: user.operational_unit,
                fullName: user.full_name,
            },
            JWT_SECRET,
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                operationalUnit: user.operational_unit,
                fullName: user.full_name,
                mustChangePassword: Boolean(user.must_change_password),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/auth/change-password
router.post(
    "/change-password",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        const { newPassword } = req.body;

        try {
            const hashedPassword = bcrypt.hashSync(newPassword, 10);

            const request = await createRequest();
            await request
                .input("password", sql.NVarChar, hashedPassword)
                .input("id", sql.Int, req.user!.id)
                .query(`
          UPDATE users
          SET password = @password, must_change_password = 0
          WHERE id = @id
        `);

            res.json({ message: "Password updated successfully" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to update password" });
        }
    },
);

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        const findRequest = await createRequest();
        const userResult = await findRequest
            .input("email", sql.NVarChar, email)
            .query(`
        SELECT TOP 1 *
        FROM users
        WHERE email = @email
      `);

        const user = userResult.recordset[0];
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const updateRequest = await createRequest();
        await updateRequest
            .input("otp", sql.NVarChar, otp)
            .input("email", sql.NVarChar, email)
            .query(`
        UPDATE users
        SET otp_code = @otp
        WHERE email = @email
      `);

        await transporter.sendMail({
            from: `"OGFZA Support" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your OTP for Password Reset",
            html: `
        <h3>Security Verification</h3>
        <p>Your OTP for password reset is: <b>${otp}</b></p>
        <p>This code will expire shortly.</p>
        <br/>
        <p>Best Regards,<br/>OGFZA IT Team</p>
      `,
        });

        res.json({ message: "OTP sent to your email." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send email" });
    }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const request = await createRequest();
        const result = await request
            .input("email", sql.NVarChar, email)
            .input("otp", sql.NVarChar, otp)
            .query(`
        SELECT TOP 1 *
        FROM users
        WHERE email = @email AND otp_code = @otp
      `);

        if (!result.recordset[0]) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        res.json({ message: "OTP verified" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "OTP verification failed" });
    }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const findRequest = await createRequest();
        const userResult = await findRequest
            .input("email", sql.NVarChar, email)
            .input("otp", sql.NVarChar, otp)
            .query(`
        SELECT TOP 1 *
        FROM users
        WHERE email = @email AND otp_code = @otp
      `);

        if (!userResult.recordset[0]) {
            return res.status(400).json({ error: "Unauthorized access" });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);

        const updateRequest = await createRequest();
        await updateRequest
            .input("password", sql.NVarChar, hashedPassword)
            .input("email", sql.NVarChar, email)
            .query(`
        UPDATE users
        SET password = @password, otp_code = NULL
        WHERE email = @email
      `);

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Password reset failed" });
    }
});

export default router;