import type { AuthRequest } from "../middleware/auth";
import type { NextFunction, Response } from 'express';

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const {chatId} = req.params;

        
    } catch (error) {
        res.status(500);
        next(error);
    }
}