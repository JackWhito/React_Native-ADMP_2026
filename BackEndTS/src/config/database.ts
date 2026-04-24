import mongoose from "mongoose";

export const connectDB = async () => {
    try{
        const mongoURI = process.env.MONGODB_URI;
        if(!mongoURI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        await mongoose.connect(mongoURI);
        // Build indexes from schema definitions. In production, run once after deploy or set MONGODB_SYNC_INDEXES=1.
        if (process.env.NODE_ENV !== "production" || process.env.MONGODB_SYNC_INDEXES === "1") {
            await mongoose.syncIndexes();
        }
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};