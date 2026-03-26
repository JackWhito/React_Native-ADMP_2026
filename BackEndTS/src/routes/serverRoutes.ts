import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import { createServer, getServerChannels, getServers } from "../controllers/serverController";


const router = Router();    
router.get("/",protectRoute, getServers);
router.get("/:serverId/channels", protectRoute, getServerChannels);
router.post("/", protectRoute, createServer);

export default router;