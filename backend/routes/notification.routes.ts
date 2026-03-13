import { Router } from "express";
import { clients } from "../helpers";

const router = Router();

// GET /api/notifications/stream
router.get("/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    clients.add(res);

    req.on("close", () => {
        clients.delete(res);
    });
});

export default router;