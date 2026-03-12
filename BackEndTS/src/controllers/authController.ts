import type { AuthRequest } from "../middleware/auth";
import type { NextFunction, Response } from 'express';
import { Profile } from "../models/Profile";
import { clerkClient, getAuth } from "@clerk/express";


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

        let profile = await Profile.findOne({
            clerkId
        });
        if (!profile) {
            const clerkUser = await clerkClient.users.getUser(clerkId);
            const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
            if (!primaryEmail) {
                res.status(400).json({ message: 'User email is required' });
                return;
            }
            profile = await Profile.create({
                clerkId,
                name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() 
                : primaryEmail.split('@')[0],
                email: primaryEmail,
                imageUrl: clerkUser.imageUrl
            });        }
        res.status(200).json(profile);
    } catch (error) {
        res.status(500);
        next(error);
    }
}