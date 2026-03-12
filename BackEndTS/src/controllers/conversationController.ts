import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { Conversation } from "../models/Conversation";
import mongoose from "mongoose";

export async function getOrCreateConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userOne = req.profileId;
    const { userTwo } = req.params;
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
        new: true,
        upsert: true
      }
    );

    res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
}