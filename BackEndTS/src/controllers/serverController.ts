import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { Profile } from "../models/Profile";
import { Server } from "../models/Server";

function generateInviteCode(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

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

export async function createServer(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  try {
    const { name, imageUrl } = (req.body ?? {}) as { name?: string; imageUrl?: string };
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Server name is required" });
    }

    const profile = await Profile.findById(userId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // ensure inviteCode uniqueness with a few retries
    let inviteCode = generateInviteCode();
    let unique = false;
    for (let i = 0; i < 5; i++) {
      if (!(await Server.exists({ inviteCode }))) {
        unique = true;
        break;
      }
      inviteCode = generateInviteCode();
    }
    if (!unique) {
      return res.status(500).json({ error: "Failed to generate unique invite code" });
    }
    const server = await Server.create({
      name: name.trim(),
      imageUrl: typeof imageUrl === "string" ? imageUrl : "",
      inviteCode,
      participants: [profile._id],
    });

    res.status(201).json(server);
  } catch (error) {
    res.status(500);
    next(error);
  }
}