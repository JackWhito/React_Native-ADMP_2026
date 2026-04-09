import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import {
  acceptServerInviteNotification,
  createServerInviteNotification,
  getMyNotifications,
  rejectServerInviteNotification,
} from "../controllers/notificationController";

const router = Router();

router.get("/", protectRoute, getMyNotifications);
router.post("/server-invite", protectRoute, createServerInviteNotification);
router.post("/:notificationId/accept", protectRoute, acceptServerInviteNotification);
router.post("/:notificationId/reject", protectRoute, rejectServerInviteNotification);

export default router;
