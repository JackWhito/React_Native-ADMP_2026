import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '@clerk/express'; 
import { Profile } from '../models/Profile';
import { Admin } from '../models/Admin';
import { DirectMessage } from '../models/DirectMessage';
import { Conversation } from '../models/Conversation';
import { Channel } from '../models/Channel';
import { Message } from '../models/Message';
import { Server } from '../models/Server';
import { createServerMessageNotifications } from '../controllers/notificationController';
import mongoose from 'mongoose';
import { verifyAdminToken } from './adminJwt';

interface SocketWithProfile extends Socket {
    profileId: string;
    shadowBanned?: boolean;
    isAdminClient?: boolean;
}
export const onlineUsers: Map<string, string> = new Map();
let ioInstance: SocketServer | null = null;

export const getSocketServer = () => ioInstance;
const normalizeMentionName = (value: string) =>
    String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
export const emitAdminDataChanged = (scopes: string[]) => {
    if (!ioInstance || scopes.length === 0) return;
    ioInstance.to("admin:global").emit("admin-data-changed", {
        scopes: Array.from(new Set(scopes)),
        at: new Date().toISOString(),
    });
};

export const initializeSocket = (server: HttpServer) => {
    // Allow Flutter mobile (no CORS) and Flutter web / dev hosts (CORS).
    // Configure via SOCKET_CORS_ORIGIN="http://localhost:8081,http://10.0.2.2:8081,https://your-web-domain"
    const allowedOrigins = (process.env.SOCKET_CORS_ORIGIN ?? 'http://localhost:8081')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const io = new SocketServer(server, {
        cors: {
            origin: (origin, callback) => {
                // Non-browser clients (Flutter mobile/desktop) typically send no Origin header.
                if (!origin) return callback(null, true);

                if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                return callback(new Error(`Socket origin not allowed: ${origin}`));
            },
            credentials: true,
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
    });
    ioInstance = io;
    io.use(async (socket, next) => {
        const auth = socket.handshake.auth ?? {};
        const token = auth.token;
        if(!token) return next(new Error('Unauthorized'));

        try {
            if (auth.clientType === "admin") {
                const payload = await verifyAdminToken(String(token));
                const adminId = String(payload.sub ?? "");
                if (!adminId) return next(new Error('Unauthorized'));
                const admin = await Admin.findById(adminId).select("_id");
                if (!admin) return next(new Error('Unauthorized'));
                (socket as SocketWithProfile).profileId = admin._id.toString();
                (socket as SocketWithProfile).isAdminClient = true;
                return next();
            }
            const session = await verifyToken(token, {secretKey: process.env.CLERK_SECRET_KEY});
            const clerkId = session.sub;
            const user = await Profile.findOne({clerkId});
            if(!user) return next(new Error('Unauthorized'));
            if (user.moderationStatus === 'banned') return next(new Error('Banned'));
            if (
                user.moderationStatus === 'suspended' &&
                user.suspendedUntil instanceof Date &&
                user.suspendedUntil.getTime() > Date.now()
            ) {
                return next(new Error('Suspended'));
            }

            (socket as SocketWithProfile).profileId = user._id.toString();
            (socket as SocketWithProfile).shadowBanned = user.moderationStatus === 'shadow_banned';

            next();
        } catch (error: any) {
            next(new Error(error.message));
        }
    });

    io.on('connection', (socket) => {
        const userId = (socket as SocketWithProfile).profileId;
        const isAdminClient = Boolean((socket as SocketWithProfile).isAdminClient);
        if (isAdminClient) {
            socket.join("admin:global");
            socket.emit("admin-socket-ready", { ok: true });
            return;
        }

        socket.emit("online-users", {usersId: Array.from(onlineUsers.keys()) });

        onlineUsers.set(userId, socket.id);

        socket.broadcast.emit("user-online", {userId});

        socket.join(`user:${userId}`);

        socket.on("join-chat", (conversationId: string) => {
            // room for a specific conversation; keep naming consistent with emit
            socket.join(`chat:${conversationId}`);
        })

        socket.on("leave-chat", (conversationId: string) => {
            socket.leave(`chat:${conversationId}`);
        })

        socket.on("join-channel", async (channelId: string) => {
            try {
                const hasAccess = await Channel.exists({ _id: channelId, profile: userId });
                if (!hasAccess) {
                    socket.emit("socket-error", { message: "Channel not found" });
                    return;
                }
                socket.join(`channel:${channelId}`);
            } catch {
                socket.emit("socket-error", { message: "Failed to join channel" });
            }
        });

        socket.on("leave-channel", (channelId: string) => {
            socket.leave(`channel:${channelId}`);
        });

        socket.on("channel-typing", async (data: { channelId?: string; isTyping?: boolean }) => {
            try {
                const channelId = String(data?.channelId ?? "");
                if (!channelId) return;

                const hasAccess = await Channel.exists({ _id: channelId, profile: userId });
                if (!hasAccess) return;

                const me = await Profile.findById(userId).select("name username");
                const displayName =
                    String(me?.name ?? "").trim() ||
                    String((me as any)?.username ?? "").trim() ||
                    "Member";

                socket.to(`channel:${channelId}`).emit("channel-typing", {
                    channelId,
                    userId,
                    name: displayName,
                    isTyping: Boolean(data?.isTyping),
                });
            } catch {
                // Ignore typing failures.
            }
        });

        socket.on(
            "send-channel-message",
            async (
                data: { channelId?: string; content?: string; fileUrl?: string },
                ack?: (response: { ok: boolean; message?: any; error?: string }) => void
            ) => {
                try {
                    const channelId = String(data?.channelId ?? "");
                    const content = String(data?.content ?? "").trim();
                    const fileUrl = String(data?.fileUrl ?? "").trim();

                    if (!channelId) {
                        ack?.({ ok: false, error: "Missing channel id" });
                        return;
                    }
                    if (!content && !fileUrl) {
                        ack?.({ ok: false, error: "Message cannot be empty" });
                        return;
                    }

                    const channel = await Channel.findOne({ _id: channelId, profile: userId });
                    if (!channel) {
                        ack?.({ ok: false, error: "Channel not found" });
                        return;
                    }
                    if ((socket as SocketWithProfile).shadowBanned) {
                        const now = new Date();
                        ack?.({
                            ok: true,
                            message: {
                                _id: new mongoose.Types.ObjectId().toString(),
                                content,
                                fileUrl,
                                member: userId,
                                channel: channelId,
                                createdAt: now,
                                updatedAt: now,
                            },
                        });
                        return;
                    }

                    const created = await Message.create({
                        content,
                        fileUrl,
                        member: userId,
                        channel: channelId,
                    });
                    await created.populate("member", "clerkId name username imageUrl");
                    if ((channel as any)?.server) {
                        const senderProfile = await Profile.findById(userId)
                            .select("_id name username imageUrl")
                            .lean();
                        const mentionUsernames = Array.from(
                            new Set(
                                (content.match(/@([a-zA-Z0-9_.-]+)/g) ?? [])
                                    .map((token) => token.slice(1).toLowerCase())
                                    .filter(Boolean)
                            )
                        );
                        let mentionRecipientIds: string[] = [];
                        if (mentionUsernames.length) {
                            const serverId = String((channel as any).server ?? "");
                            const serverDoc = serverId && mongoose.Types.ObjectId.isValid(serverId)
                                ? await Server.findById(serverId).select("participants").lean()
                                : null;
                            const participantIds = Array.isArray((serverDoc as any)?.participants)
                                ? (serverDoc as any).participants.map((p: any) => String(p))
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
                        const createdNotifications = await createServerMessageNotifications({
                            serverId: String((channel as any).server),
                            senderId: String(userId),
                            channelId,
                            messageContent: content || fileUrl,
                            recipientIds: mentionRecipientIds.length ? mentionRecipientIds : undefined,
                            notificationType: mentionRecipientIds.length ? "mention_message" : "server_message",
                            senderPreview: senderProfile
                                ? {
                                    _id: String((senderProfile as any)._id),
                                    name: String((senderProfile as any).name ?? "Someone"),
                                    username: String((senderProfile as any).username ?? ""),
                                    imageUrl: String((senderProfile as any).imageUrl ?? ""),
                                }
                                : undefined,
                        });
                        for (const notification of createdNotifications) {
                            const recipientId = String((notification as any).recipient ?? "");
                            if (!recipientId) continue;
                            const eventName = (notification as any).event === "updated"
                                ? "notification-updated"
                                : "notification-created";
                            io.to(`user:${recipientId}`).emit(eventName, notification);
                        }
                    }

                    io.to(`channel:${channelId}`).emit("channel-message-created", created);
                    emitAdminDataChanged(["chats", "dashboard"]);
                    ack?.({ ok: true, message: created });
                } catch {
                    ack?.({ ok: false, error: "Failed to send message" });
                }
            }
        );

        socket.on(
            "send-message",
            async (
                data: { chatId?: string; text?: string; content?: string; fileUrl?: string },
                ack?: (response: { ok: boolean; message?: any; error?: string }) => void
            ) => {
            try {
                const chatId = String(data?.chatId ?? "");
                const content = String(data?.content ?? data?.text ?? "").trim();
                const fileUrl = String(data?.fileUrl ?? "").trim();
                if (!chatId) {
                    ack?.({ ok: false, error: "Missing conversation id" });
                    return;
                }
                if (!content && !fileUrl) {
                    ack?.({ ok: false, error: "Message cannot be empty" });
                    return;
                }
                const conversation = await Conversation.findOne({
                    _id: chatId,
                    $or: [
                        { memberOne: userId },
                        { memberTwo: userId }
                    ]
                });

                if(!conversation) {
                    ack?.({ ok: false, error: "Chat not found" });
                    socket.emit("socket-error", {message:"Chat not found"});
                    return;
                }
                if ((socket as SocketWithProfile).shadowBanned) {
                    const now = new Date();
                    ack?.({
                        ok: true,
                        message: {
                            _id: new mongoose.Types.ObjectId().toString(),
                            conversation: chatId,
                            member: userId,
                            content,
                            fileUrl,
                            createdAt: now,
                            updatedAt: now,
                        },
                    });
                    return;
                }

                const message = await DirectMessage.create({
                    conversation: chatId,
                    member: userId,
                    content,
                    fileUrl,
                });

                conversation.lastMessage = message._id;
                conversation.lastMessageAt = new Date();
                await conversation.save();

                await message.populate("member", "clerkId name username email imageUrl");

                io.to(`chat:${chatId}`).emit("new-message", message);

                // Emit the new message to both members in the conversation
                const members = [conversation.memberOne, conversation.memberTwo];
                for (const memberId of members) {
                    io.to(`user:${memberId}`).emit("new-message", message);
                }
                emitAdminDataChanged(["chats", "dashboard"]);
                ack?.({ ok: true, message });

            } catch (error) {
                ack?.({ ok: false, error: "Failed to send message" });
                socket.emit("socket-error", {message: "Failed to send Message"});

            }
        })

        socket.on("disconnect", () => {
            onlineUsers.delete(userId)

            socket.broadcast.emit("user-offline", {userId})
        })
    });
    return io;
};
