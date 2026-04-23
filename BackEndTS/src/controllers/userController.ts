import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";
import { clerkClient } from "@clerk/express";
import { Profile } from "../models/Profile";
import { Conversation } from "../models/Conversation";
import { Server } from "../models/Server";
import { Channel } from "../models/Channel";
import { ChannelCategory } from "../models/ChannelCategory";
import { Notification } from "../models/Notification";
import { Message } from "../models/Message";
import { DirectMessage } from "../models/DirectMessage";
import { AdminUserReport, type AdminUserReportCategory } from "../models/AdminUserReport";
import { usernameFromLinkOrCode } from "../utils/username";
import { emitAdminDataChanged, getSocketServer } from "../utils/socket";

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
    if (req.shadowBanned) return res.status(200).json([]);
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
    if (req.shadowBanned) {
      return res.status(200).json({ code: "restricted", link: "discord://friend/restricted" });
    }
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
    if (req.shadowBanned) {
      return res.status(200).json({
        invited: true,
        recipientId: "",
        recipientName: "Unknown",
      });
    }
    if (!raw) return res.status(400).json({ error: "Username is required" });
    const username = raw.toLowerCase();
    const other = await Profile.findOne({ username }).select("_id name username imageUrl");
    if (!other) return res.status(404).json({ error: "User not found" });
    if (String(other._id) === String(userId)) {
      return res.status(400).json({ error: "Cannot add yourself" });
    }
    const existingConversation = await Conversation.findOne({
      $or: [
        { memberOne: userId, memberTwo: other._id },
        { memberOne: other._id, memberTwo: userId },
      ],
    }).select("_id");
    if (existingConversation) {
      return res.status(409).json({ error: "You are already friends" });
    }

    const existingPendingInvite = await Notification.findOne({
      type: "friend_invite",
      status: "pending",
      $or: [
        { sender: userId, recipient: other._id },
        { sender: other._id, recipient: userId },
      ],
    }).select("_id sender recipient");
    if (existingPendingInvite) {
      const isMine = String((existingPendingInvite as any).sender) === String(userId);
      return res.status(409).json({
        error: isMine
          ? "Friend invite is already pending"
          : "This user has already sent you a friend invite",
      });
    }

    const me = await Profile.findById(userId).select("name username imageUrl");
    const created = await Notification.create({
      type: "friend_invite",
      status: "pending",
      isRead: false,
      sender: userId,
      recipient: other._id,
      message: `${me?.name || "Someone"} sent you a friend invite`,
    });

    const io = getSocketServer();
    io?.to(`user:${String(other._id)}`).emit("notification-created", {
      _id: String(created._id),
      type: "friend_invite",
      status: "pending",
      isRead: false,
      readAt: null,
      message: created.message,
      createdAt: created.createdAt,
      sender: {
        _id: String(me?._id ?? userId),
        name: String(me?.name ?? "Unknown"),
        username: String(me?.username ?? ""),
        imageUrl: String(me?.imageUrl ?? ""),
      },
    });

    return res.status(200).json({
      invited: true,
      recipientId: String(other._id),
      recipientName: other.name,
    });
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

export async function getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  try {
    const me = await Profile.findById(userId).select("_id clerkId name username bio imageUrl email createdAt");
    if (!me) return res.status(404).json({ error: "Profile not found" });
    return res.status(200).json(me);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function getSharedServersWithProfile(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const profileId = String((req.params as { profileId?: string })?.profileId ?? "").trim();
  try {
    if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ error: "Invalid profile id" });
    }
    if (String(profileId) === String(userId)) {
      return res.status(200).json({ servers: [] });
    }

    const servers = await Server.find({
      participants: {
        $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(profileId)],
      },
    })
      .select("_id name imageUrl")
      .sort({ updatedAt: -1 })
      .limit(3)
      .lean();

    return res.status(200).json({
      servers: servers.map((server: any) => ({
        _id: String(server._id),
        name: String(server.name ?? ""),
        imageUrl: String(server.imageUrl ?? ""),
      })),
      total: servers.length,
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function reportUserProfile(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const profileId = String((req.params as { profileId?: string })?.profileId ?? "").trim();
  const { reason, category, details } = (req.body ?? {}) as {
    reason?: string;
    category?: AdminUserReportCategory;
    details?: string;
  };
  try {
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ error: "Invalid profile id" });
    }
    if (String(profileId) === String(userId)) {
      return res.status(400).json({ error: "You cannot report yourself" });
    }

    const targetProfile = await Profile.findById(profileId).select("_id");
    if (!targetProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const normalizedCategory = String(category ?? "other").trim().toLowerCase();
    const allowedCategories: AdminUserReportCategory[] = [
      "spam",
      "harassment",
      "hate",
      "nudity",
      "violence",
      "scam",
      "other",
    ];
    if (!allowedCategories.includes(normalizedCategory as AdminUserReportCategory)) {
      return res.status(400).json({ error: "Invalid report category" });
    }

    const normalizedReason = String(reason ?? "User violates community guidelines").trim();
    if (!normalizedReason) {
      return res.status(400).json({ error: "Report reason is required" });
    }
    if (normalizedReason.length > 300) {
      return res.status(400).json({ error: "Report reason must be 300 characters or less" });
    }

    const normalizedDetails = String(details ?? "").trim();
    if (normalizedDetails.length > 1000) {
      return res.status(400).json({ error: "Report details must be 1000 characters or less" });
    }

    const existingPending = await AdminUserReport.findOne({
      profile: profileId,
      reportedBy: userId,
      reason: normalizedReason,
      status: "pending",
    }).select("_id");
    if (existingPending?._id) {
      return res.status(200).json({
        reported: true,
        duplicate: true,
        reportId: String(existingPending._id),
      });
    }

    const created = await AdminUserReport.create({
      profile: profileId,
      reportedBy: userId,
      reason: normalizedReason,
      category: normalizedCategory as AdminUserReportCategory,
      details: normalizedDetails,
    });

    emitAdminDataChanged(["reports", "dashboard"]);
    return res.status(201).json({
      reported: true,
      reportId: String(created._id),
      status: created.status,
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function blockUserProfile(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const profileId = String((req.params as { profileId?: string })?.profileId ?? "").trim();
  try {
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ error: "Invalid profile id" });
    }
    if (String(profileId) === String(userId)) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    const [me, target] = await Promise.all([
      Profile.findById(userId).select("_id blockedProfiles"),
      Profile.findById(profileId).select("_id"),
    ]);
    if (!me) return res.status(404).json({ error: "Profile not found" });
    if (!target) return res.status(404).json({ error: "Target user not found" });

    const alreadyBlocked = (me.blockedProfiles ?? []).some((id) => String(id) === String(profileId));
    if (alreadyBlocked) {
      return res.status(200).json({ blocked: true, alreadyBlocked: true, profileId });
    }

    me.blockedProfiles = [...(me.blockedProfiles ?? []), new mongoose.Types.ObjectId(profileId)];
    await me.save();

    await Notification.deleteMany({
      type: "friend_invite",
      status: "pending",
      $or: [
        { sender: userId, recipient: profileId },
        { sender: profileId, recipient: userId },
      ],
    });

    return res.status(200).json({ blocked: true, profileId });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function updateMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const { name, bio } = (req.body ?? {}) as { name?: string; bio?: string };
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedBio = typeof bio === "string" ? bio.trim() : "";
  try {
    if (!normalizedName) return res.status(400).json({ error: "Name is required" });
    if (normalizedBio.length > 300) {
      return res.status(400).json({ error: "Bio must be 300 characters or less" });
    }

    const me = await Profile.findById(userId);
    if (!me) return res.status(404).json({ error: "Profile not found" });

    me.name = normalizedName;
    me.bio = normalizedBio;
    await me.save();

    return res.status(200).json(me);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function updateAccountSettings(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const { username, name, email } = (req.body ?? {}) as {
    username?: string;
    name?: string;
    email?: string;
  };
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  try {
    if (!normalizedName) return res.status(400).json({ error: "Name is required" });
    if (!normalizedUsername) return res.status(400).json({ error: "Username is required" });
    if (!normalizedEmail) return res.status(400).json({ error: "Email is required" });
    if (!normalizedEmail.includes("@")) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const me = await Profile.findById(userId);
    if (!me) return res.status(404).json({ error: "Profile not found" });

    const usernameTaken = await Profile.findOne({
      _id: { $ne: me._id },
      username: normalizedUsername,
    }).select("_id");
    if (usernameTaken) return res.status(409).json({ error: "Username is already taken" });

    const emailTaken = await Profile.findOne({
      _id: { $ne: me._id },
      email: normalizedEmail,
    }).select("_id");
    if (emailTaken) return res.status(409).json({ error: "Email is already in use" });

    me.name = normalizedName;
    me.username = normalizedUsername;
    me.email = normalizedEmail;
    await me.save();

    return res.status(200).json(me);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function deleteMyAccount(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  try {
    const me = await Profile.findById(userId);
    if (!me) return res.status(404).json({ error: "Profile not found" });

    const createdServers = await Server.find({ createdBy: me._id }).select("_id").lean();
    const createdServerIds = createdServers.map((s) => s._id);

    if (createdServerIds.length) {
      await Promise.all([
        Message.deleteMany({ channel: { $in: await Channel.find({ server: { $in: createdServerIds } }).distinct("_id") } }),
        Channel.deleteMany({ server: { $in: createdServerIds } }),
        ChannelCategory.deleteMany({ server: { $in: createdServerIds } }),
        Notification.deleteMany({ server: { $in: createdServerIds } }),
        Server.deleteMany({ _id: { $in: createdServerIds } }),
      ]);
    }

    await Promise.all([
      Message.deleteMany({ member: me._id }),
      DirectMessage.deleteMany({ member: me._id }),
      Notification.deleteMany({
        $or: [{ recipient: me._id }, { sender: me._id }],
      }),
      Conversation.deleteMany({
        $or: [{ memberOne: me._id }, { memberTwo: me._id }],
      }),
      Server.updateMany(
        { participants: me._id },
        {
          $pull: {
            participants: me._id,
            admins: me._id,
          },
        }
      ),
      Channel.updateMany({ profile: me._id }, { $pull: { profile: me._id } }),
    ]);

    await Profile.deleteOne({ _id: me._id });

    if (me.clerkId) {
      await clerkClient.users.deleteUser(me.clerkId);
    }

    return res.status(200).json({ deleted: true });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

