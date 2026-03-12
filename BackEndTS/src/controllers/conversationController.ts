import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { Conversation } from "../models/Conversation";

export async function getOrCreateConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userOne = req.profileId;
    const { userTwo } = req.params;

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