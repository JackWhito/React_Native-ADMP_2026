import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import {
  createServerChannel,
  createServer,
  createServerCategory,
  deleteServerCategory,
  deleteServer,
  getServerInvite,
  getServerMembers,
  getServerChannelList,
  getServerChannels,
  getServerById,
  getServers,
  grantMemberAdminRole,
  joinServerByInvite,
  kickGuestMember,
  leaveServer,
  updateServerCategory,
  updateServer,
  reportServer,
} from "../controllers/serverController";


const router = Router();    
router.get("/",protectRoute, getServers);
router.get("/:serverId/channels", protectRoute, getServerChannels);
router.get("/:serverId/channel-list", protectRoute, getServerChannelList);
router.get("/:serverId/invite", protectRoute, getServerInvite);
router.get("/:serverId/members", protectRoute, getServerMembers);
router.get("/:serverId", protectRoute, getServerById);
router.post("/:serverId/report", protectRoute, reportServer);
router.patch("/:serverId", protectRoute, updateServer);
router.patch("/:serverId/members/:memberId/admin", protectRoute, grantMemberAdminRole);
router.delete("/:serverId", protectRoute, deleteServer);
router.delete("/:serverId/leave", protectRoute, leaveServer);
router.delete("/:serverId/members/:memberId", protectRoute, kickGuestMember);
router.post("/invite/:inviteCode/join", protectRoute, joinServerByInvite);
router.post("/:serverId/channels", protectRoute, createServerChannel);
router.post("/:serverId/categories", protectRoute, createServerCategory);
router.patch("/:serverId/categories/:categoryId", protectRoute, updateServerCategory);
router.delete("/:serverId/categories/:categoryId", protectRoute, deleteServerCategory);
router.post("/", protectRoute, createServer);

export default router;