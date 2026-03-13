import { Router } from "express";
import sql from "mssql";

import { createRequest, today } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";


const router = Router();

// GET /api/contractors
router.get("/contractors", authenticateToken, async (_req, res) => {
    try {
        const result = await (await createRequest()).query(`
      SELECT * FROM contractors
    `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch contractors" });
    }
});

// GET /api/contractors/documents
router.get("/contractors/documents", authenticateToken, async (_req, res) => {
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

// POST /api/contractors/documents
router.post("/contractors/documents", authenticateToken, async (req, res) => {
    const { contractor_id, doc_type, file_name } = req.body;

    try {
        const result = await (await createRequest())
            .input("contractor_id", sql.Int, Number(contractor_id))
            .input("doc_type", sql.NVarChar, doc_type)
            .input("file_name", sql.NVarChar, file_name)
            .input("upload_date", sql.NVarChar, today())
            .query(`
        INSERT INTO contractor_documents (
          contractor_id,
          doc_type,
          file_name,
          upload_date
        )
        OUTPUT INSERTED.id
        VALUES (
          @contractor_id,
          @doc_type,
          @file_name,
          @upload_date
        )
      `);

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Upload failed" });
    }
});

// GET /api/work-orders
router.get("/work-orders", authenticateToken, async (_req, res) => {
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

// PATCH /api/work-orders/:id
router.patch("/work-orders/:id", authenticateToken, async (req, res) => {
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

// POST /api/work-orders
router.post("/work-orders", authenticateToken, async (req, res) => {
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
        INSERT INTO work_orders (
          contractor_id,
          title,
          description,
          location,
          start_date,
          status
        )
        OUTPUT INSERTED.id
        VALUES (
          @contractor_id,
          @title,
          @description,
          @location,
          @start_date,
          @status
        )
      `);

        res.status(201).json({ id: result.recordset[0].id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Request failed" });
    }
});

export default router;