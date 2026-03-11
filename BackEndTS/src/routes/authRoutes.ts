import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import { authCallback, getMe } from "../controllers/profileController";

const router = Router();    

router.get("/me", protectRoute, getMe);
router.post("/callback", authCallback);

export default router;