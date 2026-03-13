import { Router } from "express";
import sql from "mssql";
import { hasRole, createRequest } from "../helpers";
import { authenticateToken } from "../../middleware/auth.middleware";
import { AuthenticatedRequest } from "../../middleware/types.middleware";

const router = Router();

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
        must_change_password AS status
      FROM users
    `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
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