import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import {
  createServerChannel,
  createServer,
  createServerCategory,
  getServerInvite,
  getServerChannelList,
  getServerChannels,
  getServers,
  joinServerByInvite,
} from "../controllers/serverController";


const router = Router();    
router.get("/",protectRoute, getServers);
router.get("/:serverId/channels", protectRoute, getServerChannels);
router.get("/:serverId/channel-list", protectRoute, getServerChannelList);
router.get("/:serverId/invite", protectRoute, getServerInvite);
router.post("/invite/:inviteCode/join", protectRoute, joinServerByInvite);
router.post("/:serverId/channels", protectRoute, createServerChannel);
router.post("/:serverId/categories", protectRoute, createServerCategory);
router.post("/", protectRoute, createServer);

export default router;