import express from 'express';
import dotenv from "dotenv";
const app = express();
dotenv.config()

import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from './routes/auth.route.js';
import {connectDB} from './lib/db.js';

const PORT = process.env.PORT

app.use(express.json());
app.use(cookieParser());
app.use(cors())

app.use("/api/auth", authRoutes);

app.get('/', (req, res) => {
    res.send('API is running....');
});

app.listen(PORT, () => {
    console.log('Server is running on port: '+ PORT);
    connectDB()
});