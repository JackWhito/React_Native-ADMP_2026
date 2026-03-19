import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import { getConversations, getOrCreateConversation } from "../controllers/conversationController";

const router = Router();

router.get("/", protectRoute, getConversations)
router.post("/:userTwo", protectRoute, getOrCreateConversation)
export default router;