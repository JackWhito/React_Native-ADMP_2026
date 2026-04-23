import { randomInt } from "node:crypto";

import mongoose from "mongoose";
import type { NextFunction, Request, Response } from "express";
import { Admin } from "../models/Admin";
import { AdminPasswordResetOtp } from "../models/AdminPasswordResetOtp";
import { AdminMessageReport } from "../models/AdminMessageReport";
import { AdminProfileDeletionRequest } from "../models/AdminProfileDeletionRequest";
import { AdminRegisterOtp } from "../models/AdminRegisterOtp";
import { AdminServerReport } from "../models/AdminServerReport";
import { AdminServerDeletionRequest } from "../models/AdminServerDeletionRequest";
import { AdminUserReport } from "../models/AdminUserReport";
import { Channel } from "../models/Channel";
import { Conversation } from "../models/Conversation";
import { DirectMessage } from "../models/DirectMessage";
import { Message } from "../models/Message";
import { Notification } from "../models/Notification";
import { Profile } from "../models/Profile";
import { Server } from "../models/Server";
import { ChannelCategory } from "../models/ChannelCategory";
import { signAdminToken } from "../utils/adminJwt";
import { hashAdminPassword, verifyAdminPassword } from "../utils/adminPassword";
import { sendOtpEmail } from "../utils/sendOtpEmail";
import { emitAdminDataChanged } from "../utils/socket";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
const OTP_TTL_MS = 15 * 60 * 1000;
const HOURS_WINDOW = 24;
const DAYS_WINDOW = 14;
const PROFILE_DELETE_DELAY_HOURS = 24;
const SERVER_DELETE_DELAY_HOURS = 24;

function isStrongPassword(password: string): boolean {
    return password.length >= MIN_PASSWORD_LENGTH && passwordRegex.test(password);
}

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

function parsePagination(req: Request): { page: number; limit: number; skip: number } {
    const pageRaw = Number((req.query as { page?: string }).page ?? 1);
    const limitRaw = Number((req.query as { limit?: string }).limit ?? 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 10;
    return { page, limit, skip: (page - 1) * limit };
}

function parseReportsPagination(req: Request): { page: number; limit: number; skip: number } {
    const pageRaw = Number((req.query as { page?: string }).page ?? 1);
    const limitRaw = Number((req.query as { limit?: string }).limit ?? 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 50) : 10;
    return { page, limit, skip: (page - 1) * limit };
}

type ReportStatusFilter = "pending" | "resolved" | "dismissed" | "all";
type ReportCategoryFilter = "spam" | "harassment" | "hate" | "nudity" | "violence" | "scam" | "other" | "all";

function parseReportStatus(req: Request): ReportStatusFilter {
    const raw = String((req.query as { status?: string }).status ?? "pending").trim().toLowerCase();
    if (raw === "all") return "all";
    if (raw === "resolved") return "resolved";
    if (raw === "dismissed") return "dismissed";
    return "pending";
}

function parseReportCategory(req: Request): ReportCategoryFilter {
    const raw = String((req.query as { category?: string }).category ?? "all").trim().toLowerCase();
    if (["spam", "harassment", "hate", "nudity", "violence", "scam", "other"].includes(raw)) {
        return raw as ReportCategoryFilter;
    }
    return "all";
}

function buildReportFilter(status: ReportStatusFilter, category: ReportCategoryFilter): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (status !== "all") filter.status = status;
    if (category !== "all") filter.category = category;
    return filter;
}

type CountPoint = { key: string; count: number };
type AdminNewsItem = {
    id: string;
    type: "profile_created" | "server_created";
    title: string;
    subtitle: string;
    createdAt: string;
};

function getLastUtcHours(hours: number): string[] {
    const now = new Date();
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
    const keys: string[] = [];
    for (let i = hours - 1; i >= 0; i -= 1) {
        const d = new Date(base.getTime() - i * 60 * 60 * 1000);
        keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}`);
    }
    return keys;
}

function getLastUtcDays(days: number): string[] {
    const now = new Date();
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const keys: string[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(base.getTime() - i * 24 * 60 * 60 * 1000);
        keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
    }
    return keys;
}

function toSeries(keys: string[], raw: CountPoint[]): Array<{ label: string; count: number }> {
    const m = new Map<string, number>();
    raw.forEach((p) => m.set(p.key, p.count));
    return keys.map((k) => ({ label: k, count: m.get(k) ?? 0 }));
}

async function hardDeleteProfileById(profileId: mongoose.Types.ObjectId): Promise<void> {
    const profile = await Profile.findById(profileId);
    if (!profile) return;

    const createdServers = await Server.find({ createdBy: profileId }).select("_id").lean();
    const createdServerIds = createdServers.map((s) => s._id);

    if (createdServerIds.length) {
        const serverChannelIds = await Channel.find({ server: { $in: createdServerIds } }).distinct("_id");
        await Promise.all([
            Message.deleteMany({ channel: { $in: serverChannelIds } }),
            Channel.deleteMany({ server: { $in: createdServerIds } }),
            ChannelCategory.deleteMany({ server: { $in: createdServerIds } }),
            Notification.deleteMany({ server: { $in: createdServerIds } }),
            Server.deleteMany({ _id: { $in: createdServerIds } }),
        ]);
    }

    await Promise.all([
        Message.deleteMany({ member: profileId }),
        DirectMessage.deleteMany({ member: profileId }),
        Notification.deleteMany({ $or: [{ recipient: profileId }, { sender: profileId }] }),
        Conversation.deleteMany({ $or: [{ memberOne: profileId }, { memberTwo: profileId }] }),
        Server.updateMany({ participants: profileId }, { $pull: { participants: profileId, admins: profileId } }),
        Channel.updateMany({ profile: profileId }, { $pull: { profile: profileId } }),
    ]);

    await Profile.deleteOne({ _id: profileId });
    await AdminProfileDeletionRequest.deleteOne({ profile: profileId });
}

async function processDueDeletionRequests(): Promise<void> {
    const due = await AdminProfileDeletionRequest.find({
        executeAt: { $lte: new Date() },
        cancellationRequested: { $ne: true },
    })
        .select("profile")
        .lean();
    for (const req of due) {
        const id = req.profile;
        if (id instanceof mongoose.Types.ObjectId) {
            await hardDeleteProfileById(id);
        }
    }
}

async function hardDeleteServerById(serverId: mongoose.Types.ObjectId): Promise<void> {
    const server = await Server.findById(serverId).select("_id");
    if (!server) return;
    const channelIds = await Channel.find({ server: serverId }).distinct("_id");
    await Promise.all([
        Message.deleteMany({ channel: { $in: channelIds } }),
        Channel.deleteMany({ server: serverId }),
        ChannelCategory.deleteMany({ server: serverId }),
        Notification.deleteMany({ server: serverId }),
        Server.deleteOne({ _id: serverId }),
        AdminServerDeletionRequest.deleteOne({ server: serverId }),
    ]);
}

async function processDueServerDeletionRequests(): Promise<void> {
    const due = await AdminServerDeletionRequest.find({ executeAt: { $lte: new Date() } })
        .select("server")
        .lean();
    for (const req of due) {
        const id = req.server;
        if (id instanceof mongoose.Types.ObjectId) {
            await hardDeleteServerById(id);
        }
    }
}

async function setDeletionNotificationState(
    profileId: mongoose.Types.ObjectId,
    status: "accepted" | "rejected",
    message: string
): Promise<void> {
    const n = await Notification.findOne({
        recipient: profileId,
        type: "account_deletion_warning",
        status: { $in: ["pending", "cancel_requested"] },
    }).sort({ createdAt: -1 });
    if (!n) return;
    n.status = status;
    n.message = message;
    n.isRead = false;
    n.readAt = null;
    await n.save();
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
        if (!isStrongPassword(password)) {
            res
                .status(400)
                .json({
                    message:
                        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
                });
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
        if (!isStrongPassword(password)) {
            res
                .status(400)
                .json({
                    message:
                        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
                });
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
        if (!isStrongPassword(password)) {
            res
                .status(400)
                .json({
                    message:
                        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
                });
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
        await processDueDeletionRequests();
        const req = _req as Request;
        const q = String((req.query as { q?: string }).q ?? "").trim();
        const { page, limit, skip } = parsePagination(req);
        const filter: Record<string, unknown> = {};
        if (q) {
            const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ name: regex }, { email: regex }, { username: regex }];
        }
        const [rows, total] = await Promise.all([
            Profile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Profile.countDocuments(filter),
        ]);
        const rowIds = rows.map((p) => p._id);
        const pendingRows = await AdminProfileDeletionRequest.find({ profile: { $in: rowIds } })
            .select("profile executeAt")
            .lean();
        const pendingMap = new Map<string, string>();
        for (const p of pendingRows) {
            pendingMap.set(String(p.profile), p.executeAt instanceof Date ? p.executeAt.toISOString() : "");
        }
        const profiles = rows.map((p) => ({
            id: String(p._id),
            clerkId: p.clerkId,
            name: p.name,
            username: p.username ?? "",
            bio: p.bio ?? "",
            email: p.email,
            imageUrl: p.imageUrl ?? "",
            role: p.role ?? "user",
            moderationStatus: p.moderationStatus ?? "active",
            moderationReason: p.moderationReason ?? "",
            suspendedUntil: p.suspendedUntil instanceof Date ? p.suspendedUntil.toISOString() : "",
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : undefined,
            pendingDeletionAt: pendingMap.get(String(p._id)) ?? "",
        }));
        res.status(200).json({ profiles, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function getProfileDetail(req: Request, res: Response, next: NextFunction) {
    try {
        await processDueDeletionRequests();
        const profileId = String((req.params as { profileId?: string }).profileId ?? "");
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            res.status(400).json({ message: "Invalid profile id" });
            return;
        }
        const _id = new mongoose.Types.ObjectId(profileId);
        const profile = await Profile.findById(_id).lean();
        if (!profile) {
            res.status(404).json({ message: "Profile not found" });
            return;
        }
        const [messages, directMessages, conversations, serversOwned, serversJoined, notifications, pendingDeletion] =
            await Promise.all([
                Message.countDocuments({ member: _id }),
                DirectMessage.countDocuments({ member: _id }),
                Conversation.countDocuments({ $or: [{ memberOne: _id }, { memberTwo: _id }] }),
                Server.countDocuments({ createdBy: _id }),
                Server.countDocuments({ participants: _id }),
                Notification.countDocuments({ $or: [{ recipient: _id }, { sender: _id }] }),
                AdminProfileDeletionRequest.findOne({ profile: _id })
                    .select("reason executeAt requestedAt cancellationRequested cancellationReason cancellationRequestedAt")
                    .lean(),
            ]);
        res.status(200).json({
            profile: {
                id: String(profile._id),
                clerkId: profile.clerkId,
                name: profile.name,
                username: profile.username ?? "",
                bio: profile.bio ?? "",
                email: profile.email,
                imageUrl: profile.imageUrl ?? "",
                role: profile.role ?? "user",
                moderationStatus: profile.moderationStatus ?? "active",
                moderationReason: profile.moderationReason ?? "",
                suspendedUntil: profile.suspendedUntil instanceof Date ? profile.suspendedUntil.toISOString() : "",
                forceLogoutAfter:
                    profile.forceLogoutAfter instanceof Date ? profile.forceLogoutAfter.toISOString() : "",
                sessionVersion: typeof profile.sessionVersion === "number" ? profile.sessionVersion : 1,
                createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : undefined,
                updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : undefined,
                pendingDeletion:
                    pendingDeletion != null
                        ? {
                              reason: pendingDeletion.reason,
                              requestedAt:
                                  pendingDeletion.requestedAt instanceof Date
                                      ? pendingDeletion.requestedAt.toISOString()
                                      : "",
                              executeAt:
                                  pendingDeletion.executeAt instanceof Date
                                      ? pendingDeletion.executeAt.toISOString()
                                      : "",
                              cancellationRequested: Boolean(pendingDeletion.cancellationRequested),
                              cancellationReason: String(pendingDeletion.cancellationReason ?? ""),
                              cancellationRequestedAt:
                                  pendingDeletion.cancellationRequestedAt instanceof Date
                                      ? pendingDeletion.cancellationRequestedAt.toISOString()
                                      : "",
                          }
                        : null,
                stats: {
                    messages,
                    directMessages,
                    conversations,
                    serversOwned,
                    serversJoined,
                    notifications,
                },
            },
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function updateProfileAsAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const profileId = String((req.params as { profileId?: string }).profileId ?? "");
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            res.status(400).json({ message: "Invalid profile id" });
            return;
        }
        const body = (req.body ?? {}) as {
            name?: unknown;
            username?: unknown;
            bio?: unknown;
            email?: unknown;
        };
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
        const bio = typeof body.bio === "string" ? body.bio.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

        if (!name) {
            res.status(400).json({ message: "Name is required" });
            return;
        }
        if (!email || !email.includes("@")) {
            res.status(400).json({ message: "Invalid email format" });
            return;
        }
        if (bio.length > 300) {
            res.status(400).json({ message: "Bio must be 300 characters or less" });
            return;
        }
        if (username.length > 0 && username.length < 3) {
            res.status(400).json({ message: "Username must be at least 3 characters" });
            return;
        }
        const _id = new mongoose.Types.ObjectId(profileId);
        const profile = await Profile.findById(_id);
        if (!profile) {
            res.status(404).json({ message: "Profile not found" });
            return;
        }
        const emailTaken = await Profile.findOne({ _id: { $ne: _id }, email }).select("_id");
        if (emailTaken) {
            res.status(409).json({ message: "Email is already in use" });
            return;
        }
        if (username) {
            const usernameTaken = await Profile.findOne({ _id: { $ne: _id }, username }).select("_id");
            if (usernameTaken) {
                res.status(409).json({ message: "Username is already taken" });
                return;
            }
            profile.username = username;
        } else {
            profile.username = undefined;
        }
        profile.name = name;
        profile.email = email;
        profile.bio = bio;
        await profile.save();
        res.status(200).json({
            profile: {
                id: String(profile._id),
                clerkId: profile.clerkId,
                name: profile.name,
                username: profile.username ?? "",
                bio: profile.bio ?? "",
                email: profile.email,
                imageUrl: profile.imageUrl ?? "",
                role: profile.role ?? "user",
                moderationStatus: profile.moderationStatus ?? "active",
                moderationReason: profile.moderationReason ?? "",
                suspendedUntil: profile.suspendedUntil instanceof Date ? profile.suspendedUntil.toISOString() : "",
                forceLogoutAfter:
                    profile.forceLogoutAfter instanceof Date ? profile.forceLogoutAfter.toISOString() : "",
                sessionVersion: typeof profile.sessionVersion === "number" ? profile.sessionVersion : 1,
                createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : undefined,
                updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : undefined,
            },
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function deleteProfileAsAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        await processDueDeletionRequests();
        const profileId = String((req.params as { profileId?: string }).profileId ?? "");
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            res.status(400).json({ message: "Invalid profile id" });
            return;
        }
        const _id = new mongoose.Types.ObjectId(profileId);
        const profile = await Profile.findById(_id).select("_id");
        if (!profile) {
            res.status(404).json({ message: "Profile not found" });
            return;
        }
        const body = (req.body ?? {}) as { reason?: unknown };
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (reason.length < 5) {
            res.status(400).json({ message: "Deletion reason must be at least 5 characters" });
            return;
        }
        const already = await AdminProfileDeletionRequest.findOne({ profile: _id }).select("_id executeAt");
        if (already) {
            res.status(409).json({
                message: "Deletion is already scheduled for this profile",
                executeAt: already.executeAt instanceof Date ? already.executeAt.toISOString() : undefined,
            });
            return;
        }
        const requestedAt = new Date();
        const executeAt = new Date(Date.now() + PROFILE_DELETE_DELAY_HOURS * 60 * 60 * 1000);
        const requestedBy = String((req as Request & { adminId?: string }).adminId ?? "").trim() || undefined;
        await AdminProfileDeletionRequest.create({
            profile: _id,
            reason,
            requestedBy,
            requestedAt,
            executeAt,
        });
        await Notification.create({
            type: "account_deletion_warning",
            status: "pending",
            isRead: false,
            recipient: _id,
            message: `Your account is scheduled for deletion at ${executeAt.toISOString()}. Reason: ${reason}`,
        });
        res.status(202).json({
            scheduled: true,
            reason,
            requestedAt: requestedAt.toISOString(),
            executeAt: executeAt.toISOString(),
            delayHours: PROFILE_DELETE_DELAY_HOURS,
        });
        emitAdminDataChanged(["profiles", "dashboard"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function assignProfileRole(req: Request, res: Response, next: NextFunction) {
    try {
        const profileId = String((req.params as { profileId?: string }).profileId ?? "");
        const role = String(((req.body ?? {}) as { role?: unknown }).role ?? "").trim();
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            res.status(400).json({ message: "Invalid profile id" });
            return;
        }
        if (!["user", "moderator", "admin"].includes(role)) {
            res.status(400).json({ message: "Role must be user, moderator, or admin" });
            return;
        }
        const profile = await Profile.findById(profileId);
        if (!profile) {
            res.status(404).json({ message: "Profile not found" });
            return;
        }
        profile.role = role as "user" | "moderator" | "admin";
        await profile.save();
        res.status(200).json({ updated: true, role: profile.role });
        emitAdminDataChanged(["profiles"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function moderateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const profileId = String((req.params as { profileId?: string }).profileId ?? "");
        const body = (req.body ?? {}) as {
            action?: unknown;
            reason?: unknown;
            suspendedHours?: unknown;
        };
        const action = String(body.action ?? "").trim();
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        const suspendedHours = Number(body.suspendedHours ?? 24);

        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            res.status(400).json({ message: "Invalid profile id" });
            return;
        }
        if (!["active", "suspended", "banned", "shadow_banned"].includes(action)) {
            res.status(400).json({ message: "Invalid moderation action" });
            return;
        }
        const profile = await Profile.findById(profileId);
        if (!profile) {
            res.status(404).json({ message: "Profile not found" });
            return;
        }

        profile.moderationStatus = action as "active" | "suspended" | "banned" | "shadow_banned";
        profile.moderationReason = reason;
        if (action === "suspended") {
            const safeHours = Number.isFinite(suspendedHours) && suspendedHours > 0 ? suspendedHours : 24;
            profile.suspendedUntil = new Date(Date.now() + safeHours * 60 * 60 * 1000);
        } else {
            profile.suspendedUntil = undefined;
        }
        if (action === "banned") {
            profile.forceLogoutAfter = new Date();
            profile.sessionVersion = (profile.sessionVersion ?? 1) + 1;
        }
        await profile.save();
        res.status(200).json({
            updated: true,
            moderationStatus: profile.moderationStatus,
            moderationReason: profile.moderationReason ?? "",
            suspendedUntil: profile.suspendedUntil instanceof Date ? profile.suspendedUntil.toISOString() : "",
        });
        emitAdminDataChanged(["profiles"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function forceLogoutProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const profileId = String((req.params as { profileId?: string }).profileId ?? "");
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            res.status(400).json({ message: "Invalid profile id" });
            return;
        }
        const profile = await Profile.findById(profileId);
        if (!profile) {
            res.status(404).json({ message: "Profile not found" });
            return;
        }
        profile.forceLogoutAfter = new Date();
        profile.sessionVersion = (profile.sessionVersion ?? 1) + 1;
        await profile.save();
        res.status(200).json({
            forced: true,
            forceLogoutAfter:
                profile.forceLogoutAfter instanceof Date ? profile.forceLogoutAfter.toISOString() : "",
            sessionVersion: profile.sessionVersion,
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Lists all scheduled deletion requests for admin review. */
export async function listDeletionRequests(_req: Request, res: Response, next: NextFunction) {
    try {
        await processDueDeletionRequests();
        const req = _req as Request;
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            AdminProfileDeletionRequest.find()
                .populate("profile", "name email username")
                .sort({ executeAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AdminProfileDeletionRequest.countDocuments(),
        ]);
        const requests = rows.map((r) => {
            const profile = r.profile as { _id?: unknown; name?: string; email?: string; username?: string } | undefined;
            return {
                profileId: profile?._id ? String(profile._id) : "",
                name: profile?.name ?? "",
                email: profile?.email ?? "",
                username: profile?.username ?? "",
                reason: r.reason,
                requestedAt: r.requestedAt instanceof Date ? r.requestedAt.toISOString() : "",
                executeAt: r.executeAt instanceof Date ? r.executeAt.toISOString() : "",
                cancellationRequested: Boolean(r.cancellationRequested),
                cancellationReason: String(r.cancellationReason ?? ""),
                cancellationRequestedAt:
                    r.cancellationRequestedAt instanceof Date ? r.cancellationRequestedAt.toISOString() : "",
            };
        });
        res.status(200).json({ requests, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Approve user's cancellation request and remove scheduled deletion. */
export async function approveDeletionCancellation(req: Request, res: Response, next: NextFunction) {
    try {
        const profileId = String((req.params as { profileId?: string }).profileId ?? "");
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            res.status(400).json({ message: "Invalid profile id" });
            return;
        }
        const _id = new mongoose.Types.ObjectId(profileId);
        const request = await AdminProfileDeletionRequest.findOne({ profile: _id });
        if (!request) {
            res.status(404).json({ message: "No scheduled deletion found" });
            return;
        }
        await AdminProfileDeletionRequest.deleteOne({ profile: _id });
        await setDeletionNotificationState(
            _id,
            "accepted",
            "Your account deletion cancellation request was accepted. Scheduled deletion has been canceled."
        );
        res.status(200).json({ cancelled: true });
        emitAdminDataChanged(["profiles"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Reject user's cancellation request and keep scheduled deletion. */
export async function rejectDeletionCancellation(req: Request, res: Response, next: NextFunction) {
    try {
        const profileId = String((req.params as { profileId?: string }).profileId ?? "");
        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            res.status(400).json({ message: "Invalid profile id" });
            return;
        }
        const _id = new mongoose.Types.ObjectId(profileId);
        const request = await AdminProfileDeletionRequest.findOne({ profile: _id });
        if (!request) {
            res.status(404).json({ message: "No scheduled deletion found" });
            return;
        }
        request.cancellationRequested = false;
        request.cancellationReason = "";
        request.cancellationRequestedAt = undefined;
        await request.save();
        await setDeletionNotificationState(
            _id,
            "rejected",
            "Your cancellation request was rejected. The scheduled account deletion remains active."
        );
        res.status(200).json({ kept: true });
        emitAdminDataChanged(["profiles"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Lists pending message reports for content moderation. */
export async function listMessageReports(_req: Request, res: Response, next: NextFunction) {
    try {
        const req = _req as Request;
        const { page, limit, skip } = parseReportsPagination(req);
        const status = parseReportStatus(req);
        const category = parseReportCategory(req);
        const filter = buildReportFilter(status, category);
        const [rows, total] = await Promise.all([
            AdminMessageReport.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("message", "content")
                .populate("reportedBy", "name email")
                .lean(),
            AdminMessageReport.countDocuments(filter),
        ]);
        const reports = rows.map((r) => {
            const message = r.message as { _id?: unknown; content?: string } | undefined;
            const reportedBy = r.reportedBy as { name?: string; email?: string } | undefined;
            return {
                id: String(r._id),
                messageId: message?._id ? String(message._id) : "",
                messagePreview: String(message?.content ?? "").slice(0, 280),
                reason: r.reason ?? "",
                category: String((r as { category?: unknown }).category ?? "other"),
                reportedByName: reportedBy?.name ?? "",
                reportedByEmail: reportedBy?.email ?? "",
                createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : "",
                status: r.status ?? "pending",
            };
        });
        res.status(200).json({ reports, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Lists pending user reports for moderation review. */
export async function listUserReports(_req: Request, res: Response, next: NextFunction) {
    try {
        const req = _req as Request;
        const { page, limit, skip } = parseReportsPagination(req);
        const status = parseReportStatus(req);
        const category = parseReportCategory(req);
        const filter = buildReportFilter(status, category);
        const [rows, total] = await Promise.all([
            AdminUserReport.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("profile", "name email")
                .populate("reportedBy", "name email")
                .lean(),
            AdminUserReport.countDocuments(filter),
        ]);
        const reports = rows.map((r) => {
            const profile = r.profile as { _id?: unknown; name?: string; email?: string } | undefined;
            const reportedBy = r.reportedBy as { name?: string; email?: string } | undefined;
            return {
                id: String(r._id),
                profileId: profile?._id ? String(profile._id) : "",
                targetName: profile?.name ?? "",
                targetEmail: profile?.email ?? "",
                reason: r.reason ?? "",
                category: String((r as { category?: unknown }).category ?? "other"),
                reportedByName: reportedBy?.name ?? "",
                reportedByEmail: reportedBy?.email ?? "",
                createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : "",
                status: r.status ?? "pending",
            };
        });
        res.status(200).json({ reports, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Lists pending server reports for moderation review. */
export async function listServerReports(_req: Request, res: Response, next: NextFunction) {
    try {
        const req = _req as Request;
        const { page, limit, skip } = parseReportsPagination(req);
        const status = parseReportStatus(req);
        const category = parseReportCategory(req);
        const filter = buildReportFilter(status, category);
        const [rows, total] = await Promise.all([
            AdminServerReport.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("server", "name inviteCode")
                .populate("reportedBy", "name email")
                .lean(),
            AdminServerReport.countDocuments(filter),
        ]);
        const reports = rows.map((r) => {
            const server = r.server as { _id?: unknown; name?: string; inviteCode?: string } | undefined;
            const reportedBy = r.reportedBy as { name?: string; email?: string } | undefined;
            return {
                id: String(r._id),
                serverId: server?._id ? String(server._id) : "",
                serverName: server?.name ?? "",
                inviteCode: server?.inviteCode ?? "",
                reason: r.reason ?? "",
                category: String((r as { category?: unknown }).category ?? "other"),
                reportedByName: reportedBy?.name ?? "",
                reportedByEmail: reportedBy?.email ?? "",
                createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : "",
                status: r.status ?? "pending",
            };
        });
        res.status(200).json({ reports, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function resolveMessageReport(req: Request, res: Response, next: NextFunction) {
    try {
        const reportId = String((req.params as { reportId?: string }).reportId ?? "");
        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            res.status(400).json({ message: "Invalid report id" });
            return;
        }
        const report = await AdminMessageReport.findById(reportId);
        if (!report) {
            res.status(404).json({ message: "Message report not found" });
            return;
        }
        report.status = "resolved";
        report.reviewedAt = new Date();
        report.reviewedBy = mongoose.Types.ObjectId.isValid(String((req as Request & { adminId?: string }).adminId ?? ""))
            ? new mongoose.Types.ObjectId(String((req as Request & { adminId?: string }).adminId))
            : undefined;
        await report.save();
        res.status(200).json({ updated: true, status: report.status });
        emitAdminDataChanged(["reports"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function dismissMessageReport(req: Request, res: Response, next: NextFunction) {
    try {
        const reportId = String((req.params as { reportId?: string }).reportId ?? "");
        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            res.status(400).json({ message: "Invalid report id" });
            return;
        }
        const report = await AdminMessageReport.findById(reportId);
        if (!report) {
            res.status(404).json({ message: "Message report not found" });
            return;
        }
        report.status = "dismissed";
        report.reviewedAt = new Date();
        report.reviewedBy = mongoose.Types.ObjectId.isValid(String((req as Request & { adminId?: string }).adminId ?? ""))
            ? new mongoose.Types.ObjectId(String((req as Request & { adminId?: string }).adminId))
            : undefined;
        await report.save();
        res.status(200).json({ updated: true, status: report.status });
        emitAdminDataChanged(["reports"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function resolveUserReport(req: Request, res: Response, next: NextFunction) {
    try {
        const reportId = String((req.params as { reportId?: string }).reportId ?? "");
        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            res.status(400).json({ message: "Invalid report id" });
            return;
        }
        const report = await AdminUserReport.findById(reportId);
        if (!report) {
            res.status(404).json({ message: "User report not found" });
            return;
        }
        report.status = "resolved";
        report.reviewedAt = new Date();
        report.reviewedBy = mongoose.Types.ObjectId.isValid(String((req as Request & { adminId?: string }).adminId ?? ""))
            ? new mongoose.Types.ObjectId(String((req as Request & { adminId?: string }).adminId))
            : undefined;
        await report.save();
        res.status(200).json({ updated: true, status: report.status });
        emitAdminDataChanged(["reports"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function dismissUserReport(req: Request, res: Response, next: NextFunction) {
    try {
        const reportId = String((req.params as { reportId?: string }).reportId ?? "");
        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            res.status(400).json({ message: "Invalid report id" });
            return;
        }
        const report = await AdminUserReport.findById(reportId);
        if (!report) {
            res.status(404).json({ message: "User report not found" });
            return;
        }
        report.status = "dismissed";
        report.reviewedAt = new Date();
        report.reviewedBy = mongoose.Types.ObjectId.isValid(String((req as Request & { adminId?: string }).adminId ?? ""))
            ? new mongoose.Types.ObjectId(String((req as Request & { adminId?: string }).adminId))
            : undefined;
        await report.save();
        res.status(200).json({ updated: true, status: report.status });
        emitAdminDataChanged(["reports"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function resolveServerReport(req: Request, res: Response, next: NextFunction) {
    try {
        const reportId = String((req.params as { reportId?: string }).reportId ?? "");
        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            res.status(400).json({ message: "Invalid report id" });
            return;
        }
        const report = await AdminServerReport.findById(reportId);
        if (!report) {
            res.status(404).json({ message: "Server report not found" });
            return;
        }
        report.status = "resolved";
        report.reviewedAt = new Date();
        report.reviewedBy = mongoose.Types.ObjectId.isValid(String((req as Request & { adminId?: string }).adminId ?? ""))
            ? new mongoose.Types.ObjectId(String((req as Request & { adminId?: string }).adminId))
            : undefined;
        await report.save();
        res.status(200).json({ updated: true, status: report.status });
        emitAdminDataChanged(["reports"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function dismissServerReport(req: Request, res: Response, next: NextFunction) {
    try {
        const reportId = String((req.params as { reportId?: string }).reportId ?? "");
        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            res.status(400).json({ message: "Invalid report id" });
            return;
        }
        const report = await AdminServerReport.findById(reportId);
        if (!report) {
            res.status(404).json({ message: "Server report not found" });
            return;
        }
        report.status = "dismissed";
        report.reviewedAt = new Date();
        report.reviewedBy = mongoose.Types.ObjectId.isValid(String((req as Request & { adminId?: string }).adminId ?? ""))
            ? new mongoose.Types.ObjectId(String((req as Request & { adminId?: string }).adminId))
            : undefined;
        await report.save();
        res.status(200).json({ updated: true, status: report.status });
        emitAdminDataChanged(["reports"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function getReportQueueSummary(_req: Request, res: Response, next: NextFunction) {
    try {
        const [messagesTotal, usersTotal, serversTotal, statusRows, categoryRows] = await Promise.all([
            AdminMessageReport.countDocuments(),
            AdminUserReport.countDocuments(),
            AdminServerReport.countDocuments(),
            Promise.all([
                AdminMessageReport.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
                AdminUserReport.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
                AdminServerReport.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            ]),
            Promise.all([
                AdminMessageReport.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
                AdminUserReport.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
                AdminServerReport.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
            ]),
        ]);

        const status = new Map<string, number>();
        for (const bucket of statusRows.flat()) status.set(bucket._id, (status.get(bucket._id) ?? 0) + bucket.count);
        const categories = new Map<string, number>();
        for (const bucket of categoryRows.flat()) categories.set(bucket._id, (categories.get(bucket._id) ?? 0) + bucket.count);

        res.status(200).json({
            summary: {
                totals: {
                    messages: messagesTotal,
                    users: usersTotal,
                    servers: serversTotal,
                    all: messagesTotal + usersTotal + serversTotal,
                },
                status: {
                    pending: status.get("pending") ?? 0,
                    resolved: status.get("resolved") ?? 0,
                    dismissed: status.get("dismissed") ?? 0,
                },
                categories: {
                    spam: categories.get("spam") ?? 0,
                    harassment: categories.get("harassment") ?? 0,
                    hate: categories.get("hate") ?? 0,
                    nudity: categories.get("nudity") ?? 0,
                    violence: categories.get("violence") ?? 0,
                    scam: categories.get("scam") ?? 0,
                    other: categories.get("other") ?? 0,
                },
            },
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Lists all direct conversations for admin oversight. */
export async function listConversations(_req: Request, res: Response, next: NextFunction) {
    try {
        const req = _req as Request;
        const { page, limit, skip } = parsePagination(req);
        const [rows, total] = await Promise.all([
            Conversation.find()
                .sort({ lastMessageAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("memberOne", "name username email imageUrl")
                .populate("memberTwo", "name username email imageUrl")
                .populate("lastMessage", "content createdAt deleted")
                .lean(),
            Conversation.countDocuments(),
        ]);
        const conversations = rows.map((c) => {
            const memberOne = c.memberOne as {
                _id?: unknown;
                name?: string;
                username?: string;
                email?: string;
                imageUrl?: string;
            } | undefined;
            const memberTwo = c.memberTwo as {
                _id?: unknown;
                name?: string;
                username?: string;
                email?: string;
                imageUrl?: string;
            } | undefined;
            const lastMessage = c.lastMessage as {
                content?: string;
                createdAt?: Date;
                deleted?: boolean;
            } | undefined;
            return {
                id: String(c._id),
                memberOne: {
                    id: memberOne?._id ? String(memberOne._id) : "",
                    name: memberOne?.name ?? "",
                    username: memberOne?.username ?? "",
                    email: memberOne?.email ?? "",
                    imageUrl: memberOne?.imageUrl ?? "",
                },
                memberTwo: {
                    id: memberTwo?._id ? String(memberTwo._id) : "",
                    name: memberTwo?.name ?? "",
                    username: memberTwo?.username ?? "",
                    email: memberTwo?.email ?? "",
                    imageUrl: memberTwo?.imageUrl ?? "",
                },
                lastMessagePreview: lastMessage?.deleted ? "[deleted]" : String(lastMessage?.content ?? "").slice(0, 120),
                lastMessageAt:
                    c.lastMessageAt instanceof Date
                        ? c.lastMessageAt.toISOString()
                        : lastMessage?.createdAt instanceof Date
                          ? lastMessage.createdAt.toISOString()
                          : "",
                createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : "",
            };
        });
        res.status(200).json({ conversations, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Lists messages in a conversation for admin review. */
export async function listConversationMessages(req: Request, res: Response, next: NextFunction) {
    try {
        const conversationId = String((req.params as { conversationId?: string }).conversationId ?? "");
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            res.status(400).json({ message: "Invalid conversation id" });
            return;
        }
        const { page, limit, skip } = parsePagination(req);
        const [conversation, rows, total] = await Promise.all([
            Conversation.findById(conversationId).select("_id"),
            DirectMessage.find({ conversation: conversationId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("member", "name username email imageUrl")
                .lean(),
            DirectMessage.countDocuments({ conversation: conversationId }),
        ]);
        if (!conversation) {
            res.status(404).json({ message: "Conversation not found" });
            return;
        }
        const messageIds = rows.map((m) => m._id);
        const pendingReports = await AdminMessageReport.aggregate<{ _id: mongoose.Types.ObjectId; count: number; topReason: string }>([
            {
                $match: {
                    status: "pending",
                    message: { $in: messageIds },
                },
            },
            {
                $group: {
                    _id: "$message",
                    count: { $sum: 1 },
                    topReason: { $first: "$reason" },
                },
            },
        ]);
        const reportMap = new Map<string, { count: number; reason: string }>();
        pendingReports.forEach((r) => {
            reportMap.set(String(r._id), { count: r.count, reason: r.topReason ?? "" });
        });

        const messages = rows.map((m) => {
            const member = m.member as {
                _id?: unknown;
                name?: string;
                username?: string;
                email?: string;
                imageUrl?: string;
            } | undefined;
            const report = reportMap.get(String(m._id));
            return {
                id: String(m._id),
                content: m.deleted ? "[deleted]" : m.content ?? "",
                fileUrl: m.deleted ? "" : m.fileUrl ?? "",
                deleted: Boolean(m.deleted),
                reportCount: report?.count ?? 0,
                reportReason: report?.reason ?? "",
                createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : "",
                member: {
                    id: member?._id ? String(member._id) : "",
                    name: member?.name ?? "",
                    username: member?.username ?? "",
                    email: member?.email ?? "",
                    imageUrl: member?.imageUrl ?? "",
                },
            };
        });
        res.status(200).json({ messages, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Soft deletes a direct message as admin moderation action. */
export async function deleteConversationMessageAsAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const conversationId = String((req.params as { conversationId?: string }).conversationId ?? "");
        const messageId = String((req.params as { messageId?: string }).messageId ?? "");
        if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(messageId)) {
            res.status(400).json({ message: "Invalid conversation or message id" });
            return;
        }
        const message = await DirectMessage.findOne({ _id: messageId, conversation: conversationId });
        if (!message) {
            res.status(404).json({ message: "Message not found" });
            return;
        }
        message.deleted = true;
        message.content = "";
        message.fileUrl = "";
        await message.save();
        res.status(200).json({ deleted: true, messageId: String(message._id) });
        emitAdminDataChanged(["chats"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function deleteServerAsAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        await processDueServerDeletionRequests();
        const serverId = String((req.params as { serverId?: string }).serverId ?? "");
        if (!mongoose.Types.ObjectId.isValid(serverId)) {
            res.status(400).json({ message: "Invalid server id" });
            return;
        }
        const _id = new mongoose.Types.ObjectId(serverId);
        const server = await Server.findById(_id).select("_id");
        if (!server) {
            res.status(404).json({ message: "Server not found" });
            return;
        }
        const body = (req.body ?? {}) as { reason?: unknown };
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (reason.length < 5) {
            res.status(400).json({ message: "Deletion reason must be at least 5 characters" });
            return;
        }
        const already = await AdminServerDeletionRequest.findOne({ server: _id }).select("_id executeAt");
        if (already) {
            res.status(409).json({
                message: "Deletion is already scheduled for this server",
                executeAt: already.executeAt instanceof Date ? already.executeAt.toISOString() : undefined,
            });
            return;
        }
        const requestedAt = new Date();
        const executeAt = new Date(Date.now() + SERVER_DELETE_DELAY_HOURS * 60 * 60 * 1000);
        const requestedBy = String((req as Request & { adminId?: string }).adminId ?? "").trim() || undefined;
        await AdminServerDeletionRequest.create({
            server: _id,
            reason,
            requestedBy,
            requestedAt,
            executeAt,
        });
        res.status(202).json({
            scheduled: true,
            reason,
            requestedAt: requestedAt.toISOString(),
            executeAt: executeAt.toISOString(),
            delayHours: SERVER_DELETE_DELAY_HOURS,
        });
        emitAdminDataChanged(["servers", "dashboard"]);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function getServerDetail(req: Request, res: Response, next: NextFunction) {
    try {
        await processDueServerDeletionRequests();
        const serverId = String((req.params as { serverId?: string }).serverId ?? "");
        if (!mongoose.Types.ObjectId.isValid(serverId)) {
            res.status(400).json({ message: "Invalid server id" });
            return;
        }
        const _id = new mongoose.Types.ObjectId(serverId);
        const server = await Server.findById(_id).populate("createdBy", "name email").lean();
        if (!server) {
            res.status(404).json({ message: "Server not found" });
            return;
        }
        const pendingDeletion = await AdminServerDeletionRequest.findOne({ server: _id })
            .select("executeAt reason")
            .lean();
        const adminSet = new Set((server.admins ?? []).map((id) => String(id)));
        const participantIds = (server.participants ?? []).map((id) => new mongoose.Types.ObjectId(String(id)));
        const [memberRows, channels] = await Promise.all([
            Profile.find({ _id: { $in: participantIds } })
                .select("name username email imageUrl role moderationStatus moderationReason suspendedUntil")
                .lean(),
            Channel.find({ server: _id }).sort({ createdAt: -1 }).lean(),
        ]);
        const channelDetails = await Promise.all(
            channels.map(async (c) => {
                const msgs = await Message.find({ channel: c._id })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate("member", "name username email imageUrl")
                    .lean();
                return {
                    id: String(c._id),
                    name: c.name,
                    type: c.type,
                    participantsCount: Array.isArray(c.profile) ? c.profile.length : 0,
                    recentMessages: msgs.map((m) => {
                        const member = m.member as
                            | { _id?: unknown; name?: string; username?: string; email?: string; imageUrl?: string }
                            | undefined;
                        return {
                            id: String(m._id),
                            content: m.deleted ? "[deleted]" : m.content ?? "",
                            createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : "",
                            deleted: Boolean(m.deleted),
                            member: {
                                id: member?._id ? String(member._id) : "",
                                name: member?.name ?? "",
                                username: member?.username ?? "",
                                email: member?.email ?? "",
                                imageUrl: member?.imageUrl ?? "",
                            },
                        };
                    }),
                };
            })
        );
        const createdBy = server.createdBy as { name?: string; email?: string } | undefined;
        const members = memberRows.map((m) => ({
            id: String(m._id),
            name: m.name ?? "",
            username: m.username ?? "",
            email: m.email ?? "",
            imageUrl: m.imageUrl ?? "",
            role: m.role ?? "user",
            moderationStatus: m.moderationStatus ?? "active",
            moderationReason: m.moderationReason ?? "",
            suspendedUntil: m.suspendedUntil instanceof Date ? m.suspendedUntil.toISOString() : "",
            isAdmin: adminSet.has(String(m._id)),
        }));
        res.status(200).json({
            server: {
                id: String(server._id),
                name: server.name,
                inviteCode: server.inviteCode,
                imageUrl: server.imageUrl ?? "",
                participantsCount: Array.isArray(server.participants) ? server.participants.length : 0,
                adminsCount: Array.isArray(server.admins) ? server.admins.length : 0,
                createdByName: createdBy?.name ?? "",
                createdByEmail: createdBy?.email ?? "",
                createdAt: server.createdAt instanceof Date ? server.createdAt.toISOString() : "",
                pendingDeletionAt: pendingDeletion?.executeAt instanceof Date ? pendingDeletion.executeAt.toISOString() : "",
                pendingDeletionReason: pendingDeletion?.reason ?? "",
                members,
                channels: channelDetails,
            },
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function listChannelMessagesAsAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const channelId = String((req.params as { channelId?: string }).channelId ?? "");
        if (!mongoose.Types.ObjectId.isValid(channelId)) {
            res.status(400).json({ message: "Invalid channel id" });
            return;
        }
        const { page, limit, skip } = parsePagination(req);
        const [channel, rows, total] = await Promise.all([
            Channel.findById(channelId).select("_id"),
            Message.find({ channel: channelId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("member", "name username email imageUrl")
                .lean(),
            Message.countDocuments({ channel: channelId }),
        ]);
        if (!channel) {
            res.status(404).json({ message: "Channel not found" });
            return;
        }
        const messageIds = rows.map((m) => m._id);
        const pendingReports = await AdminMessageReport.aggregate<{ _id: mongoose.Types.ObjectId; count: number; topReason: string }>([
            {
                $match: {
                    status: "pending",
                    message: { $in: messageIds },
                },
            },
            {
                $group: {
                    _id: "$message",
                    count: { $sum: 1 },
                    topReason: { $first: "$reason" },
                },
            },
        ]);
        const reportMap = new Map<string, { count: number; reason: string }>();
        pendingReports.forEach((r) => reportMap.set(String(r._id), { count: r.count, reason: r.topReason ?? "" }));

        const messages = rows.map((m) => {
            const member = m.member as
                | { _id?: unknown; name?: string; username?: string; email?: string; imageUrl?: string }
                | undefined;
            const report = reportMap.get(String(m._id));
            return {
                id: String(m._id),
                content: m.deleted ? "[deleted]" : m.content ?? "",
                fileUrl: m.deleted ? "" : m.fileUrl ?? "",
                deleted: Boolean(m.deleted),
                createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : "",
                reportCount: report?.count ?? 0,
                reportReason: report?.reason ?? "",
                member: {
                    id: member?._id ? String(member._id) : "",
                    name: member?.name ?? "",
                    username: member?.username ?? "",
                    email: member?.email ?? "",
                    imageUrl: member?.imageUrl ?? "",
                },
            };
        });
        res.status(200).json({ messages, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Lists all servers for admin overview. */
export async function listServers(_req: Request, res: Response, next: NextFunction) {
    try {
        await processDueServerDeletionRequests();
        const req = _req as Request;
        const q = String((req.query as { q?: string }).q ?? "").trim();
        const { page, limit, skip } = parsePagination(req);
        const filter: Record<string, unknown> = {};
        if (q) {
            const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ name: regex }, { inviteCode: regex }];
        }
        const [rows, total] = await Promise.all([
            Server.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("createdBy", "name email")
                .lean(),
            Server.countDocuments(filter),
        ]);
        const rowIds = rows.map((s) => s._id);
        const pendingRows = await AdminServerDeletionRequest.find({ server: { $in: rowIds } })
            .select("server executeAt")
            .lean();
        const pendingMap = new Map<string, string>();
        for (const p of pendingRows) {
            pendingMap.set(String(p.server), p.executeAt instanceof Date ? p.executeAt.toISOString() : "");
        }
        const servers = rows.map((s) => {
            const createdBy = s.createdBy as { name?: string; email?: string } | undefined;
            return {
                id: String(s._id),
                name: s.name,
                inviteCode: s.inviteCode,
                imageUrl: s.imageUrl ?? "",
                participantsCount: Array.isArray(s.participants) ? s.participants.length : 0,
                adminsCount: Array.isArray(s.admins) ? s.admins.length : 0,
                createdByName: createdBy?.name ?? "",
                createdByEmail: createdBy?.email ?? "",
                createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : undefined,
                pendingDeletionAt: pendingMap.get(String(s._id)) ?? "",
            };
        });
        res.status(200).json({ servers, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Returns chronological news logs for new accounts and servers. */
export async function listNews(_req: Request, res: Response, next: NextFunction) {
    try {
        const req = _req as Request;
        const { page, limit, skip } = parsePagination(req);
        const sampleSize = skip + limit;
        const [profiles, servers] = await Promise.all([
            Profile.find({})
                .sort({ createdAt: -1 })
                .limit(sampleSize)
                .select("_id name username email createdAt")
                .lean(),
            Server.find({})
                .sort({ createdAt: -1 })
                .limit(sampleSize)
                .select("_id name inviteCode createdAt")
                .lean(),
        ]);

        const news = new Array<AdminNewsItem>();
        profiles.forEach((profile) => {
            const name = profile.name || profile.username || "Unknown account";
            news.push({
                id: String(profile._id),
                type: "profile_created",
                title: `New account: ${name}`,
                subtitle: profile.email || "",
                createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : "",
            });
        });
        servers.forEach((server) => {
            news.push({
                id: String(server._id),
                type: "server_created",
                title: `New server: ${server.name || "Untitled server"}`,
                subtitle: server.inviteCode ? `Invite: ${server.inviteCode}` : "",
                createdAt: server.createdAt instanceof Date ? server.createdAt.toISOString() : "",
            });
        });

        news.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const paged = news.slice(skip, skip + limit);
        const total = await Promise.all([Profile.countDocuments(), Server.countDocuments()]).then(
            ([profileCount, serverCount]) => profileCount + serverCount
        );
        res.status(200).json({ news: paged, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Returns lightweight platform stats for admin dashboard cards. */
export async function getDashboardStats(_req: Request, res: Response, next: NextFunction) {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [profiles, servers, channels, channelMessages, conversations, directMessages] =
            await Promise.all([
                Profile.countDocuments(),
                Server.countDocuments(),
                Channel.countDocuments(),
                Message.countDocuments(),
                Conversation.countDocuments(),
                DirectMessage.countDocuments(),
            ]);
        const [activeChannelMembers, activeDirectMembers] = await Promise.all([
            Message.distinct("member", { createdAt: { $gte: last24h } }),
            DirectMessage.distinct("member", { createdAt: { $gte: last24h } }),
        ]);
        const dailyActiveUsers = new Set<string>([
            ...activeChannelMembers.map((id: unknown) => String(id)),
            ...activeDirectMembers.map((id: unknown) => String(id)),
        ]).size;
        res.status(200).json({
            stats: {
                profiles,
                servers,
                channels,
                conversations,
                messages: channelMessages + directMessages,
                dailyActiveUsers,
            },
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

/** Returns time-series for dashboard charts (UTC buckets). */
export async function getDashboardInsights(_req: Request, res: Response, next: NextFunction) {
    try {
        const hourKeys = getLastUtcHours(HOURS_WINDOW);
        const dayKeys = getLastUtcDays(DAYS_WINDOW);
        const hoursAgo = new Date(Date.now() - HOURS_WINDOW * 60 * 60 * 1000);
        const daysAgo = new Date(Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

        const [channelHourly, directHourly, serversDaily, profilesDaily] = await Promise.all([
            Message.aggregate<CountPoint>([
                { $match: { createdAt: { $gte: hoursAgo } } },
                {
                    $group: {
                        _id: {
                            y: { $year: "$createdAt" },
                            m: { $month: "$createdAt" },
                            d: { $dayOfMonth: "$createdAt" },
                            h: { $hour: "$createdAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        key: {
                            $concat: [
                                { $toString: "$_id.y" },
                                "-",
                                { $cond: [{ $lt: ["$_id.m", 10] }, { $concat: ["0", { $toString: "$_id.m" }] }, { $toString: "$_id.m" }] },
                                "-",
                                { $cond: [{ $lt: ["$_id.d", 10] }, { $concat: ["0", { $toString: "$_id.d" }] }, { $toString: "$_id.d" }] },
                                " ",
                                { $cond: [{ $lt: ["$_id.h", 10] }, { $concat: ["0", { $toString: "$_id.h" }] }, { $toString: "$_id.h" }] },
                            ],
                        },
                        count: 1,
                    },
                },
            ]),
            DirectMessage.aggregate<CountPoint>([
                { $match: { createdAt: { $gte: hoursAgo } } },
                {
                    $group: {
                        _id: {
                            y: { $year: "$createdAt" },
                            m: { $month: "$createdAt" },
                            d: { $dayOfMonth: "$createdAt" },
                            h: { $hour: "$createdAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        key: {
                            $concat: [
                                { $toString: "$_id.y" },
                                "-",
                                { $cond: [{ $lt: ["$_id.m", 10] }, { $concat: ["0", { $toString: "$_id.m" }] }, { $toString: "$_id.m" }] },
                                "-",
                                { $cond: [{ $lt: ["$_id.d", 10] }, { $concat: ["0", { $toString: "$_id.d" }] }, { $toString: "$_id.d" }] },
                                " ",
                                { $cond: [{ $lt: ["$_id.h", 10] }, { $concat: ["0", { $toString: "$_id.h" }] }, { $toString: "$_id.h" }] },
                            ],
                        },
                        count: 1,
                    },
                },
            ]),
            Server.aggregate<CountPoint>([
                { $match: { createdAt: { $gte: daysAgo } } },
                {
                    $group: {
                        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" }, d: { $dayOfMonth: "$createdAt" } },
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        key: {
                            $concat: [
                                { $toString: "$_id.y" },
                                "-",
                                { $cond: [{ $lt: ["$_id.m", 10] }, { $concat: ["0", { $toString: "$_id.m" }] }, { $toString: "$_id.m" }] },
                                "-",
                                { $cond: [{ $lt: ["$_id.d", 10] }, { $concat: ["0", { $toString: "$_id.d" }] }, { $toString: "$_id.d" }] },
                            ],
                        },
                        count: 1,
                    },
                },
            ]),
            Profile.aggregate<CountPoint>([
                { $match: { createdAt: { $gte: daysAgo } } },
                {
                    $group: {
                        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" }, d: { $dayOfMonth: "$createdAt" } },
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        key: {
                            $concat: [
                                { $toString: "$_id.y" },
                                "-",
                                { $cond: [{ $lt: ["$_id.m", 10] }, { $concat: ["0", { $toString: "$_id.m" }] }, { $toString: "$_id.m" }] },
                                "-",
                                { $cond: [{ $lt: ["$_id.d", 10] }, { $concat: ["0", { $toString: "$_id.d" }] }, { $toString: "$_id.d" }] },
                            ],
                        },
                        count: 1,
                    },
                },
            ]),
        ]);

        const combinedHourly = new Map<string, number>();
        for (const p of channelHourly) combinedHourly.set(p.key, (combinedHourly.get(p.key) ?? 0) + p.count);
        for (const p of directHourly) combinedHourly.set(p.key, (combinedHourly.get(p.key) ?? 0) + p.count);
        const messagesPerHour = hourKeys.map((k) => ({ label: k.slice(11), count: combinedHourly.get(k) ?? 0 }));
        const serversPerDay = toSeries(dayKeys, serversDaily).map((p) => ({ label: p.label.slice(5), count: p.count }));
        const profilesPerDay = toSeries(dayKeys, profilesDaily).map((p) => ({ label: p.label.slice(5), count: p.count }));

        res.status(200).json({
            insights: {
                messagesPerHour,
                serversPerDay,
                profilesPerDay,
            },
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}
