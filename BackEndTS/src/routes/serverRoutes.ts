import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import { createServer, getServers } from "../controllers/serverController";


const router = Router();    
router.get("/",protectRoute, getServers);
router.post("/", protectRoute, createServer);

export default router;