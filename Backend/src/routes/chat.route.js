import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getChats, getOrCreateChat, getParticipants } from "../controllers/chat.controller.js";

const router = Router();

router.get("/", protectRoute, getChats );
router.post("/with/:participant", protectRoute, getOrCreateChat );
router.get("/participants/:chatId", protectRoute, getParticipants);

export default router;