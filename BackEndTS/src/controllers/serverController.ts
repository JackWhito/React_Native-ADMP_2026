import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { Profile } from "../models/Profile";
import { Server } from "../models/Server";
import { Channel } from "../models/Channel";
import { ChannelCategory } from "../models/ChannelCategory";
import { Notification } from "../models/Notification";
import { AdminServerReport, type AdminServerReportCategory } from "../models/AdminServerReport";
import mongoose from "mongoose";
import { emitAdminDataChanged } from "../utils/socket";

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
      createdBy: profile._id,
      participants: [profile._id],
      admins: [profile._id],
    });

    const participantIds = [profile._id];
    const chatCategory = await ChannelCategory.create({
      name: "Chat",
      server: server._id,
      createdBy: profile._id,
    });
    const voiceCategory = await ChannelCategory.create({
      name: "Voice",
      server: server._id,
      createdBy: profile._id,
    });

    const textChannel = await Channel.create({
      name: "general",
      type: "text",
      server: server._id,
      profile: participantIds,
      category: chatCategory._id,
    });
    const audioChannel = await Channel.create({
      name: "General",
      type: "audio",
      server: server._id,
      profile: participantIds,
      category: voiceCategory._id,
    });

    const serverObj = server.toObject();
    emitAdminDataChanged(["servers", "dashboard", "news"]);
    res.status(201).json({
      ...serverObj,
      categories: [chatCategory.toObject(), voiceCategory.toObject()],
      channels: [textChannel.toObject(), audioChannel.toObject()],
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function updateServer(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  const { name, imageUrl } = (req.body ?? {}) as { name?: string; imageUrl?: string };
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (typeof name === "string") {
      if (!name.trim()) return res.status(400).json({ error: "Server name cannot be empty" });
      server.name = name.trim();
    }
    if (typeof imageUrl === "string") {
      server.imageUrl = imageUrl.trim();
    }

    await server.save();
    return res.status(200).json(server);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function getServerMembers(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    const server = await Server.findOne({ _id: serverId, participants: userId })
      .populate("participants", "name username imageUrl")
      .lean();
    if (!server) return res.status(404).json({ error: "Server not found" });

    const admins = Array.isArray((server as any).admins)
      ? (server as any).admins.map((id: any) => String(id))
      : [];
    const members = Array.isArray(server.participants)
      ? (server.participants as any[]).map((m: any) => {
          const id = String(m?._id ?? m);
          return {
            _id: id,
            name: m?.name ?? "",
            username: m?.username ?? "",
            imageUrl: m?.imageUrl ?? "",
            role: admins.includes(id) ? "admin" : "guest",
          };
        })
      : [];
    const myRole = admins.includes(String(userId)) ? "admin" : "guest";

    return res.status(200).json({
      total: members.length,
      members,
      myRole,
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function leaveServer(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    server.participants = server.participants.filter((p) => String(p) !== String(userId));
    server.admins = (server.admins ?? []).filter((p) => String(p) !== String(userId));

    await Channel.updateMany(
      { server: server._id, profile: userId },
      { $pull: { profile: userId } }
    );

    await server.save();
    return res.status(200).json({ left: true, serverId: String(server._id) });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function deleteServer(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const isRequesterAdmin = (server.admins ?? []).some((id) => String(id) === String(userId));
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: "Only admins can delete this server" });
    }

    await Promise.all([
      Channel.deleteMany({ server: server._id }),
      ChannelCategory.deleteMany({ server: server._id }),
      Notification.deleteMany({ server: server._id }),
      Server.deleteOne({ _id: server._id }),
    ]);

    return res.status(200).json({ deleted: true, serverId: String(server._id) });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function kickGuestMember(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  const memberId = (req.params as { memberId?: string }).memberId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid member id" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const isRequesterAdmin = (server.admins ?? []).some((id) => String(id) === String(userId));
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: "Only admins can kick members" });
    }
    if (String(memberId) === String(userId)) {
      return res.status(400).json({ error: "Use leave server to remove yourself" });
    }

    const isMember = server.participants.some((id) => String(id) === String(memberId));
    if (!isMember) return res.status(404).json({ error: "Member not found in this server" });

    const isTargetAdmin = (server.admins ?? []).some((id) => String(id) === String(memberId));
    if (isTargetAdmin) {
      return res.status(403).json({ error: "Cannot kick admin members" });
    }

    server.participants = server.participants.filter((p) => String(p) !== String(memberId));
    await Channel.updateMany(
      { server: server._id, profile: memberId },
      { $pull: { profile: memberId } }
    );
    await server.save();

    return res.status(200).json({ kicked: true, memberId: String(memberId) });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function grantMemberAdminRole(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  const memberId = (req.params as { memberId?: string }).memberId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid member id" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const isRequesterAdmin = (server.admins ?? []).some((id) => String(id) === String(userId));
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: "Only admins can grant admin role" });
    }

    const isMember = server.participants.some((id) => String(id) === String(memberId));
    if (!isMember) return res.status(404).json({ error: "Member not found in this server" });

    if (!(server.admins ?? []).some((id) => String(id) === String(memberId))) {
      server.admins = [...(server.admins ?? []), new mongoose.Types.ObjectId(String(memberId))];
      await server.save();
    }

    return res.status(200).json({ granted: true, memberId: String(memberId) });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

const channelTypeOrder = (t: string) => (t === "text" ? 0 : t === "audio" ? 1 : 2);
const byTypeThenName = (a: { type?: string; name?: string }, b: { type?: string; name?: string }) =>
  channelTypeOrder(String(a.type)) - channelTypeOrder(String(b.type)) ||
  String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" });

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
    channels.sort(byTypeThenName);
    res.status(200).json(channels);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function getServerChannelList(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const [categories, channels] = await Promise.all([
      ChannelCategory.find({ server: serverId })
        .sort({ name: 1 })
        .lean(),
      Channel.find({ server: serverId }).lean(),
    ]);

    const channelsByCategory = new Map<string, any[]>();
    const uncategorized: any[] = [];

    for (const ch of channels) {
      const key = ch.category ? String(ch.category) : "";
      if (!key) {
        uncategorized.push(ch);
        continue;
      }
      const current = channelsByCategory.get(key);
      if (current) current.push(ch);
      else channelsByCategory.set(key, [ch]);
    }

    const categoryList = categories.map((cat) => {
      const groupedChannels = channelsByCategory.get(String(cat._id)) ?? [];
      groupedChannels.sort(byTypeThenName);
      return {
        _id: cat._id,
        name: cat.name,
        channels: groupedChannels,
      };
    });

    uncategorized.sort(byTypeThenName);

    res.status(200).json({
      categories: categoryList,
      uncategorized,
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function createServerCategory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  const { name } = (req.body ?? {}) as { name?: string };
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const categoryName = name.trim();
    const existing = await ChannelCategory.findOne({
      server: serverId,
      name: new RegExp(`^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (existing) {
      return res.status(409).json({ error: "Category already exists" });
    }

    const category = await ChannelCategory.create({
      name: categoryName,
      server: server._id,
      createdBy: userId,
    });

    return res.status(201).json(category);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function updateServerCategory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  const categoryId = (req.params as { categoryId?: string }).categoryId;
  const { name } = (req.body ?? {}) as { name?: string };
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: "Invalid category id" });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const isRequesterAdmin = (server.admins ?? []).some((id) => String(id) === String(userId));
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: "Only admins can edit categories" });
    }

    const category = await ChannelCategory.findOne({ _id: categoryId, server: serverId });
    if (!category) return res.status(404).json({ error: "Category not found in this server" });

    const categoryName = name.trim();
    const existing = await ChannelCategory.findOne({
      _id: { $ne: category._id },
      server: serverId,
      name: new RegExp(`^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (existing) return res.status(409).json({ error: "Category already exists" });

    category.name = categoryName;
    await category.save();
    return res.status(200).json(category);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function deleteServerCategory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  const categoryId = (req.params as { categoryId?: string }).categoryId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: "Invalid category id" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const isRequesterAdmin = (server.admins ?? []).some((id) => String(id) === String(userId));
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: "Only admins can delete categories" });
    }

    const category = await ChannelCategory.findOne({ _id: categoryId, server: serverId });
    if (!category) return res.status(404).json({ error: "Category not found in this server" });

    await Promise.all([
      Channel.deleteMany({ server: serverId, category: category._id }),
      ChannelCategory.deleteOne({ _id: category._id }),
    ]);

    return res.status(200).json({ deleted: true, categoryId: String(category._id) });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function createServerChannel(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  const { name, categoryId, type } = (req.body ?? {}) as {
    name?: string;
    categoryId?: string;
    type?: "text" | "audio" | "video";
  };
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Channel name is required" });
    }
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: "Valid category id is required" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const category = await ChannelCategory.findOne({ _id: categoryId, server: serverId });
    if (!category) {
      return res.status(404).json({ error: "Category not found in this server" });
    }

    const channelName = name.trim();
    const exists = await Channel.findOne({
      server: serverId,
      category: category._id,
      name: new RegExp(`^${channelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (exists) {
      return res.status(409).json({ error: "Channel already exists in this category" });
    }

    const created = await Channel.create({
      name: channelName,
      type: type && ["text", "audio", "video"].includes(type) ? type : "text",
      server: server._id,
      profile: server.participants,
      category: category._id,
    });

    return res.status(201).json(created);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function getServerInvite(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }
    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const inviteCode = String(server.inviteCode);
    const inviteLink = `discord://invite/${inviteCode}`;
    return res.status(200).json({ inviteCode, inviteLink });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function joinServerByInvite(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const inviteCode = (req.params as { inviteCode?: string }).inviteCode;
  try {
    const normalizedCode = (inviteCode ?? "").trim();
    if (!normalizedCode) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const server = await Server.findOne({ inviteCode: normalizedCode });
    if (!server) {
      return res.status(404).json({ error: "Invite not found" });
    }

    const alreadyJoined = server.participants.some((id) => String(id) === String(userId));
    if (!alreadyJoined) {
      server.participants.push(new mongoose.Types.ObjectId(String(userId)));
      await server.save();
    }

    await Channel.updateMany(
      { server: server._id, profile: { $ne: userId } },
      { $push: { profile: userId } }
    );

    return res.status(200).json({
      joined: !alreadyJoined,
      serverId: String(server._id),
      serverName: server.name,
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function reportServer(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  const serverId = (req.params as { serverId?: string }).serverId;
  const { reason, category, details } = (req.body ?? {}) as {
    reason?: string;
    category?: AdminServerReportCategory;
    details?: string;
  };
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Invalid server id" });
    }

    const server = await Server.findOne({ _id: serverId, participants: userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const isRequesterAdmin = (server.admins ?? []).some((id) => String(id) === String(userId));
    if (isRequesterAdmin) {
      return res.status(403).json({ error: "Server admins cannot report this server" });
    }

    const normalizedCategory = String(category ?? "other").trim().toLowerCase();
    const allowedCategories: AdminServerReportCategory[] = [
      "spam",
      "harassment",
      "hate",
      "nudity",
      "violence",
      "scam",
      "other",
    ];
    if (!allowedCategories.includes(normalizedCategory as AdminServerReportCategory)) {
      return res.status(400).json({ error: "Invalid report category" });
    }

    const normalizedReason = String(reason ?? "Server violates community guidelines").trim();
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

    const existingPending = await AdminServerReport.findOne({
      server: server._id,
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

    const created = await AdminServerReport.create({
      server: server._id,
      reportedBy: userId,
      reason: normalizedReason,
      category: normalizedCategory as AdminServerReportCategory,
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