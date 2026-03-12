import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { Profile } from "../models/Profile";
import { Server } from "../models/Server";

export async function getServer(req: AuthRequest, res: Response, next: NextFunction) {
    const userId = req.profileId
    try {
    const server = await Server.findOne({participants: userId})
    if(!server) {
        res.status(404).json({ message: 'Server not found' });
        return;
    }
    res.status(200).json(server);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function getServers(req: AuthRequest, res: Response, next: NextFunction) {
    const userId = req.profileId
    try {
    const servers = await Server.find({participants: userId})
    res.status(200).json(servers);
    } catch (error) {
        res.status(500);
        next(error);
    }
}