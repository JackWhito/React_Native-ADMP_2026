import type { NextFunction, Request, Response } from "express";
import { Admin } from "../models/Admin";
import { signAdminToken } from "../utils/adminJwt";
import { hashAdminPassword, verifyAdminPassword } from "../utils/adminPassword";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function parseBody(req: Request): {
    name?: string;
    email?: string;
    password?: string;
} {
    const { name, email, password } = req.body as {
        name?: unknown;
        email?: unknown;
        password?: unknown;
    };
    return {
        name: typeof name === "string" ? name.trim() : undefined,
        email: typeof email === "string" ? email.trim().toLowerCase() : undefined,
        password: typeof password === "string" ? password : undefined,
    };
}

export async function registerAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, email, password } = parseBody(req);
        if (!name || !email || !password) {
            res.status(400).json({ message: "Name, email, and password are required" });
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            res
                .status(400)
                .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
            return;
        }
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: "Invalid email" });
            return;
        }

        const existing = await Admin.findOne({ email });
        if (existing) {
            res.status(409).json({ message: "An admin with this email already exists" });
            return;
        }

        const passwordHash = await hashAdminPassword(password);
        const admin = await Admin.create({ name, email, passwordHash });
        const token = await signAdminToken(admin._id.toString());

        res.status(201).json({
            token,
            admin: { id: admin._id.toString(), name: admin.name, email: admin.email },
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function loginAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = parseBody(req);
        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: "Invalid email" });
            return;
        }

        const admin = await Admin.findOne({ email }).select("+passwordHash");
        if (!admin?.passwordHash) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        const ok = await verifyAdminPassword(password, admin.passwordHash);
        if (!ok) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        const token = await signAdminToken(admin._id.toString());

        res.status(200).json({
            token,
            admin: { id: admin._id.toString(), name: admin.name, email: admin.email },
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}
