import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import {
  addFriendByLink,
  addFriendByUsername,
  getFriendInviteLink,
  searchProfilesByName,
} from "../controllers/userController";

const router = Router();

router.get("/search", protectRoute, searchProfilesByName);
router.get("/friend-invite", protectRoute, getFriendInviteLink);
router.post("/friends/by-name", protectRoute, addFriendByUsername);
router.post("/friends/by-link", protectRoute, addFriendByLink);


export default router;