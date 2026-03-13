import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

import type { AuthenticatedRequest, JwtUser } from "./types.middleware";

const JWT_SECRET = process.env.JWT_SECRET || "petroflow-secret-key-2024";

export const authenticateToken = (
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
        if (err) {
            return res.sendStatus(403);
        }

        req.user = user as JwtUser;
        next();
    });
};