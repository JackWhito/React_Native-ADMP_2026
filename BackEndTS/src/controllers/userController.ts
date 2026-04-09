import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";
import { Profile } from "../models/Profile";
import { Conversation } from "../models/Conversation";
import { usernameFromLinkOrCode } from "../utils/username";

async function createFriendConversation(userOne: string, userTwo: string) {
  return Conversation.findOneAndUpdate(
    {
      $or: [
        { memberOne: userOne, memberTwo: userTwo },
        { memberOne: userTwo, memberTwo: userOne },
      ],
    },
    {
      $setOnInsert: {
        memberOne: userOne,
        memberTwo: userTwo,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
    }
  );
}

export async function searchProfilesByName(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const q = String((req.query as { q?: string }).q ?? "").trim();
  try {
    if (!q) return res.status(200).json([]);
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const rows = await Profile.find({
      _id: { $ne: new mongoose.Types.ObjectId(userId) },
      $or: [{ name: regex }, { username: regex }],
    })
      .select("_id name username imageUrl")
      .limit(20)
      .lean();

    return res.status(200).json(rows);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function getFriendInviteLink(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  try {
    const me = await Profile.findById(userId).select("username");
    if (!me?.username) {
      return res.status(400).json({ error: "Username is missing. Please re-login." });
    }
    const code = me.username;
    const link = `discord://friend/${code}`;
    return res.status(200).json({ code, link });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function addFriendByUsername(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const raw = String((req.body as { username?: string })?.username ?? "").trim();
  try {
    if (!raw) return res.status(400).json({ error: "Username is required" });
    const username = raw.toLowerCase();
    const other = await Profile.findOne({ username }).select("_id name username imageUrl");
    if (!other) return res.status(404).json({ error: "User not found" });
    if (String(other._id) === String(userId)) {
      return res.status(400).json({ error: "Cannot add yourself" });
    }
    const conversation = await createFriendConversation(String(userId), String(other._id));
    return res.status(200).json({ profile: other, conversationId: String(conversation?._id) });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function addFriendByLink(req: AuthRequest, res: Response, next: NextFunction) {
  const raw = String((req.body as { linkOrCode?: string })?.linkOrCode ?? "");
  const username = usernameFromLinkOrCode(raw).toLowerCase();
  (req.body as any).username = username;
  return addFriendByUsername(req, res, next);
}
