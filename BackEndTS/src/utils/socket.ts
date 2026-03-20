import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '@clerk/express'; 
import { Profile } from '../models/Profile';
import { DirectMessage } from '../models/DirectMessage';
import { Conversation } from '../models/Conversation';

interface SocketWithProfile extends Socket {
    profileId: string;
}
export const onlineUsers: Map<string, string> = new Map();

export const initializeSocket = (server: HttpServer) => {
    const io = new SocketServer(server, {cors: {origin: "http://localhost:8081"}});
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if(!token) return next(new Error('Unauthorized'));

        try {
            const session = await verifyToken(token, {secretKey: process.env.CLERK_SECRET_KEY});
            const clerkId = session.sub;
            const user = await Profile.findOne({clerkId});
            if(!user) return next(new Error('Unauthorized'));

            (socket as SocketWithProfile).profileId = user._id.toString();

            next();
        } catch (error: any) {
            next(new Error(error.message));
        }
    });

    io.on('connection', (socket) => {
        const userId = (socket as SocketWithProfile).profileId;

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

        socket.on("send-message", async (data : {chatId: string, text: string}) => {
            try {
                const {chatId, text} = data;
                const conversation = await Conversation.findOne({
                    _id: chatId,
                    $or: [
                        { memberOne: userId },
                        { memberTwo: userId }
                    ]
                });

                if(!conversation) {
                socket.emit("socket-error", {message:"Chat not found"});
                    return;
                }

                const message = await DirectMessage.create({
                    conversation: chatId,
                    member: userId,
                    content: text
                });

                conversation.lastMessage = message._id;
                conversation.lastMessageAt = new Date();
                await conversation.save();

                await message.populate("member", "name email imageUrl");

                io.to(`chat:${chatId}`).emit("new-message", message);

                // Emit the new message to both members in the conversation
                const members = [conversation.memberOne, conversation.memberTwo];
                for (const memberId of members) {
                    io.to(`user:${memberId}`).emit("new-message", message);
                }

            } catch (error) {
                socket.emit("socket-error", {message: "Failed to send Message"});

            }
        })

        socket.on("typing", async(data) => {

        })

        socket.on("disconnect", () => {
            onlineUsers.delete(userId)

            socket.broadcast.emit("user-offline", {userId})
        })
    });
    return io;
};
