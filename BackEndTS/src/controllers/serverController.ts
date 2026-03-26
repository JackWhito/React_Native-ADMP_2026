import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { Profile } from "../models/Profile";
import { Server } from "../models/Server";
import { Channel } from "../models/Channel";
import mongoose from "mongoose";

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

    const participantIds = [profile._id];

    const [textChannel, audioChannel] = await Channel.create([
      {
        name: "general",
        type: "text",
        server: server._id,
        profile: participantIds,
      },
      {
        name: "General",
        type: "audio",
        server: server._id,
        profile: participantIds,
      },
    ]);

    const serverObj = server.toObject();
    res.status(201).json({
      ...serverObj,
      channels: [textChannel.toObject(), audioChannel.toObject()],
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

const channelTypeOrder = (t: string) => (t === "text" ? 0 : t === "audio" ? 1 : 2);

export async function getServerChannels(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const channels = await Channel.find({ server: serverId }).lean();
    channels.sort(
      (a, b) =>
        channelTypeOrder(String(a.type)) - channelTypeOrder(String(b.type)) ||
        String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" })
    );
    res.status(200).json(channels);
  } catch (error) {
    res.status(500);
    next(error);
  }
}