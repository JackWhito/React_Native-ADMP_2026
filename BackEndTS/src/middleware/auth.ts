import type { Request, Response, NextFunction } from "express";
import { getAuth, requireAuth } from "@clerk/express";
import { Profile } from "../models/Profile";
import { getCachedAuthProfile, setCachedAuthProfile, type CachedAuthProfile } from "../utils/profileAuthCache";
import { verifyAppToken } from "../utils/appJwt";

export type AuthRequest = Request & {
    profileId?: string;
    shadowBanned?: boolean;
    isLocalAppAuth?: boolean;
};

/**
 * If `Authorization: Bearer` is a valid app (email) JWT, attach `profileId` and continue.
 * Otherwise passes through so Clerk can validate the same header.
 */
async function tryAppJwt(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        next();
        return;
    }
    const raw = header.slice(7).trim();
    if (!raw) {
        next();
        return;
    }

    let payload: { sub?: string; v?: number };
    try {
        payload = (await verifyAppToken(raw)) as { sub?: string; v?: number };
    } catch {
        next();
        return;
    }

    const sub = payload.sub;
    if (!sub) {
        next();
        return;
    }

    const lean = await Profile.findById(sub)
        .select("_id authProvider clerkId moderationStatus suspendedUntil forceLogoutAfter sessionVersion")
        .lean();

    if (!lean) {
        res.status(401).json({ message: "Invalid session" });
        return;
    }
    if (String(lean.authProvider ?? "clerk") !== "email") {
        res.status(401).json({ message: "Invalid session" });
        return;
    }
    if (typeof payload.v === "number" && payload.v !== (lean.sessionVersion ?? 1)) {
        res.status(401).json({ message: "Session expired. Please sign in again." });
        return;
    }

    if (lean.moderationStatus === "banned") {
        res.status(403).json({ message: "Account is banned" });
        return;
    }
    if (
        lean.moderationStatus === "suspended" &&
        lean.suspendedUntil instanceof Date &&
        lean.suspendedUntil.getTime() > Date.now()
    ) {
        res.status(403).json({
            message: `Account is suspended until ${lean.suspendedUntil.toISOString()}`,
        });
        return;
    }
    if (lean.moderationStatus === "shadow_banned") {
        req.shadowBanned = true;
    }

    req.profileId = String(lean._id);
    req.isLocalAppAuth = true;
    next();
}

function attachClerkProfile(req: AuthRequest, res: Response, next: NextFunction): void {
    if (req.profileId) {
        next();
        return;
    }
    (requireAuth() as (a: Request, b: Response, c: NextFunction) => void)(req, res, (err) => {
        if (err) {
            next(err);
            return;
        }
        void (async () => {
            try {
                const auth = getAuth(req);
                const clerkId = auth.userId;
                if (!clerkId) {
                    res.status(401).json({ message: "Unauthorized" });
                    return;
                }

                let profile: CachedAuthProfile | null = getCachedAuthProfile(clerkId);
                if (!profile) {
                    const lean = await Profile.findOne({ clerkId })
                        .select("_id clerkId moderationStatus suspendedUntil forceLogoutAfter")
                        .lean();
                    if (!lean) {
                        res.status(404).json({ message: "Profile not found" });
                        return;
                    }
                    profile = {
                        _id: lean._id as CachedAuthProfile["_id"],
                        clerkId: String(lean.clerkId),
                        moderationStatus: (lean.moderationStatus ?? "active") as CachedAuthProfile["moderationStatus"],
                        suspendedUntil: lean.suspendedUntil ?? null,
                        forceLogoutAfter: lean.forceLogoutAfter ?? null,
                    };
                    setCachedAuthProfile(clerkId, profile);
                }

                if (profile.moderationStatus === "banned") {
                    res.status(403).json({ message: "Account is banned" });
                    return;
                }
                if (
                    profile.moderationStatus === "suspended" &&
                    profile.suspendedUntil instanceof Date &&
                    profile.suspendedUntil.getTime() > Date.now()
                ) {
                    res.status(403).json({
                        message: `Account is suspended until ${profile.suspendedUntil.toISOString()}`,
                    });
                    return;
                }
                if (profile.moderationStatus === "shadow_banned") {
                    req.shadowBanned = true;
                }
                const forceLogoutAfter = profile.forceLogoutAfter;
                const authClaims = (auth as unknown as { sessionClaims?: { iat?: number } }).sessionClaims;
                const iat = authClaims?.iat;
                if (forceLogoutAfter instanceof Date && typeof iat === "number") {
                    const sessionIssuedAtMs = iat * 1000;
                    if (sessionIssuedAtMs < forceLogoutAfter.getTime()) {
                        res.status(401).json({ message: "Session invalidated by admin. Please sign in again." });
                        return;
                    }
                }
                req.profileId = String(profile._id);
                next();
            } catch (error) {
                next(error);
            }
        })();
    });
}

export const protectRoute = [tryAppJwt, attachClerkProfile];
