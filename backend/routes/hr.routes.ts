import { Router } from "express";
import { sql } from "@/db";
import { createRequest, today, sendPushNotification } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { AuthenticatedRequest } from "../../middleware/types.middleware";


const router = Router();

// GET /api/hr/employees
router.get("/employees", authenticateToken, async (_req, res) => {
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

// POST /api/hr/employees
router.post("/employees", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
        INSERT INTO employees (
          full_name,
          department,
          position,
          zone,
          email,
          phone,
          company,
          hire_date
        )
        OUTPUT INSERTED.id
        VALUES (
          @full_name,
          @department,
          @position,
          @zone,
          @email,
          @phone,
          @company,
          @hire_date
        )
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

// GET /api/hr/attendance
router.get("/attendance", authenticateToken, async (_req, res) => {
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

// POST /api/hr/attendance
router.post("/attendance", authenticateToken, async (req, res) => {
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
        INSERT INTO attendance (
          employee_id,
          [date],
          shift,
          check_in,
          check_out,
          status
        )
        OUTPUT INSERTED.id
        VALUES (
          @employee_id,
          @date,
          @shift,
          @check_in,
          @check_out,
          @status
        )
      `);

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to log attendance" });
    }
});

// GET /api/hr/certifications
router.get("/certifications", authenticateToken, async (_req, res) => {
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

// POST /api/hr/certifications
router.post("/certifications", authenticateToken, async (req, res) => {
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
        INSERT INTO certifications (
          employee_id,
          cert_name,
          issued_date,
          expiry_date,
          status
        )
        OUTPUT INSERTED.id
        VALUES (
          @employee_id,
          @cert_name,
          @issued_date,
          @expiry_date,
          @status
        )
      `);

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Failed to add certification" });
    }
});

// GET /api/hr/shifts
router.get("/shifts", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`SELECT * FROM shifts`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch shifts" });
    }
});

// GET /api/hr/stats
router.get("/stats", authenticateToken, async (_req, res) => {
    try {
        const [totalEmployees, presentToday, expiredCerts, onLeave] = await Promise.all([
            (await createRequest()).query(
                `SELECT COUNT(*) AS count FROM employees WHERE status = 'Active'`
            ),
            (await createRequest()).query(
                `SELECT COUNT(*) AS count FROM attendance WHERE [date] = CAST(GETDATE() AS date) AND status = 'Present'`
            ),
            (await createRequest()).query(
                `SELECT COUNT(*) AS count FROM certifications WHERE status = 'Expired'`
            ),
            (await createRequest()).query(
                `SELECT COUNT(*) AS count FROM employees WHERE status = 'On Leave'`
            ),
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

export default router;