import { Router } from "express";
import {
    listProfiles,
    loginAdmin,
    registerAdmin,
    sendForgotPasswordOtp,
    sendRegisterOtp,
    verifyForgotPasswordOtp,
    verifyRegisterWithOtp,
} from "../controllers/adminController";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();

router.post("/register/send-otp", sendRegisterOtp);
router.post("/register/verify", verifyRegisterWithOtp);
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

router.post("/forgot-password/send-otp", sendForgotPasswordOtp);
router.post("/forgot-password/verify", verifyForgotPasswordOtp);

router.get("/profiles", requireAdmin, listProfiles);

export default router;
