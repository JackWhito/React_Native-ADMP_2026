import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { Conversation } from "../models/Conversation";
import mongoose from "mongoose";

export async function getOrCreateConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userOne = req.profileId;
    const userTwo = (req.params as any)?.userTwo as string | undefined;
    if(!userTwo || !mongoose.Types.ObjectId.isValid(userTwo)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    if(userOne === userTwo) {
      return res.status(400).json({ error: "Cannot create conversation with yourself" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      {
        $or: [
          { memberOne: userOne, memberTwo: userTwo },
          { memberOne: userTwo, memberTwo: userOne }
        ]
      },
      {
        $setOnInsert: {
          memberOne: userOne,
          memberTwo: userTwo
        }
      },
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500);
    next(error);
  }
}

export async function getConversations(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.profileId;
  try{
    const conversations = await Conversation.find({
      $or: [
        {memberOne: userId},
        {memberTwo: userId}
      ]
    }).populate("memberOne", "name email imageUrl")
    .populate("memberTwo", "name email imageUrl")
    .populate("lastMessage", "text sender createdAt")
    .sort({lastMessageAt:-1});

    const formatted = conversations.map(conversation => {
      const memberOneDoc: any = conversation.memberOne as any;
      const memberOneId =
        memberOneDoc?._id ? memberOneDoc._id.toString() : String(memberOneDoc);

      const others = memberOneId === userId ? conversation.memberTwo : conversation.memberOne;
      return {
        _id: conversation._id,
        member: others,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
      }
    })
    res.status(200).json(formatted)
  } catch (error)
  {
    res.status(500);
    next(error);
  }
}