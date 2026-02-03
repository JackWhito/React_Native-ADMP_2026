import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, sendMessage} from "../controllers/message.controller.js";
import { uploadMessage } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/chat/:chatId", protectRoute, getMessages);
router.post("/send", protectRoute, uploadMessage.single("image"), sendMessage);

export default router;