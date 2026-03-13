import express, { NextFunction, Request, Response } from "express";
import "dotenv/config";
import { pool, poolConnect } from "@/db";

export const clients = new Set<Response>();

export const sendPushNotification = (type: string, message: string, detail?: string) => {
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

export const today = () => new Date().toISOString().split("T")[0];

export const isUniqueConstraintError = (err: any) =>
    err?.number === 2627 || err?.number === 2601;

export const createRequest = async () => {
    await poolConnect;
    return pool.request();
};

export const hasRole = (role: string | undefined, allowed: string[]) => {
    if (!role) return false;
    return allowed.some((r) => role.includes(r));
};