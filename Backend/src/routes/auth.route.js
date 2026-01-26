import express from "express";
import {login, logout, signup, signupJWT, loginJWT, checkAuth} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/signup-jwt", signupJWT);
router.post("/login-jwt", loginJWT);
router.post("/logout", logout);

router.get("/check", protectRoute, checkAuth);

export default router;