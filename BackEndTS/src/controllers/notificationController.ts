import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";
import { Notification } from "../models/Notification";
import { AdminProfileDeletionRequest } from "../models/AdminProfileDeletionRequest";
import { Server } from "../models/Server";
import { Channel } from "../models/Channel";
import { getSocketServer } from "../utils/socket";
import { Conversation } from "../models/Conversation";
import { decodeSortCursor, encodeSortCursor, nextPageFilter, parseListLimit } from "../utils/cursorPagination";

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

export async function createServerMessageNotifications(input: {
  serverId: string;
  senderId: string;
  channelId?: string;
  messageContent?: string;
  recipientIds?: string[];
  notificationType?: "server_message" | "mention_message";
  senderPreview?: {
    _id: string;
    name: string;
    username?: string;
    imageUrl?: string;
  };
}) {
  const server = await Server.findById(input.serverId).select("name imageUrl participants");
  if (!server) return [];
  const channel = input.channelId && mongoose.Types.ObjectId.isValid(input.channelId)
    ? await Channel.findById(input.channelId).select("name")
    : null;

  const baseRecipients = (server.participants ?? [])
    .map((id) => String(id))
    .filter((id) => id !== String(input.senderId));
  const recipientIds = Array.isArray(input.recipientIds) && input.recipientIds.length
    ? baseRecipients.filter((id) => input.recipientIds?.includes(id))
    : baseRecipients;

  if (!recipientIds.length) return [];

  const payloads: Array<{
    _id: string;
    type: "server_message" | "mention_message";
    status: "accepted";
    isRead: boolean;
    readAt: null;
    message: string;
    createdAt: Date;
    updatedAt: Date;
    sender?: {
      _id: string;
      name: string;
      username?: string;
      imageUrl?: string;
    };
    server: {
      _id: string;
      name: string;
      imageUrl: string;
    };
    channel?: {
      _id: string;
      name: string;
    };
    recipient: string;
    event: "created" | "updated";
  }> = [];

  const type = (input.notificationType ?? "server_message") as "server_message" | "mention_message";
  const message = input.messageContent?.trim() || `${server.name} has a new message`;
  const now = new Date();

  const findFilter: Record<string, unknown> = {
    type,
    server: server._id,
    recipient: { $in: recipientIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
  };
  if (channel?._id) {
    findFilter.channel = channel._id;
  }
  const existingRows = await Notification.find(findFilter).lean();
  const byRecipient = new Map(
    existingRows.map((d) => [String(d.recipient), d] as [string, (typeof existingRows)[0]])
  );

  const bulkOps: Parameters<typeof Notification.bulkWrite>[0] = [];
  const insertDocs: Array<{
    type: "server_message" | "mention_message";
    status: "accepted";
    sender: mongoose.Types.ObjectId;
    recipient: mongoose.Types.ObjectId;
    server: mongoose.Types.ObjectId;
    channel?: mongoose.Types.ObjectId;
    message: string;
    isRead: boolean;
    readAt: null;
  }> = [];

  for (const recipientId of recipientIds) {
    const existing = byRecipient.get(String(recipientId));
    if (existing && type === "server_message") {
      bulkOps.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: {
              sender: new mongoose.Types.ObjectId(String(input.senderId)),
              status: "accepted",
              message,
              isRead: false,
              readAt: null,
              updatedAt: now,
            },
          },
        },
      });
    } else {
      insertDocs.push({
        type,
        status: "accepted",
        sender: new mongoose.Types.ObjectId(String(input.senderId)),
        recipient: new mongoose.Types.ObjectId(String(recipientId)),
        server: server._id as mongoose.Types.ObjectId,
        channel: channel?._id,
        message,
        isRead: false,
        readAt: null,
      });
    }
  }

  if (bulkOps.length) {
    await Notification.bulkWrite(bulkOps, { ordered: false });
  }
  const inserted = insertDocs.length
    ? await Notification.insertMany(insertDocs, { ordered: true })
    : [];
  const insertedByRecipient = new Map(
    inserted.map((d) => [String(d.recipient), d] as [string, (typeof inserted)[0]])
  );

  for (const recipientId of recipientIds) {
    const key = String(recipientId);
    const existing = byRecipient.get(key);
    if (type === "server_message" && existing) {
      payloads.push({
        _id: String(existing._id),
        type,
        status: "accepted",
        isRead: false,
        readAt: null,
        message,
        createdAt: existing.createdAt as Date,
        updatedAt: now,
        sender: input.senderPreview
          ? {
              _id: input.senderPreview._id,
              name: input.senderPreview.name,
              username: input.senderPreview.username ?? "",
              imageUrl: input.senderPreview.imageUrl ?? "",
            }
          : undefined,
        server: {
          _id: String(server._id),
          name: String((server as any).name ?? ""),
          imageUrl: String((server as any).imageUrl ?? ""),
        },
        channel: channel
          ? {
              _id: String(channel._id),
              name: String((channel as any).name ?? ""),
            }
          : undefined,
        recipient: key,
        event: "updated",
      });
    } else {
      const created = insertedByRecipient.get(key);
      if (!created) continue;
      payloads.push({
        _id: String(created._id),
        type,
        status: "accepted",
        isRead: false,
        readAt: null,
        message: created.message,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        sender: input.senderPreview
          ? {
              _id: input.senderPreview._id,
              name: input.senderPreview.name,
              username: input.senderPreview.username ?? "",
              imageUrl: input.senderPreview.imageUrl ?? "",
            }
          : undefined,
        server: {
          _id: String(server._id),
          name: String((server as any).name ?? ""),
          imageUrl: String((server as any).imageUrl ?? ""),
        },
        channel: channel
          ? {
              _id: String(channel._id),
              name: String((channel as any).name ?? ""),
            }
          : undefined,
        recipient: key,
        event: "created",
      });
    }
  }

  return payloads;
}

export async function getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  try {
    const limit = parseListLimit((req.query as { limit?: string }).limit);
    const rawCursor = typeof (req.query as { cursor?: string }).cursor === "string"
      ? (req.query as { cursor: string }).cursor
      : "";
    const cur = rawCursor ? decodeSortCursor(rawCursor) : null;
    const base = { recipient: userId };
    const filter: Record<string, unknown> = cur
      ? { $and: [base, nextPageFilter("createdAt", cur)] }
      : base;

    const rows = await Notification.find(filter)
      .populate("sender", "name username imageUrl")
      .populate("server", "name imageUrl")
      .populate("channel", "name")
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1] as { _id?: unknown; createdAt?: Date } | undefined;
    const lastAt = last?.createdAt instanceof Date ? last.createdAt : new Date(0);
    const nextCursor =
      hasMore && last?._id != null ? encodeSortCursor(lastAt, String(last._id)) : null;
    return res.status(200).json({ notifications: page, nextCursor, hasMore });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function createServerInviteNotification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const senderId = req.profileId;
  const { serverId, recipientId } = (req.body ?? {}) as {
    serverId?: string;
    recipientId?: string;
  };
  try {
    if (!serverId || !mongoose.Types.ObjectId.isValid(serverId)) {
      return res.status(400).json({ error: "Valid server id is required" });
    }
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ error: "Valid recipient id is required" });
    }
    if (String(senderId) === String(recipientId)) {
      return res.status(400).json({ error: "Cannot invite yourself" });
    }

    const server = await Server.findOne({ _id: serverId, participants: senderId });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (server.participants.some((p) => String(p) === String(recipientId))) {
      return res.status(409).json({ error: "User is already in this server" });
    }

    const existing = await Notification.findOne({
      type: "server_invite",
      status: "pending",
      sender: senderId,
      recipient: recipientId,
      server: serverId,
    });
    if (existing) return res.status(409).json({ error: "Invite is already pending" });

    const created = await Notification.create({
      type: "server_invite",
      status: "pending",
      isRead: false,
      sender: senderId,
      recipient: recipientId,
      server: serverId,
      message: `You were invited to join ${server.name}`,
    });
    await created.populate("sender", "name username imageUrl");
    await created.populate("server", "name imageUrl");

    const io = getSocketServer();
    io?.to(`user:${recipientId}`).emit("notification-created", {
      _id: String(created._id),
      type: "server_invite",
      status: created.status,
      isRead: Boolean((created as any).isRead),
      readAt: (created as any).readAt ?? null,
      message: created.message,
      createdAt: created.createdAt,
      sender: created.sender,
      server: created.server,
    });

    return res.status(201).json(created);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function acceptServerInviteNotification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const notificationId = (req.params as { notificationId?: string }).notificationId;
  try {
    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
      type: "server_invite",
    });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (notification.status !== "pending") {
      return res.status(409).json({ error: `Invite is already ${notification.status}` });
    }

    const server = await Server.findById(notification.server);
    if (!server) return res.status(404).json({ error: "Server not found" });

    if (!server.participants.some((p) => String(p) === String(userId))) {
      server.participants.push(new mongoose.Types.ObjectId(String(userId)));
      await server.save();
    }

    await Channel.updateMany(
      { server: server._id, profile: { $ne: userId } },
      { $push: { profile: userId } }
    );

    notification.status = "accepted";
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const io = getSocketServer();
    io?.to(`user:${String(userId)}`).emit("notification-updated", {
      _id: String(notification._id),
      status: "accepted",
      isRead: true,
      readAt: notification.readAt,
    });

    return res.status(200).json({ joined: true, serverId: String(server._id), serverName: server.name });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function rejectServerInviteNotification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const notificationId = (req.params as { notificationId?: string }).notificationId;
  try {
    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
      type: "server_invite",
    });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (notification.status !== "pending") {
      return res.status(409).json({ error: `Invite is already ${notification.status}` });
    }
    notification.status = "rejected";
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const io = getSocketServer();
    io?.to(`user:${String(userId)}`).emit("notification-updated", {
      _id: String(notification._id),
      status: "rejected",
      isRead: true,
      readAt: notification.readAt,
    });

    return res.status(200).json({ rejected: true });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function markNotificationAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const notificationId = (req.params as { notificationId?: string }).notificationId;
  try {
    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });
    if (!notification) return res.status(404).json({ error: "Notification not found" });

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    const io = getSocketServer();
    io?.to(`user:${String(userId)}`).emit("notification-updated", {
      _id: String(notification._id),
      isRead: true,
      readAt: notification.readAt ?? new Date(),
    });

    return res.status(200).json({ read: true, notificationId: String(notification._id) });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function requestCancelAccountDeletion(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const notificationId = (req.params as { notificationId?: string }).notificationId;
  const body = (req.body ?? {}) as { reason?: unknown };
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  try {
    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }
    if (reason.length < 5) {
      return res.status(400).json({ error: "Cancellation reason must be at least 5 characters" });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
      type: "account_deletion_warning",
    });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (notification.status !== "pending") {
      return res.status(409).json({ error: "Cancellation already requested or resolved" });
    }

    const request = await AdminProfileDeletionRequest.findOne({ profile: userId });
    if (!request) {
      return res.status(404).json({ error: "No scheduled deletion found" });
    }
    if (request.cancellationRequested) {
      return res.status(409).json({ error: "Cancellation already requested" });
    }
    request.cancellationRequested = true;
    request.cancellationReason = reason;
    request.cancellationRequestedAt = new Date();
    await request.save();

    notification.status = "cancel_requested";
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const io = getSocketServer();
    io?.to(`user:${String(userId)}`).emit("notification-updated", {
      _id: String(notification._id),
      status: "cancel_requested",
      isRead: true,
      readAt: notification.readAt,
    });

    return res.status(200).json({ requested: true });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function acceptFriendInviteNotification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const notificationId = (req.params as { notificationId?: string }).notificationId;
  try {
    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
      type: "friend_invite",
    });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (notification.status !== "pending") {
      return res.status(409).json({ error: `Invite is already ${notification.status}` });
    }

    const conversation = await createFriendConversation(String(notification.sender), String(userId));

    notification.status = "accepted";
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const io = getSocketServer();
    const payload = {
      _id: String(notification._id),
      status: "accepted",
      isRead: true,
      readAt: notification.readAt,
    };
    io?.to(`user:${String(userId)}`).emit("notification-updated", payload);
    io?.to(`user:${String(notification.sender)}`).emit("notification-updated", payload);

    return res.status(200).json({
      accepted: true,
      conversationId: String(conversation?._id ?? ""),
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function rejectFriendInviteNotification(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.profileId;
  const notificationId = (req.params as { notificationId?: string }).notificationId;
  try {
    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
      type: "friend_invite",
    });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (notification.status !== "pending") {
      return res.status(409).json({ error: `Invite is already ${notification.status}` });
    }

    notification.status = "rejected";
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const io = getSocketServer();
    const payload = {
      _id: String(notification._id),
      status: "rejected",
      isRead: true,
      readAt: notification.readAt,
    };
    io?.to(`user:${String(userId)}`).emit("notification-updated", payload);
    io?.to(`user:${String(notification.sender)}`).emit("notification-updated", payload);

    return res.status(200).json({ rejected: true });
  } catch (error) {
    res.status(500);
    next(error);
  }
}
