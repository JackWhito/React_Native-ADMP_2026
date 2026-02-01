import express from "express";
import {login, logout, signup, signupJWT, loginJWT, checkAuth, verifyOTP, forgotPassword, resendOTP, resetPassword, updateUser, updateEmail, updateProfile} from "../controllers/auth.controller.js";
import { protectRoute, apiLimiter, adminOnly } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/signup", apiLimiter, signup);
router.post("/login", apiLimiter, login);
router.post("/signup-jwt", apiLimiter, signupJWT);
router.post("/login-jwt", apiLimiter, loginJWT);
router.post("/logout", logout);
router.post("/verify-otp", apiLimiter, verifyOTP);

router.post("/forget-password", apiLimiter, forgotPassword);
router.post("/reset-password", apiLimiter, resetPassword);
router.post("/resend-otp", apiLimiter, resendOTP);

router.get("/check", protectRoute, checkAuth);
router.post("/admin",protectRoute, adminOnly, checkAuth);

router.put("/update", apiLimiter, protectRoute, updateUser);
router.put("/update-email", apiLimiter, protectRoute, updateEmail);

router.put("/profile", apiLimiter, protectRoute, upload.single("avatar"), updateProfile)

export default router;