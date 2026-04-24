import { Router } from "express";
import { protectRoute } from "../middleware/auth";
import { authCallback, getMe } from "../controllers/authController";
import {
  completeEmailRegistration,
  forgotPasswordRequest,
  loginWithEmail,
  resetPasswordWithOtp,
  startEmailRegistration,
} from "../controllers/localAuthController";

const router = Router();

router.post("/local/register-start", startEmailRegistration);
router.post("/local/register-verify", completeEmailRegistration);
router.post("/local/login", loginWithEmail);
router.post("/local/forgot-password", forgotPasswordRequest);
router.post("/local/reset-password", resetPasswordWithOtp);

router.get("/me", protectRoute, getMe);
router.post("/callback", authCallback);

export default router;