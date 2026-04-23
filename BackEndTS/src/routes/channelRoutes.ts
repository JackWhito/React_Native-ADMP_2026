import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import {
  createChannelMessage,
  deleteChannelMessage,
  getChannelMessages,
  updateChannelMessage,
} from "../controllers/messageController";

const router = Router();

router.get("/:channelId/messages", protectRoute, getChannelMessages);
router.post("/:channelId/messages", protectRoute, createChannelMessage);
router.patch("/:channelId/messages/:messageId", protectRoute, updateChannelMessage);
router.delete("/:channelId/messages/:messageId", protectRoute, deleteChannelMessage);

export default router;
