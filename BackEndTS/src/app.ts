import express from 'express';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/messageRoutes';
import orderRoutes from './routes/chatRoutes';
import serverRoutes from './routes/serverRoutes';
import conversationRoutes from './routes/conversationRoutes';

import { clerkMiddleware } from '@clerk/express';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.use(clerkMiddleware());

app.get("/health", (req, res) => {
    res.status(200).json({message: "Server is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/conversations", conversationRoutes);


app.use(errorHandler);
export default app;