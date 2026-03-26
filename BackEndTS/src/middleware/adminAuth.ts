import type { NextFunction, Request, Response } from "express";
import { verifyAdminToken } from "../utils/adminJwt";

export type AdminRequest = Request & { adminId?: string };

/**
 * Requires `Authorization: Bearer <admin JWT>` from login/register.
 */
export async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
    try {
        const auth = req.headers.authorization;
        if (!auth?.startsWith("Bearer ")) {
            res.status(401).json({ message: "Missing or invalid Authorization header" });
            return;
        }
        const token = auth.slice(7).trim();
        if (!token) {
            res.status(401).json({ message: "Missing token" });
            return;
        }
        const payload = await verifyAdminToken(token);
        if (payload.role !== "admin") {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
        const sub = payload.sub;
        if (typeof sub !== "string" || !sub) {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        req.adminId = sub;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}
