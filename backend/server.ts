import express, { NextFunction, Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import sql from "mssql";
import "dotenv/config";
import { AuthenticatedRequest } from "../middleware/types.middleware";
import type { JwtUser } from "../middleware/types.middleware";
import {
  clients,
  createRequest,
  today,
  hasRole,
  sendPushNotification,
  isUniqueConstraintError,
} from "./helpers";
import { poolConnect } from "@/db";
import { transporter } from "./email";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import notificationRoutes from "./routes/notification.routes";
import companyRoutes from "./routes/companies.routes";
import companyApplicationsRoutes from "./routes/company-applications.routes";
import tradeOperationsRoutes from "./routes/trade-operations.routes";
import operationsRoutes from "./routes/operations.routes";
import revenueRoutes from "./routes/revenue.routes";
import complianceRoutes from "./routes/compliance.routes";
import incidentsRoutes from "./routes/incidents.routes";
import assetsRoutes from "./routes/assets.routes";
import hrRoutes from "./routes/hr.routes";
import userRoutes from "./routes/users.routes";
import contractorsRoutes from "./routes/contractos.routes";
import maintenanceRoutes from "./routes/maintenance.routes";
import changeManagementRoutes from "./routes/change-management.routes";
import { authenticateToken } from "../middleware/auth.middleware";

const JWT_SECRET = process.env.JWT_SECRET || "petroflow-secret-key-2024";
const PORT = Number(process.env.PORT || 3001);


async function startServer() {
  await poolConnect;
  console.log("Connected to SQL Server");

  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/companies", companyRoutes);
  app.use("/api/company-applications", companyApplicationsRoutes);
  app.use("/api/trade-operations", tradeOperationsRoutes);
  app.use("/api/operations", operationsRoutes);
  app.use("/api/revenue", revenueRoutes);
  app.use("/api/compliance", complianceRoutes);
  app.use("/api/incidents", incidentsRoutes);
  app.use("/api/assets", assetsRoutes);
  app.use("/api/hr", hrRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api", contractorsRoutes);
  app.use("/api/maintenance", maintenanceRoutes);
  app.use("/api/change-management", changeManagementRoutes);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found." });
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
