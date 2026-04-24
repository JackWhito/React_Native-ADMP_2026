import express from 'express';
import compression from "compression";
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/messageRoutes';
import orderRoutes from './routes/chatRoutes';
import serverRoutes from './routes/serverRoutes';
import conversationRoutes from './routes/conversationRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import channelRoutes from './routes/channelRoutes';

import { clerkMiddleware } from '@clerk/express';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

app.use(clerkMiddleware());

app.get("/health", (req, res) => {
    res.status(200).json({message: "Server is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/messages", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/notifications", notificationRoutes);


app.use(errorHandler);
export default app;