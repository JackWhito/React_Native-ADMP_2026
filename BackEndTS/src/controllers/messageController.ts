import type { AuthRequest } from "../middleware/auth";
import type { NextFunction, Response } from 'express';
import mongoose from "mongoose";
import { Conversation } from "../models/Conversation";
import { DirectMessage } from "../models/DirectMessage";
import { Channel } from "../models/Channel";
import { Message } from "../models/Message";
import { AdminMessageReport, type AdminReportCategory } from "../models/AdminMessageReport";
import { AdminUserReport, type AdminUserReportCategory } from "../models/AdminUserReport";
import { Profile } from "../models/Profile";
import { emitAdminDataChanged, getSocketServer } from "../utils/socket";
import { createServerMessageNotifications } from "./notificationController";

function toggleReactionInList(
    reactions: Array<{ emoji: string; users: Array<mongoose.Types.ObjectId | string> }>,
    emoji: string,
    userId: string
) {
    const next = Array.isArray(reactions) ? [...reactions] : [];
    const reactionIndex = next.findIndex((r) => String(r.emoji) === emoji);
    if (reactionIndex < 0) {
        next.push({
            emoji,
            users: [new mongoose.Types.ObjectId(userId)],
        });
        return next;
    }

    const entry = next[reactionIndex];
    const userIds = (entry.users ?? []).map((u) => String(u));
    const hasReacted = userIds.includes(userId);
    if (hasReacted) {
        const remainingUsers = (entry.users ?? []).filter((u) => String(u) !== userId);
        if (!remainingUsers.length) {
            next.splice(reactionIndex, 1);
        } else {
            next[reactionIndex] = { ...entry, users: remainingUsers as any };
        }
        return next;
    }

    next[reactionIndex] = {
        ...entry,
        users: [...(entry.users ?? []), new mongoose.Types.ObjectId(userId)] as any,
    };
    return next;
}

const normalizeMentionName = (value: string) =>
    String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

const pickParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

function fakeDirectMessage(chatId: string, userId: string, content: string, fileUrl: string) {
    const now = new Date();
    return {
        _id: new mongoose.Types.ObjectId().toString(),
        conversation: chatId,
        member: userId,
        content,
        fileUrl,
        deleted: false,
        createdAt: now,
        updatedAt: now,
    };
}

function fakeChannelMessage(channelId: string, userId: string, content: string, fileUrl: string) {
    const now = new Date();
    return {
        _id: new mongoose.Types.ObjectId().toString(),
        channel: channelId,
        member: userId,
        content,
        fileUrl,
        deleted: false,
        createdAt: now,
        updatedAt: now,
    };
}

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const chatId = pickParam(req.params.chatId);
        const rawLimit = Number(req.query?.limit);
        const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 50) : 10;
        const rawCursor = typeof req.query?.cursor === "string" ? req.query.cursor : "";
        const cursorDate = rawCursor ? new Date(rawCursor) : null;
        const hasCursor = !!cursorDate && !Number.isNaN(cursorDate.getTime());
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ error: "Invalid conversation id" });
        }

        const conversation = await Conversation.findOne({
            _id: chatId,
            $or: [{ memberOne: userId }, { memberTwo: userId }],
        });
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        const query: Record<string, unknown> = { conversation: chatId };
        if (hasCursor && cursorDate) {
            query.createdAt = { $lt: cursorDate };
        }

        const messages = await DirectMessage.find(query)
            .populate("member", "clerkId name username email imageUrl")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const oldestMessage = messages[messages.length - 1];
        const nextCursor = messages.length === limit && oldestMessage?.createdAt
            ? new Date(oldestMessage.createdAt).toISOString()
            : null;

        return res.status(200).json({
            messages,
            nextCursor,
            hasMore: messages.length === limit,
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

async function ensureConversationMembership(chatId: string, profileId: string) {
    return Conversation.findOne({
        _id: chatId,
        $or: [{ memberOne: profileId }, { memberTwo: profileId }],
    });
}

async function findDirectMessageForMember(chatId: string, messageId: string, profileId: string) {
    const conversation = await ensureConversationMembership(chatId, profileId);
    if (!conversation) return { conversation: null, message: null };

    const message = await DirectMessage.findOne({ _id: messageId, conversation: chatId });
    return { conversation, message };
}

export async function createDirectMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const chatId = pickParam(req.params.chatId);
        const { content, fileUrl } = (req.body ?? {}) as { content?: string; fileUrl?: string };
        const normalizedContent = typeof content === "string" ? content.trim() : "";
        const normalizedFileUrl = typeof fileUrl === "string" ? fileUrl.trim() : "";

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ error: "Invalid conversation id" });
        }
        if (!normalizedContent && !normalizedFileUrl) {
            return res.status(400).json({ error: "Message content or image is required" });
        }

        const conversation = await ensureConversationMembership(chatId, userId);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        if (req.shadowBanned) {
            const fake = fakeDirectMessage(chatId, userId, normalizedContent, normalizedFileUrl);
            return res.status(201).json(fake);
        }

        const created = new DirectMessage({
            content: normalizedContent,
            fileUrl: normalizedFileUrl,
            member: userId,
            conversation: chatId,
        });
        await created.save();
        await created.populate("member", "clerkId name username email imageUrl");

        conversation.lastMessage = created._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();
        const io = getSocketServer();
        io?.to(`chat:${chatId}`).emit("new-message", created);
        io?.to(`user:${String(conversation.memberOne)}`).emit("new-message", created);
        io?.to(`user:${String(conversation.memberTwo)}`).emit("new-message", created);
        emitAdminDataChanged(["chats", "dashboard"]);

        return res.status(201).json(created);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function updateDirectMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const chatId = pickParam(req.params.chatId);
        const messageId = pickParam(req.params.messageId);
        const { content } = (req.body ?? {}) as { content?: string };
        const normalizedContent = typeof content === "string" ? content.trim() : "";

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ error: "Invalid conversation id" });
        }
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message id" });
        }
        if (!normalizedContent) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const { message } = await findDirectMessageForMember(chatId, messageId, userId);
        if (!message) return res.status(404).json({ error: "Message not found" });
        if (String(message.member) !== String(userId)) {
            return res.status(403).json({ error: "Only sender can edit this message" });
        }

        message.content = normalizedContent;
        await message.save();
        await message.populate("member", "clerkId name username email imageUrl");
        const io = getSocketServer();
        io?.to(`chat:${chatId}`).emit("direct-message-updated", message);
        const conversation = await Conversation.findById(chatId).select("memberOne memberTwo");
        if (conversation) {
            io?.to(`user:${String(conversation.memberOne)}`).emit("direct-message-updated", message);
            io?.to(`user:${String(conversation.memberTwo)}`).emit("direct-message-updated", message);
        }
        return res.status(200).json(message);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function deleteDirectMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const chatId = pickParam(req.params.chatId);
        const messageId = pickParam(req.params.messageId);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ error: "Invalid conversation id" });
        }
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message id" });
        }

        const { message } = await findDirectMessageForMember(chatId, messageId, userId);
        if (!message) return res.status(404).json({ error: "Message not found" });
        if (String(message.member) !== String(userId)) {
            return res.status(403).json({ error: "Only sender can delete this message" });
        }

        await DirectMessage.deleteOne({ _id: message._id });
        const io = getSocketServer();
        const payload = { messageId: String(message._id), conversationId: chatId };
        io?.to(`chat:${chatId}`).emit("direct-message-deleted", payload);
        const conversation = await Conversation.findById(chatId).select("memberOne memberTwo");
        if (conversation) {
            io?.to(`user:${String(conversation.memberOne)}`).emit("direct-message-deleted", payload);
            io?.to(`user:${String(conversation.memberTwo)}`).emit("direct-message-deleted", payload);
        }
        return res.status(200).json({ deleted: true, messageId: String(message._id) });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

async function ensureChannelMembership(channelId: string, profileId: string) {
    return Channel.exists({
        _id: channelId,
        profile: profileId,
    });
}

async function findChannelMessageForMember(channelId: string, messageId: string, profileId: string) {
    const channel = await ensureChannelMembership(channelId, profileId);
    if (!channel) return { channel: null, message: null };

    const message = await Message.findOne({ _id: messageId, channel: channelId });
    return { channel, message };
}

export async function getChannelMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const channelId = pickParam(req.params.channelId);
        const rawLimit = Number(req.query?.limit);
        const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 50) : 10;
        const rawCursor = typeof req.query?.cursor === "string" ? req.query.cursor : "";
        const cursorDate = rawCursor ? new Date(rawCursor) : null;
        const hasCursor = !!cursorDate && !Number.isNaN(cursorDate.getTime());
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ error: "Invalid channel id" });
        }

        const channel = await ensureChannelMembership(channelId, userId);
        if (!channel) {
            return res.status(404).json({ error: "Channel not found" });
        }

        const query: Record<string, unknown> = { channel: channelId };
        if (hasCursor && cursorDate) {
            query.createdAt = { $lt: cursorDate };
        }

        const messages = await Message.find(query)
            .populate("member", "clerkId name username imageUrl")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const oldestMessage = messages[messages.length - 1];
        const nextCursor = messages.length === limit && oldestMessage?.createdAt
            ? new Date(oldestMessage.createdAt).toISOString()
            : null;

        return res.status(200).json({
            messages,
            nextCursor,
            hasMore: messages.length === limit,
        });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function createChannelMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const channelId = pickParam(req.params.channelId);
        const { content, fileUrl } = (req.body ?? {}) as { content?: string; fileUrl?: string };
        const normalizedContent = typeof content === "string" ? content.trim() : "";
        const normalizedFileUrl = typeof fileUrl === "string" ? fileUrl.trim() : "";

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ error: "Invalid channel id" });
        }
        if (!normalizedContent && !normalizedFileUrl) {
            return res.status(400).json({ error: "Message content or image is required" });
        }

        const channel = await ensureChannelMembership(channelId, userId);
        if (!channel) {
            return res.status(404).json({ error: "Channel not found" });
        }
        if (req.shadowBanned) {
            const fake = fakeChannelMessage(channelId, userId, normalizedContent, normalizedFileUrl);
            return res.status(201).json(fake);
        }

        const created = new Message({
            content: normalizedContent,
            fileUrl: normalizedFileUrl,
            member: userId,
            channel: channelId,
        });
        await created.save();
        await created.populate("member", "clerkId name username imageUrl");
        const channelServer = await Channel.findById(channelId).select("server");
        if (channelServer?.server) {
            const senderProfile = await Profile.findById(userId)
                .select("_id name username imageUrl")
                .lean();
            const mentionUsernames = Array.from(
                new Set(
                    (normalizedContent.match(/@([a-zA-Z0-9_.-]+)/g) ?? [])
                        .map((token) => token.slice(1).toLowerCase())
                        .filter(Boolean)
                )
            );
            let mentionRecipientIds: string[] = [];
            if (mentionUsernames.length) {
                const serverWithParticipants = await Channel.findById(channelId)
                    .select("server")
                    .populate({
                        path: "server",
                        select: "participants",
                    });
                const participantIds = Array.isArray((serverWithParticipants as any)?.server?.participants)
                    ? (serverWithParticipants as any).server.participants.map((p: any) => String(p))
                    : [];
                if (participantIds.length) {
                    const mentionedProfiles = await Profile.find({
                        _id: { $in: participantIds },
                    })
                        .select("_id username name")
                        .lean();
                    const mentionSet = new Set(mentionUsernames.map((u) => u.toLowerCase()));
                    mentionRecipientIds = mentionedProfiles
                        .filter((profile: any) => {
                            const username = String(profile?.username ?? "").trim().toLowerCase();
                            const normalizedName = normalizeMentionName(String(profile?.name ?? ""));
                            return mentionSet.has(username) || mentionSet.has(normalizedName);
                        })
                        .map((p: any) => String(p._id));
                }
            }
            const createdNotifications = mentionRecipientIds.length
                ? await createServerMessageNotifications({
                    serverId: String(channelServer.server),
                    senderId: String(userId),
                    channelId,
                    messageContent: normalizedContent || normalizedFileUrl,
                    recipientIds: mentionRecipientIds,
                    notificationType: "mention_message",
                    senderPreview: senderProfile
                        ? {
                            _id: String(senderProfile._id),
                            name: String((senderProfile as any).name ?? "Someone"),
                            username: String((senderProfile as any).username ?? ""),
                            imageUrl: String((senderProfile as any).imageUrl ?? ""),
                        }
                        : undefined,
                })
                : await createServerMessageNotifications({
                    serverId: String(channelServer.server),
                    senderId: String(userId),
                    channelId,
                    messageContent: normalizedContent || normalizedFileUrl,
                });
            const io = getSocketServer();
            for (const notification of createdNotifications) {
                const recipientId = String((notification as any).recipient ?? "");
                if (!recipientId) continue;
                const eventName = (notification as any).event === "updated"
                    ? "notification-updated"
                    : "notification-created";
                io?.to(`user:${recipientId}`).emit(eventName, notification);
            }
        }
        const io = getSocketServer();
        io?.to(`channel:${channelId}`).emit("channel-message-created", created);
        emitAdminDataChanged(["chats", "dashboard"]);
        return res.status(201).json(created);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function updateChannelMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const channelId = pickParam(req.params.channelId);
        const messageId = pickParam(req.params.messageId);
        const { content } = (req.body ?? {}) as { content?: string };
        const normalizedContent = typeof content === "string" ? content.trim() : "";

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ error: "Invalid channel id" });
        }
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message id" });
        }
        if (!normalizedContent) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const { message } = await findChannelMessageForMember(channelId, messageId, userId);
        if (!message) return res.status(404).json({ error: "Message not found" });
        if (String(message.member) !== String(userId)) {
            return res.status(403).json({ error: "Only sender can edit this message" });
        }

        message.content = normalizedContent;
        await message.save();
        await message.populate("member", "clerkId name username imageUrl");

        const io = getSocketServer();
        io?.to(`channel:${channelId}`).emit("channel-message-updated", message);
        return res.status(200).json(message);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function deleteChannelMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const channelId = pickParam(req.params.channelId);
        const messageId = pickParam(req.params.messageId);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ error: "Invalid channel id" });
        }
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message id" });
        }

        const { message } = await findChannelMessageForMember(channelId, messageId, userId);
        if (!message) return res.status(404).json({ error: "Message not found" });
        if (String(message.member) !== String(userId)) {
            return res.status(403).json({ error: "Only sender can delete this message" });
        }

        const io = getSocketServer();
        io?.to(`channel:${channelId}`).emit("channel-message-deleted", { messageId: String(message._id) });
        await Message.deleteOne({ _id: message._id });
        return res.status(200).json({ deleted: true, messageId: String(message._id) });
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function reportChannelMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const channelId = pickParam(req.params.channelId);
        const messageId = pickParam(req.params.messageId);
        const { reason, category, details } = (req.body ?? {}) as {
            reason?: string;
            category?: AdminReportCategory;
            details?: string;
        };

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ error: "Invalid channel id" });
        }
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message id" });
        }

        const { message } = await findChannelMessageForMember(channelId, messageId, userId);
        if (!message) return res.status(404).json({ error: "Message not found" });
        if (String(message.member) === String(userId)) {
            return res.status(400).json({ error: "You cannot report your own message" });
        }

        const normalizedCategory = String(category ?? "other").trim().toLowerCase();
        const allowedCategories: AdminReportCategory[] = [
            "spam",
            "harassment",
            "hate",
            "nudity",
            "violence",
            "scam",
            "other",
        ];
        if (!allowedCategories.includes(normalizedCategory as AdminReportCategory)) {
            return res.status(400).json({ error: "Invalid report category" });
        }

        const normalizedReason = String(reason ?? "Message violates community guidelines").trim();
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

        const existingPending = await AdminMessageReport.findOne({
            message: message._id,
            reportedBy: userId,
            status: "pending",
        }).select("_id");

        if (existingPending?._id) {
            return res.status(200).json({
                reported: true,
                duplicate: true,
                reportId: String(existingPending._id),
            });
        }

        const created = await AdminMessageReport.create({
            message: message._id,
            reportedBy: userId,
            reason: normalizedReason,
            category: normalizedCategory as AdminReportCategory,
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

export async function reportDirectMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const chatId = pickParam(req.params.chatId);
        const messageId = pickParam(req.params.messageId);
        const { reason, category, details } = (req.body ?? {}) as {
            reason?: string;
            category?: AdminUserReportCategory;
            details?: string;
        };

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ error: "Invalid conversation id" });
        }
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message id" });
        }

        const { message } = await findDirectMessageForMember(chatId, messageId, userId);
        if (!message) return res.status(404).json({ error: "Message not found" });

        const targetProfileId = String(message.member ?? "");
        if (!targetProfileId || !mongoose.Types.ObjectId.isValid(targetProfileId)) {
            return res.status(400).json({ error: "Message sender is invalid" });
        }
        if (String(targetProfileId) === String(userId)) {
            return res.status(400).json({ error: "You cannot report your own message" });
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

        const normalizedReason = String(reason ?? "Direct message violates community guidelines").trim();
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
            profile: targetProfileId,
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
            profile: targetProfileId,
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

export async function reactToChannelMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const channelId = pickParam(req.params.channelId);
        const messageId = pickParam(req.params.messageId);
        const emoji = String((req.body as { emoji?: string })?.emoji ?? "").trim();

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ error: "Invalid channel id" });
        }
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message id" });
        }
        if (!emoji) return res.status(400).json({ error: "Emoji is required" });

        const { message } = await findChannelMessageForMember(channelId, messageId, userId);
        if (!message) return res.status(404).json({ error: "Message not found" });

        message.reactions = toggleReactionInList(message.reactions as any, emoji, userId) as any;
        await message.save();
        await message.populate("member", "clerkId name username imageUrl");

        const io = getSocketServer();
        io?.to(`channel:${channelId}`).emit("channel-message-updated", message);
        return res.status(200).json(message);
    } catch (error) {
        res.status(500);
        next(error);
    }
}

export async function reactToDirectMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.profileId;
        const chatId = pickParam(req.params.chatId);
        const messageId = pickParam(req.params.messageId);
        const emoji = String((req.body as { emoji?: string })?.emoji ?? "").trim();

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ error: "Invalid conversation id" });
        }
        if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message id" });
        }
        if (!emoji) return res.status(400).json({ error: "Emoji is required" });

        const { message } = await findDirectMessageForMember(chatId, messageId, userId);
        if (!message) return res.status(404).json({ error: "Message not found" });

        message.reactions = toggleReactionInList(message.reactions as any, emoji, userId) as any;
        await message.save();
        await message.populate("member", "clerkId name username email imageUrl");
        const io = getSocketServer();
        io?.to(`chat:${chatId}`).emit("direct-message-updated", message);
        const conversation = await Conversation.findById(chatId).select("memberOne memberTwo");
        if (conversation) {
            io?.to(`user:${String(conversation.memberOne)}`).emit("direct-message-updated", message);
            io?.to(`user:${String(conversation.memberTwo)}`).emit("direct-message-updated", message);
        }

        return res.status(200).json(message);
    } catch (error) {
        res.status(500);
        next(error);
    }
}