import type { Request, Response } from "express";
import { Profile } from "../models/Profile";
import { LocalPasswordResetOtp } from "../models/LocalPasswordResetOtp";
import { LocalEmailSignupPending } from "../models/LocalEmailSignupPending";
import { generateUniqueUsername } from "../utils/username";
import { hashAppPassword, isStrongAppPassword, verifyAppPassword } from "../utils/appPassword";
import { signAppToken } from "../utils/appJwt";
import { sendOtpEmail } from "../utils/sendOtpEmail";
import { emitAdminDataChanged } from "../utils/socket";
import { invalidateAuthProfileCacheAfterSave } from "../utils/profileAuthCache";
import { randomInt } from "node:crypto";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 15 * 60 * 1000;

function generateOtp6(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function profileToPublic(doc: InstanceType<typeof Profile>) {
    return {
        _id: doc._id,
        name: doc.name,
        username: doc.username,
        bio: doc.bio,
        imageUrl: doc.imageUrl,
        email: doc.email,
        clerkId: doc.clerkId,
        authProvider: doc.authProvider,
        createdAt: doc.createdAt,
    };
}

/** POST /api/auth/local/register-start — send sign-up OTP (no account until verify). */
export async function startEmailRegistration(req: Request, res: Response): Promise<void> {
    try {
        const body = req.body as { email?: unknown; password?: unknown; name?: unknown };
        const email =
            typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (!emailRegex.test(email)) {
            res.status(400).json({ error: "Invalid email address." });
            return;
        }
        if (!isStrongAppPassword(password)) {
            res.status(400).json({
                error:
                    "Password must be at least 8 characters and include upper, lower, number, and symbol.",
            });
            return;
        }
        if (!name || name.length < 1) {
            res.status(400).json({ error: "Name is required." });
            return;
        }

        const existing = await Profile.findOne({ email });
        if (existing) {
            res.status(409).json({ error: "An account with this email already exists." });
            return;
        }

        const passwordHash = await hashAppPassword(password);
        await LocalEmailSignupPending.deleteMany({ email });
        const otp = generateOtp6();
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);
        await LocalEmailSignupPending.create({ email, passwordHash, name, otp, expiresAt });
        await sendOtpEmail(email, otp, "app_signup");

        res.status(200).json({
            ok: true,
            message: "Verification code sent. Check your email.",
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not start registration." });
    }
}

/** POST /api/auth/local/register-verify — create account after OTP. */
export async function completeEmailRegistration(req: Request, res: Response): Promise<void> {
    try {
        const body = req.body as { email?: unknown; otp?: unknown };
        const email =
            typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const otp = typeof body.otp === "string" ? body.otp.trim() : "";
        if (!emailRegex.test(email) || !otp) {
            res.status(400).json({ error: "Email and verification code are required." });
            return;
        }

        const pending = await LocalEmailSignupPending.findOne({ email, otp });
        if (!pending || pending.expiresAt.getTime() < Date.now()) {
            res.status(400).json({ error: "Invalid or expired code." });
            return;
        }

        const stillExists = await Profile.findOne({ email });
        if (stillExists) {
            await LocalEmailSignupPending.deleteMany({ email });
            res.status(409).json({ error: "An account with this email already exists." });
            return;
        }

        const username = await generateUniqueUsername(email.split("@")[0] || pending.name);
        const profile = await Profile.create({
            authProvider: "email",
            email: pending.email,
            name: pending.name,
            username,
            bio: "",
            imageUrl: "",
            passwordHash: pending.passwordHash,
        });
        await LocalEmailSignupPending.deleteMany({ email });

        const accessToken = await signAppToken(String(profile._id), profile.sessionVersion);
        emitAdminDataChanged(["profiles", "dashboard", "news"]);

        res.status(201).json({
            accessToken,
            profile: profileToPublic(profile),
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Registration failed." });
    }
}

/** POST /api/auth/local/login */
export async function loginWithEmail(req: Request, res: Response): Promise<void> {
    try {
        const body = req.body as { email?: unknown; password?: unknown };
        const email =
            typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";

        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required." });
            return;
        }

        const profile = await Profile.findOne({ email, authProvider: "email" }).select(
            "+passwordHash"
        );
        if (!profile || !profile.passwordHash) {
            res.status(401).json({ error: "Invalid email or password." });
            return;
        }

        const ok = await verifyAppPassword(password, profile.passwordHash);
        if (!ok) {
            res.status(401).json({ error: "Invalid email or password." });
            return;
        }

        const accessToken = await signAppToken(String(profile._id), profile.sessionVersion);

        res.status(200).json({
            accessToken,
            profile: profileToPublic(profile),
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Login failed." });
    }
}

/** POST /api/auth/local/forgot-password */
export async function forgotPasswordRequest(req: Request, res: Response): Promise<void> {
    try {
        const body = req.body as { email?: unknown };
        const email =
            typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (!emailRegex.test(email)) {
            res.status(400).json({ error: "Invalid email address." });
            return;
        }

        const profile = await Profile.findOne({ email, authProvider: "email" });
        if (!profile) {
            res.status(200).json({ ok: true, message: "If an account exists, a code was sent." });
            return;
        }

        await LocalPasswordResetOtp.deleteMany({ email });

        const otp = generateOtp6();
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);
        await LocalPasswordResetOtp.create({ email, otp, expiresAt });

        await sendOtpEmail(email, otp, "app_password_reset");

        res.status(200).json({ ok: true, message: "If an account exists, a code was sent." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not send reset email." });
    }
}

/** POST /api/auth/local/reset-password */
export async function resetPasswordWithOtp(req: Request, res: Response): Promise<void> {
    try {
        const body = req.body as {
            email?: unknown;
            otp?: unknown;
            newPassword?: unknown;
        };
        const email =
            typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const otp = typeof body.otp === "string" ? body.otp.trim() : "";
        const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

        if (!emailRegex.test(email) || !otp || !newPassword) {
            res.status(400).json({ error: "Email, code, and new password are required." });
            return;
        }
        if (!isStrongAppPassword(newPassword)) {
            res.status(400).json({
                error:
                    "Password must be at least 8 characters and include upper, lower, number, and symbol.",
            });
            return;
        }

        const row = await LocalPasswordResetOtp.findOne({ email, otp });
        if (!row || row.expiresAt.getTime() < Date.now()) {
            res.status(400).json({ error: "Invalid or expired code." });
            return;
        }

        const profile = await Profile.findOne({ email, authProvider: "email" }).select(
            "+passwordHash"
        );
        if (!profile) {
            res.status(400).json({ error: "Account not found." });
            return;
        }

        profile.passwordHash = await hashAppPassword(newPassword);
        profile.sessionVersion = (profile.sessionVersion ?? 1) + 1;
        await profile.save();
        await LocalPasswordResetOtp.deleteMany({ email });

        invalidateAuthProfileCacheAfterSave(profile);

        const accessToken = await signAppToken(String(profile._id), profile.sessionVersion);

        res.status(200).json({
            accessToken,
            profile: profileToPublic(profile),
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Password reset failed." });
    }
}
