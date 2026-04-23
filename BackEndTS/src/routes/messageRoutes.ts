import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import {
  createChannelMessage,
  createDirectMessage,
  deleteChannelMessage,
  deleteDirectMessage,
  getChannelMessages,
  getMessages,
  reactToChannelMessage,
  reactToDirectMessage,
  reportDirectMessage,
  reportChannelMessage,
  updateDirectMessage,
  updateChannelMessage,
} from "../controllers/messageController";

const router = Router();

router.get("/conversation/:chatId", protectRoute, getMessages);
router.post("/conversation/:chatId", protectRoute, createDirectMessage);
router.patch("/conversation/:chatId/:messageId", protectRoute, updateDirectMessage);
router.delete("/conversation/:chatId/:messageId", protectRoute, deleteDirectMessage);
router.post("/conversation/:chatId/:messageId/report", protectRoute, reportDirectMessage);
router.post("/conversation/:chatId/:messageId/reactions", protectRoute, reactToDirectMessage);
router.get("/channel/:channelId", protectRoute, getChannelMessages);
router.post("/channel/:channelId", protectRoute, createChannelMessage);
router.patch("/channel/:channelId/:messageId", protectRoute, updateChannelMessage);
router.delete("/channel/:channelId/:messageId", protectRoute, deleteChannelMessage);
router.post("/channel/:channelId/:messageId/report", protectRoute, reportChannelMessage);
router.post("/channel/:channelId/:messageId/reactions", protectRoute, reactToChannelMessage);

export default router;