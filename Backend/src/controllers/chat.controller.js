import Chat from "../models/chat.model.js"
export async function getChats(req, res) {
    try {
        const userId = req.user.id
        const chats = await Chat.find({participants: userId}).populate("participants","fullName email avatar").populate({path:"lastMessage", select:"text sender createdAt", populate:{path:"sender", select:"fullName avatar"}}).sort({lastMessageAt:-1}).lean()

        const formatted = chats.map(chat => {
            const others = chat.participants.find(p => p._id.toString() !== userId)
            return{
                _id:chat._id,
                participant: others,
                lastMessage: chat.lastMessage,
                lastMessageAt: chat.lastMessageAt
            };
        });
        res.status(200).json(formatted)
    } catch (error) {
        console.error("Error in getChats controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }    
}

export async function getOrCreateChat(req, res) {
    try {
        const userId= req.user.id;
        const participantId = req.params.participant;

        let chat = await Chat.findOne({
            participants: {$all: [userId, participantId]}
        }).populate("participants","fullName email avatar").populate("lastMessage")

        if(!chat) {
            const newChat = new Chat({participants:[userId, participantId]});

            await newChat.save();

            chat = await newChat.populate("participants","fullName email avatar")
        }

        const others = chat.participants.find((p) => p._id.toString() !== userId);
        res.status(200).json({
            _id: chat._id,
            participant: others ?? null,
            lastMessage: chat.lastMessage,
            lastMessageAt: chat.lastMessageAt,
            createdAt: chat.createdAt,
        })
    } catch (error) {
        console.error("Error in getOrCreateChat controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getParticipants(req, res) {
    try {
        const userId = req.user.id;
        const chatId = req.params.chatId;

        const chat = await Chat.findOne({
            _id:chatId,
            participants: userId
        }).populate("participants", "fullName avatar")
        .lean();

        if(!chat) {
            return res.status(404).json({
                message: "Chat not found or access denied",
            });
        }
        const participants = chat.participants.map(p => ({
            _id: p._id,
            fullName: p.fullName,
            avatar: p.avatar,
        }));

        res.status(200).json({
            chatId,
            participants,
            participantsCount: participants.length,
        });

    } catch (error) {    
        console.error("Error in getChatParticipants:", error);
        res.status(500).json({ message: "Internal Server Error" });     
    }
    
}