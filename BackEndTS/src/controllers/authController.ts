import type { AuthRequest } from "../middleware/auth";
import type { NextFunction, Response } from 'express';
import { Profile } from "../models/Profile";
import { clerkClient, getAuth } from "@clerk/express";
import { generateUniqueUsername } from "../utils/username";
import { emitAdminDataChanged } from "../utils/socket";


export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const user = await Profile.findById(userId)
        if (!user) {
            res.status(404).json({ message: 'Profile not found' });
            return;
        }
        res.status(200).json(user)

    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function  authCallback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const {userId: clerkId} = getAuth(req);

        if(!clerkId) {
            res.status(401).json({ message: 'Unauthorized - invalid token' });
            return;
        }

        const clerkUser = await clerkClient.users.getUser(clerkId);
        let profile = await Profile.findOne({
            clerkId
        });
        if (!profile) {
            const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
            if (!primaryEmail) {
                res.status(400).json({ message: 'User email is required' });
                return;
            }
            const preferredSeed =
              (clerkUser.username || clerkUser.firstName || primaryEmail.split("@")[0] || "").trim();
            const username = await generateUniqueUsername(preferredSeed);
            profile = await Profile.create({
                clerkId,
                name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() 
                : primaryEmail.split('@')[0],
                username,
                bio: "",
                email: primaryEmail,
                imageUrl: clerkUser.imageUrl
            });
            emitAdminDataChanged(["profiles", "dashboard", "news"]);
        } else {
            let shouldSave = false;
            const latestImageUrl = String(clerkUser.imageUrl ?? "");
            const latestEmail = String(clerkUser.emailAddresses[0]?.emailAddress ?? "").trim().toLowerCase();

            if (profile.imageUrl !== latestImageUrl) {
                profile.imageUrl = latestImageUrl;
                shouldSave = true;
            }
            if (latestEmail && profile.email?.toLowerCase?.() !== latestEmail) {
                profile.email = latestEmail;
                shouldSave = true;
            }
            if (!profile.username) {
                const fallbackSeed = profile.email?.split("@")[0] || profile.name || "user";
                profile.username = await generateUniqueUsername(fallbackSeed);
                shouldSave = true;
            }
            if (shouldSave) {
                await profile.save();
            }
        }

        res.status(200).json(profile);
    } catch (error) {
        res.status(500);
        next(error);
    }
}