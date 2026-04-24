import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { Conversation } from "../models/Conversation";
import mongoose from "mongoose";
import { decodeSortCursor, encodeSortCursor, nextPageFilter, parseListLimit } from "../utils/cursorPagination";

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
  try {
    const limit = parseListLimit((req.query as { limit?: string }).limit);
    const rawCursor = typeof (req.query as { cursor?: string }).cursor === "string"
      ? (req.query as { cursor: string }).cursor
      : "";
    const cur = rawCursor ? decodeSortCursor(rawCursor) : null;

    const membership = {
      $or: [{ memberOne: userId }, { memberTwo: userId }],
    };
    const filter: Record<string, unknown> = cur
      ? { $and: [membership, nextPageFilter("lastMessageAt", cur)] }
      : membership;

    const rows = await Conversation.find(filter)
      .populate("memberOne", "name username email imageUrl")
      .populate("memberTwo", "name username email imageUrl")
      .populate("lastMessage", "content member createdAt")
      .sort({ lastMessageAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1] as
      | { _id?: unknown; lastMessageAt?: Date }
      | undefined;
    const lastAt = last?.lastMessageAt instanceof Date ? last.lastMessageAt : new Date(0);
    const nextCursor =
      hasMore && last?._id != null
        ? encodeSortCursor(lastAt, String(last._id))
        : null;

    const formatted = page.map((conversation) => {
      const c = conversation as {
        _id: unknown;
        memberOne: unknown;
        memberTwo: unknown;
        lastMessage: unknown;
        lastMessageAt: unknown;
        createdAt: unknown;
      };
      const memberOneDoc: any = c.memberOne;
      const memberOneId = memberOneDoc?._id ? memberOneDoc._id.toString() : String(memberOneDoc);
      const others = memberOneId === userId ? c.memberTwo : c.memberOne;
      return {
        _id: c._id,
        member: others,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
      };
    });
    return res.status(200).json({ conversations: formatted, nextCursor, hasMore });
  } catch (error) {
    res.status(500);
    next(error);
  }
}