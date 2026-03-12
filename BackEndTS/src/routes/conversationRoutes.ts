import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import { getConversations } from "../controllers/conversationController";

const router = Router();

router.get("/", protectRoute, getConversations)
export default router;