import mongoose from "mongoose";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";

export async function getMessages(req, res) {
    try {
        const userId = req.user.id;
        const {chatId} = req.params;

        if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chatId" });
        }

        const chat = await Chat.findOne({
            _id:chatId,
            participants: userId,
        });

        if(!chat){
            res.status(404).json({message:"Chat not found"});
            return;
        }

        const limit = Number(req.query.limit) || 50;

        const messages = await Message.find({chat:chatId})
            .populate("sender","fullName email avatar")
            .sort({createdAt: 1})
            .limit(limit)
            .lean()
        res.status(200).json(messages)
    } catch (error) {
        console.error("Error in getMessages controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
const extractUrls = (text = "") => {
  if (!text) return [];

  const urlRegex =
    /\b((https?:\/\/|www\.)[^\s<>"]+)/gi;

  return [...new Set(
    text.match(urlRegex)?.map(url =>
      url.startsWith("www.") ? `https://${url}` : url
    ) || []
  )];
};
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.body;
    const senderId = req.user._id;

    const text =
      typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!text && !req.file) {
      return res
        .status(400)
        .json({ message: "Message text or image is required" });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/messages/${req.file.filename}`;
    }

    const links = extractUrls(text);

    const message = await Message.create({
      chat: chatId,
      sender: senderId,
      text,
      image: imagePath,
      links: links,
    });

    const populatedMessage = await message.populate(
      "sender",
      "username avatar"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export async function getImages(req, res) {
    try {
        const chatId = req.params.chatId;

        if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chatId" });
        }

        const chat = await Chat.findOne({
            _id:chatId,
        });

        if(!chat){
            res.status(404).json({message:"Chat not found"});
            return;
        }

        const limit = Number(req.query.limit) || 50;

        const images = await Message.find(
          {
            chat: chatId,
            image: { $type: "string", $ne: null, $ne: "", $ne:"null" }
          },
          {
            image: 1,
          }
        ).sort({createdAt: 1})
          .select("links sender createdAt")
          .populate("sender", "fullName avatar")
          .sort({ createdAt: -1 })
          .lean();
        res.status(200).json(images)
    } catch (error) {
        console.error("Error in getMessages controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getChatLinks = async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({
      chat: chatId,
      links: { $exists: true, $ne: [] },
    })
      .select("links sender createdAt")
      .populate("sender", "fullName avatar")
      .sort({ createdAt: -1 })
      .lean();

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};