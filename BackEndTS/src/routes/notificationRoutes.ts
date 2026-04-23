import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import {
  acceptFriendInviteNotification,
  acceptServerInviteNotification,
  createServerInviteNotification,
  getMyNotifications,
  markNotificationAsRead,
  requestCancelAccountDeletion,
  rejectFriendInviteNotification,
  rejectServerInviteNotification,
} from "../controllers/notificationController";

const router = Router();

router.get("/", protectRoute, getMyNotifications);
router.post("/server-invite", protectRoute, createServerInviteNotification);
router.post("/:notificationId/accept", protectRoute, acceptServerInviteNotification);
router.post("/:notificationId/reject", protectRoute, rejectServerInviteNotification);
router.post("/:notificationId/friend-accept", protectRoute, acceptFriendInviteNotification);
router.post("/:notificationId/friend-reject", protectRoute, rejectFriendInviteNotification);
router.patch("/:notificationId/read", protectRoute, markNotificationAsRead);
router.post("/:notificationId/request-cancel-deletion", protectRoute, requestCancelAccountDeletion);

export default router;
