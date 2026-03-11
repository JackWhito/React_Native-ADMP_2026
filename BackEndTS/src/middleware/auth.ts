import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { Profile } from '../models/Profile';
import { requireAuth } from '@clerk/express';

export type AuthRequest = Request & {
    profileId?: string;
};

export const protectRoute = [
    requireAuth(),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { userId: clerkId } = getAuth(req);
            if (!clerkId) {
                return res.status(401).json({ message: 'Unauthorized - invalid token' });
            }
            const profile = await Profile.findOne({ clerkId });
            if(!profile) return res.status(404).json({ message: 'Profile not found' });
            req.profileId = profile._id.toString();
            next();
        } catch (error) {
            console.error('Error in protectRoute middleware:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
];