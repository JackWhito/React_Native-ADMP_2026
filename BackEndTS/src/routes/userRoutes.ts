import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import {
  addFriendByLink,
  addFriendByUsername,
  blockUserProfile,
  confirmAccountEmailChange,
  deleteMyAccount,
  getFriendInviteLink,
  getMyProfile,
  requestAccountEmailChange,
  updateLocalAccountPassword,
  reportUserProfile,
  getSharedServersWithProfile,
  searchProfilesByName,
  updateAccountSettings,
  updateMyAvatar,
  updateMyProfile,
} from "../controllers/userController";

const router = Router();

router.get("/search", protectRoute, searchProfilesByName);
router.get("/me", protectRoute, getMyProfile);
router.patch("/me", protectRoute, updateMyProfile);
router.patch("/me/avatar", protectRoute, updateMyAvatar);
router.post("/account/email-change/request", protectRoute, requestAccountEmailChange);
router.post("/account/email-change/confirm", protectRoute, confirmAccountEmailChange);
router.patch("/account/local-password", protectRoute, updateLocalAccountPassword);
router.patch("/account", protectRoute, updateAccountSettings);
router.delete("/account", protectRoute, deleteMyAccount);
router.get("/friend-invite", protectRoute, getFriendInviteLink);
router.post("/friends/by-name", protectRoute, addFriendByUsername);
router.post("/friends/by-link", protectRoute, addFriendByLink);
router.post("/:profileId/block", protectRoute, blockUserProfile);
router.get("/:profileId/shared-servers", protectRoute, getSharedServersWithProfile);
router.post("/:profileId/report", protectRoute, reportUserProfile);


export default router;