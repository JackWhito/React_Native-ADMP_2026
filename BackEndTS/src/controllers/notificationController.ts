import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";
import { Notification } from "../models/Notification";
import { Server } from "../models/Server";
import { Channel } from "../models/Channel";

export async function getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  try {
    const rows = await Notification.find({ recipient: userId })
      .populate("sender", "name username imageUrl")
      .populate("server", "name imageUrl")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(rows);
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
      sender: senderId,
      recipient: recipientId,
      server: serverId,
      message: `You were invited to join ${server.name}`,
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
    await notification.save();

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
    await notification.save();
    return res.status(200).json({ rejected: true });
  } catch (error) {
    res.status(500);
    next(error);
  }
}
