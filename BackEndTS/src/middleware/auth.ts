import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { Profile } from '../models/Profile';
import { requireAuth } from '@clerk/express';

export type AuthRequest = Request & {
    profileId?: string;
    shadowBanned?: boolean;
};

export const protectRoute = [
    requireAuth(),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const auth = getAuth(req);
            const clerkId = auth.userId;
            const profile = await Profile.findOne({ clerkId });
            if(!profile) return res.status(404).json({ message: 'Profile not found' });

            if (profile.moderationStatus === "banned") {
                return res.status(403).json({ message: "Account is banned" });
            }
            if (
                profile.moderationStatus === "suspended" &&
                profile.suspendedUntil instanceof Date &&
                profile.suspendedUntil.getTime() > Date.now()
            ) {
                return res.status(403).json({
                    message: `Account is suspended until ${profile.suspendedUntil.toISOString()}`,
                });
            }
            if (profile.moderationStatus === "shadow_banned") {
                req.shadowBanned = true;
            }
            const forceLogoutAfter = profile.forceLogoutAfter;
            const claims = (auth as unknown as { sessionClaims?: { iat?: number } }).sessionClaims;
            const iat = claims?.iat;
            if (forceLogoutAfter instanceof Date && typeof iat === "number") {
                const sessionIssuedAtMs = iat * 1000;
                if (sessionIssuedAtMs < forceLogoutAfter.getTime()) {
                    return res.status(401).json({ message: "Session invalidated by admin. Please sign in again." });
                }
            }
            req.profileId = profile._id.toString();
            next();
        } catch (error) {
            res.status(500);
            next(error);
        }
    }
];