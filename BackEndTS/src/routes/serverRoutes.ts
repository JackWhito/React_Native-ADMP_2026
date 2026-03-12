import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import { getServers } from "../controllers/serverController";


const router = Router();    
router.get("/",protectRoute, getServers);

export default router;