import { randomInt } from "node:crypto";

import type { NextFunction, Request, Response } from "express";
import { Admin } from "../models/Admin";
import { AdminPasswordResetOtp } from "../models/AdminPasswordResetOtp";
import { AdminRegisterOtp } from "../models/AdminRegisterOtp";
import { Profile } from "../models/Profile";
import { signAdminToken } from "../utils/adminJwt";
import { hashAdminPassword, verifyAdminPassword } from "../utils/adminPassword";
import { sendOtpEmail } from "../utils/sendOtpEmail";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const OTP_TTL_MS = 15 * 60 * 1000;

function parseBody(req: Request): {
    name?: string;
    email?: string;
    password?: string;
    otp?: string;
} {
    const { name, email, password, otp } = req.body as {
        name?: unknown;
        email?: unknown;
        password?: unknown;
        otp?: unknown;
    };
    return {
        name: typeof name === "string" ? name.trim() : undefined,
        email: typeof email === "string" ? email.trim().toLowerCase() : undefined,
        password: typeof password === "string" ? password : undefined,
        otp: typeof otp === "string" ? otp.trim() : undefined,
    };
}

function generateOtp6(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function sendRegisterOtp(req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = parseBody(req);
        if (!email) {
            res.status(400).json({ message: "Email is required" });
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

        const otp = generateOtp6();
        const otpHash = await hashAdminPassword(otp);
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);

        await AdminRegisterOtp.findOneAndUpdate(
            { email },
            { email, otpHash, expiresAt },
            { upsert: true, returnDocument: "after" }
        );

        try {
            await sendOtpEmail(email, otp, "registration");
        } catch (err) {
            await AdminRegisterOtp.deleteOne({ email });
            next(err);
            return;
        }

        res.status(200).json({ message: "Verification code sent" });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function verifyRegisterWithOtp(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, email, password, otp } = parseBody(req);
        if (!name || !email || !password || !otp) {
            res.status(400).json({ message: "Name, email, password, and OTP are required" });
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

        const pending = await AdminRegisterOtp.findOne({ email });
        if (!pending) {
            res.status(400).json({ message: "No verification pending for this email; request a new code" });
            return;
        }
        if (pending.expiresAt.getTime() < Date.now()) {
            await AdminRegisterOtp.deleteOne({ _id: pending._id });
            res.status(400).json({ message: "Code expired; request a new one" });
            return;
        }

        const otpOk = await verifyAdminPassword(otp, pending.otpHash);
        if (!otpOk) {
            res.status(400).json({ message: "Invalid verification code" });
            return;
        }

        const existing = await Admin.findOne({ email });
        if (existing) {
            await AdminRegisterOtp.deleteOne({ _id: pending._id });
            res.status(409).json({ message: "An admin with this email already exists" });
            return;
        }

        const passwordHash = await hashAdminPassword(password);
        const admin = await Admin.create({ name, email, passwordHash });
        await AdminRegisterOtp.deleteOne({ _id: pending._id });

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

export async function sendForgotPasswordOtp(req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = parseBody(req);
        if (!email) {
            res.status(400).json({ message: "Email is required" });
            return;
        }
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: "Invalid email" });
            return;
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            res.status(404).json({ message: "No admin account found for this email" });
            return;
        }

        const otp = generateOtp6();
        const otpHash = await hashAdminPassword(otp);
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);

        await AdminPasswordResetOtp.findOneAndUpdate(
            { email },
            { email, otpHash, expiresAt },
            { upsert: true, returnDocument: "after" }
        );

        try {
            await sendOtpEmail(email, otp, "password_reset");
        } catch (err) {
            await AdminPasswordResetOtp.deleteOne({ email });
            next(err);
            return;
        }

        res.status(200).json({ message: "Password reset code sent" });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function verifyForgotPasswordOtp(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password, otp } = parseBody(req);
        if (!email || !password || !otp) {
            res.status(400).json({ message: "Email, new password, and OTP are required" });
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

        const pending = await AdminPasswordResetOtp.findOne({ email });
        if (!pending) {
            res
                .status(400)
                .json({ message: "No password reset pending for this email; request a new code" });
            return;
        }
        if (pending.expiresAt.getTime() < Date.now()) {
            await AdminPasswordResetOtp.deleteOne({ _id: pending._id });
            res.status(400).json({ message: "Code expired; request a new one" });
            return;
        }

        const otpOk = await verifyAdminPassword(otp, pending.otpHash);
        if (!otpOk) {
            res.status(400).json({ message: "Invalid verification code" });
            return;
        }

        const admin = await Admin.findOne({ email }).select("+passwordHash");
        if (!admin?.passwordHash) {
            await AdminPasswordResetOtp.deleteOne({ _id: pending._id });
            res.status(404).json({ message: "No admin account found for this email" });
            return;
        }

        admin.passwordHash = await hashAdminPassword(password);
        await admin.save();
        await AdminPasswordResetOtp.deleteOne({ _id: pending._id });

        res.status(200).json({ message: "Password updated" });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Lists all Clerk-linked user profiles (admin dashboard). */
export async function listProfiles(_req: Request, res: Response, next: NextFunction) {
    try {
        const rows = await Profile.find().sort({ createdAt: -1 }).lean();
        const profiles = rows.map((p) => ({
            id: String(p._id),
            clerkId: p.clerkId,
            name: p.name,
            email: p.email,
            imageUrl: p.imageUrl ?? "",
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : undefined,
        }));
        res.status(200).json({ profiles });
    } catch (error) {
        res.status(500);
        next(error);
    }
}
