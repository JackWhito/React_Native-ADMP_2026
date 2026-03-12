import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import { getOrCreateConversation } from "../controllers/conversationController";

const router = Router();
router.get("/", protectRoute, getOrCreateConversation);
export default router;