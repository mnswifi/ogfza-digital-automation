import express, { NextFunction, Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import sql from "mssql";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET || "petroflow-secret-key-2024";
const PORT = Number(process.env.PORT || 3001);

// ---------- MSSQL CONNECTION ----------
const dbConfig: sql.config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "Ms1000$xy",
  server: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "PetroflowDB",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

// ---------- TYPES ----------
interface JwtUser {
  id: number;
  email: string;
  role: string;
  operationalUnit?: string;
  fullName?: string;
}

interface AuthenticatedRequest extends Request {
  user?: JwtUser;
}

// ---------- HELPERS ----------
const clients = new Set<Response>();

const sendPushNotification = (type: string, message: string, detail?: string) => {
  const data = JSON.stringify({
    type,
    message,
    detail,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    client.write(`data: ${data}\n\n`);
  });
};

const today = () => new Date().toISOString().split("T")[0];

const isUniqueConstraintError = (err: any) =>
  err?.number === 2627 || err?.number === 2601;

const createRequest = async () => {
  await poolConnect;
  return pool.request();
};

const hasRole = (role: string | undefined, allowed: string[]) => {
  if (!role) return false;
  return allowed.some((r) => role.includes(r));
};

// ---------- EMAIL ----------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "noreply-npl@norrenpensions.com",
    pass: process.env.SMTP_PASS || "",
  },
});

// ---------- AUTH ----------
const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user as JwtUser;
    next();
  });
};

async function startServer() {
  await poolConnect;
  console.log("Connected to SQL Server");

  const app = express();
  app.use(express.json());

  // ---------- AUTH ROUTES ----------
  app.post("/api/auth/signup", async (req, res) => {
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
        from: `"OGFZA Support" <${process.env.SMTP_USER || "noreply-npl@norrenpensions.com"}>`,
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

  app.post("/api/auth/login", async (req, res) => {
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

  app.post("/api/auth/change-password", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
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
      if (!user) return res.status(404).json({ error: "User not found" });

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
        from: `"OGFZA Support" <${process.env.SMTP_USER || "noreply-npl@norrenpensions.com"}>`,
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

  app.post("/api/auth/verify-otp", async (req, res) => {
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

  app.post("/api/auth/reset-password", async (req, res) => {
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

  // ---------- DASHBOARD ----------
  app.get("/api/dashboard/stats", authenticateToken, async (_req, res) => {
    try {
      const [
        totalCompanies,
        pendingPermits,
        totalProduction,
        totalRevenue,
        totalIncidents,
      ] = await Promise.all([
        (await createRequest()).query(`SELECT COUNT(*) AS count FROM companies`),
        (await createRequest()).query(`SELECT COUNT(*) AS count FROM permits WHERE status = 'Pending'`),
        (await createRequest()).query(`SELECT ISNULL(SUM(production_volume), 0) AS total FROM operations`),
        (await createRequest()).query(`SELECT ISNULL(SUM(amount), 0) AS total FROM revenue`),
        (await createRequest()).query(`SELECT COUNT(*) AS count FROM incidents WHERE status = 'Open'`),
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

  // ---------- NOTIFICATIONS ----------
  app.get("/api/notifications/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    clients.add(res);
    req.on("close", () => clients.delete(res));
  });

  // ---------- GENERAL DATA ROUTES ----------
  app.get("/api/companies", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`SELECT * FROM companies`);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/permits", authenticateToken, async (_req, res) => {
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

  app.get("/api/operations", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT *
        FROM operations
        ORDER BY report_date DESC
      `);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch operations" });
    }
  });

  app.post("/api/operations", authenticateToken, async (req, res) => {
    const { field_name, production_volume, downtime_hours, report_date } = req.body;

    try {
      const result = await (await createRequest())
        .input("field_name", sql.NVarChar, field_name)
        .input("production_volume", sql.Decimal(18, 2), Number(production_volume || 0))
        .input("downtime_hours", sql.Decimal(18, 2), Number(downtime_hours || 0))
        .input("report_date", sql.NVarChar, report_date || today())
        .query(`
          INSERT INTO operations (field_name, production_volume, downtime_hours, report_date)
          OUTPUT INSERTED.id
          VALUES (@field_name, @production_volume, @downtime_hours, @report_date)
        `);

      res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Failed to log production data" });
    }
  });

  app.get("/api/revenue", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT r.*, c.name AS company_name
        FROM revenue r
        JOIN companies c ON r.company_id = c.id
        ORDER BY payment_date DESC
      `);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch revenue" });
    }
  });

  app.get("/api/compliance", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT comp.*, c.name AS company_name
        FROM compliance comp
        JOIN companies c ON comp.company_id = c.id
        ORDER BY audit_date DESC
      `);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch compliance records" });
    }
  });

  app.get("/api/incidents", authenticateToken, async (_req, res) => {
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

  app.get("/api/assets", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`SELECT * FROM assets`);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  // ---------- HR & WORKFORCE ----------
  app.get("/api/hr/employees", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT *
        FROM employees
        ORDER BY full_name
      `);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/hr/employees", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { full_name, department, position, zone, email, phone, company } = req.body;

    try {
      const result = await (await createRequest())
        .input("full_name", sql.NVarChar, full_name)
        .input("department", sql.NVarChar, department ?? null)
        .input("position", sql.NVarChar, position ?? null)
        .input("zone", sql.NVarChar, zone ?? null)
        .input("email", sql.NVarChar, email ?? null)
        .input("phone", sql.NVarChar, phone ?? null)
        .input("company", sql.NVarChar, company ?? null)
        .input("hire_date", sql.NVarChar, today())
        .query(`
          INSERT INTO employees (full_name, department, position, zone, email, phone, company, hire_date)
          OUTPUT INSERTED.id
          VALUES (@full_name, @department, @position, @zone, @email, @phone, @company, @hire_date)
        `);

      sendPushNotification(
        "INFO",
        "New Employee Registered",
        `${full_name} (${position}) assigned to ${zone}`,
      );

      res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Failed to add employee" });
    }
  });

  app.get("/api/hr/attendance", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT a.*, e.full_name, e.department, e.zone
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        ORDER BY a.[date] DESC, a.id DESC
      `);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.post("/api/hr/attendance", authenticateToken, async (req, res) => {
    const { employee_id, date, shift, check_in, check_out, status } = req.body;

    try {
      const result = await (await createRequest())
        .input("employee_id", sql.Int, Number(employee_id))
        .input("date", sql.NVarChar, date)
        .input("shift", sql.NVarChar, shift ?? null)
        .input("check_in", sql.NVarChar, check_in ?? null)
        .input("check_out", sql.NVarChar, check_out ?? null)
        .input("status", sql.NVarChar, status ?? "Present")
        .query(`
          INSERT INTO attendance (employee_id, [date], shift, check_in, check_out, status)
          OUTPUT INSERTED.id
          VALUES (@employee_id, @date, @shift, @check_in, @check_out, @status)
        `);

      res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Failed to log attendance" });
    }
  });

  app.get("/api/hr/certifications", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT c.*, e.full_name, e.department, e.company
        FROM certifications c
        JOIN employees e ON c.employee_id = e.id
        ORDER BY c.expiry_date ASC
      `);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch certifications" });
    }
  });

  app.post("/api/hr/certifications", authenticateToken, async (req, res) => {
    const { employee_id, cert_name, issued_date, expiry_date } = req.body;

    try {
      const status = new Date(expiry_date) < new Date() ? "Expired" : "Valid";

      const result = await (await createRequest())
        .input("employee_id", sql.Int, Number(employee_id))
        .input("cert_name", sql.NVarChar, cert_name)
        .input("issued_date", sql.NVarChar, issued_date)
        .input("expiry_date", sql.NVarChar, expiry_date)
        .input("status", sql.NVarChar, status)
        .query(`
          INSERT INTO certifications (employee_id, cert_name, issued_date, expiry_date, status)
          OUTPUT INSERTED.id
          VALUES (@employee_id, @cert_name, @issued_date, @expiry_date, @status)
        `);

      res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Failed to add certification" });
    }
  });

  app.get("/api/hr/shifts", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`SELECT * FROM shifts`);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });

  app.get("/api/hr/stats", authenticateToken, async (_req, res) => {
    try {
      const [
        totalEmployees,
        presentToday,
        expiredCerts,
        onLeave,
      ] = await Promise.all([
        (await createRequest()).query(`SELECT COUNT(*) AS count FROM employees WHERE status = 'Active'`),
        (await createRequest()).query(`SELECT COUNT(*) AS count FROM attendance WHERE [date] = CAST(GETDATE() AS date) AND status = 'Present'`),
        (await createRequest()).query(`SELECT COUNT(*) AS count FROM certifications WHERE status = 'Expired'`),
        (await createRequest()).query(`SELECT COUNT(*) AS count FROM employees WHERE status = 'On Leave'`),
      ]);

      res.json({
        totalEmployees: totalEmployees.recordset[0],
        presentToday: presentToday.recordset[0],
        expiredCerts: expiredCerts.recordset[0],
        onLeave: onLeave.recordset[0],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load HR stats" });
    }
  });

  // ---------- USER ROUTES ----------
  app.get("/api/users", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin"])) return res.sendStatus(403);

    try {
      const result = await (await createRequest()).query(`
        SELECT
          id,
          email,
          full_name AS fullName,
          role,
          operational_unit AS unit,
          must_change_password AS status
        FROM users
      `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id/role", authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (!hasRole(req.user?.role, ["Admin"])) return res.sendStatus(403);

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

  // ---------- CONTRACTOR ROUTES ----------
  app.get("/api/contractors", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`SELECT * FROM contractors`);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch contractors" });
    }
  });

  app.get("/api/contractors/documents", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT d.*, c.name AS contractor_name
        FROM contractor_documents d
        JOIN contractors c ON d.contractor_id = c.id
        ORDER BY d.upload_date DESC
      `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch contractor documents" });
    }
  });

  app.post("/api/contractors/documents", authenticateToken, async (req, res) => {
    const { contractor_id, doc_type, file_name } = req.body;

    try {
      const result = await (await createRequest())
        .input("contractor_id", sql.Int, Number(contractor_id))
        .input("doc_type", sql.NVarChar, doc_type)
        .input("file_name", sql.NVarChar, file_name)
        .input("upload_date", sql.NVarChar, today())
        .query(`
          INSERT INTO contractor_documents (contractor_id, doc_type, file_name, upload_date)
          OUTPUT INSERTED.id
          VALUES (@contractor_id, @doc_type, @file_name, @upload_date)
        `);

      res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Upload failed" });
    }
  });

  app.get("/api/work-orders", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT w.*, c.name AS contractor_name
        FROM work_orders w
        JOIN contractors c ON w.contractor_id = c.id
        ORDER BY w.start_date DESC
      `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  });

  app.patch("/api/work-orders/:id", authenticateToken, async (req, res) => {
    const { status } = req.body;

    try {
      await (await createRequest())
        .input("status", sql.NVarChar, status)
        .input("id", sql.Int, Number(req.params.id))
        .query(`
          UPDATE work_orders
          SET status = @status
          WHERE id = @id
        `);

      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Update failed" });
    }
  });

  app.post("/api/work-orders", authenticateToken, async (req, res) => {
    const { contractor_id, title, description, location } = req.body;

    try {
      const result = await (await createRequest())
        .input("contractor_id", sql.Int, Number(contractor_id))
        .input("title", sql.NVarChar, title)
        .input("description", sql.NVarChar(sql.MAX), description ?? null)
        .input("location", sql.NVarChar, location ?? null)
        .input("start_date", sql.NVarChar, today())
        .input("status", sql.NVarChar, "Assigned")
        .query(`
          INSERT INTO work_orders (contractor_id, title, description, location, start_date, status)
          OUTPUT INSERTED.id
          VALUES (@contractor_id, @title, @description, @location, @start_date, @status)
        `);

      res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Request failed" });
    }
  });

  app.get("/api/maintenance", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`
        SELECT m.*, a.asset_name
        FROM equipment_maintenance m
        JOIN assets a ON m.asset_id = a.id
        ORDER BY m.maintenance_date DESC
      `);

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch maintenance records" });
    }
  });

  app.get("/api/change-management/team", authenticateToken, async (_req, res) => {
    try {
      const result = await (await createRequest()).query(`SELECT * FROM team_members`);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // ---------- ACTION ROUTES ----------
  app.post("/api/companies", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
        from: `"OGFZA Workflow" <${process.env.SMTP_USER || "noreply-npl@norrenpensions.com"}>`,
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

  app.post("/api/permits", authenticateToken, async (req, res) => {
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
        from: `"OGFZA Workflow" <${process.env.SMTP_USER || "noreply-npl@norrenpensions.com"}>`,
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

  app.patch("/api/permits/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
        from: `"OGFZA Workflow" <${process.env.SMTP_USER || "noreply-npl@norrenpensions.com"}>`,
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

  app.post("/api/incidents", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
        from: `"OGFZA Emergency" <${process.env.SMTP_USER || "noreply-npl@norrenpensions.com"}>`,
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

  // ---------- VITE / STATIC ----------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.use("/ogfza", express.static(path.join(process.cwd(), "OGFZA")));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});