import { Router } from "express";
import {
    approveDeletionCancellation,
    assignProfileRole,
    deleteProfileAsAdmin,
    deleteServerAsAdmin,
    deleteConversationMessageAsAdmin,
    forceLogoutProfile,
    getReportQueueSummary,
    listDeletionRequests,
    listMessageReports,
    listConversations,
    listNews,
    listConversationMessages,
    listServerReports,
    listUserReports,
    rejectDeletionCancellation,
    resolveMessageReport,
    resolveServerReport,
    resolveUserReport,
    dismissMessageReport,
    dismissServerReport,
    dismissUserReport,
    getProfileDetail,
    listChannelMessagesAsAdmin,
    getServerDetail,
    getDashboardInsights,
    getDashboardStats,
    updateProfileAsAdmin,
    listProfiles,
    listServers,
    loginAdmin,
    registerAdmin,
    moderateProfile,
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
router.get("/profiles/:profileId", requireAdmin, getProfileDetail);
router.patch("/profiles/:profileId", requireAdmin, updateProfileAsAdmin);
router.delete("/profiles/:profileId", requireAdmin, deleteProfileAsAdmin);
router.patch("/profiles/:profileId/role", requireAdmin, assignProfileRole);
router.patch("/profiles/:profileId/moderation", requireAdmin, moderateProfile);
router.post("/profiles/:profileId/force-logout", requireAdmin, forceLogoutProfile);
router.get("/deletion-requests", requireAdmin, listDeletionRequests);
router.post("/deletion-requests/:profileId/approve-cancel", requireAdmin, approveDeletionCancellation);
router.post("/deletion-requests/:profileId/reject-cancel", requireAdmin, rejectDeletionCancellation);
router.get("/reports/messages", requireAdmin, listMessageReports);
router.get("/reports/users", requireAdmin, listUserReports);
router.get("/reports/servers", requireAdmin, listServerReports);
router.get("/reports/summary", requireAdmin, getReportQueueSummary);
router.post("/reports/messages/:reportId/resolve", requireAdmin, resolveMessageReport);
router.post("/reports/messages/:reportId/dismiss", requireAdmin, dismissMessageReport);
router.post("/reports/users/:reportId/resolve", requireAdmin, resolveUserReport);
router.post("/reports/users/:reportId/dismiss", requireAdmin, dismissUserReport);
router.post("/reports/servers/:reportId/resolve", requireAdmin, resolveServerReport);
router.post("/reports/servers/:reportId/dismiss", requireAdmin, dismissServerReport);
router.get("/conversations", requireAdmin, listConversations);
router.get("/conversations/:conversationId/messages", requireAdmin, listConversationMessages);
router.delete("/conversations/:conversationId/messages/:messageId", requireAdmin, deleteConversationMessageAsAdmin);
router.get("/news", requireAdmin, listNews);
router.get("/servers", requireAdmin, listServers);
router.get("/servers/:serverId", requireAdmin, getServerDetail);
router.get("/channels/:channelId/messages", requireAdmin, listChannelMessagesAsAdmin);
router.delete("/servers/:serverId", requireAdmin, deleteServerAsAdmin);
router.get("/stats", requireAdmin, getDashboardStats);
router.get("/insights", requireAdmin, getDashboardInsights);

export default router;
